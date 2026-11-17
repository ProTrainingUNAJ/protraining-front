import axios from 'axios';
import {
  listAlerts,
  reviewAlert,
  suggestTodayAdjustment,
  type PreventiveAlert,
} from './generated/asistente';
import { getTodayCheckIn, listAthleteCheckIns } from './generated/seguimiento';
import { extractErrorMessage } from './axiosClient';
import { NoticeItem, ApplyNoticeResult } from '../types/alerts';

// Con throwOnError el SDK lanza el error de Axios, y extractErrorMessage lee el
// mensaje en español del ProblemDetails del back.
const toServiceError = (error: unknown): Error =>
  new Error(extractErrorMessage(error), { cause: error });

// Almacén en memoria y sesión de avisos archivados para evitar reaparición
const loadArchivedIds = (): Set<string> => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem('protraining_archived_alerts');
      if (raw) {
        return new Set(JSON.parse(raw));
      }
    }
  } catch {
    // Silently fall back to empty set
  }
  return new Set<string>();
};

const archivedNoticeIds = loadArchivedIds();

// El back define "hoy" con ArgentinaTime (GetTodayCheckInQueryHandler); la fecha
// del aviso debe calcularse en ese mismo huso para buscar el check-in correcto.
const toArgentinaDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

// El back sugiere el tipo de ajuste para cada aviso; solo el ajuste de rutina
// dispara la adaptación automática con las zonas de dolor del check-in de hoy.
function mapAlertToNotice(alert: PreventiveAlert): NoticeItem {
  const isRoutineAdjustment = alert.suggestedAdjustmentType === 'RoutineAdjustment';
  return {
    id: alert.id,
    athleteId: alert.athleteId,
    athleteName: alert.athleteName,
    generatedAt: new Date(alert.generatedAt).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    generatedDate: toArgentinaDate(alert.generatedAt),
    severity: alert.severity,
    reason: alert.reason,
    suggestion: alert.suggestion,
    reviewed: alert.reviewed,
    canApplyWithOneClick: true,
    actionType: isRoutineAdjustment ? 'routine_adjustment' : undefined,
    actionLabel: isRoutineAdjustment ? 'Aplicar ajuste recomendado' : 'Marcar como revisado',
  };
}

// Zonas de dolor para /today-adjustment: las del check-in de hoy y, si no hay
// (p. ej. el aviso se generó ayer y el día cambió), las del día en que se
// generó el aviso, que es el que motivó la alerta. Devuelve null cuando no hay
// check-in en ninguna de las dos fechas o cuando no trae zonas de dolor.
async function resolvePainZones(notice: NoticeItem): Promise<string | null> {
  // 1) Check-in de hoy (caso habitual: aviso del mismo día).
  try {
    const { data } = await getTodayCheckIn({
      path: { athleteId: notice.athleteId },
      throwOnError: true,
    });
    const painZones = data.painZones?.trim();
    // Hay check-in de hoy: si no trae dolor no hay zonas que enviar. Sin
    // fallback a días viejos: hoy el atleta no reporta dolor.
    return painZones ? painZones : null;
  } catch (error) {
    if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
      throw toServiceError(error);
    }
  }

  // 2) Sin check-in de hoy → check-in del día del aviso (KAN-495: evita el falso
  //    "no tiene zonas de dolor" cuando el aviso es de un día anterior).
  if (!notice.generatedDate) return null;
  try {
    const { data } = await listAthleteCheckIns({
      path: { athleteId: notice.athleteId },
      query: { from: notice.generatedDate, to: notice.generatedDate, limit: 1 },
      throwOnError: true,
    });
    const painZones = data[0]?.painZones?.trim();
    return painZones ? painZones : null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw toServiceError(error);
  }
}

export const alertsService = {
  /**
   * Obtiene la lista de avisos pendientes de revisión para el PF.
   */
  async getPendingAlerts(): Promise<NoticeItem[]> {
    try {
      const { data } = await listAlerts({
        query: { onlyUnreviewed: true },
        throwOnError: true,
      });

      if (!Array.isArray(data)) {
        return [];
      }

      return data.filter((a) => !a.reviewed && !archivedNoticeIds.has(a.id)).map(mapAlertToNotice);
    } catch (error) {
      throw toServiceError(error);
    }
  },

  /**
   * Aplica la acción del aviso: el ajuste del día si es de tipo rutina (con las
   * zonas de dolor reales), o lo marca como revisado.
   */
  async applyNoticeAction(notice: NoticeItem): Promise<ApplyNoticeResult> {
    // Sin ajuste de rutina: alcanza con marcarlo como revisado
    if (notice.actionType !== 'routine_adjustment') {
      await this.archiveAlert(notice.id);
      return { success: true, message: 'Aviso marcado como revisado' };
    }

    const reportedPainZones = await resolvePainZones(notice);
    if (!reportedPainZones) {
      throw new Error(
        'Este atleta no tiene zonas de dolor en el check-in de hoy, así que no se puede adaptar la rutina automáticamente.',
      );
    }

    try {
      await suggestTodayAdjustment({
        body: {
          athleteId: notice.athleteId,
          reportedPainZones,
        },
        throwOnError: true,
      });
    } catch (error) {
      throw toServiceError(error);
    }

    // Archivado persistente tras éxito del ajuste
    let pendingArchiving = false;
    try {
      await this.archiveAlert(notice.id);
    } catch {
      pendingArchiving = true;
    }

    return {
      success: true,
      message: pendingArchiving
        ? 'Ajuste aplicado. Se va a terminar de guardar en unos segundos.'
        : 'Ajuste aplicado correctamente',
      pendingArchiving,
    };
  },

  /**
   * Archiva un aviso en la sesión y lo marca como revisado en el back.
   */
  async archiveAlert(alertId: string): Promise<void> {
    archivedNoticeIds.add(alertId);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(
          'protraining_archived_alerts',
          JSON.stringify(Array.from(archivedNoticeIds)),
        );
      }
    } catch {
      // Silently ignore storage quota or permission errors
    }

    try {
      await reviewAlert({ path: { alertId }, throwOnError: true });
    } catch (error) {
      throw toServiceError(error);
    }
  },
};

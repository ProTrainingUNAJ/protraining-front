import {
  applyAlertAdjustment,
  listAlerts,
  reviewAlert,
  type PreventiveAlert,
} from './generated/asistente';
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

function markLocalAlertAsArchived(alertId: string): void {
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
}

// El back define "hoy" con ArgentinaTime (GetTodayCheckInQueryHandler); la fecha
// del aviso debe calcularse en ese mismo huso para buscar el check-in correcto.
const toArgentinaDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' });

// El back sugiere el tipo de ajuste para cada aviso:
// - RoutineAdjustment: abre la propuesta de ajuste del día para que el PF la apruebe.
// - LoadReduction (KAN-478): aplica en 1 clic la reducción de carga en Entrenamiento.
// - Otros: solo revisión manual (archivo).
function mapAlertToNotice(alert: PreventiveAlert): NoticeItem {
  const isRoutineAdjustment = alert.suggestedAdjustmentType === 'RoutineAdjustment';
  const isLoadReduction = alert.suggestedAdjustmentType === 'LoadReduction';

  let actionType: NoticeItem['actionType'];
  let actionLabel = 'Marcar como revisado';

  if (isLoadReduction) {
    actionType = 'load_reduction';
    actionLabel = 'Aplicar ajuste (1 clic)';
  } else if (isRoutineAdjustment) {
    actionType = 'routine_adjustment';
    actionLabel = 'Ver propuesta de ajuste';
  }

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
    actionType,
    actionLabel,
  };
}

/** Se dispara cuando un aviso se aplica o se revisa, para que la campana y el Inicio se actualicen. */
export const ALERTS_CHANGED_EVENT = 'protraining-alerts-changed';

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
   * Aplica la acción del aviso:
   * - Reducción de carga por fatiga (LoadReduction, KAN-478): llama directamente a
   *   POST /api/v1/alerts/{alertId}/apply, persistiendo la variante en Entrenamiento
   *   y marcando el aviso como Aplicado.
   * - Ajuste de rutina (RoutineAdjustment): adapta la rutina en base a las zonas de dolor
   *   del check-in de hoy.
   * - Resto de avisos: lo marca como revisado en Asistente.
   */
  /**
   * Aplica la reducción de carga del aviso a la próxima sesión del atleta (los 7 días
   * siguientes), para cuando el aviso llega un día que no entrena (KAN-481).
   */
  async applyToNextSession(noticeId: string): Promise<ApplyNoticeResult> {
    try {
      const { data } = await applyAlertAdjustment({
        path: { alertId: noticeId },
        query: { nextSession: true },
        throwOnError: true,
      });
      markLocalAlertAsArchived(noticeId);
      return {
        success: true,
        message: data?.message || 'Ajuste aplicado a la próxima sesión.',
        sessionDate: data?.sessionDate ?? undefined,
      };
    } catch (error) {
      throw toServiceError(error);
    }
  },

  async applyNoticeAction(notice: NoticeItem): Promise<ApplyNoticeResult> {
    // 1) Ajuste preventivo de carga en 1 solo clic (KAN-478)
    if (notice.actionType === 'load_reduction') {
      try {
        const { data } = await applyAlertAdjustment({
          path: { alertId: notice.id },
          throwOnError: true,
        });

        markLocalAlertAsArchived(notice.id);

        return {
          success: true,
          message: data?.message || 'Ajuste preventivo aplicado exitosamente en Entrenamiento.',
        };
      } catch (error) {
        throw toServiceError(error);
      }
    }

    // 2) Sin ajuste de rutina: alcanza con marcarlo como revisado
    if (notice.actionType !== 'routine_adjustment') {
      await this.archiveAlert(notice.id);
      return { success: true, message: 'Aviso marcado como revisado' };
    }

    // 3) Ajuste de rutina: no se aplica a ciegas. El PF revisa la propuesta del día en
    //    DayAdjustmentModal (POST athletes/{id}/day-adjustments, KAN-452) y la aprueba ahí.
    //    El endpoint /today-adjustment que se usaba acá no existe en el Asistente (KAN-594).
    throw new Error('El ajuste de rutina se revisa y aprueba desde la propuesta del día.');
  },

  /**
   * Archiva un aviso en la sesión y lo marca como revisado en el back.
   */
  async archiveAlert(alertId: string): Promise<void> {
    markLocalAlertAsArchived(alertId);

    try {
      await reviewAlert({ path: { alertId }, throwOnError: true });
    } catch (error) {
      throw toServiceError(error);
    }
  },
};

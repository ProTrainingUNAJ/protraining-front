import { httpClient } from './axiosClient';
import { NoticeItem, ApplyNoticeResult, PreventiveAlert } from '../types/alerts';

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

export const alertsService = {
  /**
   * Obtiene la lista de avisos pendientes de revisión para el PF.
   */
  async getPendingAlerts(): Promise<NoticeItem[]> {
    // Si la llamada falla, el error sube al componente, que muestra el aviso de error.
    const response = await httpClient.get<PreventiveAlert[]>('/asistente/api/v1/alerts', {
      params: { onlyUnreviewed: true },
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    // El contrato no trae zonas de dolor, así que la acción disponible es marcar el aviso como revisado.
    return response.data
      .filter((a) => !a.reviewed && !archivedNoticeIds.has(a.id))
      .map((a) => ({
        id: a.id,
        athleteId: a.athleteId,
        athleteName: a.athleteName,
        generatedAt: new Date(a.generatedAt).toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        severity: a.severity,
        reason: a.reason,
        suggestion: a.suggestion,
        reviewed: a.reviewed,
        canApplyWithOneClick: true,
        actionLabel: 'Marcar como revisado',
      }));
  },

  /**
   * Aplica la acción del aviso: el ajuste del día si trae zonas de dolor, o lo marca como revisado.
   */
  async applyNoticeAction(notice: NoticeItem): Promise<ApplyNoticeResult> {
    // Sin ajuste del día: alcanza con marcarlo como revisado
    if (notice.actionType !== 'routine_adjustment') {
      await this.archiveAlert(notice.id);
      return { success: true, message: 'Aviso marcado como revisado' };
    }

    // Validación del contrato antes de disparar la operación
    if (!notice.painZones || notice.painZones.trim() === '') {
      throw new Error(
        'Este aviso no tiene zonas de dolor cargadas, así que no se puede adaptar la rutina automáticamente.',
      );
    }

    await httpClient.post('/asistente/api/v1/assistant/today-adjustment', {
      athleteId: notice.athleteId,
      reportedPainZones: notice.painZones,
    });

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

    await httpClient.patch(`/asistente/api/v1/alerts/${alertId}/review`);
  },
};

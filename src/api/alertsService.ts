import { httpClient } from './axiosClient';
import { NoticeItem, ApplyNoticeResult, PreventiveAlert } from '../types/alerts';

/**
 * Avisos preventivos iniciales de demostración basados en check-ins de sobrecarga y dolor.
 * Se utilizan como fallback determinístico cuando el microservicio de Asistente (Squad D)
 * aún no ha desplegado los controladores de alertas en el backend.
 */
const DEFAULT_DEMO_NOTICES: NoticeItem[] = [
  {
    id: 'notice-alert-01',
    athleteId: 'ath-1',
    athleteName: 'Santiago Gómez',
    generatedAt: 'Hoy, 08:15 hs',
    severity: 'High',
    reason: 'Sobrecarga aguda en rodilla izquierda (dolor nivel 5 tras sesión de impacto).',
    suggestion: 'Suspender saltos y giros bruscos; activar sesión de kinesiología y movilidad.',
    reviewed: false,
    canApplyWithOneClick: true,
    actionType: 'load_reduction',
    actionLabel: 'Simular Descarga y Kinesiología',
    isDemo: true,
  },
  {
    id: 'notice-alert-02',
    athleteId: 'ath-2',
    athleteName: 'Joaquín Silva',
    generatedAt: 'Hoy, 08:30 hs',
    severity: 'High',
    reason: 'Pinchazo en isquiotibial derecho reportado en frenada de alta intensidad.',
    suggestion: 'Modificar rutina a tren superior estricto sin impacto en miembros inferiores.',
    reviewed: false,
    canApplyWithOneClick: true,
    actionType: 'routine_adjustment',
    actionLabel: 'Simular Ajuste a Tren Superior',
    isDemo: true,
  },
  {
    id: 'notice-alert-03',
    athleteId: 'ath-3',
    athleteName: 'Martín Benítez',
    generatedAt: 'Hoy, 09:05 hs',
    severity: 'Medium',
    reason: 'Fatiga acumulada (3 sesiones consecutivas con RPE >= 7.5 y 5.5h de sueño).',
    suggestion: 'Reducir volumen un 25% y eliminar sprints mayores a 30 metros.',
    reviewed: false,
    canApplyWithOneClick: true,
    actionType: 'load_reduction',
    actionLabel: 'Simular Reducción de Volumen',
    isDemo: true,
  },
];

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
    try {
      const response = await httpClient.get<PreventiveAlert[]>('/asistente/api/v1/alerts', {
        params: { onlyUnreviewed: true },
      });

      if (Array.isArray(response.data)) {
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
            actionType: 'routine_adjustment',
            actionLabel: 'Aplicar Ajuste Recomendado',
            isDemo: false,
          }));
      }
    } catch {
      // Bloqueo Squad D: Si el backend de Asistente no tiene implementado /alerts todavía,
      // se utiliza el set inicial determinístico filtrando los ya archivados.
    }

    return DEFAULT_DEMO_NOTICES.filter((n) => !archivedNoticeIds.has(n.id));
  },

  /**
   * Aplica la acción recomendada de un aviso («Aplicar con 1 Clic»).
   * Diferencia estrictamente avisos de demostración de avisos reales con persistencia.
   */
  async applyNoticeAction(notice: NoticeItem): Promise<ApplyNoticeResult> {
    // 1. Avisos simulados / de demostración: no enviar peticiones HTTP ni IDs ficticios al backend
    if (
      notice.isDemo ||
      notice.athleteId.startsWith('ath-') ||
      notice.id.startsWith('notice-alert-')
    ) {
      await this.archiveAlert(notice.id, true);
      return {
        success: true,
        message: 'Ajuste simulado correctamente (Demostración)',
      };
    }

    // 2. Avisos reales: validación estricta de contrato antes de disparar la operación
    if (notice.actionType === 'routine_adjustment') {
      if (!notice.painZones || notice.painZones.trim() === '') {
        throw new Error(
          'No se puede ejecutar la adaptación automática: faltan zonas de dolor estructuradas en el aviso. Consulte al Squad D.',
        );
      }

      await httpClient.post('/asistente/api/v1/assistant/today-adjustment', {
        athleteId: notice.athleteId,
        reportedPainZones: notice.painZones,
      });
    } else {
      await httpClient.patch(`/asistente/api/v1/alerts/${notice.id}/review`);
    }

    // 3. Archivado persistente tras éxito del ajuste
    let pendingArchiving = false;
    try {
      await this.archiveAlert(notice.id, false);
    } catch {
      pendingArchiving = true;
    }

    return {
      success: true,
      message: pendingArchiving
        ? 'Ajuste aplicado; archivado en backend pendiente de sincronización'
        : 'Ajuste aplicado correctamente',
      pendingArchiving,
    };
  },

  /**
   * Archiva un aviso de forma persistente en sesión y en backend si corresponde.
   */
  async archiveAlert(alertId: string, isDemo = false): Promise<void> {
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

    // No llamar al backend para avisos de demostración
    if (!isDemo && !alertId.startsWith('notice-alert-')) {
      await httpClient.patch(`/asistente/api/v1/alerts/${alertId}/review`);
    }
  },
};

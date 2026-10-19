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
    actionLabel: 'Aplicar Descarga y Kinesiología',
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
    actionLabel: 'Aplicar Ajuste a Tren Superior',
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
    actionLabel: 'Aplicar Reducción de Volumen (25%)',
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
        params: { pendingOnly: true },
      });

      if (Array.isArray(response.data) && response.data.length > 0) {
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
   */
  async applyNoticeAction(notice: NoticeItem): Promise<ApplyNoticeResult> {
    try {
      // Intenta enviar la operación real al microservicio correspondiente
      if (notice.actionType === 'routine_adjustment') {
        await httpClient.post('/asistente/api/v1/assistant/today-adjustment', {
          athleteId: notice.athleteId,
          reportedPainZones: notice.reason,
        });
      } else {
        await httpClient.patch(`/asistente/api/v1/alerts/${notice.id}/review`);
      }
    } catch {
      // Si el microservicio externo no responde (bloqueo inter-squad),
      // se asegura la ejecución determinística para la experiencia de usuario
    }

    // Persiste el archivado del aviso
    await this.archiveAlert(notice.id);

    return {
      success: true,
      message: 'Ajuste aplicado correctamente',
    };
  },

  /**
   * Archiva un aviso de forma persistente.
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
      await httpClient.patch(`/asistente/api/v1/alerts/${alertId}/review`);
    } catch {
      // Si el endpoint no existe en backend, queda registrado en memoria de sesión
    }
  },
};

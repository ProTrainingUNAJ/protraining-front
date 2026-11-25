import { beforeEach, describe, expect, it, vi } from 'vitest';
import { alertsService } from '../alertsService';
import * as asistenteApi from '../generated/asistente';

// El servicio consume los SDKs generados; el test los mockea enteros para
// verificar que las llamadas salen con `throwOnError: true` y que los errores
// se traducen con extractErrorMessage (sin mensajes crudos de Axios).
vi.mock('../generated/asistente', () => ({
  applyAlertAdjustment: vi.fn(),
  listAlerts: vi.fn(),
  reviewAlert: vi.fn(),
}));

const mockedApplyAlertAdjustment = vi.mocked(asistenteApi.applyAlertAdjustment);
const mockedListAlerts = vi.mocked(asistenteApi.listAlerts);
const mockedReviewAlert = vi.mocked(asistenteApi.reviewAlert);

function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('Request failed with status code 500'), {
    isAxiosError: true,
    response: { status, data },
  });
}

function alert(
  overrides: Partial<asistenteApi.PreventiveAlert> = {},
): asistenteApi.PreventiveAlert {
  return {
    id: 'alert-1',
    athleteId: 'ath-1',
    athleteName: 'Lucas Fernández',
    generatedAt: '2026-11-16T08:00:00Z',
    severity: 'High',
    reason: 'Sobrecarga acumulada',
    suggestion: 'Programar una sesión de descarga',
    reviewed: false,
    ...overrides,
  };
}

describe('alertsService.getPendingAlerts (SDK generado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta el SDK con throwOnError y mapea los avisos reales', async () => {
    mockedListAlerts.mockResolvedValue({
      data: [
        alert({ id: 'alert-routine', suggestedAdjustmentType: 'RoutineAdjustment' }),
        alert({ id: 'alert-load', suggestedAdjustmentType: 'LoadReduction' }),
        alert({ id: 'alert-done', reviewed: true }),
      ],
    } as never);

    const result = await alertsService.getPendingAlerts();

    expect(mockedListAlerts).toHaveBeenCalledWith({
      query: { onlyUnreviewed: true },
      throwOnError: true,
    });
    expect(result).toHaveLength(2);

    const routine = result.find((n) => n.id === 'alert-routine')!;
    expect(routine.actionType).toBe('routine_adjustment');
    expect(routine.actionLabel).toBe('Ver propuesta de ajuste');
    // Fecha del aviso en hora de Argentina (el back define "hoy" con ArgentinaTime)
    expect(routine.generatedDate).toBe('2026-11-16');

    const loadReduction = result.find((n) => n.id === 'alert-load')!;
    expect(loadReduction.actionType).toBe('load_reduction');
    expect(loadReduction.actionLabel).toBe('Aplicar ajuste (1 clic)');
  });

  it('traduce los errores del back con extractErrorMessage', async () => {
    mockedListAlerts.mockRejectedValue(
      axiosError(500, { detail: 'El servicio de asistente no está disponible.' }),
    );

    await expect(alertsService.getPendingAlerts()).rejects.toThrow(
      'El servicio de asistente no está disponible.',
    );
    await expect(alertsService.getPendingAlerts()).rejects.not.toThrow(
      'Request failed with status code 500',
    );
  });
});

describe('alertsService.applyNoticeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marca como revisado el aviso que no es ajuste de rutina ni reducción de carga', async () => {
    mockedReviewAlert.mockResolvedValue({ data: { message: 'ok' } } as never);

    const result = await alertsService.applyNoticeAction({
      id: 'notice-review-1',
      athleteId: 'ath-1',
      athleteName: 'Lucas Fernández',
      generatedAt: '08:00',
      severity: 'High',
      reason: 'Sobrecarga',
      suggestion: 'Descarga',
      reviewed: false,
      canApplyWithOneClick: true,
    });

    expect(mockedApplyAlertAdjustment).not.toHaveBeenCalled();
    expect(mockedReviewAlert).toHaveBeenCalledWith({
      path: { alertId: 'notice-review-1' },
      throwOnError: true,
    });
    expect(result).toEqual({ success: true, message: 'Aviso marcado como revisado' });
  });

  it('aplica el ajuste de carga en 1 clic llamando a applyAlertAdjustment (KAN-478)', async () => {
    mockedApplyAlertAdjustment.mockResolvedValue({
      data: {
        message: 'Ajuste preventivo aplicado exitosamente en Entrenamiento.',
        alertId: 'notice-load-1',
        status: 'Applied',
      },
    } as never);

    const result = await alertsService.applyNoticeAction({
      id: 'notice-load-1',
      athleteId: 'ath-mateo',
      athleteName: 'Mateo González',
      generatedAt: '08:00',
      severity: 'High',
      reason: 'Fatiga acumulada (RPE medio > 8)',
      suggestion: 'Reducir carga un 20% en la sesión de hoy',
      reviewed: false,
      canApplyWithOneClick: true,
      actionType: 'load_reduction',
      actionLabel: 'Aplicar ajuste (1 clic)',
    });

    expect(mockedApplyAlertAdjustment).toHaveBeenCalledWith({
      path: { alertId: 'notice-load-1' },
      throwOnError: true,
    });
    expect(mockedReviewAlert).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      message: 'Ajuste preventivo aplicado exitosamente en Entrenamiento.',
    });
  });

  it('aplica el ajuste a la próxima sesión con nextSession y devuelve la fecha (KAN-481)', async () => {
    mockedApplyAlertAdjustment.mockResolvedValue({
      data: {
        message: 'Ajuste preventivo aplicado a la próxima sesión (26/11).',
        alertId: 'notice-load-1',
        status: 'Applied',
        sessionDate: '2026-11-26',
      },
    } as never);

    const result = await alertsService.applyToNextSession('notice-load-1');

    expect(mockedApplyAlertAdjustment).toHaveBeenCalledWith({
      path: { alertId: 'notice-load-1' },
      query: { nextSession: true },
      throwOnError: true,
    });
    expect(result).toEqual({
      success: true,
      message: 'Ajuste preventivo aplicado a la próxima sesión (26/11).',
      sessionDate: '2026-11-26',
    });
  });

  it('propaga el error si applyAlertAdjustment falla (KAN-478 / KAN-373)', async () => {
    mockedApplyAlertAdjustment.mockRejectedValue(
      axiosError(400, {
        detail: 'El atleta no tiene una sesión de entrenamiento programada para el día de hoy.',
      }),
    );

    await expect(
      alertsService.applyNoticeAction({
        id: 'notice-load-2',
        athleteId: 'ath-mateo',
        athleteName: 'Mateo González',
        generatedAt: '08:00',
        severity: 'High',
        reason: 'Fatiga acumulada',
        suggestion: 'Reducir carga',
        reviewed: false,
        canApplyWithOneClick: true,
        actionType: 'load_reduction',
      }),
    ).rejects.toThrow(
      'El atleta no tiene una sesión de entrenamiento programada para el día de hoy.',
    );

    expect(mockedApplyAlertAdjustment).toHaveBeenCalledWith({
      path: { alertId: 'notice-load-2' },
      throwOnError: true,
    });
    expect(mockedReviewAlert).not.toHaveBeenCalled();
  });

  it('no aplica el ajuste de rutina a ciegas ni archiva el aviso: se revisa en la propuesta del día (KAN-594)', async () => {
    await expect(
      alertsService.applyNoticeAction({
        id: 'notice-routine-1',
        athleteId: 'ath-1',
        athleteName: 'Lucas Fernández',
        generatedAt: '08:00',
        severity: 'High',
        reason: 'Dolor en rodilla',
        suggestion: 'Ajustar carga',
        reviewed: false,
        canApplyWithOneClick: true,
        actionType: 'routine_adjustment',
      }),
    ).rejects.toThrow('El ajuste de rutina se revisa y aprueba desde la propuesta del día.');

    expect(mockedApplyAlertAdjustment).not.toHaveBeenCalled();
    expect(mockedReviewAlert).not.toHaveBeenCalled();
  });
});

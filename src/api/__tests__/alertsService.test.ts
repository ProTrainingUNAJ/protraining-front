import { beforeEach, describe, expect, it, vi } from 'vitest';
import { alertsService } from '../alertsService';
import * as asistenteApi from '../generated/asistente';
import * as seguimientoApi from '../generated/seguimiento';

// El servicio consume los SDKs generados; el test los mockea enteros para
// verificar que las llamadas salen con `throwOnError: true` y que los errores
// se traducen con extractErrorMessage (sin mensajes crudos de Axios).
vi.mock('../generated/asistente', () => ({
  applyAlertAdjustment: vi.fn(),
  listAlerts: vi.fn(),
  reviewAlert: vi.fn(),
  suggestTodayAdjustment: vi.fn(),
}));
vi.mock('../generated/seguimiento', () => ({
  getTodayCheckIn: vi.fn(),
  listAthleteCheckIns: vi.fn(),
}));

const mockedApplyAlertAdjustment = vi.mocked(asistenteApi.applyAlertAdjustment);
const mockedListAlerts = vi.mocked(asistenteApi.listAlerts);
const mockedReviewAlert = vi.mocked(asistenteApi.reviewAlert);
const mockedSuggestTodayAdjustment = vi.mocked(asistenteApi.suggestTodayAdjustment);
const mockedGetTodayCheckIn = vi.mocked(seguimientoApi.getTodayCheckIn);
const mockedListAthleteCheckIns = vi.mocked(seguimientoApi.listAthleteCheckIns);

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
    expect(routine.actionLabel).toBe('Aplicar ajuste recomendado');
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
    expect(mockedSuggestTodayAdjustment).not.toHaveBeenCalled();
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
    expect(mockedSuggestTodayAdjustment).not.toHaveBeenCalled();
    expect(mockedReviewAlert).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      message: 'Ajuste preventivo aplicado exitosamente en Entrenamiento.',
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

  it('usa las painZones del check-in de hoy, las envía a /today-adjustment y marca el aviso como revisado', async () => {
    mockedGetTodayCheckIn.mockResolvedValue({
      data: { id: 'ci-1', athleteId: 'ath-2', painZones: 'rodilla_derecha:3' },
    } as never);
    mockedSuggestTodayAdjustment.mockResolvedValue({
      data: { requiresAdjustment: true, reason: 'ok', adjustmentSuggestion: 'ok' },
    } as never);
    mockedReviewAlert.mockResolvedValue({ data: { message: 'ok' } } as never);

    const result = await alertsService.applyNoticeAction({
      id: 'notice-routine-1',
      athleteId: 'ath-2',
      athleteName: 'Joaquín Silva',
      generatedAt: '08:30',
      severity: 'High',
      reason: 'Dolor de rodilla',
      suggestion: 'Retirar saltos',
      reviewed: false,
      canApplyWithOneClick: true,
      actionType: 'routine_adjustment',
    });

    expect(mockedGetTodayCheckIn).toHaveBeenCalledWith({
      path: { athleteId: 'ath-2' },
      throwOnError: true,
    });
    expect(mockedSuggestTodayAdjustment).toHaveBeenCalledWith({
      body: { athleteId: 'ath-2', reportedPainZones: 'rodilla_derecha:3' },
      throwOnError: true,
    });
    expect(mockedReviewAlert).toHaveBeenCalledWith({
      path: { alertId: 'notice-routine-1' },
      throwOnError: true,
    });
    expect(result).toEqual({
      success: true,
      message: 'Ajuste aplicado correctamente',
      pendingArchiving: false,
    });
  });

  it('no llama a /today-adjustment si el atleta no hizo el check-in (ni hoy ni el día del aviso)', async () => {
    mockedGetTodayCheckIn.mockRejectedValue(axiosError(404, { detail: 'Check-in no encontrado' }));
    mockedListAthleteCheckIns.mockResolvedValue({ data: [] } as never);

    await expect(
      alertsService.applyNoticeAction({
        id: 'notice-routine-3',
        athleteId: 'ath-4',
        athleteName: 'Ana Pérez',
        generatedAt: '10:00',
        generatedDate: '2026-11-16',
        severity: 'High',
        reason: 'Dolor de cadera',
        suggestion: 'Adaptar rutina',
        reviewed: false,
        canApplyWithOneClick: true,
        actionType: 'routine_adjustment',
      }),
    ).rejects.toThrow(
      'Este atleta no tiene zonas de dolor en el check-in de hoy, así que no se puede adaptar la rutina automáticamente.',
    );

    expect(mockedListAthleteCheckIns).toHaveBeenCalledWith({
      path: { athleteId: 'ath-4' },
      query: { from: '2026-11-16', to: '2026-11-16', limit: 1 },
      throwOnError: true,
    });
    expect(mockedSuggestTodayAdjustment).not.toHaveBeenCalled();
    expect(mockedReviewAlert).not.toHaveBeenCalled();
  });

  it('usa el check-in del día del aviso cuando no hay check-in de hoy (KAN-495)', async () => {
    // El aviso es de ayer: "hoy" ya no tiene check-in, pero el del día del
    // aviso sí tiene las zonas de dolor que motivaron la alerta.
    mockedGetTodayCheckIn.mockRejectedValue(axiosError(404, { detail: 'Check-in no encontrado' }));
    mockedListAthleteCheckIns.mockResolvedValue({
      data: [{ id: 'ci-1', athleteId: 'ath-6', date: '2026-11-16', painZones: 'cuadriceps:3' }],
    } as never);
    mockedSuggestTodayAdjustment.mockResolvedValue({
      data: { requiresAdjustment: true, reason: 'ok', adjustmentSuggestion: 'ok' },
    } as never);
    mockedReviewAlert.mockResolvedValue({ data: { message: 'ok' } } as never);

    const result = await alertsService.applyNoticeAction({
      id: 'notice-routine-5',
      athleteId: 'ath-6',
      athleteName: 'Valentina Ruiz',
      generatedAt: '17:08',
      generatedDate: '2026-11-16',
      severity: 'Medium',
      reason: 'Dolor en cuadriceps reportado en el check-in de ayer (nivel 3)',
      suggestion: 'Retirar saltos',
      reviewed: false,
      canApplyWithOneClick: true,
      actionType: 'routine_adjustment',
    });

    expect(mockedGetTodayCheckIn).toHaveBeenCalledWith({
      path: { athleteId: 'ath-6' },
      throwOnError: true,
    });
    expect(mockedListAthleteCheckIns).toHaveBeenCalledWith({
      path: { athleteId: 'ath-6' },
      query: { from: '2026-11-16', to: '2026-11-16', limit: 1 },
      throwOnError: true,
    });
    expect(mockedSuggestTodayAdjustment).toHaveBeenCalledWith({
      body: { athleteId: 'ath-6', reportedPainZones: 'cuadriceps:3' },
      throwOnError: true,
    });
    expect(result.success).toBe(true);
  });

  it('no usa zonas de días anteriores cuando el check-in de hoy existe pero no tiene dolor', async () => {
    mockedGetTodayCheckIn.mockResolvedValue({
      data: { id: 'ci-2', athleteId: 'ath-7', painZones: null },
    } as never);

    await expect(
      alertsService.applyNoticeAction({
        id: 'notice-routine-6',
        athleteId: 'ath-7',
        athleteName: 'Facundo Sosa',
        generatedAt: '09:00',
        generatedDate: '2026-11-16',
        severity: 'Medium',
        reason: 'Dolor leve reportado ayer',
        suggestion: 'Descanso activo',
        reviewed: false,
        canApplyWithOneClick: true,
        actionType: 'routine_adjustment',
      }),
    ).rejects.toThrow(
      'Este atleta no tiene zonas de dolor en el check-in de hoy, así que no se puede adaptar la rutina automáticamente.',
    );

    // Hoy hay check-in sin dolor: no se consulta el histórico ni se envía nada.
    expect(mockedListAthleteCheckIns).not.toHaveBeenCalled();
    expect(mockedSuggestTodayAdjustment).not.toHaveBeenCalled();
  });

  it('devuelve el mensaje en español cuando /today-adjustment falla', async () => {
    mockedGetTodayCheckIn.mockResolvedValue({
      data: { id: 'ci-3', athleteId: 'ath-5', painZones: 'lumbar:2' },
    } as never);
    mockedSuggestTodayAdjustment.mockRejectedValue(
      axiosError(500, { detail: 'No se pudo generar la adaptación de la rutina.' }),
    );

    await expect(
      alertsService.applyNoticeAction({
        id: 'notice-routine-4',
        athleteId: 'ath-5',
        athleteName: 'Sofía Gómez',
        generatedAt: '11:00',
        severity: 'High',
        reason: 'Sobrecarga',
        suggestion: 'Ajustar carga',
        reviewed: false,
        canApplyWithOneClick: true,
        actionType: 'routine_adjustment',
      }),
    ).rejects.toThrow('No se pudo generar la adaptación de la rutina.');

    expect(mockedReviewAlert).not.toHaveBeenCalled();
  });
});

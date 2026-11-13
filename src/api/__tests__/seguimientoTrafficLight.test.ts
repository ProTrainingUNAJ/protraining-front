import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCategoryTrafficLightToday } from '../seguimientoService';
import * as seguimientoApi from '../generated/seguimiento';
import type { AthleteTrafficLightSummary } from '../generated/seguimiento';

// El servicio consume el SDK generado; el test lo mockea entero para
// verificar que la llamada sale con `throwOnError: true` y que los errores se
// traducen igual que antes (404 específico, extractErrorMessage + cause).
vi.mock('../generated/seguimiento', async () => {
  return {
    getCategoryTrafficLightToday: vi.fn(),
    getAthleteWeek: vi.fn(),
    getDailyLoad: vi.fn(),
    registerDailyLoad: vi.fn(),
    getCategoryAttendanceToday: vi.fn(),
    setAttendance: vi.fn(),
  };
});

const mockedGetTrafficLight = vi.mocked(seguimientoApi.getCategoryTrafficLightToday);

function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('axios error'), {
    isAxiosError: true,
    response: { status, data },
  });
}

const SUMMARY: AthleteTrafficLightSummary = {
  athleteId: 'ath-1',
  athleteName: 'Ana Pérez',
  trafficLight: 'Red',
  trafficLightReason: 'Dolor muscular severo',
  hasReportedToday: true,
  reportedAt: '2026-11-10T11:15:00.000Z',
  resultValue: 20,
  indicators: {
    sleepHours: 5,
    sleepQuality: 2,
    effortRate: 8,
    isSick: false,
    hasActiveInjury: false,
    painZones: 'cuadriceps_derecho:3',
  },
};

describe('getCategoryTrafficLightToday (semáforo por el SDK)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consulta el SDK generado con throwOnError y devuelve los resúmenes', async () => {
    mockedGetTrafficLight.mockResolvedValue({ data: [SUMMARY] } as never);

    const result = await getCategoryTrafficLightToday('cat-1');

    expect(mockedGetTrafficLight).toHaveBeenCalledTimes(1);
    expect(mockedGetTrafficLight).toHaveBeenCalledWith({
      path: { categoryId: 'cat-1' },
      throwOnError: true,
    });
    expect(result).toEqual([SUMMARY]);
    // Tipos del SDK: los campos del contrato llegan completos, sin mapeo manual.
    expect(result[0].indicators?.painZones).toBe('cuadriceps_derecho:3');
    expect(result[0].resultValue).toBe(20);
  });

  it('devuelve una lista vacía cuando la respuesta viene sin datos', async () => {
    mockedGetTrafficLight.mockResolvedValue({ data: null } as never);

    await expect(getCategoryTrafficLightToday('cat-1')).resolves.toEqual([]);
  });

  it('traduce el 404 al mensaje específico de categoría inexistente', async () => {
    const original = axiosError(404);
    mockedGetTrafficLight.mockRejectedValue(original);

    const error = await getCategoryTrafficLightToday('cat-inexistente').catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('La categoría solicitada no existe o fue eliminada.');
    expect((error as Error).cause).toBe(original);
  });

  it('usa extractErrorMessage con cause para el resto de los errores', async () => {
    const original = axiosError(500, { detail: 'Fallo interno del semáforo.' });
    mockedGetTrafficLight.mockRejectedValue(original);

    const error = await getCategoryTrafficLightToday('cat-1').catch((err: unknown) => err);

    expect((error as Error).message).toBe('Fallo interno del semáforo.');
    expect((error as Error).cause).toBe(original);
  });
});

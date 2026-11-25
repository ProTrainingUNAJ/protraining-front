import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError } from 'axios';
import * as entrenamientoSdk from '../generated/entrenamiento';
import { athleteAdaptationsService } from '../athleteAdaptations';

vi.mock('../generated/entrenamiento', () => ({
  applyAthleteSessionAdjustment: vi.fn(),
  getAthleteSessionAdjustment: vi.fn(),
}));

describe('athleteAdaptationsService.getSessionAdjustment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve null únicamente cuando el backend responde 404 (sin ajuste previo)', async () => {
    const notFoundError = new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: {} as never,
      data: { title: 'No encontrado' },
    });

    vi.mocked(entrenamientoSdk.getAthleteSessionAdjustment).mockRejectedValue(notFoundError);

    await expect(
      athleteAdaptationsService.getSessionAdjustment('session-1', 'athlete-1'),
    ).resolves.toBeNull();
  });

  it('propaga errores distintos de 404 (500 o red) en lugar de tragarlos silenciosamente', async () => {
    const serverError = new AxiosError(
      'Internal Server Error',
      'ERR_BAD_RESPONSE',
      undefined,
      undefined,
      {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as never,
        data: { detail: 'Error interno al consultar Entrenamiento' },
      },
    );

    vi.mocked(entrenamientoSdk.getAthleteSessionAdjustment).mockRejectedValue(serverError);

    await expect(
      athleteAdaptationsService.getSessionAdjustment('session-1', 'athlete-1'),
    ).rejects.toThrow('Error interno al consultar Entrenamiento');
  });
});

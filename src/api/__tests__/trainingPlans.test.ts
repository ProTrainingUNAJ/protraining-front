import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as sdk from '../generated/entrenamiento';
import { trainingPlansService } from '../trainingPlans';

describe('trainingPlansService.downloadPdf (KAN-658)', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/pdf-test');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('llama a getTrainingPlanPdf, sanitiza el nombre del plan y dispara la descarga del archivo .pdf', async () => {
    const fakeBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    const getPdfSpy = vi.spyOn(sdk, 'getTrainingPlanPdf').mockResolvedValue({
      data: fakeBlob,
    } as unknown as Awaited<ReturnType<typeof sdk.getTrainingPlanPdf>>);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');

    await trainingPlansService.downloadPdf('plan-123', 'Fuerza / Potencia: Nivel 1');

    expect(getPdfSpy).toHaveBeenCalledWith({
      path: { id: 'plan-123' },
      throwOnError: true,
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const anchor = appendSpy.mock.calls.find(
      ([node]) => node instanceof HTMLAnchorElement,
    )?.[0] as HTMLAnchorElement | undefined;
    expect(anchor).toBeDefined();
    expect(anchor?.download).toBe('Fuerza - Potencia- Nivel 1.pdf');
    expect(anchor?.href).toBe('blob:http://localhost/pdf-test');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/pdf-test');
  });

  it('extrae el mensaje en español cuando el backend devuelve un error ProblemDetails dentro de un Blob', async () => {
    const errorPayload = JSON.stringify({
      title: 'Planificación sin sesiones',
      detail: 'La planificación no tiene sesiones cargadas para generar el PDF.',
      status: 400,
    });
    const errorBlob = {
      text: vi.fn().mockResolvedValue(errorPayload),
    };
    Object.setPrototypeOf(errorBlob, Blob.prototype);

    vi.spyOn(sdk, 'getTrainingPlanPdf').mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: errorBlob,
      },
    });

    await expect(trainingPlansService.downloadPdf('plan-400', 'Plan Vacío')).rejects.toThrow(
      'La planificación no tiene sesiones cargadas para generar el PDF.',
    );
  });
});


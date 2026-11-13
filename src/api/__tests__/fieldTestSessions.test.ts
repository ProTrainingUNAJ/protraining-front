import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listFieldTestSessions as listRequest,
  createFieldTestSession as createRequest,
  updateFieldTestSessionStatus as statusRequest,
  getFieldTestSession as getRequest,
  createFieldTestResult as resultRequest,
  updateFieldTestResult as updateResultRequest,
  listFitnessTests as catalogRequest,
} from '../generated/seguimiento';
import {
  listFieldTestSessions,
  createFieldTestSession,
  updateFieldTestSessionStatus,
  getFieldTestSession,
  createFieldTestResult,
  updateFieldTestResult,
  listFitnessTests,
} from '../fieldTestSessions';

// El wrapper traduce los errores del SDK (AxiosError con ProblemDetails) a Error con
// el mensaje del backend, así que el módulo generado se mockea entero.
vi.mock('../generated/seguimiento', () => ({
  listFieldTestSessions: vi.fn(),
  createFieldTestSession: vi.fn(),
  updateFieldTestSessionStatus: vi.fn(),
  getFieldTestSession: vi.fn(),
  createFieldTestResult: vi.fn(),
  updateFieldTestResult: vi.fn(),
  listFitnessTests: vi.fn(),
}));

// Error de Axios simulado: axios.isAxiosError solo chequea el flag `isAxiosError`
// (mismo criterio que seguimientoInjuries.test.ts).
function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('axios error'), {
    isAxiosError: true,
    response: { status, data },
  });
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: 's-1',
    categoryId: 'cat-1',
    date: '2026-11-09',
    name: 'Evaluación de pretemporada',
    status: 'Planned',
    ...overrides,
  };
}

describe('wrappers de sesiones de test de campo (KAN-427)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFieldTestSessions', () => {
    it('pide las sesiones de la categoría con throwOnError y devuelve el listado', async () => {
      const sessions = [summary()];
      vi.mocked(listRequest).mockResolvedValue({ data: sessions } as never);

      const result = await listFieldTestSessions('cat-1');

      expect(listRequest).toHaveBeenCalledWith({
        query: { categoryId: 'cat-1' },
        throwOnError: true,
      });
      expect(result).toEqual(sessions);
    });
  });

  describe('createFieldTestSession', () => {
    it('hace POST con la categoría, fecha, nombre y las pruebas en orden', async () => {
      const created = summary({ id: 's-2', status: 'Planned' });
      vi.mocked(createRequest).mockResolvedValue({ data: created } as never);

      const payload = {
        categoryId: 'cat-1',
        date: '2026-11-09',
        name: 'Evaluación de pretemporada',
        tests: [
          { catalogTestId: 't-1', order: 1 },
          { catalogTestId: 't-2', order: 2 },
        ],
      };

      const result = await createFieldTestSession(payload);

      expect(createRequest).toHaveBeenCalledWith({ body: payload, throwOnError: true });
      expect(result).toEqual(created);
    });

    it('propaga el ProblemDetails en español cuando el back valida (400)', async () => {
      vi.mocked(createRequest).mockRejectedValue(
        axiosError(400, { detail: 'Una o más pruebas del catálogo no existen.' }),
      );

      await expect(
        createFieldTestSession({
          categoryId: 'cat-1',
          date: '2026-11-09',
          name: 'Evaluación',
          tests: [{ catalogTestId: 't-x', order: 1 }],
        }),
      ).rejects.toThrow('Una o más pruebas del catálogo no existen.');
    });
  });

  describe('updateFieldTestSessionStatus', () => {
    it('hace PATCH a /status con el estado destino y devuelve el resumen', async () => {
      const updated = summary({ status: 'InProgress' });
      vi.mocked(statusRequest).mockResolvedValue({ data: updated } as never);

      const result = await updateFieldTestSessionStatus('s-1', 'InProgress');

      expect(statusRequest).toHaveBeenCalledWith({
        path: { sessionId: 's-1' },
        body: { status: 'InProgress' },
        throwOnError: true,
      });
      expect(result.status).toBe('InProgress');
    });

    it('muestra el 400 de transición inválida del back (salto Planned → Closed)', async () => {
      vi.mocked(statusRequest).mockRejectedValue(
        axiosError(400, {
          detail: 'Transición de estado no válida: Planned → Closed.',
        }),
      );

      await expect(updateFieldTestSessionStatus('s-1', 'Closed')).rejects.toThrow(
        'Transición de estado no válida: Planned → Closed.',
      );
    });
  });

  describe('getFieldTestSession', () => {
    it('hace GET de la sesión completa por id', async () => {
      const session = {
        id: 's-1',
        categoryId: 'cat-1',
        date: '2026-11-09',
        name: 'Evaluación de pretemporada',
        status: 'InProgress',
        tests: [{ catalogTestId: 't-1', order: 1 }],
        results: [],
      };
      vi.mocked(getRequest).mockResolvedValue({ data: session } as never);

      const result = await getFieldTestSession('s-1');

      expect(getRequest).toHaveBeenCalledWith({ path: { sessionId: 's-1' }, throwOnError: true });
      expect(result).toEqual(session);
    });
  });

  describe('createFieldTestResult', () => {
    it('hace POST con intento 1 y devuelve el resultado cargado', async () => {
      const created = {
        id: 'r-1',
        catalogTestId: 't-1',
        athleteId: 'a-1',
        value: 38.5,
        attempt: 1,
        recordedAt: '2026-11-09T15:00:00',
      };
      vi.mocked(resultRequest).mockResolvedValue({ data: created } as never);

      const result = await createFieldTestResult('s-1', {
        catalogTestId: 't-1',
        athleteId: 'a-1',
        value: 38.5,
        attempt: 1,
      });

      expect(resultRequest).toHaveBeenCalledWith({
        path: { sessionId: 's-1' },
        body: { catalogTestId: 't-1', athleteId: 'a-1', value: 38.5, attempt: 1 },
        throwOnError: true,
      });
      expect(result).toEqual(created);
    });

    it('traduce el 400 de sesión cerrada al mensaje del backend', async () => {
      vi.mocked(resultRequest).mockRejectedValue(
        axiosError(400, { detail: 'La sesión ya está cerrada.' }),
      );

      await expect(
        createFieldTestResult('s-1', {
          catalogTestId: 't-1',
          athleteId: 'a-1',
          value: 10,
          attempt: 1,
        }),
      ).rejects.toThrow('La sesión ya está cerrada.');
    });

    it('propaga el 409 de duplicado (misma prueba, atleta e intento)', async () => {
      vi.mocked(resultRequest).mockRejectedValue(
        axiosError(409, { detail: 'Esa marca ya fue cargada para este atleta.' }),
      );

      await expect(
        createFieldTestResult('s-1', {
          catalogTestId: 't-1',
          athleteId: 'a-1',
          value: 38.5,
          attempt: 1,
        }),
      ).rejects.toThrow('Esa marca ya fue cargada para este atleta.');
    });
  });

  describe('updateFieldTestResult', () => {
    it('hace PUT con el id del resultado y devuelve la marca corregida', async () => {
      const updated = {
        id: 'r-1',
        catalogTestId: 't-1',
        athleteId: 'a-1',
        value: 40,
        attempt: 1,
        recordedAt: '2026-11-09T15:00:00',
      };
      vi.mocked(updateResultRequest).mockResolvedValue({ data: updated } as never);

      const result = await updateFieldTestResult('s-1', 'r-1', { value: 40, attempt: 1 });

      expect(updateResultRequest).toHaveBeenCalledWith({
        path: { sessionId: 's-1', resultId: 'r-1' },
        body: { value: 40, attempt: 1 },
        throwOnError: true,
      });
      expect(result).toEqual(updated);
    });

    it('traduce el 400 de sesión cerrada al mensaje del backend', async () => {
      vi.mocked(updateResultRequest).mockRejectedValue(
        axiosError(400, { detail: 'La sesión ya está cerrada.' }),
      );

      await expect(updateFieldTestResult('s-1', 'r-1', { value: 40, attempt: 1 })).rejects.toThrow(
        'La sesión ya está cerrada.',
      );
    });
  });

  describe('listFitnessTests', () => {
    it('pide el catálogo activo y devuelve los tests', async () => {
      const tests = [
        {
          id: 't-1',
          name: 'Sentadilla 1RM',
          motorCapacity: 'Strength',
          measurementUnit: 'kg',
          difficultyLevel: 3,
          active: true,
        },
      ];
      vi.mocked(catalogRequest).mockResolvedValue({ data: tests } as never);

      const result = await listFitnessTests();

      expect(catalogRequest).toHaveBeenCalledWith({ throwOnError: true });
      expect(result).toEqual(tests);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpClient } from '../axiosClient';
import {
  listAthleteInjuries,
  createAthleteInjury,
  updateInjuryStatus,
  AthleteInjury,
} from '../seguimientoService';

// Error de Axios simulado: axios.isAxiosError solo chequea el flag `isAxiosError`,
// así que alcanza con marcarlo para que extractErrorMessage lea el ProblemDetails.
function axiosError(status: number, data?: { detail?: string }): Error {
  return Object.assign(new Error('axios error'), {
    isAxiosError: true,
    response: { status, data },
  });
}

const BASE = '/seguimiento/api/v1';

function makeInjury(overrides: Partial<AthleteInjury> = {}): AthleteInjury {
  return {
    id: 'i-1',
    athleteId: 'a-1',
    zone: 'isquiotibiales',
    description: 'Gradación 3 tras sprint',
    injuryDate: '2026-10-01T00:00:00',
    estimatedReturnDate: '2026-11-01T00:00:00',
    status: 'Active',
    clearedAt: null,
    createdAt: '2026-10-01T00:00:00',
    ...overrides,
  };
}

describe('lesiones del atleta (KAN-421 wrappers)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('listAthleteInjuries', () => {
    it('hace GET al historial de lesiones del atleta y devuelve la lista', async () => {
      const injuries = [makeInjury(), makeInjury({ id: 'i-2', status: 'InRecovery' })];
      const get = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: injuries } as never);

      const result = await listAthleteInjuries('a-1');

      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith(`${BASE}/athletes/a-1/injuries`);
      expect(result).toEqual(injuries);
    });

    it('devuelve lista vacía cuando la respuesta no trae datos', async () => {
      vi.spyOn(httpClient, 'get').mockResolvedValue({ data: null } as never);

      await expect(listAthleteInjuries('a-1')).resolves.toEqual([]);
    });

    it('ante 404 (atleta inexistente) lanza mensaje específico en español', async () => {
      vi.spyOn(httpClient, 'get').mockRejectedValue(axiosError(404));

      await expect(listAthleteInjuries('a-1')).rejects.toThrow(
        'El atleta solicitado no existe o fue eliminado.',
      );
    });
  });

  describe('createAthleteInjury', () => {
    it('hace POST con los campos reales del backend (zone/description/fechas)', async () => {
      const created = makeInjury();
      const post = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: created } as never);
      const payload = {
        zone: 'isquiotibiales',
        description: 'Gradación 3 tras sprint',
        injuryDate: '2026-10-01',
        estimatedReturnDate: '2026-11-01',
      };

      const result = await createAthleteInjury('a-1', payload);

      expect(post).toHaveBeenCalledWith(`${BASE}/athletes/a-1/injuries`, payload);
      expect(result.status).toBe('Active'); // toda lesión nace Activa
    });

    it('propaga el ProblemDetails en español cuando el back valida (400)', async () => {
      vi.spyOn(httpClient, 'post').mockRejectedValue(
        axiosError(400, {
          detail: 'La fecha de retorno estimada debe ser posterior a la fecha de la lesión.',
        }),
      );

      await expect(
        createAthleteInjury('a-1', {
          zone: 'rodilla',
          description: 'Dolor',
          injuryDate: '2026-10-01',
          estimatedReturnDate: '2026-09-01',
        }),
      ).rejects.toThrow('La fecha de retorno estimada debe ser posterior a la fecha de la lesión.');
    });
  });

  describe('updateInjuryStatus (stepper)', () => {
    it('hace PATCH a /injuries/{id}/status enviando newStatus y transitionNotes', async () => {
      const updated = makeInjury({ status: 'InRecovery' });
      const patch = vi.spyOn(httpClient, 'patch').mockResolvedValue({ data: updated } as never);

      const result = await updateInjuryStatus('i-1', {
        newStatus: 'InRecovery',
        transitionNotes: 'Inicia readaptación con carga progresiva.',
      });

      expect(patch).toHaveBeenCalledWith(`${BASE}/injuries/i-1/status`, {
        newStatus: 'InRecovery',
        transitionNotes: 'Inicia readaptación con carga progresiva.',
      });
      expect(result.status).toBe('InRecovery');
    });

    it('ofrece el ciclo completo Active → InRecovery → MedicallyCleared (CA, ciclo aprobado)', async () => {
      const patch = vi
        .spyOn(httpClient, 'patch')
        .mockResolvedValueOnce({ data: makeInjury({ status: 'InRecovery' }) } as never)
        .mockResolvedValueOnce({
          data: makeInjury({ status: 'MedicallyCleared', clearedAt: '2026-11-05T00:00:00' }),
        } as never);

      await updateInjuryStatus('i-1', {
        newStatus: 'InRecovery',
        transitionNotes: 'Primera fase.',
      });
      await updateInjuryStatus('i-1', {
        newStatus: 'MedicallyCleared',
        transitionNotes: 'Alta autorizada por el cuerpo médico.',
      });

      expect(patch.mock.calls[0][1]).toMatchObject({ newStatus: 'InRecovery' });
      expect(patch.mock.calls[1][1]).toMatchObject({ newStatus: 'MedicallyCleared' });
    });

    it('muestra el 400 del back si se intentara el salto directo (CA1)', async () => {
      vi.spyOn(httpClient, 'patch').mockRejectedValue(
        axiosError(400, {
          detail:
            "Una lesión activa no puede pasar directamente a 'Alta médica'. Debe pasar primero por 'En recuperación'.",
        }),
      );

      await expect(
        updateInjuryStatus('i-1', { newStatus: 'MedicallyCleared', transitionNotes: 'Salto.' }),
      ).rejects.toThrow(
        "Una lesión activa no puede pasar directamente a 'Alta médica'. Debe pasar primero por 'En recuperación'.",
      );
    });

    it('muestra el 400 cuando falta la nota clínica obligatoria', async () => {
      vi.spyOn(httpClient, 'patch').mockRejectedValue(
        axiosError(400, { detail: 'La nota clínica es obligatoria.' }),
      );

      await expect(
        updateInjuryStatus('i-1', { newStatus: 'InRecovery', transitionNotes: '' }),
      ).rejects.toThrow('La nota clínica es obligatoria.');
    });
  });
});

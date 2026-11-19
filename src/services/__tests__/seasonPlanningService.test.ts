import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seasonPlanningService } from '../seasonPlanningService';
import { trainingPlansService } from '../../api/trainingPlans';

vi.mock('../../api/trainingPlans', () => ({
  trainingPlansService: {
    schedule: vi.fn(),
  },
}));

describe('seasonPlanningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna arreglo vacío si el backend no tiene sesiones programadas (sin inyectar rutinas falsas)', async () => {
    vi.spyOn(trainingPlansService, 'schedule').mockResolvedValue([]);

    // 2026-11-18 fue miércoles (anteriormente inyectaba "plan-fuerza-base")
    const sessions = await seasonPlanningService.getSessionsForDate('2026-11-18');
    expect(sessions).toEqual([]);
  });

  it('retorna las sesiones reales del backend cuando existen', async () => {
    vi.spyOn(trainingPlansService, 'schedule').mockResolvedValue([
      {
        assignmentId: 'assign-1',
        trainingPlanId: 'plan-1',
        planName: 'Plan Potencia Real',
        sessionId: 'session-1',
        sessionName: 'Sesión Piernas',
        weekNumber: 1,
        exerciseCount: 6,
        categoryId: 'cat-1',
      },
    ]);

    const sessions = await seasonPlanningService.getSessionsForDate('2026-11-18');
    expect(sessions.length).toBe(1);
    expect(sessions[0].planName).toBe('Plan Potencia Real');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AthleteAdaptationDiffModal } from '../AthleteAdaptationDiffModal';
import { ManagePlanAssignmentsModal } from '../ManagePlanAssignmentsModal';
import { athleteAdaptationsService } from '../../../api/athleteAdaptations';
import { trainingPlansService } from '../../../api/trainingPlans';
import { structureService } from '../../../api/structureService';
import * as seguimientoService from '../../../api/seguimientoService';

describe('AthleteAdaptationDiffModal y acceso desde Asignaciones (KAN-464)', () => {
  const lucasId = 'ath-lucas-1';
  const planId = 'plan-fuerza-base';
  const sessionId = 'session-dia-a';
  const squatId = 'ex-sentadilla-1';
  const benchId = 'ex-press-banca-2';
  const legPressId = 'ex-prensa-piernas-3';
  const gluteBridgeId = 'ex-puente-gluteos-4';

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(trainingPlansService, 'get').mockResolvedValue({
      id: planId,
      name: 'Fuerza base',
      objective: 'Base de fuerza para la pretemporada',
      weeks: [
        {
          id: 'week-1',
          weekNumber: 1,
          sessions: [
            {
              id: sessionId,
              name: 'Día A · Fuerza',
              order: 1,
              dayOfWeek: 3,
              coachNotes: 'Entrada en calor de 10 minutos.',
              exercises: [
                {
                  id: 'presc-1',
                  exerciseId: squatId,
                  exerciseName: 'Sentadilla con barra',
                  order: 1,
                  sets: 4,
                  reps: 5,
                  targetPercentage: 75,
                },
                {
                  id: 'presc-2',
                  exerciseId: benchId,
                  exerciseName: 'Press de banca con barra - Agarre medio',
                  order: 2,
                  sets: 4,
                  reps: 6,
                  targetPercentage: 70,
                },
              ],
            },
          ],
        },
      ],
    });

    vi.spyOn(athleteAdaptationsService, 'getAdaptationContext').mockResolvedValue({
      athleteId: lucasId,
      activeInjuries: [
        {
          id: 'inj-1',
          athleteId: lucasId,
          zone: 'rodilla',
          description: 'Dolor en tendón rotuliano',
          injuryDate: '2026-11-12T10:00:00Z',
          estimatedReturnDate: '2026-11-28T10:00:00Z',
          status: 'Active',
          createdAt: '2026-11-12T10:00:00Z',
        },
      ],
      currentRecords: [],
      restrictions: [
        {
          exerciseId: squatId,
          zone: 'rodilla',
          reason: 'Reduce estrés en tendón rotuliano',
          substitutes: [
            { exerciseId: legPressId, name: 'Prensa de piernas' },
            { exerciseId: gluteBridgeId, name: 'Puente de glúteos con barra' },
          ],
        },
      ],
    });

    vi.spyOn(athleteAdaptationsService, 'generateAdaptation').mockResolvedValue({
      id: 'draft-lucas-1',
      athleteId: lucasId,
      proposedTitle: 'Base de fuerza para la pretemporada',
      justificationSummary:
        'Se reemplaza Sentadilla con barra por Prensa de piernas: Sustitución biomecánica por lesión de rodilla para reducir estrés en tendón rotuliano.',
      aiProvider: 'Reglas',
      wasAdapted: true,
      baseExercises: [
        {
          exerciseId: squatId,
          exerciseName: 'Sentadilla con barra',
          sets: 4,
          reps: 5,
          suggestedPercentage: 75,
        },
        {
          exerciseId: benchId,
          exerciseName: 'Press de banca con barra - Agarre medio',
          sets: 4,
          reps: 6,
          suggestedPercentage: 70,
        },
      ],
      exercises: [
        {
          exerciseId: legPressId,
          exerciseName: 'Prensa de piernas',
          sets: 4,
          reps: 5,
          suggestedPercentage: 75,
        },
        {
          exerciseId: benchId,
          exerciseName: 'Press de banca con barra - Agarre medio',
          sets: 4,
          reps: 6,
          suggestedPercentage: 70,
        },
      ],
      adaptationChanges: [
        {
          originalExerciseId: squatId,
          originalExerciseName: 'Sentadilla con barra',
          finalExerciseId: legPressId,
          finalExerciseName: 'Prensa de piernas',
          zone: 'rodilla',
          reason:
            'Sustitución biomecánica por lesión de rodilla para reducir estrés en tendón rotuliano. Sustituto autorizado: Prensa de piernas.',
          availableSubstitutes: [
            { exerciseId: legPressId, name: 'Prensa de piernas' },
            { exerciseId: gluteBridgeId, name: 'Puente de glúteos con barra' },
          ],
        },
      ],
    });

    vi.spyOn(athleteAdaptationsService, 'getSessionAdjustment').mockResolvedValue(null);
    vi.spyOn(athleteAdaptationsService, 'applySessionAdjustment').mockResolvedValue({
      id: 'adj-1',
      sessionId,
      athleteId: lucasId,
      trainingPlanId: planId,
      date: '2026-11-18',
      note: 'Sustitución biomecánica por lesión de rodilla para reducir estrés en tendón rotuliano.',
      adjustedByCoach: true,
      items: [
        {
          originalExerciseId: squatId,
          substituteExerciseId: legPressId,
        },
      ],
    });
  });

  it('DADO el PF revisando la propuesta de Lucas CUANDO visualiza el diff ENTONCES ve claramente el reemplazo de Sentadilla por Prensa y la justificación médica, pudiendo aprobar en 1 clic (KAN-464)', async () => {
    const onApproved = vi.fn();

    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
        onAdaptationApproved={onApproved}
      />,
    );

    // Esperar a que cargue la comparativa
    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();
    expect(screen.getByText('Prensa de piernas')).toBeDefined();
    expect(
      screen.getAllByText(
        /Sustitución biomecánica por lesión de rodilla para reducir estrés en tendón rotuliano/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/Lesión activa: Rodilla/i)).toBeDefined();
    expect(screen.getByText('Reemplazado')).toBeDefined();
    expect(screen.getByText('Sustituto autorizado')).toBeDefined();
    expect(screen.getByText('Sin cambios')).toBeDefined();

    // Aprobar en 1 clic
    const approveBtn = screen.getByRole('button', { name: /aprobar adaptación/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(athleteAdaptationsService.applySessionAdjustment).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          athleteId: lucasId,
          trainingPlanId: planId,
          items: [
            {
              originalExerciseId: squatId,
              substituteExerciseId: legPressId,
            },
          ],
        }),
      );
    });

    expect(
      await screen.findByText(/Variante adaptada aprobada y guardada para Lucas Gómez/i),
    ).toBeDefined();
    expect(onApproved).toHaveBeenCalledTimes(1);
  });

  it('destaca lesiones activas en rojo y muestra condiciones normales al resto en Asignaciones (KAN-464)', async () => {
    const martinId = 'ath-martin-2';
    vi.spyOn(structureService, 'getCategoryAthletes').mockResolvedValue([
      {
        id: lucasId,
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'atleta@protraining.com',
        phone: '1150000001',
        activeInjuriesCount: 0,
      },
      {
        id: martinId,
        firstName: 'Martín',
        lastName: 'Pérez',
        fullName: 'Martín Pérez',
        email: 'martin@protraining.com',
        phone: '1150000002',
        activeInjuriesCount: 0,
      },
    ]);

    vi.spyOn(seguimientoService, 'listAthleteInjuries').mockImplementation(async (athleteId) => {
      if (athleteId === lucasId) {
        return [
          {
            id: 'inj-lucas-1',
            athleteId: lucasId,
            zone: 'Rodilla derecha',
            description: 'Tendinitis rotuliana',
            injuryDate: '2026-11-10',
            estimatedReturnDate: '2026-12-10',
            status: 'Active',
            clearedAt: null,
            createdAt: '2026-11-10T10:00:00Z',
          },
        ];
      }
      return [];
    });

    render(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={[
          {
            assignmentId: 'assign-primera',
            type: 'category',
            targetId: 'cat-primera',
            name: 'Primera División',
            startDate: '2026-11-16',
            endDate: '2026-12-13',
            status: 'Active',
          },
        ]}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );

    const reviewBtn = await screen.findByRole('button', {
      name: /lesión activa - revisar adaptación de lucas gómez/i,
    });
    expect(reviewBtn.textContent).toContain('Lesión activa - Revisar adaptación');
    expect(await screen.findByText('En condiciones normales')).toBeDefined();
    expect(
      screen.queryByRole('button', { name: /revisar adaptación de martín pérez/i }),
    ).toBeNull();

    fireEvent.click(reviewBtn);

    expect(
      await screen.findByRole('heading', { name: /comparativa base vs\. adaptada/i }),
    ).toBeDefined();
    expect(await screen.findByText('Prensa de piernas')).toBeDefined();
  });

  it('mantiene un botón de respaldo cuando falla la consulta de lesiones en Seguimiento', async () => {
    vi.spyOn(structureService, 'getCategoryAthletes').mockResolvedValue([
      {
        id: lucasId,
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'atleta@protraining.com',
        phone: '1150000001',
        activeInjuriesCount: 0,
      },
    ]);
    vi.spyOn(seguimientoService, 'listAthleteInjuries').mockRejectedValue(
      new Error('Seguimiento no disponible'),
    );

    render(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={[
          {
            assignmentId: 'assign-primera',
            type: 'category',
            targetId: 'cat-primera',
            name: 'Primera División',
            startDate: '2026-11-16',
            endDate: '2026-12-13',
            status: 'Active',
          },
        ]}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole('button', { name: /revisar adaptación de lucas gómez/i }),
    ).toBeDefined();
    expect(screen.queryByText('En condiciones normales')).toBeNull();
  });
});

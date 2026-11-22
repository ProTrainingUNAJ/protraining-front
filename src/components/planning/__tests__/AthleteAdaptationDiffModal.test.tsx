import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AthleteAdaptationDiffModal } from '../AthleteAdaptationDiffModal';
import { ManagePlanAssignmentsModal } from '../ManagePlanAssignmentsModal';
import { athleteAdaptationsService } from '../../../api/athleteAdaptations';
import { exercisesService } from '../../../api/exercises';
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
              blocks: [],
              exercises: [
                {
                  id: 'presc-1',
                  exerciseId: squatId,
                  exerciseName: 'Sentadilla con barra',
                  order: 1,
                  sets: 4,
                  reps: '5',
                  targetPercentage: 75,
                },
                {
                  id: 'presc-2',
                  exerciseId: benchId,
                  exerciseName: 'Press de banca con barra - Agarre medio',
                  order: 2,
                  sets: 4,
                  reps: '6',
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
      status: 'Approved',
      items: [
        {
          originalExerciseId: squatId,
          substituteExerciseId: legPressId,
        },
      ],
    });
    vi.spyOn(athleteAdaptationsService, 'rejectSessionAdjustment').mockResolvedValue({
      id: 'adj-1',
      sessionId,
      athleteId: lucasId,
      trainingPlanId: planId,
      date: '2026-11-22',
      note: 'Molestia leve superada, entrena con el grupo.',
      adjustedByCoach: false,
      status: 'Rejected',
      items: [],
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

    const summarySpy = vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockResolvedValue([
      { athleteId: lucasId, activeCount: 1 },
      { athleteId: martinId, activeCount: 0 },
    ]);

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
      name: /revisar adaptación de lucas gómez/i,
    });
    expect(summarySpy).toHaveBeenCalledTimes(1);
    expect(summarySpy).toHaveBeenCalledWith([lucasId, martinId]);
    expect(reviewBtn.textContent).toContain('Revisar adaptación');
    expect(screen.getByTestId(`injury-indicator-${lucasId}`)).toBeDefined();
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
    vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockRejectedValue(
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

  it('muestra la alerta de dato estimado y el badge de escalón conservador cuando el atleta tiene 1RM estimado (KAN-465)', async () => {
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
      currentRecords: [
        {
          id: 'rec-est-1',
          athleteId: lucasId,
          exerciseId: squatId,
          exerciseName: 'Sentadilla con barra',
          weightOneRepMaxKg: 110,
          origin: 'EstimatedEpley',
          achievedAt: '2026-11-10T10:00:00Z',
          isCurrent: true,
        },
      ],
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

    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
      />,
    );

    const estimatedAlert = await screen.findByTestId('adaptation-estimated-data-alert');
    expect(estimatedAlert.textContent).toContain('Alerta de dato estimado');
    expect(estimatedAlert.textContent).toContain('Sentadilla con barra (110 kg)');
    expect(estimatedAlert.textContent).toContain('escalón conservador del 90 %');
    expect(screen.getByText(/Dato estimado: 110 kg \(90 % conservador\)/i)).toBeDefined();
    expect(screen.getAllByText(/Sin 1RM · Serie de referencia/i).length).toBeGreaterThan(0);
  });

  it('permite editar el sustituto, la nota y la reducción de carga antes de aprobar la adaptación (KAN-465)', async () => {
    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();

    // Abrir edición manual
    const editBtn = screen.getByRole('button', { name: /editar adaptación/i });
    fireEvent.click(editBtn);

    expect(screen.getByTestId('adaptation-edit-panel')).toBeDefined();

    // Cambiar sustituto autorizado a Puente de glúteos con barra
    const select = screen.getByLabelText(/ajustar sustituto autorizado/i);
    fireEvent.change(select, { target: { value: gluteBridgeId } });

    // Editar nota e ingresar reducción de carga
    const noteInput = screen.getByLabelText(/nota e indicación técnica para el atleta/i);
    fireEvent.change(noteInput, {
      target: { value: 'Priorizar puente de glúteos controlado sin dolor rotuliano.' },
    });

    const reductionInput = screen.getByLabelText(/reducción de carga/i);
    fireEvent.change(reductionInput, { target: { value: '15' } });

    expect(screen.getByText('Editada por PF')).toBeDefined();

    // Aprobar con los cambios editados
    const approveBtn = screen.getByRole('button', { name: /aprobar adaptación/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(athleteAdaptationsService.applySessionAdjustment).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          athleteId: lucasId,
          trainingPlanId: planId,
          note: 'Priorizar puente de glúteos controlado sin dolor rotuliano.',
          loadReductionPercentage: 15,
          items: [
            {
              originalExerciseId: squatId,
              substituteExerciseId: gluteBridgeId,
            },
          ],
        }),
      );
    });
  });

  it('permite rechazar la adaptación con motivo opcional manteniendo intacta la rutina base (KAN-465)', async () => {
    const onRejected = vi.fn();

    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
        onAdaptationRejected={onRejected}
      />,
    );

    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();

    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    try {
      const rejectBtn = screen.getByRole('button', { name: /rechazar adaptación/i });
      fireEvent.click(rejectBtn);

      expect(screen.getByTestId('adaptation-reject-form')).toBeDefined();
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }

    const reasonInput = screen.getByLabelText(/motivo de rechazo/i);
    fireEvent.change(reasonInput, {
      target: { value: 'Molestia leve superada, entrena con el grupo.' },
    });

    const confirmRejectBtn = screen.getByRole('button', { name: /confirmar rechazo/i });
    fireEvent.click(confirmRejectBtn);

    expect(await screen.findByText('Propuesta rechazada')).toBeDefined();
    expect(
      screen.getByText(/Propuesta de adaptación rechazada\. Se mantiene la rutina base/i),
    ).toBeDefined();
    expect(screen.getByText(/Molestia leve superada, entrena con el grupo\./i)).toBeDefined();
    expect(athleteAdaptationsService.applySessionAdjustment).not.toHaveBeenCalled();
    expect(athleteAdaptationsService.rejectSessionAdjustment).toHaveBeenCalledWith(
      sessionId,
      expect.objectContaining({
        athleteId: lucasId,
        trainingPlanId: planId,
        note: 'Molestia leve superada, entrena con el grupo.',
      }),
    );
    expect(onRejected).toHaveBeenCalledWith('Molestia leve superada, entrena con el grupo.');
  });

  it('permite cambiar cualquier ejercicio de la variante propuesta desde el catálogo al editar adaptación (KAN-465)', async () => {
    const inclinePressId = 'ex-press-inclinado-9';

    vi.spyOn(exercisesService, 'search').mockResolvedValue({
      items: [
        {
          id: inclinePressId,
          name: 'Press inclinado con mancuernas',
          muscleGroup: 'Pecho',
          equipment: 'Mancuernas',
          images: [],
          primaryMuscles: ['Pectorales'],
          secondaryMuscles: ['Tríceps'],
          exerciseType: 'Weight',
        },
      ],
      page: 1,
      totalPages: 1,
      totalCount: 1,
    });

    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();

    // Activar modo edición
    fireEvent.click(screen.getByRole('button', { name: /editar adaptación/i }));

    // Cambiar ejercicio que venía "Sin cambios" (Press de banca)
    fireEvent.click(screen.getByRole('button', { name: /cambiar ejercicio/i }));

    const pickedBtn = await screen.findByRole('button', {
      name: /press inclinado con mancuernas/i,
    });
    fireEvent.click(pickedBtn);

    expect(await screen.findByText('Press inclinado con mancuernas')).toBeDefined();
    expect(screen.getByText('Reemplazado por PF')).toBeDefined();

    // Aprobar enviando ambos reemplazos
    fireEvent.click(screen.getByRole('button', { name: /aprobar adaptación/i }));

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
            {
              originalExerciseId: benchId,
              substituteExerciseId: inclinePressId,
            },
          ],
        }),
      );
    });
  });

  it('muestra el porcentaje conservador provisto por el backend en lugar de 90 % fijo (KAN-465)', async () => {
    vi.spyOn(athleteAdaptationsService, 'getAdaptationContext').mockResolvedValue({
      athleteId: lucasId,
      activeInjuries: [],
      currentRecords: [
        {
          id: 'rec-est-85',
          athleteId: lucasId,
          exerciseId: squatId,
          exerciseName: 'Sentadilla con barra',
          weightOneRepMaxKg: 100,
          origin: 'Estimated',
          achievedAt: '2026-11-10T10:00:00Z',
          isCurrent: true,
        },
      ],
      restrictions: [],
      conservativeEstimatedRecordPercent: 85,
    });

    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
      />,
    );

    const alert = await screen.findByTestId('adaptation-estimated-data-alert');
    expect(alert.textContent).toContain('escalón conservador del 85 %');
    expect(alert.textContent).not.toContain('90 %');
  });

  it('DADO el modal de adaptación CUANDO el PF lo abre ENTONCES ve solo los bloques de cambio sin la justificación desplegada, y al tocar el bloque se despliega la justificación médica (KAN-637)', async () => {
    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();
    expect(screen.getByText('Prensa de piernas')).toBeDefined();

    // El botón del acordeón está presente y colapsado inicialmente
    const toggleBtn = screen.getByTestId(`toggle-reason-${squatId}`);
    expect(toggleBtn.textContent).toContain('Ver justificación médica y deportiva');

    const reasonBox = screen.getByTestId(`reason-box-${squatId}`);
    expect(reasonBox.className).toContain('is-collapsed');

    // Al tocar el botón del bloque se despliega la justificación
    fireEvent.click(toggleBtn);

    expect(toggleBtn.textContent).toContain('Ocultar justificación médica');
    expect(reasonBox.className).toContain('is-expanded');
  });

  it('DADO la lista de asignaciones CUANDO se ven atletas ENTONCES el símbolo de lesión está al lado del nombre y los dos botones están alineados uno arriba del otro (KAN-637)', async () => {
    vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockResolvedValue([
      { athleteId: lucasId, activeCount: 1 },
    ]);

    render(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={[
          {
            assignmentId: 'assign-lucas',
            type: 'athlete',
            targetId: lucasId,
            name: 'Lucas Gómez',
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

    // Indicador de lesión al lado del nombre
    expect(await screen.findByTestId(`injury-indicator-${lucasId}`)).toBeDefined();

    // Botones revisar adaptación y quitar asignación
    const reviewBtn = screen.getByRole('button', { name: /revisar adaptación de lucas gómez/i });
    const removeBtn = screen.getByRole('button', { name: /quitar a lucas gómez/i });

    expect(reviewBtn.className).toContain('manage-assignments-action-btn');
    expect(removeBtn.className).toContain('manage-assignments-action-btn');
    expect(removeBtn.textContent).toContain('Quitar asignación');
  });

  it('mantiene la propuesta de IA y muestra un aviso no bloqueante si getSessionAdjustment devuelve 500 (KAN-464)', async () => {
    vi.spyOn(athleteAdaptationsService, 'getSessionAdjustment').mockRejectedValue(
      new Error('Error interno del servidor (500)'),
    );

    render(
      <AthleteAdaptationDiffModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        athleteId={lucasId}
        athleteName="Lucas Gómez"
        onClose={vi.fn()}
      />,
    );

    // La propuesta de IA sigue visible y usable pese al 500 en getSessionAdjustment
    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();
    expect(screen.getByText('Prensa de piernas')).toBeDefined();
    expect(screen.getByRole('button', { name: /aprobar adaptación/i })).toBeDefined();

    // Se muestra el aviso no bloqueante y no el error fatal del 500
    const warning = await screen.findByTestId('adaptation-adjustment-warning');
    expect(warning.textContent).toContain('No se pudo consultar si ya había un ajuste guardado');
    expect(screen.queryByText(/Error interno del servidor \(500\)/i)).toBeNull();
  });

  it('DADO atletas sin lesión, lesionados sin ajuste y lesionados con ajuste aprobado CUANDO se abre Gestionar asignaciones ENTONCES muestra los tres estados del control y consulta ajustes solo de lesionados (KAN-636)', async () => {
    const camilaId = 'ath-camila-2';
    const martinId = 'ath-martin-3';

    vi.spyOn(structureService, 'getCategoryAthletes').mockResolvedValue([
      {
        id: martinId,
        firstName: 'Martín',
        lastName: 'Pérez',
        fullName: 'Martín Pérez',
        email: 'martin@protraining.com',
        phone: '1150000002',
        activeInjuriesCount: 0,
      },
      {
        id: camilaId,
        firstName: 'Camila',
        lastName: 'Ruiz',
        fullName: 'Camila Ruiz',
        email: 'camila@protraining.com',
        phone: '1150000003',
        activeInjuriesCount: 1,
      },
      {
        id: lucasId,
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'atleta@protraining.com',
        phone: '1150000001',
        activeInjuriesCount: 1,
      },
    ]);

    vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockResolvedValue([
      { athleteId: martinId, activeCount: 0 },
      { athleteId: camilaId, activeCount: 1 },
      { athleteId: lucasId, activeCount: 1 },
    ]);

    const getAdjustmentSpy = vi
      .spyOn(athleteAdaptationsService, 'getSessionAdjustment')
      .mockImplementation(async (_sessionId, athleteId) => {
        if (athleteId === camilaId) {
          return {
            id: 'adj-camila-1',
            sessionId,
            athleteId: camilaId,
            trainingPlanId: planId,
            date: '2026-11-22',
            note: 'Reemplazo aprobado previamente.',
            adjustedByCoach: true,
            items: [
              {
                originalExerciseId: squatId,
                substituteExerciseId: legPressId,
              },
            ],
          };
        }
        return null;
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
      name: /revisar adaptación de lucas gómez/i,
    });
    const editApprovedBtn = await screen.findByRole('button', {
      name: /revisar nuevamente la adaptación de camila ruiz/i,
    });
    const approvedStatus = screen.getByText('Adaptación aprobada').closest('span');

    expect(reviewBtn.textContent).toContain('Revisar adaptación');
    expect(approvedStatus?.parentElement?.className).toContain(
      'manage-assignments-approved-status',
    );
    expect(editApprovedBtn.className).toContain('manage-assignments-edit-adaptation-btn');
    expect(screen.getByText('En condiciones normales')).toBeDefined();

    // Consulta el plan una sola vez y el ajuste únicamente para los atletas lesionados
    expect(trainingPlansService.get).toHaveBeenCalledTimes(1);
    expect(trainingPlansService.get).toHaveBeenCalledWith(planId);
    expect(getAdjustmentSpy).toHaveBeenCalledTimes(2);
    expect(getAdjustmentSpy).toHaveBeenCalledWith(sessionId, camilaId);
    expect(getAdjustmentSpy).toHaveBeenCalledWith(sessionId, lucasId);
    expect(getAdjustmentSpy).not.toHaveBeenCalledWith(sessionId, martinId);
  });

  it('DADO un atleta lesionado sin ajuste CUANDO el PF aprueba la adaptación ENTONCES se cierra el modal, aparece el mensaje de éxito y el botón pasa a Adaptación aprobada sin recargar toda la lista (KAN-636)', async () => {
    const summarySpy = vi
      .spyOn(seguimientoService, 'getActiveInjuriesSummary')
      .mockResolvedValue([{ athleteId: lucasId, activeCount: 1 }]);

    render(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={[
          {
            assignmentId: 'assign-lucas',
            type: 'athlete',
            targetId: lucasId,
            name: 'Lucas Gómez',
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
      name: /revisar adaptación de lucas gómez/i,
    });
    fireEvent.click(reviewBtn);

    expect(
      await screen.findByRole('heading', { name: /comparativa base vs\. adaptada/i }),
    ).toBeDefined();
    expect(await screen.findByText('Prensa de piernas')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /aprobar adaptación/i }));

    await waitFor(() => {
      expect(athleteAdaptationsService.applySessionAdjustment).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('heading', { name: /comparativa base vs\. adaptada/i })).toBeNull();
    });

    expect(
      await screen.findByText(/Variante adaptada aprobada con éxito para Lucas Gómez\./i),
    ).toBeDefined();

    expect(screen.getByText('Adaptación aprobada')).toBeDefined();
    expect(
      screen.getByRole('button', {
        name: /revisar nuevamente la adaptación de lucas gómez/i,
      }),
    ).toBeDefined();
    expect(screen.queryByRole('button', { name: /revisar adaptación de lucas gómez/i })).toBeNull();
    expect(summarySpy).toHaveBeenCalledTimes(1);
  });

  it('DADO un atleta con ajuste aprobado CUANDO el PF reabre la lista, abre el modal y cambia un ejercicio ENTONCES Actualizar adaptación guarda, cierra el modal y mantiene Adaptación aprobada (KAN-636)', async () => {
    vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockResolvedValue([
      { athleteId: lucasId, activeCount: 1 },
    ]);
    vi.spyOn(athleteAdaptationsService, 'getSessionAdjustment').mockResolvedValue({
      id: 'adj-lucas-1',
      sessionId,
      athleteId: lucasId,
      trainingPlanId: planId,
      date: '2026-11-22',
      note: 'Ajuste inicial aprobado.',
      adjustedByCoach: true,
      items: [
        {
          originalExerciseId: squatId,
          substituteExerciseId: legPressId,
        },
      ],
    });

    const assignees = [
      {
        assignmentId: 'assign-lucas',
        type: 'athlete' as const,
        targetId: lucasId,
        name: 'Lucas Gómez',
        startDate: '2026-11-16',
        endDate: '2026-12-13',
        status: 'Active' as const,
      },
    ];

    const { rerender } = render(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={assignees}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adaptación aprobada')).toBeDefined();

    // Cerrar y volver a abrir Gestionar asignaciones
    rerender(
      <ManagePlanAssignmentsModal
        isOpen={false}
        planId={planId}
        planName="Fuerza base"
        assignees={assignees}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );
    rerender(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={assignees}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adaptación aprobada')).toBeDefined();
    const editBtn = screen.getByRole('button', {
      name: /revisar nuevamente la adaptación de lucas gómez/i,
    });

    // Abrir la adaptación aprobada desde el botón lápiz y cambiar el ejercicio sustituto
    fireEvent.click(editBtn);
    expect(await screen.findByText('Sentadilla con barra')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /editar adaptación/i }));
    const select = screen.getByLabelText(/ajustar sustituto autorizado/i);
    fireEvent.change(select, { target: { value: gluteBridgeId } });

    const updateBtn = screen.getByRole('button', { name: /actualizar adaptación/i });
    expect(updateBtn.textContent).toContain('Actualizar adaptación');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(athleteAdaptationsService.applySessionAdjustment).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          athleteId: lucasId,
          trainingPlanId: planId,
          items: [
            {
              originalExerciseId: squatId,
              substituteExerciseId: gluteBridgeId,
            },
          ],
        }),
      );
      expect(screen.queryByRole('heading', { name: /comparativa base vs\. adaptada/i })).toBeNull();
    });

    expect(
      await screen.findByText(/Variante adaptada actualizada con éxito para Lucas Gómez\./i),
    ).toBeDefined();
    expect(screen.getByText('Adaptación aprobada')).toBeDefined();
    expect(
      screen.getByRole('button', { name: /revisar nuevamente la adaptación de lucas gómez/i }),
    ).toBeDefined();
  });

  it('muestra aviso no bloqueante y conserva el botón Revisar adaptación usable si falla getSessionAdjustment para un atleta lesionado (KAN-636)', async () => {
    const camilaId = 'ath-camila-err';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(structureService, 'getCategoryAthletes').mockResolvedValue([
      {
        id: lucasId,
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'atleta@protraining.com',
        phone: '1150000001',
        activeInjuriesCount: 1,
      },
      {
        id: camilaId,
        firstName: 'Camila',
        lastName: 'Ruiz',
        fullName: 'Camila Ruiz',
        email: 'camila@protraining.com',
        phone: '1150000003',
        activeInjuriesCount: 1,
      },
    ]);

    vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockResolvedValue([
      { athleteId: lucasId, activeCount: 1 },
      { athleteId: camilaId, activeCount: 1 },
    ]);

    vi.spyOn(athleteAdaptationsService, 'getSessionAdjustment').mockImplementation(
      async (_sessionId, athleteId) => {
        if (athleteId === lucasId) {
          throw new Error('Error interno del servidor (500)');
        }
        return {
          id: 'adj-camila-ok',
          sessionId,
          athleteId: camilaId,
          trainingPlanId: planId,
          date: '2026-11-22',
          note: 'Reducción de carga aprobada.',
          adjustedByCoach: true,
          loadReductionPercentage: 20,
          items: [],
        };
      },
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

    // Camila (solo reducción de carga) aparece como Adaptación aprobada + botón lápiz
    expect(await screen.findByText('Adaptación aprobada')).toBeDefined();
    expect(
      screen.getByRole('button', {
        name: /revisar nuevamente la adaptación de camila ruiz/i,
      }),
    ).toBeDefined();

    // Lucas (falló getSessionAdjustment) queda con Revisar adaptación usable y se muestra el aviso
    const reviewBtn = screen.getByRole('button', {
      name: /revisar adaptación de lucas gómez/i,
    });
    expect(reviewBtn.textContent).toContain('Revisar adaptación');
    expect(
      screen.getByText(
        /No se pudo verificar el estado de adaptación aprobada de algunos atletas\./i,
      ),
    ).toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();

    // El PF igual puede abrir el modal para Lucas
    fireEvent.click(reviewBtn);
    expect(
      await screen.findByRole('heading', { name: /comparativa base vs\. adaptada/i }),
    ).toBeDefined();
  });

  it('DADO un atleta lesionado con adaptación aprobada CUANDO el PF confirma rechazarla ENTONCES cierra el modal, muestra el banner rojo con auto-cierre de 3500ms, pasa a Adaptación rechazada en rojo y el lápiz reabre el modal (KAN-636)', async () => {
    vi.spyOn(seguimientoService, 'getActiveInjuriesSummary').mockResolvedValue([
      { athleteId: lucasId, activeCount: 1 },
    ]);
    let persistedAdjustment: {
      id: string;
      sessionId: string;
      athleteId: string;
      trainingPlanId: string;
      date: string;
      note: string | null;
      adjustedByCoach: boolean;
      status: 'Approved' | 'Rejected';
      items: Array<{ originalExerciseId: string; substituteExerciseId: string }>;
    } = {
      id: 'adj-lucas-prev',
      sessionId,
      athleteId: lucasId,
      trainingPlanId: planId,
      date: '2026-11-22',
      note: 'Ajuste previo.',
      adjustedByCoach: true,
      status: 'Approved',
      items: [
        {
          originalExerciseId: squatId,
          substituteExerciseId: legPressId,
        },
      ],
    };

    vi.spyOn(athleteAdaptationsService, 'getSessionAdjustment').mockImplementation(
      async () => persistedAdjustment,
    );
    vi.spyOn(athleteAdaptationsService, 'rejectSessionAdjustment').mockImplementation(async () => {
      persistedAdjustment = {
        ...persistedAdjustment,
        note: 'Rechazada por el PF.',
        adjustedByCoach: false,
        status: 'Rejected',
        items: [],
      };
      return persistedAdjustment;
    });

    const assignees = [
      {
        assignmentId: 'assign-lucas',
        type: 'athlete' as const,
        targetId: lucasId,
        name: 'Lucas Gómez',
        startDate: '2026-11-16',
        endDate: '2026-12-13',
        status: 'Active' as const,
      },
    ];

    const { rerender } = render(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={assignees}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );

    expect(await screen.findByText('Adaptación aprobada')).toBeDefined();
    fireEvent.click(
      screen.getByRole('button', {
        name: /revisar nuevamente la adaptación de lucas gómez/i,
      }),
    );

    expect(
      await screen.findByRole('heading', { name: /comparativa base vs\. adaptada/i }),
    ).toBeDefined();
    expect(await screen.findByText('Prensa de piernas')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /rechazar adaptación/i }));

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    fireEvent.click(screen.getByRole('button', { name: /confirmar rechazo/i }));

    await waitFor(() => {
      expect(athleteAdaptationsService.rejectSessionAdjustment).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('heading', { name: /comparativa base vs\. adaptada/i })).toBeNull();
    });

    const rejectionBanner = screen.getByRole('status');
    expect(rejectionBanner.className).toContain('danger');
    expect(rejectionBanner.textContent).toContain(
      'Propuesta de adaptación rechazada. Se mantiene la rutina base de la categoría para Lucas Gómez.',
    );

    const rejectedLabel = screen.getByText('Adaptación rechazada');
    expect(rejectedLabel.parentElement?.className).toContain('manage-assignments-rejected-status');
    expect(screen.queryByText('Adaptación aprobada')).toBeNull();
    expect(athleteAdaptationsService.applySessionAdjustment).not.toHaveBeenCalled();
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3500);

    // Simular cierre y reapertura (recarga): el back devuelve status: 'Rejected' y sigue en rojo
    rerender(
      <ManagePlanAssignmentsModal
        isOpen={false}
        planId={planId}
        planName="Fuerza base"
        assignees={assignees}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );
    rerender(
      <ManagePlanAssignmentsModal
        isOpen={true}
        planId={planId}
        planName="Fuerza base"
        assignees={assignees}
        onClose={vi.fn()}
        onUnassign={vi.fn()}
        onOpenAddAssignment={vi.fn()}
      />,
    );

    const persistedRejectedLabel = await screen.findByText('Adaptación rechazada');
    expect(persistedRejectedLabel.parentElement?.className).toContain(
      'manage-assignments-rejected-status',
    );
    expect(screen.queryByText('Adaptación aprobada')).toBeNull();

    // El botón lápiz permite volver a abrir el modal de adaptación
    const reopenBtn = screen.getByRole('button', {
      name: /revisar nuevamente la adaptación de lucas gómez/i,
    });
    fireEvent.click(reopenBtn);
    expect(
      await screen.findByRole('heading', { name: /comparativa base vs\. adaptada/i }),
    ).toBeDefined();
  });
});

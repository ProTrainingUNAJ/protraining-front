import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DayAdjustmentModal } from '../DayAdjustmentModal';
import { dayAdjustmentsService, type DayAdjustmentResponse } from '../../../api/dayAdjustments';

vi.mock('../../../api/dayAdjustments', () => ({
  dayAdjustmentsService: {
    createOrGetDayAdjustment: vi.fn(),
    approveDayAdjustment: vi.fn(),
    rejectDayAdjustment: vi.fn(),
    getAthleteDayConflicts: vi.fn(),
  },
}));

describe('DayAdjustmentModal (#157 · KAN-452)', () => {
  const athleteId = 'ath-123';
  const athleteName = 'Lucas Gómez';

  const mockPendingProposal: DayAdjustmentResponse = {
    id: 'adj-001',
    athleteId,
    date: '2026-11-10',
    sessionId: 'sess-001',
    status: 'Pending',
    provider: 'Reglas',
    justification:
      'Se cambia Salto al cajón por Prensa de piernas por molestia en el cuádriceps (nivel 2) reportada hoy.',
    items: [
      {
        originalExerciseId: 'ex-jump',
        originalExerciseName: 'Salto al cajón',
        suggestedSubstituteExerciseId: 'ex-press',
        suggestedSubstituteExerciseName: 'Prensa de piernas',
        substituteExerciseId: 'ex-press',
        substituteExerciseName: 'Prensa de piernas',
        zone: 'cuadriceps',
        painLevel: 2,
        reason: 'Impacto reactivo y desaceleración brusca sobre el cuádriceps.',
        availableSubstitutes: [
          { exerciseId: 'ex-press', name: 'Prensa de piernas' },
          { exerciseId: 'ex-bands', name: 'Sentadilla con bandas elásticas' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('DADO un atleta con propuesta CUANDO se abre el modal ENTONCES muestra la justificación, original, sustituto sugerido, zona y motivo', async () => {
    vi.mocked(dayAdjustmentsService.createOrGetDayAdjustment).mockResolvedValue(
      mockPendingProposal,
    );

    render(
      <DayAdjustmentModal
        athleteId={athleteId}
        athleteName={athleteName}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aprobar Ajuste/i })).toBeTruthy();
    });

    expect(screen.getByText('Ajuste Sugerido del Día')).toBeTruthy();
    expect(screen.getByText(athleteName)).toBeTruthy();
    expect(
      screen.getByText(
        '"Se cambia Salto al cajón por Prensa de piernas por molestia en el cuádriceps (nivel 2) reportada hoy."',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Salto al cajón')).toBeTruthy();
    expect(screen.getByText('Prensa de piernas')).toBeTruthy();
    expect(screen.getByText(/Dolor cuadriceps \(2\/5\)/i)).toBeTruthy();
    expect(
      screen.getByText(/Impacto reactivo y desaceleración brusca sobre el cuádriceps\./i),
    ).toBeTruthy();
  });

  it('DADO el selector de sustituto CUANDO el PF elige otra alternativa y aprueba ENTONCES llama a approveDayAdjustment con el sustituto elegido', async () => {
    vi.mocked(dayAdjustmentsService.createOrGetDayAdjustment).mockResolvedValue(
      mockPendingProposal,
    );

    const approvedResponse: DayAdjustmentResponse = {
      ...mockPendingProposal,
      status: 'Approved',
      justification: 'Se cambia Salto al cajón por Sentadilla con bandas elásticas.',
      items: [
        {
          ...mockPendingProposal.items[0],
          substituteExerciseId: 'ex-bands',
          substituteExerciseName: 'Sentadilla con bandas elásticas',
        },
      ],
    };
    vi.mocked(dayAdjustmentsService.approveDayAdjustment).mockResolvedValue(approvedResponse);

    const onApplied = vi.fn();
    render(
      <DayAdjustmentModal
        athleteId={athleteId}
        athleteName={athleteName}
        isOpen={true}
        onClose={vi.fn()}
        onAdjustmentApplied={onApplied}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Cambiar sustituto:/i)).toBeTruthy();
    });

    // Cambiar por Sentadilla con bandas elásticas
    fireEvent.change(screen.getByLabelText(/Cambiar sustituto:/i), {
      target: { value: 'ex-bands' },
    });

    // Clic en Aprobar Ajuste
    fireEvent.click(screen.getByRole('button', { name: /Aprobar Ajuste/i }));

    await waitFor(() => {
      expect(dayAdjustmentsService.approveDayAdjustment).toHaveBeenCalledWith('adj-001', {
        items: [{ originalExerciseId: 'ex-jump', substituteExerciseId: 'ex-bands' }],
      });
    });

    expect(onApplied).toHaveBeenCalledWith(approvedResponse);
    expect(
      screen.getByText(/¡Ajuste del día aprobado y aplicado en la rutina del atleta con éxito!/i),
    ).toBeTruthy();
  });

  it('DADO una propuesta pendiente CUANDO el PF la rechaza con motivo ENTONCES llama a rejectDayAdjustment y mantiene intacta la rutina', async () => {
    vi.mocked(dayAdjustmentsService.createOrGetDayAdjustment).mockResolvedValue(
      mockPendingProposal,
    );

    const rejectedResponse: DayAdjustmentResponse = {
      ...mockPendingProposal,
      status: 'Rejected',
      rejectionReason: 'Molestia muy leve, mantener rutina original',
    };
    vi.mocked(dayAdjustmentsService.rejectDayAdjustment).mockResolvedValue(rejectedResponse);

    render(
      <DayAdjustmentModal
        athleteId={athleteId}
        athleteName={athleteName}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Rechazar\.\.\./i })).toBeTruthy();
    });

    // Clic en Rechazar... para abrir el input de motivo
    fireEvent.click(screen.getByRole('button', { name: /Rechazar\.\.\./i }));

    const input = screen.getByLabelText(/Motivo de rechazo/i);
    fireEvent.change(input, {
      target: { value: 'Molestia muy leve, mantener rutina original' },
    });

    // Clic en Confirmar Rechazo
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Rechazo/i }));

    await waitFor(() => {
      expect(dayAdjustmentsService.rejectDayAdjustment).toHaveBeenCalledWith('adj-001', {
        reason: 'Molestia muy leve, mantener rutina original',
      });
    });

    expect(
      screen.getByText(
        /La propuesta de ajuste fue rechazada\. La rutina del atleta se mantiene intacta\./i,
      ),
    ).toBeTruthy();
  });

  it('DADO un error 409 o 404 del backend CUANDO falla la aprobación ENTONCES muestra el mensaje de error en la UI', async () => {
    vi.mocked(dayAdjustmentsService.createOrGetDayAdjustment).mockResolvedValue(
      mockPendingProposal,
    );
    vi.mocked(dayAdjustmentsService.approveDayAdjustment).mockRejectedValue(
      new Error('La propuesta de ajuste del día ya fue aprobada previamente.'),
    );

    render(
      <DayAdjustmentModal
        athleteId={athleteId}
        athleteName={athleteName}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aprobar Ajuste/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Aprobar Ajuste/i }));

    await waitFor(() => {
      expect(
        screen.getByText('La propuesta de ajuste del día ya fue aprobada previamente.'),
      ).toBeTruthy();
    });
  });
});

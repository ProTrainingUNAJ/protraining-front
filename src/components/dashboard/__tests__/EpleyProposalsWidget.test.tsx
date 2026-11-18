import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EpleyProposalsWidget } from '../EpleyProposalsWidget';
import { recordProposalsService } from '../../../api/recordProposals';
import type { RecordProposalItem } from '../../../types/recordProposals';

vi.mock('../../../api/recordProposals', () => ({
  recordProposalsService: {
    listPending: vi.fn(),
    approve: vi.fn(),
    discard: vi.fn(),
  },
}));

const mockProposal1: RecordProposalItem = {
  id: 'prop-1',
  athleteId: 'ath-1',
  athleteName: 'Lucas Giménez',
  exerciseId: 'ex-1',
  exerciseName: 'Sentadilla Trasera',
  currentWeight: 100,
  proposedWeight: 107.5,
  performedWeight: 90,
  performedReps: 5,
  status: 'Pending',
  createdAt: '2026-10-30T10:00:00Z',
};

const mockProposal2: RecordProposalItem = {
  id: 'prop-2',
  athleteId: 'ath-2',
  athleteName: 'Martina Benítez',
  exerciseId: 'ex-2',
  exerciseName: 'Press de Banca',
  currentWeight: 60,
  proposedWeight: 65,
  performedWeight: 55,
  performedReps: 6,
  status: 'Pending',
  createdAt: '2026-10-30T11:00:00Z',
};

describe('EpleyProposalsWidget (KAN-566)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('al hacer click en Aprobar exitosamente, la tarjeta desaparece del DOM', async () => {
    vi.mocked(recordProposalsService.listPending).mockResolvedValueOnce([mockProposal1]);
    vi.mocked(recordProposalsService.approve).mockResolvedValueOnce({
      id: 'rec-1',
      exerciseId: 'ex-1',
      exerciseName: 'Sentadilla Trasera',
      weightKg: 107.5,
      origin: 'Epley',
      achievedAt: '2026-10-30T10:05:00Z',
    });

    const onCountChange = vi.fn();
    render(<EpleyProposalsWidget onCountChange={onCountChange} />);

    // Esperar a que se renderice la propuesta
    await waitFor(() => {
      expect(screen.getByText('Lucas Giménez')).toBeDefined();
    });
    expect(screen.getByText('Sentadilla Trasera')).toBeDefined();
    expect(onCountChange).toHaveBeenCalledWith(1);

    const approveBtn = screen.getByRole('button', {
      name: /Aprobar nuevo récord de Lucas Giménez en 1 clic/i,
    });
    fireEvent.click(approveBtn);

    // La API fue invocada con el ID de la propuesta
    await waitFor(() => {
      expect(recordProposalsService.approve).toHaveBeenCalledWith('prop-1');
    });

    // La tarjeta desaparece del DOM
    await waitFor(() => {
      expect(screen.queryByText('Lucas Giménez')).toBeNull();
    });

    // Se muestra el feedback de éxito y el estado vacío al no haber más propuestas
    expect(
      screen.getByText(/Se aprobó el récord de Lucas Giménez: 107.5 kg en Sentadilla Trasera/i),
    ).toBeDefined();
    expect(screen.getByText('Al día con las propuestas')).toBeDefined();
    expect(onCountChange).toHaveBeenCalledWith(0);
  });

  it('al hacer click en Descartar exitosamente, la tarjeta desaparece del DOM', async () => {
    vi.mocked(recordProposalsService.listPending).mockResolvedValueOnce([mockProposal1]);
    vi.mocked(recordProposalsService.discard).mockResolvedValueOnce();

    const onCountChange = vi.fn();
    render(<EpleyProposalsWidget onCountChange={onCountChange} />);

    await waitFor(() => {
      expect(screen.getByText('Lucas Giménez')).toBeDefined();
    });

    const discardBtn = screen.getByRole('button', {
      name: /Descartar propuesta de Lucas Giménez/i,
    });
    fireEvent.click(discardBtn);

    // Se invoca discard con el ID
    await waitFor(() => {
      expect(recordProposalsService.discard).toHaveBeenCalledWith('prop-1');
    });

    // La tarjeta desaparece del DOM
    await waitFor(() => {
      expect(screen.queryByText('Lucas Giménez')).toBeNull();
    });

    expect(screen.getByText(/Se descartó la propuesta de Lucas Giménez/i)).toBeDefined();
    expect(screen.getByText('Al día con las propuestas')).toBeDefined();
    expect(onCountChange).toHaveBeenCalledWith(0);
  });

  it('si la API responde con error 409 Conflict al aprobar, la tarjeta permanece en pantalla y muestra el mensaje de error', async () => {
    vi.mocked(recordProposalsService.listPending).mockResolvedValueOnce([mockProposal1]);
    const conflictError = new Error('El récord cambió; revisá la propuesta');
    vi.mocked(recordProposalsService.approve).mockRejectedValueOnce(conflictError);

    render(<EpleyProposalsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Lucas Giménez')).toBeDefined();
    });

    const approveBtn = screen.getByRole('button', {
      name: /Aprobar nuevo récord de Lucas Giménez en 1 clic/i,
    });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(recordProposalsService.approve).toHaveBeenCalledWith('prop-1');
    });

    // La tarjeta permanece en el DOM
    expect(screen.getByText('Lucas Giménez')).toBeDefined();
    expect(screen.getByText('Sentadilla Trasera')).toBeDefined();

    // Muestra el mensaje de error exacto 409 en la alerta de la tarjeta
    const alertBox = await screen.findByRole('alert');
    expect(alertBox.textContent).toContain('El récord cambió; revisá la propuesta');
  });

  it('si la API responde con error 409 Conflict al descartar, la tarjeta permanece en pantalla y muestra el mensaje de error', async () => {
    vi.mocked(recordProposalsService.listPending).mockResolvedValueOnce([mockProposal1]);
    const conflictError = new Error('El récord cambió; revisá la propuesta');
    vi.mocked(recordProposalsService.discard).mockRejectedValueOnce(conflictError);

    render(<EpleyProposalsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Lucas Giménez')).toBeDefined();
    });

    const discardBtn = screen.getByRole('button', {
      name: /Descartar propuesta de Lucas Giménez/i,
    });
    fireEvent.click(discardBtn);

    await waitFor(() => {
      expect(recordProposalsService.discard).toHaveBeenCalledWith('prop-1');
    });

    // La tarjeta permanece en el DOM
    expect(screen.getByText('Lucas Giménez')).toBeDefined();

    // Muestra el mensaje de error 409
    const alertBox = await screen.findByRole('alert');
    expect(alertBox.textContent).toContain('El récord cambió; revisá la propuesta');
  });

  it('remueve únicamente la tarjeta procesada cuando hay múltiples propuestas pendientes', async () => {
    vi.mocked(recordProposalsService.listPending).mockResolvedValueOnce([
      mockProposal1,
      mockProposal2,
    ]);
    vi.mocked(recordProposalsService.approve).mockResolvedValueOnce({
      id: 'rec-1',
      exerciseId: 'ex-1',
      exerciseName: 'Sentadilla Trasera',
      weightKg: 107.5,
      origin: 'Epley',
      achievedAt: '2026-10-30T10:05:00Z',
    });

    render(<EpleyProposalsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Lucas Giménez')).toBeDefined();
      expect(screen.getByText('Martina Benítez')).toBeDefined();
    });

    const approveBtnLucas = screen.getByRole('button', {
      name: /Aprobar nuevo récord de Lucas Giménez en 1 clic/i,
    });
    fireEvent.click(approveBtnLucas);

    // Lucas desaparece pero Martina sigue en pantalla
    await waitFor(() => {
      expect(screen.queryByText('Lucas Giménez')).toBeNull();
    });
    expect(screen.getByText('Martina Benítez')).toBeDefined();
    expect(screen.getByText('Press de Banca')).toBeDefined();
  });

  it('invoca onOpenRecords al hacer click en Ver récords', async () => {
    vi.mocked(recordProposalsService.listPending).mockResolvedValueOnce([mockProposal1]);
    const onOpenRecords = vi.fn();

    render(<EpleyProposalsWidget onOpenRecords={onOpenRecords} />);

    await waitFor(() => {
      expect(screen.getByText('Lucas Giménez')).toBeDefined();
    });

    const viewRecordsBtn = screen.getByRole('button', {
      name: /Ver récords/i,
    });
    fireEvent.click(viewRecordsBtn);

    expect(onOpenRecords).toHaveBeenCalledWith('ath-1', 'Lucas Giménez');
  });
});

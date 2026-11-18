import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecordProposalCard } from '../RecordProposalCard';
import type { RecordProposalItem } from '../../../types/recordProposals';

const mockProposal: RecordProposalItem = {
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

describe('RecordProposalCard (KAN-566)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza correctamente los datos de la propuesta y el incremento estimado', () => {
    render(<RecordProposalCard proposal={mockProposal} onApprove={vi.fn()} onDiscard={vi.fn()} />);

    expect(screen.getByText('Lucas Giménez')).toBeDefined();
    expect(screen.getByText('Sentadilla Trasera')).toBeDefined();
    expect(screen.getByText('Propuesta Epley')).toBeDefined();
    expect(screen.getByText(/90 kg/i)).toBeDefined();
    expect(screen.getByText(/5 reps/i)).toBeDefined();
    expect(screen.getByText('100 kg')).toBeDefined();
    expect(screen.getByText('107,5 kg')).toBeDefined();
    expect(screen.getByText('+7,5 kg')).toBeDefined();
    expect(screen.getByText('(+7,5%)')).toBeDefined();
  });

  it('ejecuta onApprove al hacer click en Aprobar en 1 clic', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(
      <RecordProposalCard proposal={mockProposal} onApprove={onApprove} onDiscard={vi.fn()} />,
    );

    const approveBtn = screen.getByRole('button', {
      name: /Aprobar nuevo récord de Lucas Giménez en 1 clic/i,
    });
    fireEvent.click(approveBtn);

    expect(onApprove).toHaveBeenCalledWith('prop-1');
  });

  it('ejecuta onDiscard al hacer click en Descartar', async () => {
    const onDiscard = vi.fn().mockResolvedValue(undefined);
    render(
      <RecordProposalCard proposal={mockProposal} onApprove={vi.fn()} onDiscard={onDiscard} />,
    );

    const discardBtn = screen.getByRole('button', {
      name: /Descartar propuesta de Lucas Giménez/i,
    });
    fireEvent.click(discardBtn);

    expect(onDiscard).toHaveBeenCalledWith('prop-1');
  });

  it('muestra el mensaje de error si onApprove rechaza con 409 Conflict ("El récord cambió; revisá la propuesta")', async () => {
    const onApprove = vi.fn().mockRejectedValue(new Error('El récord cambió; revisá la propuesta'));

    render(
      <RecordProposalCard proposal={mockProposal} onApprove={onApprove} onDiscard={vi.fn()} />,
    );

    const approveBtn = screen.getByRole('button', {
      name: /Aprobar nuevo récord de Lucas Giménez en 1 clic/i,
    });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('El récord cambió; revisá la propuesta');
    // El botón vuelve a estar listo
    expect(screen.getByRole('button', { name: /Aprobar nuevo récord/i })).toBeDefined();
  });

  it('muestra el mensaje de error si onDiscard rechaza con 409 Conflict ("El récord cambió; revisá la propuesta")', async () => {
    const onDiscard = vi.fn().mockRejectedValue(new Error('El récord cambió; revisá la propuesta'));

    render(
      <RecordProposalCard proposal={mockProposal} onApprove={vi.fn()} onDiscard={onDiscard} />,
    );

    const discardBtn = screen.getByRole('button', {
      name: /Descartar propuesta de Lucas Giménez/i,
    });
    fireEvent.click(discardBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('El récord cambió; revisá la propuesta');
    expect(screen.getByRole('button', { name: /Descartar propuesta/i })).toBeDefined();
  });

  it('no ejecuta acciones cuando la tarjeta está deshabilitada (disabled=true)', () => {
    const onApprove = vi.fn();
    const onDiscard = vi.fn();

    render(
      <RecordProposalCard
        proposal={mockProposal}
        onApprove={onApprove}
        onDiscard={onDiscard}
        disabled={true}
      />,
    );

    const approveBtn = screen.getByRole('button', {
      name: /Aprobar nuevo récord de Lucas Giménez en 1 clic/i,
    });
    const discardBtn = screen.getByRole('button', {
      name: /Descartar propuesta de Lucas Giménez/i,
    });

    expect(approveBtn.hasAttribute('disabled')).toBe(true);
    expect(discardBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(approveBtn);
    fireEvent.click(discardBtn);

    expect(onApprove).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('invoca onViewRecords con athleteId y athleteName si se provee la prop', () => {
    const onViewRecords = vi.fn();

    render(
      <RecordProposalCard
        proposal={mockProposal}
        onApprove={vi.fn()}
        onDiscard={vi.fn()}
        onViewRecords={onViewRecords}
      />,
    );

    const viewRecordsBtn = screen.getByRole('button', {
      name: /Ver récords/i,
    });
    fireEvent.click(viewRecordsBtn);

    expect(onViewRecords).toHaveBeenCalledWith('ath-1', 'Lucas Giménez');
  });
});

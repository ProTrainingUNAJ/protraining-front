import { useState } from 'react';
import { ArrowRight, Check, Dumbbell, Flame, Loader2, X, AlertCircle } from 'lucide-react';
import { RecordProposalItem } from '../../types/recordProposals';

export interface RecordProposalCardProps {
  proposal: RecordProposalItem;
  onApprove: (id: string) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
  onViewRecords?: (athleteId: string, athleteName: string) => void;
  disabled?: boolean;
}

function formatDate(isoDateTime: string): string {
  try {
    return new Date(isoDateTime).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDateTime;
  }
}

function formatKg(weightKg: number): string {
  return `${weightKg.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
}

function calculateIncrement(currentKg: number, proposedKg: number) {
  const diff = Math.round((proposedKg - currentKg) * 100) / 100;
  const sign = diff >= 0 ? '+' : '';
  const percent = currentKg > 0 ? Math.round((diff / currentKg) * 1000) / 10 : 0;
  return {
    diffKg: `${sign}${diff.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`,
    diffPercent: `${sign}${percent.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`,
  };
}

export function RecordProposalCard({
  proposal,
  onApprove,
  onDiscard,
  onViewRecords,
  disabled = false,
}: RecordProposalCardProps) {
  const [approving, setApproving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const increment = calculateIncrement(proposal.currentWeight, proposal.proposedWeight);
  const isBusy = disabled || approving || discarding;

  const handleApprove = async () => {
    if (isBusy) return;
    setError(null);
    setApproving(true);
    try {
      await onApprove(proposal.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar la propuesta.');
      setApproving(false);
    }
  };

  const handleDiscard = async () => {
    if (isBusy) return;
    setError(null);
    setDiscarding(true);
    try {
      await onDiscard(proposal.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo descartar la propuesta.');
      setDiscarding(false);
    }
  };

  return (
    <article
      className="epley-proposal-card"
      aria-labelledby={`epley-proposal-title-${proposal.id}`}
    >
      <header className="epley-proposal-header">
        <div className="epley-proposal-athlete-info">
          <span className="epley-proposal-badge">
            <Flame size={13} aria-hidden="true" />
            <span>Propuesta Epley</span>
          </span>
          <h4 id={`epley-proposal-title-${proposal.id}`} className="epley-proposal-athlete-name">
            {proposal.athleteName || 'Atleta'}
          </h4>
        </div>
        <time className="epley-proposal-date" dateTime={proposal.createdAt}>
          {formatDate(proposal.createdAt)}
        </time>
      </header>

      <div className="epley-proposal-exercise">
        <span className="epley-proposal-exercise-name">{proposal.exerciseName}</span>
        <span className="epley-proposal-performed">
          Serie realizada: <strong>{formatKg(proposal.performedWeight)}</strong> ×{' '}
          <strong>{proposal.performedReps} reps</strong>
        </span>
      </div>

      {/* Comparativa de récord: vigente → propuesto con incremento destacado */}
      <div className="epley-proposal-weights-row">
        <div className="epley-weight-box current">
          <span className="epley-weight-label">Vigente</span>
          <span className="epley-weight-val">{formatKg(proposal.currentWeight)}</span>
        </div>

        <div className="epley-weights-arrow" aria-hidden="true">
          <ArrowRight size={18} />
        </div>

        <div className="epley-weight-box proposed">
          <span className="epley-weight-label">Propuesto</span>
          <span className="epley-weight-val highlight">{formatKg(proposal.proposedWeight)}</span>
        </div>

        <div className="epley-increment-badge" title="Incremento de carga sobre la marca vigente">
          <span className="epley-increment-kg">{increment.diffKg}</span>
          <span className="epley-increment-percent">({increment.diffPercent})</span>
        </div>
      </div>

      {error && (
        <div className="epley-proposal-error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <footer className="epley-proposal-actions">
        {onViewRecords && (
          <button
            type="button"
            className="btn btn-secondary epley-records-btn"
            onClick={() => onViewRecords(proposal.athleteId, proposal.athleteName)}
            disabled={isBusy}
            title={`Ver historial de récords de ${proposal.athleteName}`}
          >
            <Dumbbell size={14} aria-hidden="true" />
            <span>Ver récords</span>
          </button>
        )}

        <div className="epley-decision-buttons">
          <button
            type="button"
            className="btn btn-secondary epley-btn-discard"
            onClick={handleDiscard}
            disabled={isBusy}
            aria-label={`Descartar propuesta de ${proposal.athleteName}`}
          >
            {discarding ? (
              <Loader2 size={14} className="plan-spin" aria-hidden="true" />
            ) : (
              <X size={15} aria-hidden="true" />
            )}
            <span>{discarding ? 'Descartando…' : 'Descartar'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary epley-btn-approve"
            onClick={handleApprove}
            disabled={isBusy}
            aria-label={`Aprobar nuevo récord de ${proposal.athleteName} en 1 clic`}
          >
            {approving ? (
              <Loader2 size={14} className="plan-spin" aria-hidden="true" />
            ) : (
              <Check size={16} aria-hidden="true" />
            )}
            <span>{approving ? 'Aprobando…' : 'Aprobar en 1 clic'}</span>
          </button>
        </div>
      </footer>
    </article>
  );
}

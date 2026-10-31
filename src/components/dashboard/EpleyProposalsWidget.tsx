import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Flame, Loader2, RotateCcw } from 'lucide-react';
import { recordProposalsService } from '../../api/recordProposals';
import { RecordProposalItem } from '../../types/recordProposals';
import { RecordProposalCard } from './RecordProposalCard';

export interface EpleyProposalsWidgetProps {
  className?: string;
  onOpenRecords?: (athleteId: string, athleteName: string) => void;
  /** Callback para sincronizar conteo con el dashboard general si se requiere */
  onCountChange?: (count: number) => void;
}

export function EpleyProposalsWidget({
  className = '',
  onOpenRecords,
  onCountChange,
}: EpleyProposalsWidgetProps) {
  const [proposals, setProposals] = useState<RecordProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let active = true;

    recordProposalsService
      .listPending()
      .then((data) => {
        if (active) {
          setProposals(data);
          onCountChange?.(data.length);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las propuestas.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [onCountChange, reloadKey]);

  const handleApprove = async (id: string) => {
    const target = proposals.find((p) => p.id === id);
    await recordProposalsService.approve(id);
    setProposals((current) => {
      const updated = current.filter((p) => p.id !== id);
      onCountChange?.(updated.length);
      return updated;
    });
    if (target) {
      setFeedback(
        `Se aprobó el récord de ${target.athleteName}: ${target.proposedWeight} kg en ${target.exerciseName}.`,
      );
    }
  };

  const handleDiscard = async (id: string) => {
    const target = proposals.find((p) => p.id === id);
    await recordProposalsService.discard(id);
    setProposals((current) => {
      const updated = current.filter((p) => p.id !== id);
      onCountChange?.(updated.length);
      return updated;
    });
    if (target) {
      setFeedback(`Se descartó la propuesta de ${target.athleteName}.`);
    }
  };

  return (
    <div
      className={`epley-proposals-widget ${className}`}
      aria-label="Propuestas de nuevo récord Epley"
    >
      <div className="epley-widget-header">
        <div className="epley-widget-title-group">
          <span className="epley-widget-icon" aria-hidden="true">
            <Flame size={16} />
          </span>
          <span className="epley-widget-title">Propuestas de Récord Epley</span>
        </div>

        <div className="epley-widget-header-actions">
          {proposals.length > 0 && (
            <span
              className="badge epley-widget-badge"
              title={`${proposals.length} propuestas pendientes de revisión`}
            >
              {proposals.length} pendiente{proposals.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            className="wireframe-control-btn"
            onClick={reload}
            disabled={loading}
            title="Actualizar propuestas"
            aria-label="Actualizar propuestas"
          >
            <RotateCcw size={13} className={loading ? 'plan-spin' : ''} />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="alert-banner success epley-widget-alert" role="status">
          <span>{feedback}</span>
          <button
            type="button"
            className="epley-alert-close-btn"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar aviso"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert-banner danger epley-widget-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Reintentar
          </button>
        </div>
      )}

      <div className="epley-widget-body">
        {loading ? (
          <div className="epley-widget-loading">
            <Loader2 size={20} className="plan-spin" aria-hidden="true" />
            <span>Cargando propuestas de Epley…</span>
          </div>
        ) : proposals.length === 0 ? (
          <div className="epley-widget-empty">
            <div className="epley-empty-icon" aria-hidden="true">
              <CheckCircle2 size={24} />
            </div>
            <h4>Al día con las propuestas</h4>
            <p>
              Cuando un atleta registre una serie con 1RM estimado mayor al vigente, la verás acá
              para aprobarla en 1 clic o descartarla.
            </p>
          </div>
        ) : (
          <div className="epley-widget-cards-list">
            {proposals.map((proposal) => (
              <RecordProposalCard
                key={proposal.id}
                proposal={proposal}
                onApprove={handleApprove}
                onDiscard={handleDiscard}
                onViewRecords={onOpenRecords}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

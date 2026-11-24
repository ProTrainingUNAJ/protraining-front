import { useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { AthleteRecommendation } from '../../api/recommendations';
import { capitalizeFirst } from '../../utils/recommendationFormat';

const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 2000;

export interface RecommendationCardProps {
  recommendation: AthleteRecommendation;
  athleteName: string;
  hideAthleteName?: boolean;
  onUpdate: (id: string, title: string, recommendationText: string) => Promise<void>;
  onApprove: (id: string, edits?: { title: string; recommendationText: string }) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

function formatArgentinaDate(isoDateTime?: string | null): string {
  if (!isoDateTime) return '';
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

function getStatusLabel(status: AthleteRecommendation['status']): string {
  switch (status) {
    case 'Pending':
      return 'Pendiente';
    case 'Approved':
      return 'Aprobada';
    case 'Discarded':
      return 'Descartada';
  }
}

function getStatusClass(status: AthleteRecommendation['status']): string {
  switch (status) {
    case 'Pending':
      return 'status-pending';
    case 'Approved':
      return 'status-approved';
    case 'Discarded':
      return 'status-discarded';
  }
}

function getTypeLabel(type: AthleteRecommendation['type']): string {
  return type === 'Habits' ? 'Hábitos' : 'Entrenamiento';
}

function formatMetricNumber(value: number): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
}

export function RecommendationCard({
  recommendation,
  athleteName,
  hideAthleteName = false,
  onUpdate,
  onApprove,
  onDiscard,
}: RecommendationCardProps) {
  const isPending = recommendation.status === 'Pending';

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const [draftTitle, setDraftTitle] = useState(recommendation.title);
  const [draftText, setDraftText] = useState(recommendation.recommendationText);

  const [busyAction, setBusyAction] = useState<
    'save' | 'approve' | 'save-approve' | 'discard' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = busyAction !== null;
  const hasEvidence =
    (recommendation.metrics && recommendation.metrics.length > 0) || Boolean(recommendation.trends);

  const openEditMode = () => {
    setDraftTitle(recommendation.title);
    setDraftText(recommendation.recommendationText);
    setConfirmDiscard(false);
    setError(null);
    setIsEditing(true);
  };

  const cancelEditMode = () => {
    setIsEditing(false);
    setError(null);
  };

  const validateDraft = (): { title: string; text: string } | null => {
    const cleanTitle = draftTitle.trim();
    const cleanText = draftText.trim();
    if (!cleanTitle) {
      setError('El título de la recomendación es obligatorio.');
      return null;
    }
    if (!cleanText) {
      setError('El texto de la recomendación es obligatorio.');
      return null;
    }
    return { title: cleanTitle, text: cleanText };
  };

  const handleSave = async () => {
    if (isBusy) return;
    const valid = validateDraft();
    if (!valid) return;

    setError(null);
    setBusyAction('save');
    try {
      await onUpdate(recommendation.id, valid.title, valid.text);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleApproveDirect = async () => {
    if (isBusy) return;
    setError(null);
    setConfirmDiscard(false);
    setBusyAction('approve');
    try {
      await onApprove(recommendation.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar la recomendación.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveAndApprove = async () => {
    if (isBusy) return;
    const valid = validateDraft();
    if (!valid) return;

    setError(null);
    setBusyAction('save-approve');
    try {
      await onApprove(recommendation.id, {
        title: valid.title,
        recommendationText: valid.text,
      });
      setIsEditing(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar y aprobar la recomendación.',
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleConfirmDiscard = async () => {
    if (isBusy) return;
    setError(null);
    setBusyAction('discard');
    try {
      await onDiscard(recommendation.id);
      setConfirmDiscard(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo descartar la recomendación.');
    } finally {
      setBusyAction(null);
    }
  };

  const timestampIso =
    recommendation.status === 'Pending'
      ? recommendation.createdAt
      : (recommendation.reviewedAtUtc ?? recommendation.updatedAt);

  return (
    <article
      className={`recommendation-card${hideAthleteName ? ' recommendation-card-nested' : ''}`}
      aria-labelledby={`recommendation-title-${recommendation.id}`}
    >
      <header className="recommendation-card-header">
        <div className="recommendation-card-identity">
          <div className="recommendation-card-badges-row">
            <div className="recommendation-card-badges">
              <span className={`recommendation-badge ${getStatusClass(recommendation.status)}`}>
                {getStatusLabel(recommendation.status)}
              </span>
              <span className="recommendation-badge type">{getTypeLabel(recommendation.type)}</span>
              {recommendation.categoryName && (
                <span className="recommendation-badge category">{recommendation.categoryName}</span>
              )}
            </div>
            <time className="recommendation-date" dateTime={timestampIso}>
              {formatArgentinaDate(timestampIso)}
            </time>
          </div>

          {!hideAthleteName && <h4 className="recommendation-athlete-name">{athleteName}</h4>}
        </div>
      </header>

      {/* Recuadro Destacado de Motivo: solo si aporta información y no es genérico (KAN-665) */}
      {recommendation.reason &&
        !recommendation.reason.toLowerCase().trim().startsWith('objetivo: objetivo no informado') &&
        recommendation.reason.toLowerCase().trim() !== 'objetivo no informado' && (
          <div className="recommendation-reason-box">
            <span className="recommendation-reason-label">Motivo detectado</span>
            <span className="recommendation-reason-text">
              {capitalizeFirst(recommendation.reason)}
            </span>
          </div>
        )}

      {isEditing ? (
        <div className="recommendation-edit-form">
          <div className="recommendation-field">
            <label htmlFor={`rec-title-${recommendation.id}`}>Título</label>
            <input
              id={`rec-title-${recommendation.id}`}
              type="text"
              className="recommendation-input"
              maxLength={MAX_TITLE_LENGTH}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              disabled={isBusy}
            />
            <div className="recommendation-field-meta">
              {draftTitle.length}/{MAX_TITLE_LENGTH}
            </div>
          </div>

          <div className="recommendation-field">
            <label htmlFor={`rec-text-${recommendation.id}`}>Texto para el atleta</label>
            <textarea
              id={`rec-text-${recommendation.id}`}
              className="recommendation-textarea"
              maxLength={MAX_TEXT_LENGTH}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              disabled={isBusy}
            />
            <div className="recommendation-field-meta">
              {draftText.length}/{MAX_TEXT_LENGTH}
            </div>
          </div>
        </div>
      ) : (
        <div className="recommendation-content">
          <h5 id={`recommendation-title-${recommendation.id}`} className="recommendation-title">
            {recommendation.title}
          </h5>
          <p className="recommendation-body">{recommendation.recommendationText}</p>
        </div>
      )}

      {hasEvidence && (
        <div className="recommendation-evidence">
          <button
            type="button"
            className="recommendation-evidence-toggle"
            onClick={() => setShowEvidence((prev) => !prev)}
            aria-expanded={showEvidence}
          >
            {showEvidence ? (
              <ChevronUp size={15} aria-hidden="true" />
            ) : (
              <ChevronDown size={15} aria-hidden="true" />
            )}
            <span>
              {showEvidence ? 'Ocultar datos de respaldo' : 'Ver datos de respaldo del análisis'}
            </span>
          </button>

          {showEvidence && (
            <div className="recommendation-metrics-grid">
              {recommendation.metrics.map((metric, idx) => (
                <div key={`${metric.dimension}-${idx}`} className="recommendation-metric-row">
                  <span className="recommendation-metric-name">{metric.dimension}</span>
                  <span className="recommendation-metric-values">
                    Atleta:{' '}
                    <strong>
                      {formatMetricNumber(metric.athleteValue)} {metric.unit}
                    </strong>{' '}
                    · Grupo:{' '}
                    <strong>
                      {formatMetricNumber(metric.groupAverage)} {metric.unit}
                    </strong>
                    {typeof metric.percentageDifference === 'number' && (
                      <>
                        {' '}
                        ({metric.percentageDifference > 0 ? '+' : ''}
                        {formatMetricNumber(metric.percentageDifference)}%)
                      </>
                    )}
                  </span>
                </div>
              ))}

              {recommendation.trends && (
                <div className="recommendation-trend-pill">
                  Tendencia ({recommendation.trends.weeksEvaluated} sem.):{' '}
                  <strong>{recommendation.trends.trendLabel}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="recommendation-card-error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isPending && (
        <footer className="recommendation-card-actions">
          {confirmDiscard ? (
            <div
              className="recommendation-confirm-discard"
              role="region"
              aria-label="Confirmar descarte"
            >
              <span>¿Descartar esta recomendación? No se enviará al atleta.</span>
              <div className="recommendation-action-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmDiscard(false)}
                  disabled={isBusy}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn recommendation-btn-danger"
                  onClick={handleConfirmDiscard}
                  disabled={isBusy}
                >
                  {busyAction === 'discard' ? (
                    <Loader2 size={14} className="plan-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={14} aria-hidden="true" />
                  )}
                  <span>{busyAction === 'discard' ? 'Descartando…' : 'Confirmar descarte'}</span>
                </button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="recommendation-edit-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={cancelEditMode}
                disabled={isBusy}
              >
                <X size={15} aria-hidden="true" />
                <span>Cancelar</span>
              </button>

              <div className="recommendation-action-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSave}
                  disabled={isBusy}
                >
                  {busyAction === 'save' ? (
                    <Loader2 size={14} className="plan-spin" aria-hidden="true" />
                  ) : (
                    <Check size={15} aria-hidden="true" />
                  )}
                  <span>{busyAction === 'save' ? 'Guardando…' : 'Guardar cambios'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveAndApprove}
                  disabled={isBusy}
                >
                  {busyAction === 'save-approve' ? (
                    <Loader2 size={14} className="plan-spin" aria-hidden="true" />
                  ) : (
                    <Send size={14} aria-hidden="true" />
                  )}
                  <span>{busyAction === 'save-approve' ? 'Enviando…' : 'Guardar y aprobar'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="recommendation-actions-container">
              <div className="recommendation-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary recommendation-btn-edit"
                  onClick={openEditMode}
                  disabled={isBusy}
                >
                  <Pencil size={14} aria-hidden="true" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  className="btn recommendation-btn-discard"
                  onClick={() => {
                    setError(null);
                    setConfirmDiscard(true);
                  }}
                  disabled={isBusy}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  <span>Descartar</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary recommendation-btn-approve-full"
                onClick={handleApproveDirect}
                disabled={isBusy}
                aria-label={`Aprobar y enviar recomendación a ${athleteName}`}
              >
                {busyAction === 'approve' ? (
                  <Loader2 size={15} className="plan-spin" aria-hidden="true" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
                <span>
                  {busyAction === 'approve' ? 'Aprobando…' : 'Aprobar y enviar al atleta'}
                </span>
              </button>
            </div>
          )}
        </footer>
      )}
    </article>
  );
}

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { AthleteRecommendation, RecommendationStatusFilter } from '../../api/recommendations';
import { capitalizeFirst } from '../../utils/recommendationFormat';
import { RecommendationCard } from './RecommendationCard';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface AthleteRecommendationGroupCardProps {
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string | null;
  subtitle?: string | null;
  recommendations: AthleteRecommendation[];
  statusTab: RecommendationStatusFilter;
  onUpdate: (id: string, title: string, recommendationText: string) => Promise<void>;
  onApprove: (id: string, edits?: { title: string; recommendationText: string }) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

function getCountLabel(count: number, statusTab: RecommendationStatusFilter): string {
  switch (statusTab) {
    case 'Pending':
      return count === 1 ? '1 pendiente' : `${count} pendientes`;
    case 'Approved':
      return count === 1 ? '1 aprobada' : `${count} aprobadas`;
    case 'Discarded':
      return count === 1 ? '1 descartada' : `${count} descartadas`;
  }
}

function getStatusLabel(statusTab: RecommendationStatusFilter): string {
  switch (statusTab) {
    case 'Pending':
      return 'Pendiente';
    case 'Approved':
      return 'Aprobada';
    case 'Discarded':
      return 'Descartada';
  }
}

export function AthleteRecommendationGroupCard({
  athleteId,
  athleteName,
  athletePhotoUrl,
  subtitle,
  recommendations,
  statusTab,
  onUpdate,
  onApprove,
  onDiscard,
}: AthleteRecommendationGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  const uniqueCategories = Array.from(
    new Set(
      recommendations
        .map((rec) => rec.categoryName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  const displaySubtitle = subtitle?.trim() || uniqueCategories.join(', ') || 'Plantel deportivo';

  const uniqueReasons = Array.from(
    new Set(recommendations.map((rec) => capitalizeFirst(rec.reason)).filter(Boolean)),
  );

  // Filtrar motivos genéricos o no informados para evitar redundancia (KAN-665)
  const filteredReasons = uniqueReasons.filter((r) => {
    const lower = r.toLowerCase().trim();
    return (
      !lower.startsWith('objetivo: objetivo no informado') && lower !== 'objetivo no informado'
    );
  });

  const countLabel = getCountLabel(recommendations.length, statusTab);
  const statusLabel = getStatusLabel(statusTab);

  // Recolectar números de métricas clave para el modelo minimalista de la burbuja (KAN-665)
  const metricsWithDiff = recommendations
    .flatMap((rec) => rec.metrics || [])
    .filter(
      (m) =>
        m.percentageDifference !== undefined &&
        m.percentageDifference !== null &&
        m.percentageDifference !== 0,
    );

  const toggleText =
    recommendations.length === 1
      ? 'Ver recomendación'
      : `Ver recomendaciones (${recommendations.length})`;

  return (
    <article
      className="recommendation-athlete-group"
      aria-labelledby={`athlete-group-heading-${athleteId}`}
    >
      <button
        type="button"
        className="recommendation-athlete-group-header"
        onClick={() => setExpanded(true)}
        aria-expanded={expanded}
        aria-haspopup="dialog"
      >
        {/* Fila superior: Avatar, Nombre, Subtítulo y Estado */}
        <div className="recommendation-bubble-top">
          <div className="recommendation-bubble-athlete">
            <ProfileAvatar
              key={`rec-athlete-avatar-${athleteId}`}
              src={athletePhotoUrl}
              name={athleteName}
              size={40}
              className="recommendation-bubble-avatar-img"
            />
            <div className="recommendation-bubble-athlete-text">
              <h3
                id={`athlete-group-heading-${athleteId}`}
                className="recommendation-bubble-athlete-name"
              >
                {athleteName}
              </h3>
              <div className="recommendation-bubble-athlete-sub">{displaySubtitle}</div>
            </div>
          </div>
          <span
            className={`recommendation-bubble-status-tag status-${statusTab.toLowerCase()}`}
            aria-label={`${countLabel} para ${athleteName}`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Modelo minimalista: números de recomendación y motivos clave */}
        <div className="recommendation-bubble-body">
          {/* Si tiene números de métricas clave, mostrarlos de forma destacada */}
          {metricsWithDiff.length > 0 && (
            <div className="recommendation-bubble-metrics">
              {metricsWithDiff.slice(0, 2).map((m, idx) => (
                <span key={idx} className="recommendation-bubble-metric-pill">
                  <span className="recommendation-bubble-metric-dim">
                    {m.dimension.split('(')[0].trim()}:
                  </span>
                  <span
                    className={`recommendation-bubble-metric-delta ${
                      m.percentageDifference && m.percentageDifference < 0 ? 'negative' : 'positive'
                    }`}
                  >
                    {m.percentageDifference && m.percentageDifference > 0
                      ? `+${m.percentageDifference}%`
                      : `${m.percentageDifference}%`}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Motivo(s) detectado(s) informados */}
          {filteredReasons.length > 0 && (
            <div className="recommendation-reason-chips">
              {filteredReasons.map((reason) => (
                <span key={reason} className="recommendation-reason-chip">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pie de burbuja: contador y acción de apertura en ventana */}
        <div className="recommendation-bubble-footer">
          <span className="recommendation-bubble-count-text">{countLabel}</span>
          <span className="recommendation-athlete-group-toggle">
            <span>{toggleText}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </span>
        </div>
      </button>

      {/* Ventana Modal con todo detallado (KAN-665) */}
      {expanded && (
        <div
          className="modal-overlay recommendation-modal-overlay"
          role="presentation"
          onClick={() => setExpanded(false)}
        >
          <div
            className="recommendation-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`modal-heading-${athleteId}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera de la ventana */}
            <header className="recommendation-modal-header">
              <div className="recommendation-modal-header-info">
                <ProfileAvatar
                  src={athletePhotoUrl}
                  name={athleteName}
                  size={48}
                  className="recommendation-modal-avatar"
                />
                <div className="recommendation-modal-header-text">
                  <h2 id={`modal-heading-${athleteId}`} className="recommendation-modal-title">
                    {athleteName}
                  </h2>
                  <div className="recommendation-modal-subtitle">{displaySubtitle}</div>
                </div>
              </div>

              <div className="recommendation-modal-header-actions">
                <span className={`recommendation-badge status-${statusTab.toLowerCase()}`}>
                  {countLabel}
                </span>
                <button
                  type="button"
                  className="recommendation-modal-close"
                  onClick={() => setExpanded(false)}
                  aria-label="Cerrar ventana"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
            </header>

            {/* Contenido detallado: todas las tarjetas de recomendaciones del atleta */}
            <div className="recommendation-modal-body">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  athleteName={athleteName}
                  hideAthleteName
                  onUpdate={onUpdate}
                  onApprove={onApprove}
                  onDiscard={onDiscard}
                />
              ))}
            </div>

            {/* Pie de la ventana */}
            <footer className="recommendation-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExpanded(false)}
              >
                Cerrar ventana
              </button>
            </footer>
          </div>
        </div>
      )}
    </article>
  );
}

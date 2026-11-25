import { ExternalLink } from 'lucide-react';
import type { AthleteRecommendation, RecommendationStatusFilter } from '../../api/recommendations';
import {
  capitalizeFirst,
  getRecommendationCountLabel,
  getRecommendationDisplaySubtitle,
} from '../../utils/recommendationFormat';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface AthleteRecommendationGroupCardProps {
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string | null;
  subtitle?: string | null;
  recommendations: AthleteRecommendation[];
  statusTab: RecommendationStatusFilter;
  isOpen: boolean;
  onOpen: () => void;
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
  isOpen,
  onOpen,
}: AthleteRecommendationGroupCardProps) {
  const displaySubtitle = getRecommendationDisplaySubtitle(subtitle, recommendations);

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

  const countLabel = getRecommendationCountLabel(recommendations.length, statusTab);
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
        onClick={onOpen}
        aria-expanded={isOpen}
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
    </article>
  );
}

import { useState } from 'react';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import type { AthleteRecommendation, RecommendationStatusFilter } from '../../api/recommendations';
import { capitalizeFirst } from '../../utils/recommendationFormat';
import { RecommendationCard } from './RecommendationCard';

export interface AthleteRecommendationGroupCardProps {
  athleteId: string;
  athleteName: string;
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

export function AthleteRecommendationGroupCard({
  athleteId,
  athleteName,
  recommendations,
  statusTab,
  onUpdate,
  onApprove,
  onDiscard,
}: AthleteRecommendationGroupCardProps) {
  const [expanded, setExpanded] = useState(false);

  const uniqueCategories = Array.from(
    new Set(
      recommendations
        .map((rec) => rec.categoryName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  const uniqueReasons = Array.from(
    new Set(recommendations.map((rec) => capitalizeFirst(rec.reason)).filter(Boolean)),
  );

  const countLabel = getCountLabel(recommendations.length, statusTab);

  return (
    <section
      className="recommendation-athlete-group"
      aria-labelledby={`athlete-group-heading-${athleteId}`}
    >
      <button
        type="button"
        className="recommendation-athlete-group-header"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <div className="recommendation-athlete-group-main">
          <div className="recommendation-athlete-group-top">
            <span className="recommendation-athlete-avatar" aria-hidden="true">
              <User size={16} />
            </span>
            <h3
              id={`athlete-group-heading-${athleteId}`}
              className="recommendation-athlete-group-name"
            >
              {athleteName}
            </h3>
            <span
              className={`recommendation-badge status-${statusTab.toLowerCase()}`}
              aria-label={`${countLabel} para ${athleteName}`}
            >
              {countLabel}
            </span>
            {uniqueCategories.map((category) => (
              <span key={category} className="recommendation-badge category">
                {category}
              </span>
            ))}
          </div>

          {uniqueReasons.length > 0 && (
            <div className="recommendation-reason-chips">
              {uniqueReasons.map((reason) => (
                <span key={reason} className="recommendation-reason-chip">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        <span className="recommendation-athlete-group-toggle">
          <span>
            {expanded
              ? 'Ocultar'
              : `Ver ${recommendations.length === 1 ? 'recomendación' : `recomendaciones (${recommendations.length})`}`}
          </span>
          {expanded ? (
            <ChevronUp size={17} aria-hidden="true" />
          ) : (
            <ChevronDown size={17} aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="recommendation-athlete-group-body">
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
      )}
    </section>
  );
}

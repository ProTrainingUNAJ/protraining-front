import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AthleteRecommendation, RecommendationStatusFilter } from '../../api/recommendations';
import { capitalizeFirst } from '../../utils/recommendationFormat';
import { RecommendationCard } from './RecommendationCard';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface AthleteRecommendationGroupCardProps {
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string | null;
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
  athletePhotoUrl,
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
          <div className="recommendation-athlete-avatar-row">
            <ProfileAvatar
              key={`rec-athlete-avatar-${athleteId}`}
              src={athletePhotoUrl}
              name={athleteName}
              size={40}
              className="recommendation-athlete-avatar-img"
            />

            <div className="recommendation-athlete-group-text-col">
              <div className="recommendation-athlete-group-top">
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
              </div>

              {uniqueCategories.length > 0 && (
                <div className="recommendation-athlete-category-sub">
                  {uniqueCategories.join(', ')}
                </div>
              )}

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
          </div>
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

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { AthleteRecommendation, RecommendationStatusFilter } from '../../api/recommendations';
import {
  getRecommendationCountLabel,
  getRecommendationDisplaySubtitle,
} from '../../utils/recommendationFormat';
import { RecommendationCard } from './RecommendationCard';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface RecommendationDetailModalProps {
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string | null;
  subtitle?: string | null;
  recommendations: AthleteRecommendation[];
  statusTab: RecommendationStatusFilter;
  onClose: () => void;
  onUpdate: (id: string, title: string, recommendationText: string) => Promise<void>;
  onApprove: (id: string, edits?: { title: string; recommendationText: string }) => Promise<void>;
  onDiscard: (id: string) => Promise<void>;
}

export function RecommendationDetailModal({
  athleteId,
  athleteName,
  athletePhotoUrl,
  subtitle,
  recommendations,
  statusTab,
  onClose,
  onUpdate,
  onApprove,
  onDiscard,
}: RecommendationDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const displaySubtitle = getRecommendationDisplaySubtitle(subtitle, recommendations);
  const countLabel = getRecommendationCountLabel(recommendations.length, statusTab);

  return createPortal(
    <div className="recommendation-modal-overlay" role="presentation" onClick={onClose}>
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
              onClick={onClose}
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
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar ventana
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

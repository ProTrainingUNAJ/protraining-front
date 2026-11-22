import { useEffect, useState } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { recommendationsService, type MyRecommendation } from '../../api/recommendations';
import { capitalizeFirst } from '../../utils/recommendationFormat';

function formatArgentinaDate(isoDateTime?: string | null): string {
  if (!isoDateTime) return '';
  try {
    return new Date(isoDateTime).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return isoDateTime;
  }
}

export function AthleteRecommendationsSection() {
  const [recommendations, setRecommendations] = useState<MyRecommendation[]>([]);

  useEffect(() => {
    let active = true;

    recommendationsService
      .listMyRecommendations()
      .then((items) => {
        if (active) setRecommendations(items);
      })
      .catch(() => {
        if (active) setRecommendations([]);
      });

    return () => {
      active = false;
    };
  }, []);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section
      className="athlete-recommendations-section"
      aria-label="Recomendaciones de tu preparador físico"
    >
      <div className="athlete-recommendations-header">
        <div className="athlete-recommendations-title-wrap">
          <span className="recommendations-engine-icon" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <div>
            <h3>Recomendaciones de tu preparador físico ({recommendations.length})</h3>
            <p>Sugerencias aprobadas por tu preparador para acompañar tu entrenamiento.</p>
          </div>
        </div>
      </div>

      <div className="athlete-recommendations-grid">
        {recommendations.map((rec) => {
          const dateIso = rec.reviewedAtUtc ?? rec.createdAt;
          return (
            <article key={rec.id} className="athlete-recommendation-card">
              <div className="athlete-recommendation-meta">
                <div className="recommendation-card-badges">
                  <span className="recommendation-badge type">
                    {rec.type === 'Habits' ? 'Hábitos' : 'Entrenamiento'}
                  </span>
                  {rec.categoryName && (
                    <span className="recommendation-badge category">{rec.categoryName}</span>
                  )}
                </div>
                {dateIso && (
                  <time className="recommendation-date" dateTime={dateIso}>
                    {formatArgentinaDate(dateIso)}
                  </time>
                )}
              </div>

              <h4 className="athlete-recommendation-title">{rec.title}</h4>
              <p className="athlete-recommendation-reason">Motivo: {capitalizeFirst(rec.reason)}</p>
              <p className="athlete-recommendation-text">{rec.recommendationText}</p>
              {/* Aviso del nutricionista, siempre visible en las de alimentación (KAN-634) */}
              {rec.legalDisclaimer && (
                <p className="athlete-recommendation-disclaimer" role="note">
                  <Info size={15} aria-hidden="true" />
                  <span>{rec.legalDisclaimer}</span>
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

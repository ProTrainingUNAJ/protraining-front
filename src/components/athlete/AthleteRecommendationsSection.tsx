import { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, Dumbbell, Info, RefreshCw, Salad, Sparkles } from 'lucide-react';
import { recommendationsService, type MyRecommendation } from '../../api/recommendations';
import {
  capitalizeFirst,
  splitRecommendationText,
  type TextBlock,
} from '../../utils/recommendationFormat';

/**
 * Recomendaciones aprobadas por el PF en el Inicio del atleta (KAN-492, rediseño KAN-481/660).
 *
 * Ocupa el ancho del Inicio, muestra las 3 más recientes con "Ver todas", parte el texto en
 * párrafos y viñetas, y en las de hábitos siempre deja visible el aviso del nutricionista.
 * Tiene estado vacío y, si falla el Asistente, un error con "Reintentar" que no rompe el Inicio.
 */

const VISIBLE_RECOMMENDATIONS = 3;

/** Aviso por si una recomendación de hábitos llega sin el texto oficial del back. */
const FALLBACK_HABITS_DISCLAIMER =
  'Esto es una recomendación general; para un plan a tu medida, consultá a un nutricionista.';

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: MyRecommendation[] };

function formatArgentinaDate(isoDateTime?: string | null): string {
  if (!isoDateTime) return '';
  try {
    return new Date(isoDateTime).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return isoDateTime;
  }
}

function approvedAt(rec: MyRecommendation): string {
  return rec.reviewedAtUtc ?? rec.createdAt;
}

function RecommendationBody({ blocks }: { blocks: TextBlock[] }) {
  return (
    <div className="athlete-recommendation-body">
      {blocks.map((block, index) =>
        block.kind === 'list' ? (
          <ul key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{block.text}</p>
        ),
      )}
    </div>
  );
}

function RecommendationCard({ rec }: { rec: MyRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const isHabits = rec.type === 'Habits';
  const blocks = splitRecommendationText(rec.recommendationText);
  // Los textos de hábitos son largos: de entrada se ve el primer bloque y "Leer completa"
  const canCollapse = blocks.length > 1;
  const visibleBlocks = canCollapse && !expanded ? blocks.slice(0, 1) : blocks;
  const disclaimer = rec.legalDisclaimer ?? (isHabits ? FALLBACK_HABITS_DISCLAIMER : null);
  const dateIso = approvedAt(rec);
  const bodyId = `athlete-rec-body-${rec.id}`;
  const TypeIcon = isHabits ? Salad : Dumbbell;

  return (
    <article
      className={`athlete-recommendation-card athlete-recommendation-card--${isHabits ? 'habits' : 'training'}`}
      aria-labelledby={`athlete-rec-title-${rec.id}`}
    >
      <div className="athlete-recommendation-meta">
        <span className="athlete-recommendation-type">
          <TypeIcon size={14} aria-hidden="true" />
          {isHabits ? 'Hábitos' : 'Entrenamiento'}
        </span>
        {rec.categoryName && (
          <span className="athlete-recommendation-category">{rec.categoryName}</span>
        )}
        {dateIso && (
          <span className="athlete-recommendation-date">
            Aprobada el <time dateTime={dateIso}>{formatArgentinaDate(dateIso)}</time>
          </span>
        )}
      </div>

      <h4 id={`athlete-rec-title-${rec.id}`} className="athlete-recommendation-title">
        {rec.title}
      </h4>
      <p className="athlete-recommendation-reason">{capitalizeFirst(rec.reason)}</p>

      <div id={bodyId}>
        <RecommendationBody blocks={visibleBlocks} />
      </div>

      {canCollapse && (
        <button
          type="button"
          className="athlete-recommendation-more"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Leer menos' : 'Leer completa'}
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={expanded ? 'athlete-recommendation-chevron--up' : undefined}
          />
        </button>
      )}

      {/* Aviso del nutricionista, siempre visible en las de hábitos (KAN-634) */}
      {disclaimer && (
        <p className="athlete-recommendation-disclaimer" role="note">
          <Info size={15} aria-hidden="true" />
          <span>{disclaimer}</span>
        </p>
      )}
    </article>
  );
}

export function AthleteRecommendationsSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [showAll, setShowAll] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    recommendationsService
      .listMyRecommendations()
      .then((items) => {
        if (!active) return;
        const sorted = [...items].sort((a, b) => approvedAt(b).localeCompare(approvedAt(a)));
        setState({ status: 'ready', items: sorted });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setState({ status: 'loading' });
    setReloadKey((prev) => prev + 1);
  };

  // Mientras carga no se muestra nada: la sección es secundaria y no debe mover el Inicio
  if (state.status === 'loading') return null;

  const items = state.status === 'ready' ? state.items : [];
  const visible = showAll ? items : items.slice(0, VISIBLE_RECOMMENDATIONS);
  const hidden = items.length - VISIBLE_RECOMMENDATIONS;

  return (
    <section className="athlete-recommendations-section" aria-labelledby="athlete-recs-title">
      <header className="athlete-recommendations-header">
        <span className="recommendations-engine-icon" aria-hidden="true">
          <Sparkles size={18} />
        </span>
        <div>
          <h3 id="athlete-recs-title">
            Recomendaciones de tu preparador físico
            {items.length > 0 && ` (${items.length})`}
          </h3>
          <p>Sugerencias que tu preparador revisó y aprobó para acompañar tu entrenamiento.</p>
        </div>
      </header>

      {state.status === 'error' ? (
        <div className="athlete-recommendations-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>No pudimos cargar tus recomendaciones.</span>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            <RefreshCw size={14} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="athlete-recommendations-empty">
          Cuando tu preparador apruebe una recomendación, la vas a ver acá.
        </p>
      ) : (
        <>
          <div className="athlete-recommendations-grid">
            {visible.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </div>
          {hidden > 0 && (
            <button
              type="button"
              className="athlete-recommendations-toggle"
              aria-expanded={showAll}
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? 'Ver menos' : `Ver todas (${items.length})`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

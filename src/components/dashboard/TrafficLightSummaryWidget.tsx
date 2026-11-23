import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';
import { TrafficLightCounts } from '../../api/seguimientoService';
import type { AthleteTrafficLightItem, TrafficLightStatus } from '../monitoring/trafficLight.types';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { summarizeNames } from '../../utils/attentionToday';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';

/**
 * Semáforo del día del Inicio del PF (KAN-365/366, rediseñado en KAN-594).
 *
 * Cada anillo dice qué color es y cuántos atletas hay, sin depender del mouse (en el celular no
 * hay tooltip). El color del anillo se ve siempre, aunque la cantidad sea 0. Con 0 check-ins
 * muestra un estado propio y, debajo, quiénes están en rojo y en amarillo. Si el servicio falla,
 * muestra el error con "Reintentar" en lugar de ceros.
 */
interface TrafficLightSummaryProps {
  counts?: TrafficLightCounts;
  /** Atletas del semáforo, para nombrar a los que están en rojo y en amarillo. */
  athletes?: AthleteTrafficLightItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Texto del encabezado derecho (plantel representado). */
  subtitle?: string;
  className?: string;
}

interface RingSpec {
  status: TrafficLightStatus;
  label: string;
  count: number;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const Ring: React.FC<RingSpec & { total: number; onClick: () => void }> = ({
  status,
  label,
  count,
  total,
  onClick,
}) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  const offset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;
  return (
    <button
      type="button"
      className={`tl-ring tl-ring--${status}`}
      onClick={onClick}
      aria-label={`${label}: ${count} de ${total} (${percentage} %). Ver en Seguimiento`}
    >
      <span className="tl-ring__graphic" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle className="tl-ring__track" cx="50" cy="50" r={RADIUS} />
          {percentage > 0 && (
            <circle
              className="tl-ring__arc"
              cx="50"
              cy="50"
              r={RADIUS}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        <span className="tl-ring__count">{count}</span>
      </span>
      <span className="tl-ring__label" aria-hidden="true">
        {/* Guion que no corta: "Sin check-in" baja entero a la segunda línea, no "check- / in" */}
        {label.replace('-', '\u2011')}
      </span>
      <span className="tl-ring__pct" aria-hidden="true">
        {percentage} %
      </span>
    </button>
  );
};

export const TrafficLightSummaryWidget: React.FC<TrafficLightSummaryProps> = ({
  counts,
  athletes = [],
  loading = false,
  error = null,
  onRetry,
  subtitle = 'Todos los planteles',
  className = '',
}) => {
  const navigate = useNavigate();
  const showSkeleton = useDelayedLoading(loading);

  const red = counts?.red ?? 0;
  const yellow = counts?.yellow ?? 0;
  const green = counts?.green ?? 0;
  const gray = counts?.gray ?? 0;
  const total = counts?.all ?? red + yellow + green + gray;
  const reported = total - gray;

  const redNames = useMemo(
    () => athletes.filter((a) => a.status === 'red').map((a) => a.name),
    [athletes],
  );
  const yellowNames = useMemo(
    () => athletes.filter((a) => a.status === 'yellow').map((a) => a.name),
    [athletes],
  );

  const goTo = (filter: TrafficLightStatus) =>
    navigate(`/pf/monitoring?filter=${filter}`, { state: { filter } });

  const rings: RingSpec[] = [
    { status: 'green', label: 'Verde', count: green },
    { status: 'yellow', label: 'Amarillo', count: yellow },
    { status: 'red', label: 'Rojo', count: red },
    { status: 'gray', label: 'Sin check-in', count: gray },
  ];

  return (
    <section
      className={`dash-w traffic-light-summary-widget ${className}`}
      aria-labelledby="tl-summary-title"
    >
      <header className="dash-w__header">
        <h3 id="tl-summary-title" className="dash-w__eyebrow">
          <Activity size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Semáforo del día
        </h3>
        {!error && !loading && <span className="dash-w__meta">{subtitle}</span>}
      </header>

      {error ? (
        <WidgetErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        showSkeleton ? (
          <div className="tl-summary__skeleton" role="status" aria-label="Cargando semáforo">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : total === 0 ? (
        <p className="dash-w__empty">Todavía no hay atletas en tus planteles.</p>
      ) : reported === 0 ? (
        <div className="tl-summary__none">
          <p className="tl-summary__none-title">Nadie hizo el check-in todavía</p>
          <p className="tl-summary__none-count">0/{total} atletas</p>
        </div>
      ) : (
        <>
          <div className="tl-summary__rings">
            {rings.map((ring) => (
              <Ring key={ring.status} {...ring} total={total} onClick={() => goTo(ring.status)} />
            ))}
          </div>
          {(redNames.length > 0 || yellowNames.length > 0) && (
            <dl className="tl-summary__names">
              {redNames.length > 0 && (
                <div>
                  <dt>En rojo:</dt>
                  <dd>{summarizeNames(redNames, 2, false)}</dd>
                </div>
              )}
              {yellowNames.length > 0 && (
                <div>
                  <dt>En amarillo:</dt>
                  <dd>{summarizeNames(yellowNames, 3)}</dd>
                </div>
              )}
            </dl>
          )}
        </>
      )}

      {!error && (
        <button
          type="button"
          className="dash-w__btn dash-w__btn--block"
          onClick={() => navigate('/pf/monitoring')}
        >
          Ver semáforo detallado
          <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </section>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { summarizeNames } from '../../utils/attentionToday';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';

/**
 * Progreso de check-in del día (KAN-366, ampliado en KAN-594).
 *
 * `total` = atletas del semáforo y `completed` = total menos los que siguen en gris. Además del
 * porcentaje, dice quiénes faltan, para que el PF sepa a quién escribirle. Si el servicio falla,
 * muestra el error con "Reintentar" en lugar de 0/0.
 */
interface CheckInProgressProps {
  completed: number;
  total: number;
  /** Nombres de los atletas que todavía no hicieron el check-in. */
  missingNames?: string[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export const CheckInProgressWidget: React.FC<CheckInProgressProps> = ({
  completed,
  total,
  missingNames = [],
  loading = false,
  error = null,
  onRetry,
  className = '',
}) => {
  const navigate = useNavigate();
  const showSkeleton = useDelayedLoading(loading);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      className={`dash-w checkin-widget ${className}`}
      aria-labelledby="checkin-widget-title"
    >
      <header className="dash-w__header">
        <h3 id="checkin-widget-title" className="dash-w__eyebrow">
          <CheckCircle2 size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Check-in
        </h3>
        {!loading && !error && <span className="dash-w__meta">Hoy</span>}
      </header>

      {error ? (
        <WidgetErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        showSkeleton ? (
          <div role="status" aria-label="Cargando check-ins">
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : total === 0 ? (
        <p className="dash-w__empty">Todavía no hay atletas en tus planteles.</p>
      ) : (
        <>
          <div className="checkin-widget__figures">
            <p className="checkin-widget__count">
              <strong>{completed}</strong> / {total} atletas
            </p>
            <span className="checkin-widget__pct">{percentage} %</span>
          </div>
          <div
            className="checkin-widget__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
            aria-label="Check-ins del día"
          >
            {/* El ancho depende del porcentaje: es el único estilo dinámico del widget */}
            <span style={{ width: `${percentage}%` }} />
          </div>
          {missingNames.length > 0 ? (
            <p className="checkin-widget__missing">
              <strong>Faltan:</strong> {summarizeNames(missingNames, 3, false)}.
            </p>
          ) : (
            <p className="checkin-widget__missing">Todo el plantel hizo el check-in.</p>
          )}
          {missingNames.length > 0 && (
            <button
              type="button"
              className="btn btn-primary dash-w__cta"
              onClick={() => navigate('/pf/monitoring?filter=gray', { state: { filter: 'gray' } })}
            >
              Ver en el semáforo
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </>
      )}
    </section>
  );
};

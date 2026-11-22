import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import type { AthleteTrafficLightItem, PainZoneReport } from '../monitoring/trafficLight.types';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';

/**
 * Alertas de dolor del Inicio del PF (KAN-365/366, rediseñado en KAN-594): solo atletas que
 * marcaron dolor o tienen una lesión activa hoy, con la zona y el nivel. "Molestia crítica"
 * agrupa nivel 4 o más y lesiones; "Precaución", el resto. Sin casos, una línea neutra en lugar
 * de tarjetas de alarma vacías.
 */
interface PainAlertsWidgetProps {
  athletes?: AthleteTrafficLightItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Abre el ajuste del día del atleta (solo si su rutina de hoy carga la zona con dolor). */
  onAdjustRoutine?: (athlete: AthleteTrafficLightItem) => void;
  className?: string;
}

const CRITICAL_LEVEL = 4;
const INJURY_LEVEL = 6;

interface PainCase {
  athlete: AthleteTrafficLightItem;
  worst: PainZoneReport | null;
  critical: boolean;
}

function describePain(painCase: PainCase): string {
  if (!painCase.worst) return 'Lesión activa';
  if (painCase.worst.level >= INJURY_LEVEL) return `${painCase.worst.zone} · lesión activa`;
  return `${painCase.worst.zone} · nivel ${painCase.worst.level}`;
}

export const PainAlertsWidget: React.FC<PainAlertsWidgetProps> = ({
  athletes = [],
  loading = false,
  error = null,
  onRetry,
  onAdjustRoutine,
  className = '',
}) => {
  const navigate = useNavigate();
  const showSkeleton = useDelayedLoading(loading);

  const cases = useMemo<PainCase[]>(() => {
    return athletes
      .filter((a) => (a.pains?.length ?? 0) > 0 || a.hasActiveInjury)
      .map((athlete) => {
        const pains = athlete.pains ?? [];
        const worst = pains.length > 0 ? pains.reduce((w, p) => (p.level > w.level ? p : w)) : null;
        const critical = !worst || worst.level >= CRITICAL_LEVEL || athlete.status === 'red';
        return { athlete, worst, critical };
      })
      .sort(
        (a, b) =>
          Number(b.critical) - Number(a.critical) ||
          (b.worst?.level ?? INJURY_LEVEL) - (a.worst?.level ?? INJURY_LEVEL),
      );
  }, [athletes]);

  const critical = cases.filter((c) => c.critical);
  const caution = cases.filter((c) => !c.critical);

  const renderGroup = (title: string, tone: 'red' | 'yellow', group: PainCase[]) =>
    group.length > 0 && (
      <div className={`pain-widget__group pain-widget__group--${tone}`}>
        <h4 className="pain-widget__group-title">
          <span className="dash-w__dot" aria-hidden="true" />
          {title}
        </h4>
        <ul className="pain-widget__list">
          {group.map((painCase) => (
            <li key={painCase.athlete.id} className="pain-widget__item">
              <div className="pain-widget__who">
                <span className="pain-widget__name">{painCase.athlete.name}</span>
                <span className="pain-widget__zone">{describePain(painCase)}</span>
              </div>
              {painCase.athlete.hasDayConflict && onAdjustRoutine ? (
                <button
                  type="button"
                  className="dash-w__btn dash-w__btn--primary"
                  onClick={() => onAdjustRoutine(painCase.athlete)}
                  aria-label={`Ajustar rutina de hoy de ${painCase.athlete.name}`}
                >
                  <Wrench size={14} aria-hidden="true" />
                  Ajustar rutina
                </button>
              ) : (
                <button
                  type="button"
                  className="dash-w__btn"
                  onClick={() =>
                    navigate(`/pf/monitoring?filter=${painCase.athlete.status}`, {
                      state: { filter: painCase.athlete.status },
                    })
                  }
                  aria-label={`Ver a ${painCase.athlete.name} en Seguimiento`}
                >
                  Ver en Seguimiento
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className={`dash-w pain-widget ${className}`} aria-labelledby="pain-widget-title">
      <header className="dash-w__header">
        <h3 id="pain-widget-title" className="dash-w__eyebrow">
          <AlertTriangle size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Alertas de dolor
        </h3>
        {!loading && !error && cases.length > 0 && (
          <span className="dash-w__count">{cases.length}</span>
        )}
      </header>

      {error ? (
        <WidgetErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        showSkeleton ? (
          <div role="status" aria-label="Cargando alertas de dolor">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : cases.length === 0 ? (
        <p className="dash-w__empty">Sin alertas de dolor hoy.</p>
      ) : (
        <div className="pain-widget__groups">
          {renderGroup('Molestia crítica', 'red', critical)}
          {renderGroup('Precaución', 'yellow', caution)}
        </div>
      )}
    </section>
  );
};

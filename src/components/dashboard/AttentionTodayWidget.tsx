import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, ClipboardCheck, UserRound, Wrench } from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import type { AthleteTrafficLightItem } from '../monitoring/trafficLight.types';
import { buildAttentionReasons, sortByAttention, summarizeNames } from '../../utils/attentionToday';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';

interface AttentionTodayWidgetProps {
  athletes: AthleteTrafficLightItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewProfile: (athlete: AthleteTrafficLightItem) => void;
  onAdjustRoutine: (athlete: AthleteTrafficLightItem) => void;
}

const STATUS_LABEL = { red: 'Rojo', yellow: 'Amarillo' } as const;

/**
 * Panel "Requieren atención hoy" del Inicio del PF (KAN-594): los atletas en rojo o amarillo con
 * el motivo, acciones para resolverlos ("Ver ficha" y, si la rutina de hoy carga una zona con
 * dolor, "Ajustar rutina") y cuántos todavía no hicieron el check-in, contados en una línea.
 */
export const AttentionTodayWidget: React.FC<AttentionTodayWidgetProps> = ({
  athletes,
  loading = false,
  error = null,
  onRetry,
  onViewProfile,
  onAdjustRoutine,
}) => {
  const navigate = useNavigate();
  const showSkeleton = useDelayedLoading(loading);

  const flagged = useMemo(
    () => sortByAttention(athletes.filter((a) => a.status === 'red' || a.status === 'yellow')),
    [athletes],
  );
  const missing = useMemo(() => athletes.filter((a) => a.status === 'gray'), [athletes]);

  return (
    <section className="dash-w attention-widget" aria-labelledby="attention-widget-title">
      <header className="dash-w__header">
        <h3 id="attention-widget-title" className="dash-w__eyebrow">
          <AlertCircle size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Requieren atención hoy
        </h3>
        {!loading && !error && flagged.length > 0 && (
          <span className="dash-w__count">
            {flagged.length} {flagged.length === 1 ? 'atleta' : 'atletas'}
          </span>
        )}
      </header>

      {error ? (
        <WidgetErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        showSkeleton ? (
          <div className="attention-widget__skeleton" aria-label="Cargando atletas" role="status">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : (
        <>
          {flagged.length === 0 ? (
            <p className="dash-w__empty">
              {athletes.length === 0
                ? 'Todavía no hay atletas en tus planteles.'
                : missing.length === athletes.length
                  ? // Sin ningún check-in no se sabe cómo llegan: no es lo mismo que "están todos bien"
                    'Todavía nadie hizo el check-in: no se sabe cómo llegan.'
                  : 'Nadie necesita atención hoy.'}
            </p>
          ) : (
            <ul className="attention-widget__list">
              {flagged.map((athlete) => {
                const reasons = buildAttentionReasons(athlete);
                const status = athlete.status as 'red' | 'yellow';
                return (
                  <li key={athlete.id} className="attention-widget__item">
                    <ProfileAvatar src={athlete.avatarUrl} name={athlete.name} size={36} />
                    <div className="attention-widget__main">
                      <div className="attention-widget__name-row">
                        <span className="attention-widget__name">{athlete.name}</span>
                        <span className={`dash-w__chip dash-w__chip--${status}`}>
                          <span className="dash-w__dot" aria-hidden="true" />
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <span className="attention-widget__category">{athlete.category}</span>
                      {reasons.length > 0 && (
                        <p className="attention-widget__reason">{reasons.join(' · ')}</p>
                      )}
                      {athlete.hasDayConflict && (
                        <p className="attention-widget__conflict">
                          La rutina de hoy carga esa zona
                        </p>
                      )}
                      <div className="attention-widget__actions">
                        <button
                          type="button"
                          className="dash-w__btn"
                          onClick={() => onViewProfile(athlete)}
                          aria-label={`Ver ficha de ${athlete.name}`}
                        >
                          <UserRound size={14} aria-hidden="true" />
                          Ver ficha
                        </button>
                        {athlete.hasDayConflict && (
                          <button
                            type="button"
                            className="dash-w__btn dash-w__btn--primary"
                            onClick={() => onAdjustRoutine(athlete)}
                            aria-label={`Ajustar rutina de hoy de ${athlete.name}`}
                          >
                            <Wrench size={14} aria-hidden="true" />
                            Ajustar rutina
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {missing.length > 0 && (
            <div className="attention-widget__missing">
              <ClipboardCheck size={15} aria-hidden="true" />
              <p>
                <strong>{missing.length} sin check-in:</strong>{' '}
                {summarizeNames(missing.map((a) => a.name))}.
              </p>
              <button
                type="button"
                className="dash-w__link"
                onClick={() =>
                  navigate('/pf/monitoring?filter=gray', { state: { filter: 'gray' } })
                }
              >
                Ver quiénes faltan
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

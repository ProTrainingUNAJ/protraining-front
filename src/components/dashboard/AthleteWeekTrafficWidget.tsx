import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { listAthleteCheckIns, type CheckIn } from '../../api/seguimientoService';
import { useMyAthleteId } from '../../hooks/useMyAthleteId';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { todayInArgentina } from '../../utils/argentinaDate';
import { addDaysToIsoDate } from '../../utils/nextTraining';
import { WidgetErrorState } from './WidgetErrorState';
import { buildLastDays, LAST_DAYS } from './athleteLastDays';
import './dashboardWidgets.css';
import './AthleteWeekTrafficWidget.css';

const DAYS = LAST_DAYS;
const TONE_LABEL = {
  green: 'verde',
  yellow: 'amarillo',
  red: 'rojo',
  none: 'sin check-in',
} as const;

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; checkIns: CheckIn[] };

/**
 * "Mis últimos 7 días" del Inicio del atleta (KAN-594): un punto por día con el color de su
 * semáforo, para que vea cómo viene la semana. Sin check-in, el punto queda gris y punteado.
 */
export const AthleteWeekTrafficWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const athlete = useMyAthleteId(reloadKey);
  const athleteId = athlete.athleteId;
  const today = todayInArgentina();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${athleteId}:${today}:${attempt}`;
  const [result, setResult] = useState<
    { key: string; checkIns: CheckIn[] } | { key: string; error: true } | null
  >(null);

  useEffect(() => {
    if (!athleteId) return;
    let active = true;
    const key = `${athleteId}:${today}:${attempt}`;
    listAthleteCheckIns(athleteId, addDaysToIsoDate(today, -(DAYS - 1)), today)
      .then((checkIns) => active && setResult({ key, checkIns }))
      .catch(() => active && setResult({ key, error: true }));
    return () => {
      active = false;
    };
  }, [athleteId, today, attempt]);

  const state: State =
    athlete.status === 'error'
      ? { status: 'error' }
      : !result || result.key !== requestKey
        ? { status: 'loading' }
        : 'error' in result
          ? { status: 'error' }
          : { status: 'ready', checkIns: result.checkIns };

  const showSkeleton = useDelayedLoading(state.status === 'loading');
  // 7 elementos: no hace falta memorizarlo
  const days = state.status === 'ready' ? buildLastDays(state.checkIns, today) : [];
  const reported = days.filter((day) => day.tone !== 'none').length;
  const greens = days.filter((day) => day.tone === 'green').length;

  const retry = () => {
    if (athlete.status === 'error') setReloadKey((key) => key + 1);
    else setAttempt((value) => value + 1);
  };

  return (
    <section
      className={`dash-w athlete-week-traffic ${className}`}
      aria-labelledby="athlete-week-traffic-title"
    >
      <header className="dash-w__header">
        <h3 id="athlete-week-traffic-title" className="dash-w__eyebrow">
          <CalendarDays size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Mis últimos 7 días
        </h3>
      </header>

      {state.status === 'error' ? (
        <WidgetErrorState message="No pudimos leer tus últimos check-ins." onRetry={retry} />
      ) : state.status === 'loading' ? (
        showSkeleton ? (
          <div role="status" aria-label="Cargando tus últimos 7 días">
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : (
        <>
          <p className="athlete-week-traffic__summary">
            {reported === 0 ? (
              'Ningún check-in en los últimos 7 días.'
            ) : (
              <>
                <strong>
                  {reported} de {DAYS}
                </strong>{' '}
                días con check-in · <strong>{greens}</strong> en verde
              </>
            )}
          </p>
          <ol className="athlete-week-traffic__days" aria-label="Tu semáforo de los últimos 7 días">
            {days.map((day) => (
              <li
                key={day.date}
                className={`athlete-week-traffic__day${day.isToday ? ' is-today' : ''}`}
                aria-label={`${day.isToday ? 'Hoy, ' : ''}${day.label}: ${TONE_LABEL[day.tone]}`}
              >
                <span
                  className={`athlete-week-traffic__dot athlete-week-traffic__dot--${day.tone}`}
                  aria-hidden="true"
                />
                <span className="athlete-week-traffic__initial" aria-hidden="true">
                  {day.isToday ? 'Hoy' : day.initial}
                </span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="btn btn-primary dash-w__cta"
            onClick={() => navigate('/athlete/progress')}
          >
            Ver mi progreso
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

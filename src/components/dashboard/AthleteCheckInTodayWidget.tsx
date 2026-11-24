import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { getAthleteTodayCheckIn, parsePainZones, type CheckIn } from '../../api/seguimientoService';
import { useMyAthleteId } from '../../hooks/useMyAthleteId';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';
import './AthleteCheckInTodayWidget.css';

const CHECK_IN_PATH = '/athlete/check-in';

const LIGHT = {
  Green: { tone: 'green', label: 'Verde', headline: 'Estás para entrenar' },
  Yellow: { tone: 'yellow', label: 'Amarillo', headline: 'Entrená con atención' },
  Red: { tone: 'red', label: 'Rojo', headline: 'Hoy, con cuidado' },
} as const;

type State =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; checkIn: CheckIn | null };

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
}

// 3-4 datos del check-in, en palabras del atleta
function checkInFacts(checkIn: CheckIn): string[] {
  const facts = [`Dormiste ${formatHours(checkIn.sleepHours)} h`];
  if (typeof checkIn.effortRate === 'number') facts.push(`Esfuerzo ${checkIn.effortRate}/10`);
  const pains = parsePainZones(checkIn.painZones);
  if (pains.length > 0) {
    facts.push(`Dolor: ${pains.map((pain) => pain.zone.toLocaleLowerCase('es')).join(', ')}`);
  } else if (checkIn.hasActiveInjury) {
    facts.push('Con lesión activa');
  }
  if (checkIn.isSick) facts.push('Te sentís enfermo');
  return facts.slice(0, 4);
}

/**
 * "Mi check-in de hoy" del Inicio del atleta (KAN-594): si todavía no lo hizo, se lo pide; si ya lo
 * hizo, le muestra cómo llega (color del semáforo y motivo) y lo que cargó.
 */
export const AthleteCheckInTodayWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const athlete = useMyAthleteId(reloadKey);
  const athleteId = athlete.athleteId;
  // Resultado por atleta y por intento: mientras no llega el del intento actual, se ve "cargando"
  const [result, setResult] = useState<
    { key: string; checkIn: CheckIn | null } | { key: string; error: true } | null
  >(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${athleteId}:${attempt}`;

  useEffect(() => {
    if (!athleteId) return;
    let active = true;
    const key = `${athleteId}:${attempt}`;
    getAthleteTodayCheckIn(athleteId)
      .then((checkIn) => active && setResult({ key, checkIn }))
      .catch(() => active && setResult({ key, error: true }));
    return () => {
      active = false;
    };
  }, [athleteId, attempt]);

  // Al volver del check-in (otra pestaña o la app en segundo plano) se actualiza solo
  useEffect(() => {
    const refresh = () => setAttempt((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  // Al refrescar se sigue mostrando lo último que llegó para ese atleta, sin parpadeo
  const current = result && result.key.startsWith(`${athleteId}:`) ? result : null;
  const state: State =
    athlete.status === 'error' || (current && 'error' in current && current.key === requestKey)
      ? { status: 'error' }
      : current && 'checkIn' in current
        ? { status: 'ready', checkIn: current.checkIn }
        : { status: 'loading' };

  const showSkeleton = useDelayedLoading(state.status === 'loading');
  const retry = () => {
    setResult(null);
    if (athlete.status === 'error') setReloadKey((key) => key + 1);
    else setAttempt((value) => value + 1);
  };

  const checkIn = state.status === 'ready' ? state.checkIn : null;
  const light = checkIn ? LIGHT[checkIn.trafficLight] : null;

  return (
    <section
      className={`dash-w athlete-checkin-today ${className}`}
      aria-labelledby="athlete-checkin-today-title"
    >
      <header className="dash-w__header">
        <h3 id="athlete-checkin-today-title" className="dash-w__eyebrow">
          <ClipboardCheck size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Mi check-in de hoy
        </h3>
      </header>

      {state.status === 'error' ? (
        <WidgetErrorState message="No pudimos leer tu check-in." onRetry={retry} />
      ) : state.status === 'loading' ? (
        showSkeleton ? (
          <div role="status" aria-label="Cargando tu check-in">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : !checkIn || !light ? (
        <>
          <div className="athlete-checkin-today__pending">
            <span className="athlete-checkin-today__pending-dot" aria-hidden="true" />
            <div>
              <p className="athlete-checkin-today__pending-title">
                Todavía no hiciste el check-in de hoy
              </p>
              <p className="athlete-checkin-today__pending-text">
                Tarda menos de un minuto y tu preparador sabe cómo llegás.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary dash-w__cta"
            onClick={() => navigate(CHECK_IN_PATH)}
          >
            Hacer check-in
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <div
            className={`athlete-checkin-today__result athlete-checkin-today__result--${light.tone}`}
          >
            <span className="athlete-checkin-today__light" aria-hidden="true" />
            <div className="athlete-checkin-today__result-text">
              <span className="athlete-checkin-today__label">{light.label}</span>
              <span className="athlete-checkin-today__headline">{light.headline}</span>
            </div>
          </div>
          {checkIn.trafficLightReason?.trim() && (
            <p className="athlete-checkin-today__reason">
              <strong>Así llegás hoy:</strong> {checkIn.trafficLightReason.trim()}
            </p>
          )}
          <ul className="athlete-checkin-today__facts" aria-label="Lo que cargaste hoy">
            {checkInFacts(checkIn).map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary dash-w__cta"
            onClick={() => navigate(CHECK_IN_PATH)}
          >
            Ver mi check-in
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

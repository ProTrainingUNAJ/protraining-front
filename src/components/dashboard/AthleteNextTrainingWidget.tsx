import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, Dumbbell, MessageSquareText, Wrench } from 'lucide-react';
import { todayRoutineService } from '../../api/todayRoutine';
import type { TodayRoutineResponse } from '../../api/generated/entrenamiento';
import { nowTimeInArgentina, todayInArgentina } from '../../utils/argentinaDate';
import {
  NEXT_TRAINING_LOOKAHEAD_DAYS,
  addDaysToIsoDate,
  formatTrainingDayLabel,
} from '../../utils/nextTraining';
import { WidgetErrorState } from './WidgetErrorState';
import { pickNextRoutine, routineStartTime } from './athleteHomeUtils';
import './dashboardWidgets.css';
import './AthleteNextTrainingWidget.css';

type WidgetState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; next: TodayRoutineResponse | null };

const PREVIEW_EXERCISES = 3;

/**
 * "Mi próximo entrenamiento" en el Inicio del atleta (KAN-594): cuándo es, qué sesión, cuántos
 * ejercicios y los primeros por nombre, y si el PF la adaptó o dejó una nota. Busca en la rutina
 * del atleta de hoy a 7 días.
 */
export const AthleteNextTrainingWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<WidgetState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const today = todayInArgentina();

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let active = true;
    const dates = Array.from({ length: NEXT_TRAINING_LOOKAHEAD_DAYS }, (_, i) =>
      addDaysToIsoDate(today, i),
    );
    // Un día que falla no tapa a los demás; si fallan todos, es un error (no "no tenés entrenamientos")
    Promise.all(
      dates.map((date) =>
        todayRoutineService
          .getMyRoutine(date)
          .then((routine) => ({ ...routine, date: routine.date || date }))
          .catch(() => null),
      ),
    ).then((results) => {
      if (!active) return;
      const loaded = results.filter((r): r is TodayRoutineResponse => r !== null);
      if (loaded.length === 0) {
        setState({ status: 'error' });
        return;
      }
      setState({ status: 'ready', next: pickNextRoutine(loaded, today, nowTimeInArgentina()) });
    });
    return () => {
      active = false;
    };
  }, [today, reloadKey]);

  const next = state.status === 'ready' ? state.next : null;
  const startTime = next ? routineStartTime(next) : null;
  const dayLabel = next ? formatTrainingDayLabel(next.date.slice(0, 10), today) : null;
  // coachNotes ya trae la nota del ajuste del día cuando el PF ajustó la rutina
  const coachNote = next?.coachNotes?.trim() || null;
  const adapted = Boolean(next?.routineAdapted || next?.adjustedByCoach);

  return (
    <section
      className={`dash-w athlete-next-training ${className}`}
      aria-labelledby="athlete-next-training-title"
    >
      <header className="dash-w__header">
        <h3 id="athlete-next-training-title" className="dash-w__eyebrow">
          <CalendarClock size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Mi próximo entrenamiento
        </h3>
      </header>

      {state.status === 'loading' && (
        <p className="dash-w__empty" role="status">
          Buscando tu rutina…
        </p>
      )}

      {state.status === 'error' && (
        <WidgetErrorState message="No pudimos cargar tu rutina." onRetry={retry} />
      )}

      {state.status === 'ready' && !next && (
        <p className="dash-w__empty">
          No tenés entrenamientos en los próximos {NEXT_TRAINING_LOOKAHEAD_DAYS} días.
        </p>
      )}

      {state.status === 'ready' && next && (
        <>
          <div className="athlete-next-training__when">
            <span className="athlete-next-training__day">{dayLabel}</span>
            <span className="athlete-next-training__time">{startTime ?? 'Todo el día'}</span>
          </div>
          <div className="athlete-next-training__session">
            <span className="athlete-next-training__name">
              {next.sessionName?.trim() || 'Sesión de entrenamiento'}
            </span>
            <span className="athlete-next-training__meta">
              <Dumbbell size={13} aria-hidden="true" />
              {typeof next.weekNumber === 'number' ? `Semana ${next.weekNumber} · ` : ''}
              {next.exercises.length} {next.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
          </div>

          <ul className="athlete-next-training__exercises" aria-label="Primeros ejercicios">
            {next.exercises.slice(0, PREVIEW_EXERCISES).map((exercise, index) => (
              <li key={`${exercise.exerciseId ?? exercise.name}-${index}`}>{exercise.name}</li>
            ))}
            {next.exercises.length > PREVIEW_EXERCISES && (
              <li className="athlete-next-training__more">
                y {next.exercises.length - PREVIEW_EXERCISES} más
              </li>
            )}
          </ul>

          {(adapted || coachNote) && (
            <p className="athlete-next-training__note">
              {adapted ? (
                <Wrench size={13} aria-hidden="true" />
              ) : (
                <MessageSquareText size={13} aria-hidden="true" />
              )}
              {adapted && !coachNote && 'Tu PF adaptó esta rutina.'}
              {adapted && coachNote && `Adaptada por tu PF: ${coachNote}`}
              {!adapted && coachNote && `Nota de tu PF: ${coachNote}`}
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary dash-w__cta"
            onClick={() => navigate('/athlete/routine')}
          >
            Ver mi rutina
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ArrowRight, Users, Dumbbell } from 'lucide-react';
import { trainingPlansService } from '../../api/trainingPlans';
import { structureService } from '../../api/structureService';
import type { ScheduledSession } from '../../api/generated/entrenamiento';
import type { Category, Organization } from '../../types/structure';
import { nowTimeInArgentina, todayInArgentina } from '../../utils/argentinaDate';
import {
  NEXT_TRAINING_LOOKAHEAD_DAYS,
  TrainingDay,
  addDaysToIsoDate,
  formatTrainingDayLabel,
  pickNextTrainingDay,
  sessionStartTime,
  summarizeSessionReadiness,
} from '../../utils/nextTraining';
import type { AthleteTrafficLightItem } from '../monitoring/trafficLight.types';
import './NextTrainingWidget.css';

type WidgetState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; next: TrainingDay | null; groupLabels: Map<string, string> };

// "Club Quilmes · Primera" a partir de las categorías y organizaciones del PF.
function buildGroupLabels(organizations: Organization[], categories: Category[]) {
  const orgNames = new Map(organizations.map((org) => [org.id, org.name]));
  return new Map(
    categories.map((category) => {
      const orgName = orgNames.get(category.organizationId);
      return [category.id, orgName ? `${orgName} · ${category.name}` : category.name];
    }),
  );
}

function groupLabelFor(session: ScheduledSession, groupLabels: Map<string, string>): string {
  if (session.categoryId) return groupLabels.get(session.categoryId) ?? 'Categoría';
  return 'Asignación individual';
}

// Próximo entrenamiento del PF (KAN-583): reemplaza a "Predio y Horario", que mostraba datos de
// ejemplo. Busca en la agenda real de las planificaciones asignadas, de hoy a 7 días.
interface NextTrainingWidgetProps {
  className?: string;
  /** Semáforo de hoy del plantel (el mismo del resto del Inicio). */
  athletes?: AthleteTrafficLightItem[];
  athleteIdsByCategory?: Record<string, string[]>;
}

// Cómo llega el grupo, con los mismos colores del semáforo (prototipo F, KAN-594).
const READINESS_ITEMS = [
  { key: 'ready', tone: 'green', one: 'listo', many: 'listos' },
  { key: 'watch', tone: 'yellow', one: 'a mirar', many: 'a mirar' },
  { key: 'adjust', tone: 'red', one: 'a ajustar', many: 'a ajustar' },
  { key: 'noCheckIn', tone: 'gray', one: 'sin check-in', many: 'sin check-in' },
] as const;

export const NextTrainingWidget: React.FC<NextTrainingWidgetProps> = ({
  className = '',
  athletes = [],
  athleteIdsByCategory = {},
}) => {
  const navigate = useNavigate();
  const [state, setState] = useState<WidgetState>({ status: 'loading' });
  const today = todayInArgentina();

  useEffect(() => {
    let active = true;
    const dates = Array.from({ length: NEXT_TRAINING_LOOKAHEAD_DAYS }, (_, i) =>
      addDaysToIsoDate(today, i),
    );

    const scheduleRequests = Promise.all(
      dates.map((date) =>
        trainingPlansService
          .schedule(date)
          .then((sessions): TrainingDay => ({ date, sessions }))
          .catch(() => null),
      ),
    );
    // Los nombres del club y la categoría son un extra: si fallan, se muestra igual la sesión.
    const structureRequests = Promise.all([
      structureService.getOrganizations(),
      structureService.getCategories(),
    ]).catch((): [Organization[], Category[]] => [[], []]);

    Promise.all([scheduleRequests, structureRequests]).then(
      ([days, [organizations, categories]]) => {
        if (!active) return;
        const loadedDays = days.filter((day): day is TrainingDay => day !== null);
        if (loadedDays.length === 0) {
          setState({ status: 'error' });
          return;
        }
        setState({
          status: 'ready',
          next: pickNextTrainingDay(loadedDays, today, nowTimeInArgentina()),
          groupLabels: buildGroupLabels(organizations, categories),
        });
      },
    );

    return () => {
      active = false;
    };
  }, [today]);

  const next = state.status === 'ready' ? state.next : null;
  const session = next?.sessions[0] ?? null;
  const otherSessionsCount = next ? next.sessions.length - 1 : 0;
  const startTime = session ? sessionStartTime(session) : null;
  // El semáforo es de hoy: para una sesión de otro día no se sabe todavía cómo llegan.
  const readiness =
    session && next?.date === today
      ? summarizeSessionReadiness(session, athletes, athleteIdsByCategory)
      : null;

  return (
    <div className={`next-training-widget ${className}`}>
      <div className="next-training-widget__header">
        <span className="next-training-widget__eyebrow">
          <span className="next-training-widget__icon-wrap">
            <CalendarClock size={14} />
          </span>
          Próximo entrenamiento
        </span>
        {next && (
          <span className="next-training-widget__badge">
            {formatTrainingDayLabel(next.date, today)}
          </span>
        )}
      </div>

      {state.status === 'loading' && (
        <p className="next-training-widget__message" role="status">
          Buscando la agenda…
        </p>
      )}

      {state.status === 'error' && (
        <div className="next-training-widget__empty">
          <p className="next-training-widget__message">No pudimos cargar la agenda.</p>
          <button
            type="button"
            className="btn btn-secondary next-training-widget__action"
            onClick={() => navigate('/pf/planning')}
          >
            Ir a planificación
          </button>
        </div>
      )}

      {state.status === 'ready' && !session && (
        <div className="next-training-widget__empty">
          <p className="next-training-widget__message">
            No hay entrenamientos en los próximos {NEXT_TRAINING_LOOKAHEAD_DAYS} días.
          </p>
          <button
            type="button"
            className="btn btn-secondary next-training-widget__action"
            onClick={() => navigate('/pf/planning')}
          >
            Ir a planificación
          </button>
        </div>
      )}

      {state.status === 'ready' && session && (
        <>
          <div className="next-training-widget__body">
            <span className="next-training-widget__time">{startTime ?? 'Todo el día'}</span>
            <span className="next-training-widget__session">{session.sessionName}</span>
            <span className="next-training-widget__meta">
              <Users size={13} aria-hidden="true" />
              {groupLabelFor(session, state.groupLabels)}
            </span>
            <span className="next-training-widget__meta">
              <Dumbbell size={13} aria-hidden="true" />
              {session.planName} · Semana {session.weekNumber} · {session.exerciseCount}{' '}
              {session.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
            </span>
          </div>

          {readiness && (
            <ul className="next-training-widget__readiness" aria-label="Cómo llega el grupo hoy">
              {READINESS_ITEMS.filter((item) => readiness[item.key] > 0).map((item) => (
                <li key={item.key} className="next-training-widget__readiness-item">
                  <span
                    className={`next-training-widget__dot next-training-widget__dot--${item.tone}`}
                    aria-hidden="true"
                  />
                  <b>{readiness[item.key]}</b> {readiness[item.key] === 1 ? item.one : item.many}
                </li>
              ))}
            </ul>
          )}

          <div className="next-training-widget__footer">
            {otherSessionsCount > 0 ? (
              <button
                type="button"
                className="next-training-widget__more"
                onClick={() => navigate('/pf/calendar')}
              >
                +{otherSessionsCount} {otherSessionsCount === 1 ? 'sesión más' : 'sesiones más'}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="btn btn-primary dash-w__cta"
              onClick={() => navigate(`/pf/planning/${session.trainingPlanId}`)}
            >
              Ver planificación
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

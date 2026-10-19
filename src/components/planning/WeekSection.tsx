import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { DraftSession, DraftWeek } from '../../types/trainingPlans';
import { dayPosition } from '../../utils/planDraft';
import { SessionCard } from './SessionCard';

interface WeekSectionProps {
  week: DraftWeek;
  expanded: boolean;
  disabled: boolean;
  // Solo se puede quitar la última semana, para que los números sigan corridos.
  canRemove: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onAddSession: () => void;
  onSessionChange: (sessionKey: string, update: (session: DraftSession) => DraftSession) => void;
  onRemoveSession: (sessionKey: string) => void;
  onAddExercise: (sessionKey: string) => void;
}

export function WeekSection({
  week,
  expanded,
  disabled,
  canRemove,
  onToggle,
  onRemove,
  onAddSession,
  onSessionChange,
  onRemoveSession,
  onAddExercise,
}: WeekSectionProps) {
  // Se muestran por día (lunes primero). El orden que se guarda no cambia:
  // reordenar sesiones queda para cuando esté resuelto KAN-534.
  const sessions = [...week.sessions].sort(
    (a, b) => dayPosition(a.dayOfWeek) - dayPosition(b.dayOfWeek) || a.order - b.order,
  );
  const contentId = `week-${week.key}`;
  const sessionCount = week.sessions.length === 1 ? '1 sesión' : `${week.sessions.length} sesiones`;

  return (
    <section className="card card-static plan-week">
      <div className="plan-week-header">
        <button
          type="button"
          className="plan-week-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
        >
          {expanded ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
          <span className="plan-week-title">Semana {week.weekNumber}</span>
          <span className="plan-week-count">{sessionCount}</span>
        </button>

        {canRemove && (
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Quitar la semana ${week.weekNumber}`}
            title="Quitar semana"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {expanded && (
        <div id={contentId} className="plan-week-body">
          {sessions.length === 0 && (
            <p className="plan-empty">Esta semana todavía no tiene sesiones.</p>
          )}

          <div className="plan-session-grid">
            {sessions.map((session) => (
              <SessionCard
                key={session.key}
                session={session}
                disabled={disabled}
                onChange={(update) => onSessionChange(session.key, update)}
                onRemove={() => onRemoveSession(session.key)}
                onAddExercise={() => onAddExercise(session.key)}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onAddSession}
            disabled={disabled || week.sessions.length >= 7}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Agregar sesión</span>
          </button>
        </div>
      )}
    </section>
  );
}

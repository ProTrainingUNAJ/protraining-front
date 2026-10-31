import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { DraftExercise, DraftSession } from '../../types/trainingPlans';
import { moveExercise, WEEK_DAYS } from '../../utils/planDraft';
import { PrescribedExerciseRow } from './PrescribedExerciseRow';

interface SessionCardProps {
  session: DraftSession;
  disabled: boolean;
  onChange: (update: (session: DraftSession) => DraftSession) => void;
  onRemove: () => void;
  onAddExercise: () => void;
  // Flechas de la sesión: solo cuando hay dos o más el mismo día (KAN-542). Sin callback, la flecha
  // queda deshabilitada; si no viene ninguna de las dos, no se muestran.
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showMove?: boolean;
}

const NOTES_MAX_LENGTH = 1000;

export function SessionCard({
  session,
  disabled,
  onChange,
  onRemove,
  onAddExercise,
  onMoveUp,
  onMoveDown,
  showMove = false,
}: SessionCardProps) {
  const updateExercise = (key: string, changes: Partial<DraftExercise>) =>
    onChange((current) => ({
      ...current,
      exercises: current.exercises.map((e) => (e.key === key ? { ...e, ...changes } : e)),
    }));

  const removeExercise = (key: string) =>
    onChange((current) => ({
      ...current,
      exercises: current.exercises.filter((e) => e.key !== key),
    }));

  const notesId = `notes-${session.key}`;

  return (
    <article className="plan-session">
      <header className="plan-session-header">
        <select
          className="plan-session-day"
          value={session.dayOfWeek}
          onChange={(e) =>
            onChange((current) => ({ ...current, dayOfWeek: Number(e.target.value) }))
          }
          disabled={disabled}
          aria-label="Día de la sesión"
        >
          {WEEK_DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>

        <input
          className="plan-session-name"
          type="text"
          maxLength={100}
          value={session.name}
          onChange={(e) => onChange((current) => ({ ...current, name: e.target.value }))}
          disabled={disabled}
          placeholder="Nombre de la sesión"
          aria-label="Nombre de la sesión"
        />

        {showMove && (
          <span className="plan-move">
            <button
              type="button"
              className="plan-move-btn"
              onClick={onMoveUp}
              disabled={disabled || !onMoveUp}
              aria-label={`Subir la sesión ${session.name}`}
              title="Subir sesión"
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="plan-move-btn"
              onClick={onMoveDown}
              disabled={disabled || !onMoveDown}
              aria-label={`Bajar la sesión ${session.name}`}
              title="Bajar sesión"
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </span>
        )}

        <button
          type="button"
          className="plan-icon-btn"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Quitar la sesión ${session.name}`}
          title="Quitar sesión"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </header>

      {session.exercises.length === 0 ? (
        <p className="plan-empty">Todavía no hay ejercicios en esta sesión.</p>
      ) : (
        <ul className="plan-exercise-list">
          {session.exercises.map((exercise, index) => (
            <PrescribedExerciseRow
              key={exercise.key}
              exercise={exercise}
              disabled={disabled}
              onChange={(changes) => updateExercise(exercise.key, changes)}
              onRemove={() => removeExercise(exercise.key)}
              onMoveUp={
                index > 0
                  ? () => onChange((current) => moveExercise(current, exercise.key, -1))
                  : undefined
              }
              onMoveDown={
                index < session.exercises.length - 1
                  ? () => onChange((current) => moveExercise(current, exercise.key, 1))
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-secondary plan-add-exercise"
        onClick={onAddExercise}
        disabled={disabled}
      >
        <Plus size={16} aria-hidden="true" />
        <span>Agregar ejercicio</span>
      </button>

      <label className="plan-notes-label" htmlFor={notesId}>
        Nota del PF para la sesión
      </label>
      <textarea
        id={notesId}
        className="plan-notes"
        rows={2}
        maxLength={NOTES_MAX_LENGTH}
        value={session.coachNotes}
        onChange={(e) => onChange((current) => ({ ...current, coachNotes: e.target.value }))}
        disabled={disabled}
        placeholder="Ej. Controlar la técnica en el descenso"
      />
    </article>
  );
}

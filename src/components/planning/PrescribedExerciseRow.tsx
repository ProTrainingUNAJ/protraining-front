import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { DraftExercise } from '../../types/trainingPlans';
import { PERCENTAGE_MAX } from '../../utils/planDraft';

interface PrescribedExerciseRowProps {
  exercise: DraftExercise;
  disabled: boolean;
  onChange: (changes: Partial<DraftExercise>) => void;
  onRemove: () => void;
  // Sin callback, la flecha queda deshabilitada (el primero no sube y el último no baja).
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

// Un campo vacío queda en 0 (series y repeticiones) o sin % (null); la
// validación antes de guardar avisa si falta algo.
function toInteger(value: string): number {
  return value === '' ? 0 : Math.trunc(Number(value));
}

export function PrescribedExerciseRow({
  exercise,
  disabled,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PrescribedExerciseRowProps) {
  const label = exercise.exerciseName || 'Ejercicio sin nombre';

  return (
    <li className="plan-exercise-row">
      <span className="plan-move">
        <button
          type="button"
          className="plan-move-btn"
          onClick={onMoveUp}
          disabled={disabled || !onMoveUp}
          aria-label={`Subir ${label}`}
          title="Subir"
        >
          <ChevronUp size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="plan-move-btn"
          onClick={onMoveDown}
          disabled={disabled || !onMoveDown}
          aria-label={`Bajar ${label}`}
          title="Bajar"
        >
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </span>

      <span className="plan-exercise-name" title={label}>
        {label}
      </span>

      <label className="plan-exercise-field">
        <span>Series</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={exercise.sets || ''}
          onChange={(e) => onChange({ sets: toInteger(e.target.value) })}
          disabled={disabled}
          aria-label={`Series de ${label}`}
        />
      </label>

      <label className="plan-exercise-field">
        <span>Reps</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={exercise.reps || ''}
          onChange={(e) => onChange({ reps: toInteger(e.target.value) })}
          disabled={disabled}
          aria-label={`Repeticiones de ${label}`}
        />
      </label>

      <label className="plan-exercise-field">
        <span>%</span>
        <input
          type="number"
          inputMode="decimal"
          min={1}
          max={PERCENTAGE_MAX}
          step={2.5}
          placeholder="—"
          value={exercise.targetPercentage ?? ''}
          onChange={(e) =>
            onChange({
              targetPercentage: e.target.value === '' ? null : Number(e.target.value),
            })
          }
          disabled={disabled}
          aria-label={`Porcentaje del máximo de ${label}`}
        />
      </label>

      <button
        type="button"
        className="plan-icon-btn"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Quitar ${label}`}
        title="Quitar ejercicio"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </li>
  );
}

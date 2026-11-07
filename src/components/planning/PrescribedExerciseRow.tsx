import { ArrowLeftRight, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { DraftExercise } from '../../types/trainingPlans';
import { PERCENTAGE_MAX } from '../../utils/planDraft';

interface PrescribedExerciseRowProps {
  exercise: DraftExercise;
  disabled: boolean;
  onChange: (changes: Partial<DraftExercise>) => void;
  onRemove: () => void;
  onSwap?: () => void;
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
  onSwap,
  onMoveUp,
  onMoveDown,
}: PrescribedExerciseRowProps) {
  const label = exercise.exerciseName || 'Ejercicio sin nombre';
  const currentType = exercise.exerciseType ?? 'Weight';

  const handleTypeChange = (newType: NonNullable<DraftExercise['exerciseType']>) => {
    const isDist = newType === 'Distance';
    const isTime = newType === 'Time';
    const distVal = isDist ? exercise.targetDistanceMeters || 100 : null;
    const timeVal = isTime ? exercise.targetTimeSeconds || 30 : null;
    const repsVal = isDist ? distVal || 100 : isTime ? timeVal || 30 : exercise.reps || 10;
    const setsVal = isDist ? exercise.sets || 6 : isTime ? exercise.sets || 4 : exercise.sets || 3;

    onChange({
      exerciseType: newType,
      sets: setsVal,
      reps: repsVal,
      targetDistanceMeters: distVal,
      targetTimeSeconds: timeVal,
    });
  };

  return (
    <li className="plan-exercise-row">
      <div className="plan-exercise-header">
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

        <div className="plan-exercise-actions">
          {onSwap && (
            <button
              type="button"
              className="plan-icon-btn"
              onClick={onSwap}
              disabled={disabled}
              aria-label={`Cambiar ${label}`}
              title="Cambiar ejercicio"
            >
              <ArrowLeftRight size={16} aria-hidden="true" />
            </button>
          )}

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
        </div>
      </div>

      <div className="plan-exercise-controls">
        <select
          value={currentType}
          onChange={(e) =>
            handleTypeChange(e.target.value as NonNullable<DraftExercise['exerciseType']>)
          }
          disabled={disabled}
          className="plan-type-select"
          aria-label={`Modalidad de ${label}`}
        >
          <option value="Weight">Con carga</option>
          <option value="Reps">Repeticiones</option>
          <option value="Distance">Distancia</option>
          <option value="Time">Tiempo</option>
        </select>

        <div className="plan-exercise-fields">
          <label className="plan-exercise-field">
            <span>{currentType === 'Distance' ? 'Pasadas' : 'Series'}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={exercise.sets || ''}
              onChange={(e) => onChange({ sets: toInteger(e.target.value) })}
              disabled={disabled}
              aria-label={`Series o pasadas de ${label}`}
            />
          </label>

          {currentType === 'Distance' && (
            <label className="plan-exercise-field">
              <span>Dist (m)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={10}
                placeholder="100"
                value={exercise.targetDistanceMeters || ''}
                onChange={(e) => {
                  const val = toInteger(e.target.value);
                  onChange({ targetDistanceMeters: val, reps: val });
                }}
                disabled={disabled}
                aria-label={`Distancia en metros de ${label}`}
              />
            </label>
          )}

          {currentType === 'Time' && (
            <label className="plan-exercise-field">
              <span>Tiempo (s)</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={5}
                placeholder="30"
                value={exercise.targetTimeSeconds || ''}
                onChange={(e) => {
                  const val = toInteger(e.target.value);
                  onChange({ targetTimeSeconds: val, reps: val });
                }}
                disabled={disabled}
                aria-label={`Tiempo en segundos de ${label}`}
              />
            </label>
          )}

          {(currentType === 'Weight' || currentType === 'Reps') && (
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
          )}

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
        </div>
      </div>
    </li>
  );
}

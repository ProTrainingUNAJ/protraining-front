import { ArrowLeftRight, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  BlockExercise,
  IntensityMetric,
  WeeklyExerciseProgression,
} from '../../types/trainingPlans';
import { parseRepsNumber } from '../../utils/planDraft';
import { IntensityTypeSelector } from './IntensityTypeSelector';

interface ExerciseProgressionGridProps {
  exercise: BlockExercise;
  weekNumbers: number[];
  disabled: boolean;
  onUpdateProgression: (weekNumber: number, changes: Partial<WeeklyExerciseProgression>) => void;
  onUpdateIntensityType: (type: IntensityMetric) => void;
  onRemove: () => void;
  onSwap?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function ExerciseProgressionGrid({
  exercise,
  weekNumbers,
  disabled,
  onUpdateProgression,
  onUpdateIntensityType,
  onRemove,
  onSwap,
  onMoveUp,
  onMoveDown,
}: ExerciseProgressionGridProps) {
  const label = exercise.exerciseName || 'Ejercicio sin nombre';

  return (
    <div className="plan-exercise-block-item">
      <div className="plan-exercise-block-header">
        <div className="plan-exercise-identity">
          <span className="plan-move">
            <button
              type="button"
              className="plan-move-btn"
              onClick={onMoveUp}
              disabled={disabled || !onMoveUp}
              aria-label={`Subir ${label}`}
              title="Subir ejercicio"
            >
              <ChevronUp size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="plan-move-btn"
              onClick={onMoveDown}
              disabled={disabled || !onMoveDown}
              aria-label={`Bajar ${label}`}
              title="Bajar ejercicio"
            >
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </span>

          <span className="plan-exercise-name" title={label}>
            {label}
          </span>
          {exercise.exerciseType && exercise.exerciseType !== 'Weight' && (
            <span className="plan-exercise-badge">{exercise.exerciseType}</span>
          )}
        </div>

        <div className="plan-exercise-controls">
          <IntensityTypeSelector
            value={exercise.intensityType}
            onChange={onUpdateIntensityType}
            disabled={disabled}
          />

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
            className="plan-icon-btn plan-icon-btn-danger"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Quitar ${label}`}
            title="Quitar ejercicio"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="plan-progression-table-container">
        <table className="plan-progression-table" aria-label={`Grilla de progresión para ${label}`}>
          <thead>
            <tr>
              <th scope="col" className="col-week">
                Semana
              </th>
              <th scope="col" className="col-sets">
                Series
              </th>
              <th scope="col" className="col-reps">
                Reps / Rango
              </th>
              <th scope="col" className="col-pct">
                %RM
              </th>
              <th scope="col" className="col-intensity">
                {exercise.intensityType === 'RPE' ? 'RPE (1-10)' : 'RIR (0-5)'}
              </th>
              <th scope="col" className="col-notes">
                Nota semanal
              </th>
            </tr>
          </thead>
          <tbody>
            {weekNumbers.map((weekNum) => {
              const prog: WeeklyExerciseProgression = exercise.weeklyProgression[weekNum] || {
                weekNumber: weekNum,
                sets: 3,
                reps: 10,
                repsRange: '10',
                targetPercentage: null,
                intensityType: exercise.intensityType,
                targetRpe: exercise.intensityType === 'RPE' ? 8 : null,
                targetRir: exercise.intensityType === 'RIR' ? 2 : null,
                notes: null,
              };

              const repsDisplay = prog.repsRange ?? (prog.reps ? String(prog.reps) : '');

              return (
                <tr key={`prog-${exercise.key}-w${weekNum}`}>
                  <td className="cell-week">
                    <span className="week-tag">Sem {weekNum}</span>
                  </td>
                  <td className="cell-input">
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={prog.sets ?? ''}
                      onChange={(e) => {
                        const val =
                          e.target.value === ''
                            ? 1
                            : Math.max(1, parseInt(e.target.value, 10) || 1);
                        onUpdateProgression(weekNum, { sets: val });
                      }}
                      disabled={disabled}
                      aria-label={`Series de ${label} semana ${weekNum}`}
                      className="plan-table-input"
                    />
                  </td>
                  <td className="cell-input">
                    <input
                      type="text"
                      maxLength={15}
                      value={repsDisplay}
                      onChange={(e) => {
                        const str = e.target.value;
                        const parsed = parseRepsNumber(str, prog.reps);
                        onUpdateProgression(weekNum, {
                          repsRange: str,
                          reps: parsed,
                        });
                      }}
                      disabled={disabled}
                      placeholder="ej. 8 o 6-8"
                      aria-label={`Repeticiones de ${label} semana ${weekNum}`}
                      className="plan-table-input"
                    />
                  </td>
                  <td className="cell-input">
                    <input
                      type="number"
                      min={1}
                      max={150}
                      value={prog.targetPercentage ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        onUpdateProgression(weekNum, { targetPercentage: val });
                      }}
                      disabled={disabled}
                      placeholder="%"
                      aria-label={`%RM de ${label} semana ${weekNum}`}
                      className="plan-table-input"
                    />
                  </td>
                  <td className="cell-input">
                    {exercise.intensityType === 'RPE' ? (
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={prog.targetRpe ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          onUpdateProgression(weekNum, { targetRpe: val });
                        }}
                        disabled={disabled}
                        placeholder="1-10"
                        aria-label={`RPE de ${label} semana ${weekNum}`}
                        className="plan-table-input"
                      />
                    ) : (
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step={0.5}
                        value={prog.targetRir ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          onUpdateProgression(weekNum, { targetRir: val });
                        }}
                        disabled={disabled}
                        placeholder="0-5"
                        aria-label={`RIR de ${label} semana ${weekNum}`}
                        className="plan-table-input"
                      />
                    )}
                  </td>
                  <td className="cell-input">
                    <input
                      type="text"
                      maxLength={150}
                      value={prog.notes ?? ''}
                      onChange={(e) => onUpdateProgression(weekNum, { notes: e.target.value })}
                      disabled={disabled}
                      placeholder="Nota técnica..."
                      aria-label={`Nota de ${label} semana ${weekNum}`}
                      className="plan-table-input plan-table-input-notes"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

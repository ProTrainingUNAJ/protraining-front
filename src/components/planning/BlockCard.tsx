import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { DayBlock, IntensityMetric, WeeklyExerciseProgression } from '../../types/trainingPlans';
import { ExerciseProgressionGrid } from './ExerciseProgressionGrid';

interface BlockCardProps {
  block: DayBlock;
  weekNumbers: number[];
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRename: (newTitle: string) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onAddExercise: () => void;
  onUpdateExerciseProgression: (
    exerciseKey: string,
    weekNumber: number,
    changes: Partial<WeeklyExerciseProgression>,
  ) => void;
  onUpdateExerciseIntensity: (exerciseKey: string, type: IntensityMetric) => void;
  onRemoveExercise: (exerciseKey: string) => void;
  onSwapExercise?: (exerciseKey: string) => void;
  onMoveExerciseUp?: (exerciseIndex: number) => void;
  onMoveExerciseDown?: (exerciseIndex: number) => void;
}

export function BlockCard({
  block,
  weekNumbers,
  disabled,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRename,
  onDuplicate,
  onRemove,
  onAddExercise,
  onUpdateExerciseProgression,
  onUpdateExerciseIntensity,
  onRemoveExercise,
  onSwapExercise,
  onMoveExerciseUp,
  onMoveExerciseDown,
}: BlockCardProps) {
  return (
    <article className="card card-static plan-block-card" aria-label={`Bloque: ${block.title}`}>
      <header className="plan-block-header">
        <div className="plan-block-title-group">
          <span className="plan-block-badge">Bloque {block.order}</span>
          <input
            type="text"
            className="plan-block-title-input"
            value={block.title}
            onChange={(e) => onRename(e.target.value)}
            disabled={disabled}
            placeholder="Título del bloque (ej. Fuerza A)"
            aria-label={`Nombre del bloque ${block.order}`}
            maxLength={80}
          />
        </div>

        <div className="plan-block-actions">
          <span className="plan-move">
            <button
              type="button"
              className="plan-move-btn"
              onClick={onMoveUp}
              disabled={disabled || !canMoveUp}
              aria-label={`Subir bloque ${block.title}`}
              title="Subir bloque"
            >
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="plan-move-btn"
              onClick={onMoveDown}
              disabled={disabled || !canMoveDown}
              aria-label={`Bajar bloque ${block.title}`}
              title="Bajar bloque"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </span>

          <button
            type="button"
            className="plan-icon-btn"
            onClick={onDuplicate}
            disabled={disabled}
            aria-label={`Duplicar bloque ${block.title}`}
            title="Duplicar bloque"
          >
            <Copy size={16} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="plan-icon-btn plan-icon-btn-danger"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Eliminar bloque ${block.title}`}
            title="Eliminar bloque"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="plan-block-content">
        {block.exercises.length === 0 ? (
          <div className="plan-block-empty">
            <p>Este bloque aún no tiene ejercicios asignados.</p>
          </div>
        ) : (
          <div className="plan-block-exercises">
            {block.exercises.map((exercise, index) => (
              <ExerciseProgressionGrid
                key={exercise.key}
                exercise={exercise}
                weekNumbers={weekNumbers}
                disabled={disabled}
                onUpdateProgression={(weekNum, changes) =>
                  onUpdateExerciseProgression(exercise.key, weekNum, changes)
                }
                onUpdateIntensityType={(type) => onUpdateExerciseIntensity(exercise.key, type)}
                onRemove={() => onRemoveExercise(exercise.key)}
                onSwap={onSwapExercise ? () => onSwapExercise(exercise.key) : undefined}
                onMoveUp={index > 0 && onMoveExerciseUp ? () => onMoveExerciseUp(index) : undefined}
                onMoveDown={
                  index < block.exercises.length - 1 && onMoveExerciseDown
                    ? () => onMoveExerciseDown(index)
                    : undefined
                }
              />
            ))}
          </div>
        )}

        <div className="plan-block-footer">
          <button
            type="button"
            className="btn btn-secondary plan-add-exercise-to-block-btn"
            onClick={onAddExercise}
            disabled={disabled}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Agregar ejercicio al bloque</span>
          </button>
        </div>
      </div>
    </article>
  );
}

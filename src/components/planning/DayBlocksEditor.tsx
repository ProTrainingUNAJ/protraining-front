import { useState } from 'react';
import { Calendar, Layers, Plus, Trash2 } from 'lucide-react';
import { DayPlan, IntensityMetric, WeeklyExerciseProgression } from '../../types/trainingPlans';
import { dayLabel, dayPosition, WEEK_DAYS } from '../../utils/planDraft';
import { BlockCard } from './BlockCard';

interface DayBlocksEditorProps {
  days: DayPlan[];
  selectedDayOfWeek: number;
  weekNumbers: number[];
  disabled: boolean;
  onSelectDay: (dayOfWeek: number) => void;
  onAddDay: (dayOfWeek: number) => void;
  onRemoveDay: (dayOfWeek: number) => void;
  onAddBlock: (dayOfWeek: number) => void;
  onReorderBlocks: (dayOfWeek: number, fromIndex: number, toIndex: number) => void;
  onRenameBlock: (dayOfWeek: number, blockKey: string, newTitle: string) => void;
  onDuplicateBlock: (dayOfWeek: number, blockKey: string) => void;
  onRemoveBlock: (dayOfWeek: number, blockKey: string) => void;
  onOpenExercisePicker: (dayOfWeek: number, blockKey: string, exerciseKey?: string) => void;
  onUpdateExerciseProgression: (
    dayOfWeek: number,
    blockKey: string,
    exerciseKey: string,
    weekNumber: number,
    changes: Partial<WeeklyExerciseProgression>,
  ) => void;
  onUpdateExerciseIntensity: (
    dayOfWeek: number,
    blockKey: string,
    exerciseKey: string,
    type: IntensityMetric,
  ) => void;
  onRemoveExercise: (dayOfWeek: number, blockKey: string, exerciseKey: string) => void;
  onMoveExercise: (dayOfWeek: number, blockKey: string, fromIndex: number, toIndex: number) => void;
}

export function DayBlocksEditor({
  days,
  selectedDayOfWeek,
  weekNumbers,
  disabled,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onAddBlock,
  onReorderBlocks,
  onRenameBlock,
  onDuplicateBlock,
  onRemoveBlock,
  onOpenExercisePicker,
  onUpdateExerciseProgression,
  onUpdateExerciseIntensity,
  onRemoveExercise,
  onMoveExercise,
}: DayBlocksEditorProps) {
  const [showAddDayMenu, setShowAddDayMenu] = useState(false);

  const sortedDays = [...days].sort((a, b) => dayPosition(a.dayOfWeek) - dayPosition(b.dayOfWeek));
  const activeDay = days.find((d) => d.dayOfWeek === selectedDayOfWeek) || sortedDays[0];

  const existingDaysSet = new Set(days.map((d) => d.dayOfWeek));
  const availableWeekDays = WEEK_DAYS.filter((wd) => !existingDaysSet.has(wd.value));

  if (!activeDay) {
    return (
      <div className="plan-days-empty">
        <p>No hay días configurados en esta planificación.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAddDay(1)}
          disabled={disabled}
        >
          <Plus size={16} aria-hidden="true" />
          <span>Comenzar con Día Lunes</span>
        </button>
      </div>
    );
  }

  return (
    <div className="plan-day-blocks-editor">
      {/* Barra de pestañas por día */}
      <nav className="plan-days-tabs-nav" aria-label="Días de entrenamiento">
        <div className="plan-days-tabs-scroll">
          {sortedDays.map((day) => {
            const isSelected = day.dayOfWeek === activeDay.dayOfWeek;
            const totalExercises = day.blocks.reduce((acc, b) => acc + b.exercises.length, 0);

            return (
              <div
                key={`day-tab-${day.dayOfWeek}`}
                className={`plan-day-tab-item ${isSelected ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="plan-day-tab-btn"
                  onClick={() => onSelectDay(day.dayOfWeek)}
                  aria-selected={isSelected}
                  role="tab"
                >
                  <Calendar size={14} aria-hidden="true" className="plan-day-tab-icon" />
                  <span className="plan-day-tab-label">{dayLabel(day.dayOfWeek)}</span>
                  <span className="plan-day-tab-badge">
                    {day.blocks.length} {day.blocks.length === 1 ? 'bloque' : 'bloques'} ·{' '}
                    {totalExercises} ej.
                  </span>
                </button>

                {days.length > 1 && (
                  <button
                    type="button"
                    className="plan-day-tab-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDay(day.dayOfWeek);
                    }}
                    disabled={disabled}
                    aria-label={`Quitar día ${dayLabel(day.dayOfWeek)}`}
                    title="Quitar día"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {availableWeekDays.length > 0 && (
          <div className="plan-add-day-wrapper">
            <button
              type="button"
              className="btn btn-secondary plan-add-day-trigger"
              onClick={() => setShowAddDayMenu(!showAddDayMenu)}
              disabled={disabled}
              aria-expanded={showAddDayMenu}
              aria-label="Agregar día a la planificación"
            >
              <Plus size={15} aria-hidden="true" />
              <span>Agregar día</span>
            </button>

            {showAddDayMenu && (
              <div className="plan-add-day-menu" role="menu">
                {availableWeekDays.map((wd) => (
                  <button
                    key={`add-day-${wd.value}`}
                    type="button"
                    className="plan-add-day-option"
                    role="menuitem"
                    onClick={() => {
                      onAddDay(wd.value);
                      setShowAddDayMenu(false);
                    }}
                  >
                    {wd.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Contenido del día activo */}
      <div className="plan-day-content" role="tabpanel">
        <div className="plan-day-header">
          <div className="plan-day-info">
            <div className="plan-day-title-row">
              <h3 className="plan-day-title">
                <Layers size={18} aria-hidden="true" />
                <span>{dayLabel(activeDay.dayOfWeek)}</span>
              </h3>
              <div className="plan-day-volume-summary" aria-label="Resumen de volumen del día">
                <span className="plan-volume-badge">
                  <strong>{activeDay.blocks.length}</strong>{' '}
                  {activeDay.blocks.length === 1 ? 'bloque' : 'bloques'}
                </span>
                <span className="plan-volume-badge">
                  <strong>
                    {activeDay.blocks.reduce((acc, b) => acc + b.exercises.length, 0)}
                  </strong>{' '}
                  {activeDay.blocks.reduce((acc, b) => acc + b.exercises.length, 0) === 1
                    ? 'ejercicio'
                    : 'ejercicios'}
                </span>
                <span className="plan-volume-badge">
                  <strong>
                    {activeDay.blocks.reduce(
                      (acc, b) =>
                        acc +
                        b.exercises.reduce((exAcc, ex) => {
                          const w1 =
                            ex.weeklyProgression[1] || ex.weeklyProgression[weekNumbers[0]];
                          return exAcc + (w1?.sets ?? 3);
                        }, 0),
                      0,
                    )}
                  </strong>{' '}
                  series estimadas
                </span>
              </div>
            </div>
            <p className="plan-day-subtitle">
              Configura los bloques y la progresión semana a semana para este día.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary plan-add-block-btn"
            onClick={() => onAddBlock(activeDay.dayOfWeek)}
            disabled={disabled}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Agregar bloque</span>
          </button>
        </div>

        {/* Lista de bloques */}
        <div className="plan-blocks-list">
          {activeDay.blocks.length === 0 ? (
            <div className="plan-blocks-empty">
              <p>Este día no tiene bloques aún.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onAddBlock(activeDay.dayOfWeek)}
                disabled={disabled}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Crear primer bloque</span>
              </button>
            </div>
          ) : (
            activeDay.blocks.map((block, index) => (
              <BlockCard
                key={block.key}
                block={block}
                weekNumbers={weekNumbers}
                disabled={disabled}
                canMoveUp={index > 0}
                canMoveDown={index < activeDay.blocks.length - 1}
                onMoveUp={() => onReorderBlocks(activeDay.dayOfWeek, index, index - 1)}
                onMoveDown={() => onReorderBlocks(activeDay.dayOfWeek, index, index + 1)}
                onRename={(newTitle) => onRenameBlock(activeDay.dayOfWeek, block.key, newTitle)}
                onDuplicate={() => onDuplicateBlock(activeDay.dayOfWeek, block.key)}
                onRemove={() => onRemoveBlock(activeDay.dayOfWeek, block.key)}
                onAddExercise={() => onOpenExercisePicker(activeDay.dayOfWeek, block.key)}
                onUpdateExerciseProgression={(exerciseKey, weekNum, changes) =>
                  onUpdateExerciseProgression(
                    activeDay.dayOfWeek,
                    block.key,
                    exerciseKey,
                    weekNum,
                    changes,
                  )
                }
                onUpdateExerciseIntensity={(exerciseKey, type) =>
                  onUpdateExerciseIntensity(activeDay.dayOfWeek, block.key, exerciseKey, type)
                }
                onRemoveExercise={(exerciseKey) =>
                  onRemoveExercise(activeDay.dayOfWeek, block.key, exerciseKey)
                }
                onSwapExercise={(exerciseKey) =>
                  onOpenExercisePicker(activeDay.dayOfWeek, block.key, exerciseKey)
                }
                onMoveExerciseUp={(exIndex) =>
                  onMoveExercise(activeDay.dayOfWeek, block.key, exIndex, exIndex - 1)
                }
                onMoveExerciseDown={(exIndex) =>
                  onMoveExercise(activeDay.dayOfWeek, block.key, exIndex, exIndex + 1)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  Layers,
  Loader2,
  Plus,
  Save,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { WeekSection } from '../../components/planning/WeekSection';
import { DayBlocksEditor } from '../../components/planning/DayBlocksEditor';
import { ExercisePickerModal } from '../../components/planning/ExercisePickerModal';
import { AssignPlanModal } from '../../components/planning/AssignPlanModal';
import { trainingPlansService } from '../../api/trainingPlans';
import { exercisesService } from '../../api/exercises';
import {
  CatalogExercise,
  DayPlan,
  DraftSession,
  DraftWeek,
  IntensityMetric,
  PlanDraft,
  WeeklyExerciseProgression,
} from '../../types/trainingPlans';
import { SaveAsTemplateModal } from '../../components/planning/SaveAsTemplateModal';
import {
  createBlockExercise,
  createDayPlan,
  createExercise,
  createSession,
  createWeek,
  daysToPlanDraft,
  duplicateBlock,
  moveSession,
  type MoveDirection,
  planDraftToDays,
  reorderBlocks,
  toDraft,
  toSaveRequest,
  validateDraft,
} from '../../utils/planDraft';

interface PickerTarget {
  weekKey?: string;
  sessionKey?: string;
  dayOfWeek?: number;
  blockKey?: string;
  exerciseKey?: string;
}

export function PlanEditorPage() {
  const { planId = '' } = useParams();
  const location = useLocation();

  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'blocks' | 'weeks'>('blocks');

  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null,
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(
    (location.state as { warning?: string } | null)?.warning ?? null,
  );
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  useEffect(() => {
    let active = true;
    trainingPlansService
      .get(planId)
      .then((plan) => {
        if (!active) return;
        const loaded = toDraft(plan);
        setDraft(loaded);
        const parsedDays = planDraftToDays(loaded);
        setDays(parsedDays);
        if (parsedDays.length > 0) {
          setSelectedDayOfWeek(parsedDays[0].dayOfWeek);
        }
        setExpandedWeeks(new Set(loaded.weeks.slice(0, 1).map((w) => w.key)));

        // Enriquecer ejercicios con fotos o músculos si faltasen
        const allExercises = parsedDays.flatMap((d) => d.blocks.flatMap((b) => b.exercises));
        const missingIds = allExercises
          .filter(
            (e) =>
              !e.images ||
              e.images.length === 0 ||
              !e.primaryMuscles ||
              e.primaryMuscles.length === 0,
          )
          .map((e) => e.exerciseId);

        if (missingIds.length > 0) {
          exercisesService
            .getByIds(missingIds)
            .then((catalogItems) => {
              if (!active || catalogItems.length === 0) return;
              const catalogMap = new Map(catalogItems.map((c) => [c.id, c]));
              setDays((prevDays) =>
                prevDays.map((d) => ({
                  ...d,
                  blocks: d.blocks.map((b) => ({
                    ...b,
                    exercises: b.exercises.map((e) => {
                      const cat = catalogMap.get(e.exerciseId);
                      if (!cat) return e;
                      return {
                        ...e,
                        images: e.images && e.images.length > 0 ? e.images : (cat.images ?? []),
                        primaryMuscles:
                          e.primaryMuscles && e.primaryMuscles.length > 0
                            ? e.primaryMuscles
                            : (cat.primaryMuscles ?? []),
                        secondaryMuscles:
                          e.secondaryMuscles && e.secondaryMuscles.length > 0
                            ? e.secondaryMuscles
                            : (cat.secondaryMuscles ?? []),
                        muscleGroup: e.muscleGroup || cat.muscleGroup,
                      };
                    }),
                  })),
                })),
              );
            })
            .catch(() => {
              // Silencioso: fallback gráfico activo
            });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la planificación.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [planId]);

  // Avisa si el PF cierra o recarga la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const editDraft = useCallback((update: (current: PlanDraft) => PlanDraft) => {
    setDraft((current) => {
      if (!current) return current;
      const updated = update(current);
      setDays(planDraftToDays(updated));
      return updated;
    });
    setDirty(true);
    setSavedMessage(null);
  }, []);

  const updateDaysState = useCallback((updater: (prevDays: DayPlan[]) => DayPlan[]) => {
    setDays((currentDays) => {
      const nextDays = updater(currentDays);
      setDraft((currentDraft) => {
        if (!currentDraft) return currentDraft;
        return daysToPlanDraft(nextDays, currentDraft);
      });
      return nextDays;
    });
    setDirty(true);
    setSavedMessage(null);
  }, []);

  const editWeek = (weekKey: string, update: (week: DraftWeek) => DraftWeek) =>
    editDraft((current) => ({
      ...current,
      weeks: current.weeks.map((w) => (w.key === weekKey ? update(w) : w)),
    }));

  const editSession = (
    weekKey: string,
    sessionKey: string,
    update: (session: DraftSession) => DraftSession,
  ) =>
    editWeek(weekKey, (week) => ({
      ...week,
      sessions: week.sessions.map((s) => (s.key === sessionKey ? update(s) : s)),
    }));

  const toggleWeek = (weekKey: string) =>
    setExpandedWeeks((current) => {
      const next = new Set(current);
      if (next.has(weekKey)) next.delete(weekKey);
      else next.add(weekKey);
      return next;
    });

  const addWeek = () => {
    if (!draft) return;
    const week = createWeek(draft.weeks);
    const updatedWeeks = [...draft.weeks, week];
    const nextDraft = { ...draft, weeks: updatedWeeks };
    setDraft(nextDraft);
    setDays(planDraftToDays(nextDraft));
    setDirty(true);
  };

  const removeWeek = (weekKey: string) => {
    if (!draft) return;
    const updatedWeeks = draft.weeks.filter((w) => w.key !== weekKey);
    const nextDraft = { ...draft, weeks: updatedWeeks };
    setDraft(nextDraft);
    setDays(planDraftToDays(nextDraft));
    setDirty(true);
  };

  const addSession = (weekKey: string) =>
    editWeek(weekKey, (week) => {
      const session = createSession(week);
      return {
        ...week,
        sessions: [...week.sessions, session],
        nextSessionOrder: week.nextSessionOrder + 1,
      };
    });

  const removeSession = (weekKey: string, sessionKey: string) =>
    editWeek(weekKey, (week) => ({
      ...week,
      sessions: week.sessions.filter((s) => s.key !== sessionKey),
    }));

  const reorderSession = (weekKey: string, sessionKey: string, direction: MoveDirection) =>
    editWeek(weekKey, (week) => moveSession(week, sessionKey, direction));

  // --- Manejo de Bloques (KAN-587) ---
  const handleAddDay = (dayOfWeek: number) => {
    const newDay = createDayPlan(dayOfWeek);
    updateDaysState((prev) => [...prev, newDay]);
    setSelectedDayOfWeek(dayOfWeek);
  };

  const handleRemoveDay = (dayOfWeek: number) => {
    updateDaysState((prev) => {
      const filtered = prev.filter((d) => d.dayOfWeek !== dayOfWeek);
      if (selectedDayOfWeek === dayOfWeek && filtered.length > 0) {
        setSelectedDayOfWeek(filtered[0].dayOfWeek);
      }
      return filtered;
    });
  };

  const handleAddBlock = (dayOfWeek: number) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const nextOrder = d.blocks.length + 1;
        return {
          ...d,
          blocks: [
            ...d.blocks,
            {
              key: `block-custom-${Date.now()}-${nextOrder}`,
              title: `Bloque ${nextOrder}`,
              order: nextOrder,
              exercises: [],
            },
          ],
        };
      }),
    );
  };

  const handleReorderBlocks = (dayOfWeek: number, fromIndex: number, toIndex: number) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: reorderBlocks(d.blocks, fromIndex, toIndex),
        };
      }),
    );
  };

  const handleRenameBlock = (dayOfWeek: number, blockKey: string, newTitle: string) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => (b.key === blockKey ? { ...b, title: newTitle } : b)),
        };
      }),
    );
  };

  const handleDuplicateBlock = (dayOfWeek: number, blockKey: string) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const blockIdx = d.blocks.findIndex((b) => b.key === blockKey);
        if (blockIdx === -1) return d;
        const cloned = duplicateBlock(d.blocks[blockIdx]);
        const updatedBlocks = [...d.blocks];
        updatedBlocks.splice(blockIdx + 1, 0, cloned);
        return {
          ...d,
          blocks: updatedBlocks.map((b, idx) => ({ ...b, order: idx + 1 })),
        };
      }),
    );
  };

  const handleRemoveBlock = (dayOfWeek: number, blockKey: string) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: d.blocks
            .filter((b) => b.key !== blockKey)
            .map((b, idx) => ({ ...b, order: idx + 1 })),
        };
      }),
    );
  };

  const handleUpdateExerciseProgression = (
    dayOfWeek: number,
    blockKey: string,
    exerciseKey: string,
    weekNumber: number,
    changes: Partial<WeeklyExerciseProgression>,
  ) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.key !== blockKey) return b;
            return {
              ...b,
              exercises: b.exercises.map((ex) => {
                if (ex.key !== exerciseKey) return ex;
                const existingProg = ex.weeklyProgression[weekNumber] || {
                  weekNumber,
                  sets: 3,
                  reps: 10,
                  repsRange: '10',
                  targetPercentage: null,
                  intensityType: ex.intensityType,
                };
                return {
                  ...ex,
                  weeklyProgression: {
                    ...ex.weeklyProgression,
                    [weekNumber]: {
                      ...existingProg,
                      ...changes,
                    },
                  },
                };
              }),
            };
          }),
        };
      }),
    );
  };

  const handleUpdateExerciseIntensity = (
    dayOfWeek: number,
    blockKey: string,
    exerciseKey: string,
    type: IntensityMetric,
  ) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.key !== blockKey) return b;
            return {
              ...b,
              exercises: b.exercises.map((ex) => {
                if (ex.key !== exerciseKey) return ex;
                const updatedWeekly: Record<number, WeeklyExerciseProgression> = {};
                Object.entries(ex.weeklyProgression).forEach(([w, prog]) => {
                  const numW = Number(w);
                  updatedWeekly[numW] = {
                    ...prog,
                    intensityType: type,
                    targetRpe: type === 'RPE' ? (prog.targetRpe ?? 8) : null,
                    targetRir: type === 'RIR' ? (prog.targetRir ?? 2) : null,
                  };
                });
                return {
                  ...ex,
                  intensityType: type,
                  weeklyProgression: updatedWeekly,
                };
              }),
            };
          }),
        };
      }),
    );
  };

  const handleRemoveBlockExercise = (dayOfWeek: number, blockKey: string, exerciseKey: string) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.key !== blockKey) return b;
            return {
              ...b,
              exercises: b.exercises
                .filter((e) => e.key !== exerciseKey)
                .map((e, idx) => ({ ...e, order: idx + 1 })),
            };
          }),
        };
      }),
    );
  };

  const handleMoveBlockExercise = (
    dayOfWeek: number,
    blockKey: string,
    fromIndex: number,
    toIndex: number,
  ) => {
    updateDaysState((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.key !== blockKey) return b;
            if (
              fromIndex < 0 ||
              fromIndex >= b.exercises.length ||
              toIndex < 0 ||
              toIndex >= b.exercises.length
            ) {
              return b;
            }
            const exList = [...b.exercises];
            const [moved] = exList.splice(fromIndex, 1);
            exList.splice(toIndex, 0, moved);
            return {
              ...b,
              exercises: exList.map((e, idx) => ({ ...e, order: idx + 1 })),
            };
          }),
        };
      }),
    );
  };

  const handleOpenBlockExercisePicker = (
    dayOfWeek: number,
    blockKey: string,
    exerciseKey?: string,
  ) => {
    setPickerTarget({ dayOfWeek, blockKey, exerciseKey });
  };

  const addExercise = (exercise: CatalogExercise) => {
    if (!pickerTarget) return;

    // Modo Bloques (KAN-587)
    if (pickerTarget.dayOfWeek != null && pickerTarget.blockKey != null) {
      const { dayOfWeek, blockKey, exerciseKey } = pickerTarget;
      const weekNumbers = draft?.weeks.map((w) => w.weekNumber) || [1, 2, 3, 4];

      updateDaysState((prev) =>
        prev.map((d) => {
          if (d.dayOfWeek !== dayOfWeek) return d;
          return {
            ...d,
            blocks: d.blocks.map((b) => {
              if (b.key !== blockKey) return b;

              // Sustituir ejercicio
              if (exerciseKey) {
                return {
                  ...b,
                  exercises: b.exercises.map((e) =>
                    e.key === exerciseKey
                      ? {
                          ...e,
                          exerciseId: exercise.id,
                          exerciseName: exercise.name,
                          exerciseType: exercise.exerciseType ?? 'Weight',
                          images: exercise.images ?? [],
                          primaryMuscles: exercise.primaryMuscles ?? [],
                          secondaryMuscles: exercise.secondaryMuscles ?? [],
                          muscleGroup: exercise.muscleGroup,
                        }
                      : e,
                  ),
                };
              }

              // Agregar ejercicio nuevo
              const newEx = createBlockExercise(exercise, b.exercises.length + 1, weekNumbers);
              return {
                ...b,
                exercises: [...b.exercises, newEx],
              };
            }),
          };
        }),
      );
      setPickerTarget(null);
      return;
    }

    // Modo Semanas tradicional
    if (pickerTarget.weekKey && pickerTarget.sessionKey) {
      editSession(pickerTarget.weekKey, pickerTarget.sessionKey, (session) => {
        const item = createExercise(session, exercise);
        return {
          ...session,
          exercises: [...session.exercises, item],
          nextExerciseOrder: session.nextExerciseOrder + 1,
        };
      });
      setPickerTarget(null);
    }
  };

  const closePicker = () => setPickerTarget(null);

  const save = async () => {
    if (!draft) return;
    const currentDraft =
      viewMode === 'blocks' && days.length > 0 ? daysToPlanDraft(days, draft) : draft;

    const validationError = validateDraft(currentDraft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await trainingPlansService.update(planId, toSaveRequest(currentDraft));
      const nextDraft = toDraft(updated);
      setDraft(nextDraft);
      const parsedDays = planDraftToDays(nextDraft);
      setDays(parsedDays);
      setDirty(false);
      setSavedMessage('Planificación guardada.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la planificación.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssigned = () => {
    setShowAssign(false);
    setSavedMessage('Planificación asignada exitosamente.');
  };

  const closeAssign = () => setShowAssign(false);

  const backLink = (
    <Link to="/pf/planning" className="btn btn-secondary">
      <ArrowLeft size={16} aria-hidden="true" />
      <span>Volver</span>
    </Link>
  );

  if (loading) {
    return (
      <div className="app-page-container">
        <p className="plan-empty plan-inline">
          <Loader2 size={16} className="plan-spin" aria-hidden="true" />
          Cargando la planificación…
        </p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="app-page-container">
        <PageHeader title="Planificación" actions={backLink} />
        <div className="alert-banner danger" role="alert">
          <span className="plan-inline">
            <AlertCircle size={18} aria-hidden="true" />
            {error ?? 'No se encontró la planificación.'}
          </span>
        </div>
      </div>
    );
  }

  const lastWeekKey = draft.weeks[draft.weeks.length - 1]?.key;
  const weekNumbers = draft.weeks.map((w) => w.weekNumber).sort((a, b) => a - b);

  return (
    <div className="app-page-container">
      {/* Header Compacto y Accesible del Builder (KAN-623) */}
      <header className="plan-builder-compact-header" aria-label="Controles de la planificación">
        <div className="plan-builder-header-main-row">
          <div className="plan-builder-title-group">
            {backLink}
            <div className="plan-builder-name-wrap">
              <input
                type="text"
                className="plan-builder-name-input"
                maxLength={200}
                value={draft.name}
                onChange={(e) => editDraft((current) => ({ ...current, name: e.target.value }))}
                disabled={saving}
                placeholder="Nombre de la planificación *"
                aria-label="Nombre de la planificación"
              />
              {dirty && <span className="badge badge-warning">Cambios sin guardar</span>}
            </div>
          </div>

          <div className="plan-view-selector" role="group" aria-label="Modo de visualización">
            <button
              type="button"
              className={`plan-view-btn ${viewMode === 'blocks' ? 'active' : ''}`}
              onClick={() => setViewMode('blocks')}
              aria-pressed={viewMode === 'blocks'}
            >
              <Layers size={14} aria-hidden="true" />
              <span>Por Bloques (Semanal)</span>
            </button>
            <button
              type="button"
              className={`plan-view-btn ${viewMode === 'weeks' ? 'active' : ''}`}
              onClick={() => setViewMode('weeks')}
              aria-pressed={viewMode === 'weeks'}
            >
              <Calendar size={14} aria-hidden="true" />
              <span>Por Semanas</span>
            </button>
          </div>

          <div className="plan-builder-actions">
            <button
              type="button"
              className="btn btn-secondary plan-builder-action-btn"
              onClick={() => setShowSaveTemplate(true)}
              disabled={saving || dirty}
              title={
                dirty
                  ? 'Guardá los cambios antes de crear una plantilla'
                  : 'Guardar esta planificación como plantilla reutilizable'
              }
            >
              <Bookmark size={15} aria-hidden="true" />
              <span>Plantilla</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary plan-builder-action-btn"
              onClick={() => setShowAssign(true)}
              disabled={saving || dirty}
              title={
                dirty
                  ? 'Guardá los cambios antes de asignar'
                  : 'Asignar a una categoría o a un atleta'
              }
            >
              <UserPlus size={15} aria-hidden="true" />
              <span>Asignar</span>
            </button>
            <button
              type="button"
              className="btn btn-primary plan-builder-save-btn"
              onClick={save}
              disabled={saving || !dirty}
            >
              {saving ? (
                <Loader2 size={15} className="plan-spin" aria-hidden="true" />
              ) : (
                <Save size={15} aria-hidden="true" />
              )}
              <span>{saving ? 'Guardando…' : 'Guardar'}</span>
            </button>
          </div>
        </div>

        <div className="plan-builder-header-sub-row">
          <input
            type="text"
            className="plan-builder-objective-input"
            maxLength={500}
            value={draft.objective || ''}
            onChange={(e) => editDraft((current) => ({ ...current, objective: e.target.value }))}
            disabled={saving}
            placeholder="Objetivo deportivo (opcional, ej. Pretemporada, Fuerza máxima...)"
            aria-label="Objetivo deportivo"
          />
        </div>
      </header>

      <div className="app-page-body">
        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
            <button
              type="button"
              className="plan-icon-btn"
              onClick={() => setError(null)}
              aria-label="Cerrar error"
            >
              ×
            </button>
          </div>
        )}

        {warningMessage && (
          <div className="alert-banner warning" role="status">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {warningMessage}
            </span>
            <button
              type="button"
              className="plan-icon-btn"
              onClick={() => setWarningMessage(null)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        )}

        {savedMessage && !dirty && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <Check size={18} aria-hidden="true" />
              {savedMessage}
            </span>
          </div>
        )}

        {/* Vista por Bloques (KAN-587) */}
        {viewMode === 'blocks' ? (
          <DayBlocksEditor
            days={days}
            selectedDayOfWeek={selectedDayOfWeek}
            weekNumbers={weekNumbers.length > 0 ? weekNumbers : [1, 2, 3, 4]}
            disabled={saving}
            onSelectDay={setSelectedDayOfWeek}
            onAddDay={handleAddDay}
            onRemoveDay={handleRemoveDay}
            onAddBlock={handleAddBlock}
            onReorderBlocks={handleReorderBlocks}
            onRenameBlock={handleRenameBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onRemoveBlock={handleRemoveBlock}
            onOpenExercisePicker={handleOpenBlockExercisePicker}
            onUpdateExerciseProgression={handleUpdateExerciseProgression}
            onUpdateExerciseIntensity={handleUpdateExerciseIntensity}
            onRemoveExercise={handleRemoveBlockExercise}
            onMoveExercise={handleMoveBlockExercise}
          />
        ) : (
          /* Vista tradicional por Semanas */
          <>
            {draft.weeks.length === 0 && (
              <p className="plan-empty">Esta planificación todavía no tiene semanas.</p>
            )}

            {draft.weeks.map((week) => (
              <WeekSection
                key={week.key}
                week={week}
                expanded={expandedWeeks.has(week.key)}
                disabled={saving}
                canRemove={week.key === lastWeekKey}
                onToggle={() => toggleWeek(week.key)}
                onRemove={() => removeWeek(week.key)}
                onAddSession={() => addSession(week.key)}
                onSessionChange={(sessionKey, update) => editSession(week.key, sessionKey, update)}
                onRemoveSession={(sessionKey) => removeSession(week.key, sessionKey)}
                onAddExercise={(sessionKey) => setPickerTarget({ weekKey: week.key, sessionKey })}
                onMoveSession={(sessionKey, direction) =>
                  reorderSession(week.key, sessionKey, direction)
                }
              />
            ))}

            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addWeek}
                disabled={saving}
              >
                <Plus size={16} aria-hidden="true" />
                <span>Agregar semana</span>
              </button>
            </div>
          </>
        )}
      </div>

      {pickerTarget && <ExercisePickerModal onClose={closePicker} onSelect={addExercise} />}

      {showAssign && (
        <AssignPlanModal
          planId={draft.id}
          planName={draft.name}
          onClose={closeAssign}
          onAssigned={handleAssigned}
        />
      )}

      {showSaveTemplate && (
        <SaveAsTemplateModal
          planId={draft.id}
          defaultName={draft.name}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={(templateName) => {
            setShowSaveTemplate(false);
            setSavedMessage(
              `Plantilla «${templateName}» guardada exitosamente. Ya podés encontrarla en el Catálogo de plantillas.`,
            );
          }}
        />
      )}
    </div>
  );
}

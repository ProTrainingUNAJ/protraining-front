import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Layers,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { WeekSection } from '../../components/planning/WeekSection';
import { DayBlocksEditor } from '../../components/planning/DayBlocksEditor';
import { ExercisePickerModal } from '../../components/planning/ExercisePickerModal';
import { planDraftsService } from '../../api/planDrafts';
import { exercisesService } from '../../api/exercises';
import { structureService } from '../../api/structureService';
import { PlanDraftResponse } from '../../api/generated/asistente';
import {
  CatalogExercise,
  DayPlan,
  DraftSession,
  DraftWeek,
  IntensityMetric,
  PlanDraft,
  WeeklyExerciseProgression,
} from '../../types/trainingPlans';
import {
  aiDraftToEditableDraft,
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
  swapExercise,
  toUpdateDraftRequest,
  validateDraft,
} from '../../utils/planDraft';
import { formatIsoDate } from '../../utils/argentinaDate';

interface DraftLocationState {
  draft?: PlanDraftResponse;
  targetName?: string;
}

interface PickerTarget {
  mode: 'add' | 'swap';
  weekKey?: string;
  sessionKey?: string;
  dayOfWeek?: number;
  blockKey?: string;
  exerciseKey?: string;
}

function formatProviderLabel(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (normalized === 'rules' || normalized === 'reglas') {
    return 'Reglas';
  }
  if (normalized === 'ollama') {
    return 'Ollama';
  }
  if (normalized === 'gemini') {
    return 'Gemini';
  }
  return provider;
}

export function AssistantDraftPage() {
  const { draftId = '' } = useParams<{ draftId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const stateDraft = (location.state as DraftLocationState | null)?.draft ?? null;
  const matchedStateDraft = stateDraft && stateDraft.id === draftId ? stateDraft : null;

  const [draft, setDraft] = useState<PlanDraftResponse | null>(matchedStateDraft);
  const [editableDraft, setEditableDraft] = useState<PlanDraft | null>(null);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'blocks' | 'weeks'>('blocks');
  const [targetLabel, setTargetLabel] = useState<string>('Cargando destinatario…');
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);
  const [discarding, setDiscarding] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState<boolean>(false);

  // Carga inicial del borrador, catálogo de ejercicios y nombre del destinatario.
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const loadedDraft = matchedStateDraft ?? (await planDraftsService.get(draftId));
        if (!active) return;
        setDraft(loadedDraft);

        // 1. Catálogo para resolver nombres de los ejercicios del borrador
        const exerciseNamesMap: Record<string, string> = {};
        try {
          const draftExerciseIds = Array.from(
            new Set(
              (loadedDraft.weeks ?? []).flatMap((week) =>
                (week.sessions ?? []).flatMap((session) =>
                  (session.exercises ?? [])
                    .map((ex) => ex.exerciseId)
                    .filter((id): id is string => Boolean(id)),
                ),
              ),
            ),
          );
          if (draftExerciseIds.length > 0) {
            const catalogExercises = await exercisesService.getByIds(draftExerciseIds);
            if (active) {
              for (const item of catalogExercises) {
                exerciseNamesMap[item.id] = item.name;
              }
            }
          }
        } catch {
          // Si falla la búsqueda del catálogo, se continuará con nombres de fallback
        }

        // 2. Destinatario (categoría o atleta)
        let resolvedTarget = 'Sin asignar';
        try {
          if (loadedDraft.categoryId) {
            const orgs = await structureService.getOrganizations();
            const cats = (
              await Promise.all(
                orgs.map((o) => structureService.getCategories(o.id).catch(() => [])),
              )
            ).flat();
            const foundCat = cats.find((c) => c.id === loadedDraft.categoryId);
            resolvedTarget = foundCat ? `Categoría · ${foundCat.name}` : 'Categoría seleccionada';
          } else if (loadedDraft.athleteId) {
            const athletes = await structureService.getAthletes().catch(() => []);
            const foundAthlete = athletes.find((a) => a.id === loadedDraft.athleteId);
            resolvedTarget = foundAthlete
              ? `Atleta · ${foundAthlete.fullName || `${foundAthlete.firstName} ${foundAthlete.lastName}`.trim()}`
              : 'Atleta seleccionado';
          }
        } catch {
          resolvedTarget = loadedDraft.categoryId ? 'Categoría' : 'Atleta';
        }

        if (!active) return;
        setTargetLabel(resolvedTarget);

        // 3. Inicializar modelo editable
        const initialEditable = aiDraftToEditableDraft(loadedDraft, exerciseNamesMap);
        setEditableDraft(initialEditable);
        const parsedDays = planDraftToDays(initialEditable);
        setDays(parsedDays);
        if (parsedDays.length > 0) {
          setSelectedDayOfWeek(parsedDays[0].dayOfWeek);
        }
        setExpandedWeeks(new Set(initialEditable.weeks.map((w) => w.key)));
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el borrador.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [draftId, matchedStateDraft]);

  // Alerta si el PF intenta cerrar o recargar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const editDraft = useCallback((update: (current: PlanDraft) => PlanDraft) => {
    setEditableDraft((current) => {
      if (!current) return current;
      const updated = update(current);
      setDays(planDraftToDays(updated));
      return updated;
    });
    setDirty(true);
    setSavedMessage(null);
    setError(null);
  }, []);

  const updateDaysState = useCallback((updater: (prevDays: DayPlan[]) => DayPlan[]) => {
    setDays((currentDays) => {
      const nextDays = updater(currentDays);
      setEditableDraft((currentDraft) => {
        if (!currentDraft) return currentDraft;
        return daysToPlanDraft(nextDays, currentDraft);
      });
      return nextDays;
    });
    setDirty(true);
    setSavedMessage(null);
    setError(null);
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
    if (!editableDraft) return;
    const week = createWeek(editableDraft.weeks);
    const updatedWeeks = [...editableDraft.weeks, week];
    const nextDraft = { ...editableDraft, weeks: updatedWeeks };
    setEditableDraft(nextDraft);
    setDays(planDraftToDays(nextDraft));
    setExpandedWeeks((current) => new Set(current).add(week.key));
    setDirty(true);
  };

  const removeWeek = (weekKey: string) => {
    if (!editableDraft) return;
    const updatedWeeks = editableDraft.weeks.filter((w) => w.key !== weekKey);
    const nextDraft = { ...editableDraft, weeks: updatedWeeks };
    setEditableDraft(nextDraft);
    setDays(planDraftToDays(nextDraft));
    setDirty(true);
  };

  const addSession = (weekKey: string) =>
    editWeek(weekKey, (week) => ({
      ...week,
      sessions: [...week.sessions, createSession(week)],
      nextSessionOrder: week.nextSessionOrder + 1,
    }));

  const removeSession = (weekKey: string, sessionKey: string) =>
    editWeek(weekKey, (week) => ({
      ...week,
      sessions: week.sessions.filter((s) => s.key !== sessionKey),
    }));

  const handleMoveSession = (weekKey: string, sessionKey: string, direction: MoveDirection) =>
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
    setPickerTarget({ mode: exerciseKey ? 'swap' : 'add', dayOfWeek, blockKey, exerciseKey });
  };

  const openPickerForAdd = (weekKey: string, sessionKey: string) =>
    setPickerTarget({ mode: 'add', weekKey, sessionKey });

  const openPickerForSwap = (weekKey: string, sessionKey: string, exerciseKey: string) =>
    setPickerTarget({ mode: 'swap', weekKey, sessionKey, exerciseKey });

  const closePicker = useCallback(() => setPickerTarget(null), []);

  const handleSelectExercise = (exercise: CatalogExercise) => {
    if (!pickerTarget) return;

    // Modo Bloques (KAN-587)
    if (pickerTarget.dayOfWeek != null && pickerTarget.blockKey != null) {
      const { dayOfWeek, blockKey, exerciseKey } = pickerTarget;
      const weekNums = editableDraft?.weeks.map((w) => w.weekNumber) || [1, 2, 3, 4];

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
                        }
                      : e,
                  ),
                };
              }

              // Agregar ejercicio nuevo
              const newEx = createBlockExercise(exercise, b.exercises.length + 1, weekNums);
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
    if (pickerTarget.mode === 'add' && pickerTarget.weekKey && pickerTarget.sessionKey) {
      editSession(pickerTarget.weekKey, pickerTarget.sessionKey, (session) => ({
        ...session,
        exercises: [...session.exercises, createExercise(session, exercise)],
        nextExerciseOrder: session.nextExerciseOrder + 1,
      }));
    } else if (
      pickerTarget.mode === 'swap' &&
      pickerTarget.weekKey &&
      pickerTarget.sessionKey &&
      pickerTarget.exerciseKey
    ) {
      editSession(pickerTarget.weekKey, pickerTarget.sessionKey, (session) =>
        swapExercise(session, pickerTarget.exerciseKey!, exercise),
      );
    }

    setPickerTarget(null);
  };

  // Guardar cambios en el borrador (PUT /api/v1/assistant/plan-drafts/{id})
  const saveDraft = async (): Promise<boolean> => {
    if (!editableDraft || !draft) return false;

    const currentDraft =
      viewMode === 'blocks' && days.length > 0
        ? daysToPlanDraft(days, editableDraft)
        : editableDraft;

    const problem = validateDraft(currentDraft);
    if (problem) {
      setError(problem);
      return false;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = toUpdateDraftRequest(currentDraft, draft.justificationSummary);
      const updated = await planDraftsService.update(draftId, payload);
      setDraft(updated);
      setDirty(false);
      setSavedMessage('Borrador guardado exitosamente.');
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el borrador.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Aprobar borrador (POST /api/v1/assistant/plan-drafts/{id}/approve)
  const handleApprove = async () => {
    if (!draft || !editableDraft || approving || saving) return;

    // Si hay modificaciones sin guardar, se guardan primero.
    if (dirty) {
      const saved = await saveDraft();
      if (!saved) return;
    }

    setApproving(true);
    setError(null);

    try {
      const res = await planDraftsService.approve(draftId);

      // Si la planificación se creó pero falló la asignación automática, se avisa y se lleva al editor
      if (!res.assigned) {
        const warningMsg =
          res.warning ||
          (res.warnings && res.warnings[0]) ||
          'La planificación se creó correctamente, pero no se pudo asignar de forma automática. Podés asignarla a mano desde el editor.';
        navigate(`/pf/planning/${res.planId}`, { state: { warning: warningMsg } });
        return;
      }

      // Asignación exitosa
      navigate(`/pf/planning/${res.planId}`, {
        state: { message: 'Planificación aprobada y asignada exitosamente.' },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo aprobar la planificación.');
      setApproving(false);
    }
  };

  // Descartar borrador (POST /api/v1/assistant/plan-drafts/{id}/discard)
  const handleDiscard = async () => {
    if (discarding) return;
    setDiscarding(true);
    setError(null);
    try {
      await planDraftsService.discard(draftId);
      navigate('/pf/planning', {
        state: { message: 'El borrador de planificación fue descartado.' },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo descartar el borrador.');
      setDiscarding(false);
      setShowDiscardModal(false);
    }
  };

  const isTerminalStatus = draft?.status === 'Approved' || draft?.status === 'Discarded';
  const lastWeekKey = editableDraft?.weeks[editableDraft.weeks.length - 1]?.key;
  const weekNumbers = editableDraft?.weeks.map((w) => w.weekNumber) ?? [1, 2, 3, 4];
  const totalSessions =
    editableDraft?.weeks.reduce((acc, week) => acc + week.sessions.length, 0) ?? 0;

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      dirty &&
      !window.confirm('Tenés cambios sin guardar en el borrador. ¿Seguro que querés salir?')
    ) {
      e.preventDefault();
    }
  };

  const headerActions = (
    <>
      <Link to="/pf/planning" className="btn btn-secondary" onClick={handleBackClick}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Planificaciones</span>
      </Link>
      {!isTerminalStatus && (
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDiscardModal(true)}
            disabled={saving || approving || discarding}
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>Descartar</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={saveDraft}
            disabled={saving || approving || !dirty}
            title={dirty ? 'Guardar cambios del borrador' : 'No hay cambios para guardar'}
          >
            {saving ? (
              <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            <span>{saving ? 'Guardando…' : 'Guardar'}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={saving || approving || discarding}
            title="Aprobar el borrador y crearlo en Entrenamiento"
          >
            {approving ? (
              <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            ) : (
              <CheckCircle2 size={16} aria-hidden="true" />
            )}
            <span>{approving ? 'Aprobando…' : 'Aprobar y asignar'}</span>
          </button>
        </>
      )}
    </>
  );

  if (loading) {
    return (
      <div className="app-page-container">
        <PageHeader title="Borrador de planificación" actions={headerActions} />
        <div className="app-page-body">
          <p className="plan-empty plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Cargando borrador y catálogo…
          </p>
        </div>
      </div>
    );
  }

  if (!draft || !editableDraft) {
    return (
      <div className="app-page-container">
        <PageHeader title="Borrador de planificación" actions={headerActions} />
        <div className="app-page-body">
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error ?? 'No se encontró el borrador solicitado.'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const providerLabel = formatProviderLabel(draft.provider);

  return (
    <div className="app-page-container">
      <PageHeader
        title={editableDraft.name || 'Borrador generado con IA'}
        description={editableDraft.objective || draft.goal}
        actions={headerActions}
      />

      <div className="app-page-body">
        {/* Aviso de estado terminal (Aprobado o Descartado) */}
        {draft.status === 'Approved' && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <Check size={18} aria-hidden="true" />
              Este borrador ya fue aprobado y convertido en planificación.
            </span>
            {draft.approvedPlanId && (
              <Link to={`/pf/planning/${draft.approvedPlanId}`} className="btn btn-secondary">
                Ver planificación
              </Link>
            )}
          </div>
        )}

        {draft.status === 'Discarded' && (
          <div className="alert-banner warning" role="status">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              Este borrador fue descartado.
            </span>
          </div>
        )}

        {/* Notificaciones de error o éxito */}
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

        {savedMessage && !dirty && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <Check size={18} aria-hidden="true" />
              {savedMessage}
            </span>
          </div>
        )}

        {/* Resumen de la IA y contexto */}
        <div className="card card-static plan-draft-summary">
          <div className="plan-draft-meta">
            <span className="badge badge-info">Proveedor: {providerLabel}</span>
            <span className="badge badge-subtle">{targetLabel}</span>
            <span className="plan-field-hint">
              Inicio: {formatIsoDate(draft.startDate)} · {editableDraft.weeks.length}{' '}
              {editableDraft.weeks.length === 1 ? 'semana' : 'semanas'} · {totalSessions}{' '}
              {totalSessions === 1 ? 'sesión' : 'sesiones'}
            </span>
          </div>
          {draft.justificationSummary && (
            <p className="plan-empty plan-draft-justification">
              <Sparkles size={16} aria-hidden="true" className="plan-draft-justification-icon" />
              {draft.justificationSummary}
            </p>
          )}
        </div>

        {/* Avisos del borrador */}
        {draft.warnings && draft.warnings.length > 0 && (
          <div className="alert-banner warning" role="status">
            <div className="plan-draft-warnings">
              <span className="plan-inline plan-draft-warnings-title">
                <AlertCircle size={18} aria-hidden="true" />
                Avisos del borrador
              </span>
              <ul className="plan-draft-warnings-list">
                {draft.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Edición de Nombre y Objetivo del borrador */}
        <section className="card card-static plan-details">
          <div className="plan-details-top">
            <label className="plan-field plan-details-name-field">
              <span>Nombre de la planificación</span>
              <input
                type="text"
                maxLength={200}
                value={editableDraft.name}
                onChange={(e) => editDraft((current) => ({ ...current, name: e.target.value }))}
                disabled={isTerminalStatus || saving || approving}
              />
            </label>

            <div className="plan-view-selector-container">
              <span className="plan-view-selector-label">Modo de edición</span>
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
            </div>
          </div>

          <label className="plan-field" style={{ marginTop: '0.75rem' }}>
            <span>Objetivo deportivo o fisiológico</span>
            <input
              type="text"
              maxLength={500}
              value={editableDraft.objective}
              onChange={(e) => editDraft((current) => ({ ...current, objective: e.target.value }))}
              disabled={isTerminalStatus || saving || approving}
              placeholder="Ej. Fuerza máxima, pretemporada"
            />
          </label>
          {dirty && <span className="badge badge-warning">Cambios sin guardar</span>}
        </section>

        {/* Vista por Bloques (KAN-587) */}
        {viewMode === 'blocks' ? (
          <DayBlocksEditor
            days={days}
            selectedDayOfWeek={selectedDayOfWeek}
            weekNumbers={weekNumbers.length > 0 ? weekNumbers : [1, 2, 3, 4]}
            disabled={isTerminalStatus || saving || approving}
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
          /* Listado de Semanas → Sesiones → Ejercicios */
          <>
            {editableDraft.weeks.length === 0 && (
              <p className="plan-empty">El borrador no tiene semanas cargadas.</p>
            )}

            {editableDraft.weeks.map((week) => (
              <WeekSection
                key={week.key}
                week={week}
                expanded={expandedWeeks.has(week.key)}
                disabled={isTerminalStatus || saving || approving}
                canRemove={week.key === lastWeekKey}
                onToggle={() => toggleWeek(week.key)}
                onRemove={() => removeWeek(week.key)}
                onAddSession={() => addSession(week.key)}
                onSessionChange={(sessionKey, update) => editSession(week.key, sessionKey, update)}
                onRemoveSession={(sessionKey) => removeSession(week.key, sessionKey)}
                onAddExercise={(sessionKey) => openPickerForAdd(week.key, sessionKey)}
                onSwapExercise={(sessionKey, exerciseKey) =>
                  openPickerForSwap(week.key, sessionKey, exerciseKey)
                }
                onMoveSession={(sessionKey, direction) =>
                  handleMoveSession(week.key, sessionKey, direction)
                }
              />
            ))}

            {!isTerminalStatus && (
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={addWeek}
                  disabled={saving || approving}
                >
                  <Plus size={16} aria-hidden="true" />
                  <span>Agregar semana</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Paso 4 · Tarjeta de Aprobación final */}
        {!isTerminalStatus && (
          <section className="plan-draft-approval-card" aria-label="Aprobación de la planificación">
            <div className="plan-draft-approval-header">
              <h2 className="plan-draft-approval-title">Paso 4 · Aprobación y asignación</h2>
              <span className="badge badge-info">Listo para revisar</span>
            </div>

            <div className="plan-draft-approval-details">
              <div className="plan-draft-approval-item">
                <span>Destinatario</span>
                <strong>{targetLabel}</strong>
              </div>
              <div className="plan-draft-approval-item">
                <span>Fecha de inicio</span>
                <strong>{formatIsoDate(draft.startDate)}</strong>
              </div>
              <div className="plan-draft-approval-item">
                <span>Duración</span>
                <strong>
                  {editableDraft.weeks.length}{' '}
                  {editableDraft.weeks.length === 1 ? 'semana' : 'semanas'}
                </strong>
              </div>
              <div className="plan-draft-approval-item">
                <span>Volumen</span>
                <strong>
                  {totalSessions} {totalSessions === 1 ? 'sesión' : 'sesiones'}
                </strong>
              </div>
            </div>

            <div className="plan-draft-approval-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDiscardModal(true)}
                disabled={saving || approving || discarding}
              >
                <Trash2 size={16} aria-hidden="true" />
                <span>Descartar borrador</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={saving || approving || discarding}
              >
                {approving ? (
                  <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={16} aria-hidden="true" />
                )}
                <span>{approving ? 'Aprobando…' : 'Aprobar y asignar'}</span>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Modal para agregar o cambiar ejercicio */}
      {pickerTarget && (
        <ExercisePickerModal onClose={closePicker} onSelect={handleSelectExercise} />
      )}

      {/* Modal de confirmación para descartar */}
      {showDiscardModal && (
        <div className="modal-overlay" onClick={() => setShowDiscardModal(false)}>
          <div
            className="modal-content plan-discard-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="plan-discard-header">
              <h2 id="discard-modal-title" className="plan-discard-title">
                ¿Descartar este borrador?
              </h2>
              <button
                type="button"
                className="plan-icon-btn"
                onClick={() => setShowDiscardModal(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="plan-discard-text">
              Se perderán todas las modificaciones y la propuesta generada por la IA. Esta acción no
              se puede deshacer.
            </p>
            <div className="plan-discard-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDiscardModal(false)}
                disabled={discarding}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDiscard}
                disabled={discarding}
                aria-label="Confirmar descarte"
              >
                {discarding ? (
                  <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={16} aria-hidden="true" />
                )}
                <span>{discarding ? 'Descartando…' : 'Descartar borrador'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

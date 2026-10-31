import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, Loader2, Plus, Save, UserPlus } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { WeekSection } from '../../components/planning/WeekSection';
import { ExercisePickerModal } from '../../components/planning/ExercisePickerModal';
import { AssignPlanModal } from '../../components/planning/AssignPlanModal';
import { trainingPlansService } from '../../api/trainingPlans';
import { CatalogExercise, DraftSession, DraftWeek, PlanDraft } from '../../types/trainingPlans';
import {
  createExercise,
  createSession,
  createWeek,
  moveSession,
  type MoveDirection,
  toDraft,
  toSaveRequest,
  validateDraft,
} from '../../utils/planDraft';

interface PickerTarget {
  weekKey: string;
  sessionKey: string;
}

export function PlanEditorPage() {
  const { planId = '' } = useParams();

  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [showAssign, setShowAssign] = useState(false);

  useEffect(() => {
    let active = true;
    trainingPlansService
      .get(planId)
      .then((plan) => {
        if (!active) return;
        const loaded = toDraft(plan);
        setDraft(loaded);
        setExpandedWeeks(new Set(loaded.weeks.slice(0, 1).map((w) => w.key)));
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
    setDraft((current) => (current ? update(current) : current));
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
    editDraft((current) => ({ ...current, weeks: [...current.weeks, week] }));
    setExpandedWeeks((current) => new Set(current).add(week.key));
  };

  const removeWeek = (weekKey: string) =>
    editDraft((current) => ({
      ...current,
      weeks: current.weeks.filter((w) => w.key !== weekKey),
    }));

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

  const reorderSession = (weekKey: string, sessionKey: string, direction: MoveDirection) =>
    editWeek(weekKey, (week) => moveSession(week, sessionKey, direction));

  const addExercise = (exercise: CatalogExercise) => {
    if (!pickerTarget) return;
    editSession(pickerTarget.weekKey, pickerTarget.sessionKey, (session) => ({
      ...session,
      exercises: [...session.exercises, createExercise(session, exercise)],
      nextExerciseOrder: session.nextExerciseOrder + 1,
    }));
    setPickerTarget(null);
  };

  const closePicker = useCallback(() => setPickerTarget(null), []);
  const closeAssign = useCallback(() => setShowAssign(false), []);

  const handleAssigned = (message: string) => {
    setShowAssign(false);
    setError(null);
    setSavedMessage(message);
  };

  const save = async () => {
    if (!draft) return;
    const problem = validateDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await trainingPlansService.update(draft.id, toSaveRequest(draft));
      // Se recarga desde la respuesta para tener los id nuevos que generó el back.
      const next = toDraft(saved);
      const openWeeks = new Set(
        draft.weeks.filter((w) => expandedWeeks.has(w.key)).map((w) => w.weekNumber),
      );
      setDraft(next);
      setExpandedWeeks(
        new Set(next.weeks.filter((w) => openWeeks.has(w.weekNumber)).map((w) => w.key)),
      );
      setDirty(false);
      setSavedMessage('Los cambios se guardaron.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la planificación.');
    } finally {
      setSaving(false);
    }
  };

  const backLink = (
    <Link to="/pf/planning" className="btn btn-secondary">
      <ArrowLeft size={16} aria-hidden="true" />
      <span>Planificaciones</span>
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

  return (
    <div className="app-page-container">
      <PageHeader
        title={draft.name || 'Planificación'}
        description="Armá las semanas, las sesiones y los ejercicios. Los cambios se guardan con el botón Guardar."
        actions={
          <>
            {backLink}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAssign(true)}
              disabled={saving || dirty}
              title={
                dirty
                  ? 'Guardá los cambios antes de asignar'
                  : 'Asignar a una categoría o a un atleta'
              }
            >
              <UserPlus size={16} aria-hidden="true" />
              <span>Asignar</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={saving || !dirty}
            >
              {saving ? (
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              <span>{saving ? 'Guardando…' : 'Guardar'}</span>
            </button>
          </>
        }
      />

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

        {savedMessage && !dirty && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <Check size={18} aria-hidden="true" />
              {savedMessage}
            </span>
          </div>
        )}

        <section className="card card-static plan-details">
          <label className="plan-field">
            <span>Nombre</span>
            <input
              type="text"
              maxLength={200}
              value={draft.name}
              onChange={(e) => editDraft((current) => ({ ...current, name: e.target.value }))}
              disabled={saving}
            />
          </label>
          <label className="plan-field">
            <span>Objetivo (opcional)</span>
            <input
              type="text"
              maxLength={500}
              value={draft.objective}
              onChange={(e) => editDraft((current) => ({ ...current, objective: e.target.value }))}
              disabled={saving}
              placeholder="Ej. Pretemporada, fuerza base"
            />
          </label>
          {dirty && <span className="badge badge-warning">Cambios sin guardar</span>}
        </section>

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
          <button type="button" className="btn btn-secondary" onClick={addWeek} disabled={saving}>
            <Plus size={16} aria-hidden="true" />
            <span>Agregar semana</span>
          </button>
        </div>
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
    </div>
  );
}

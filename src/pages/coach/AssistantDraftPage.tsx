import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { planDraftsService } from '../../api/planDrafts';
import { PlanDraftResponse } from '../../api/generated/asistente';
import { formatIsoDate } from '../../utils/argentinaDate';

interface DraftLocationState {
  draft?: PlanDraftResponse;
}

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lunes',
  Tuesday: 'Martes',
  Wednesday: 'Miércoles',
  Thursday: 'Jueves',
  Friday: 'Viernes',
  Saturday: 'Sábado',
  Sunday: 'Domingo',
};

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
  const stateDraft = (location.state as DraftLocationState | null)?.draft ?? null;
  const matchedStateDraft = stateDraft && stateDraft.id === draftId ? stateDraft : null;

  const [draft, setDraft] = useState<PlanDraftResponse | null>(matchedStateDraft);
  const [loading, setLoading] = useState<boolean>(!matchedStateDraft);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (matchedStateDraft) {
      return;
    }

    let active = true;
    planDraftsService
      .get(draftId)
      .then((data) => {
        if (active) {
          setDraft(data);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el borrador.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [draftId, matchedStateDraft]);

  const backActions = (
    <>
      <Link to="/pf/assistant/new" className="btn btn-secondary">
        <Sparkles size={16} aria-hidden="true" />
        <span>Nueva generación</span>
      </Link>
      <Link to="/pf/planning" className="btn btn-secondary">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Planificaciones</span>
      </Link>
    </>
  );

  if (loading) {
    return (
      <div className="app-page-container">
        <PageHeader title="Borrador de planificación" actions={backActions} />
        <div className="app-page-body">
          <p className="plan-empty plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Cargando borrador…
          </p>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="app-page-container">
        <PageHeader title="Borrador de planificación" actions={backActions} />
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
        title={draft.name || 'Borrador generado con IA'}
        description={draft.objective || draft.goal}
        actions={backActions}
      />

      <div className="app-page-body">
        <div className="card card-static plan-draft-summary">
          <div className="plan-draft-meta">
            <span className="badge badge-info">Proveedor: {providerLabel}</span>
            <span className="plan-field-hint">
              Inicio: {formatIsoDate(draft.startDate)} · {draft.weeks.length}{' '}
              {draft.weeks.length === 1 ? 'semana' : 'semanas'}
            </span>
          </div>
          {draft.justificationSummary && <p className="plan-empty">{draft.justificationSummary}</p>}
        </div>

        {draft.warnings && draft.warnings.length > 0 && (
          <div className="alert-banner danger" role="status">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {draft.warnings.join(' · ')}
            </span>
          </div>
        )}

        {draft.weeks.map((week) => (
          <section key={week.weekNumber} className="card card-static plan-week">
            <div className="plan-week-header">
              <span className="plan-week-title">Semana {week.weekNumber}</span>
              <span className="plan-week-count">
                {week.sessions.length} {week.sessions.length === 1 ? 'sesión' : 'sesiones'}
              </span>
            </div>
            <div className="plan-week-body">
              <div className="plan-session-grid">
                {week.sessions.map((session) => (
                  <div key={`${week.weekNumber}-${session.order}`} className="plan-session">
                    <div className="plan-session-header">
                      <strong className="plan-session-day">
                        {DAY_LABELS[session.dayOfWeek] ?? session.dayOfWeek}
                      </strong>
                      <span className="plan-session-name">{session.name}</span>
                    </div>
                    {session.coachNotes && <p className="plan-empty">{session.coachNotes}</p>}
                    <ul className="plan-exercise-list">
                      {session.exercises.map((exercise) => (
                        <li
                          key={`${session.order}-${exercise.order}-${exercise.exerciseId}`}
                          className="plan-exercise-row"
                        >
                          <span className="plan-exercise-name">Ejercicio #{exercise.order}</span>
                          <span className="plan-exercise-field">
                            Series
                            <strong>{exercise.sets}</strong>
                          </span>
                          <span className="plan-exercise-field">
                            Reps
                            <strong>{exercise.reps}</strong>
                          </span>
                          <span className="plan-exercise-field">
                            % 1RM
                            <strong>
                              {exercise.targetPercentage != null
                                ? `${exercise.targetPercentage}%`
                                : '—'}
                            </strong>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

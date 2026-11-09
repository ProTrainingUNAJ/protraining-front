import React, { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell,
  Activity,
  Trophy,
  User,
  Send,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ClipboardList,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/shell/PageHeader';
import {
  submitDailyLoad,
  getDailyLoad,
  getAthleteWeek,
  DailyLoadSubmitRequest,
  DailyLoadSubmitResponse,
} from '../../api/seguimientoService';
import type { AthleteWeek } from '../../types/seguimiento';
import { WeekCompletionStrip } from '../../components/athlete/WeekCompletionStrip';
import { structureService } from '../../api/structureService';
import './DailyLoadPage.css';

const getCachedAthleteId = (userId?: string): string | null => {
  if (!userId) return null;
  try {
    return localStorage.getItem(`protraining_athlete_me_${userId}`);
  } catch {
    return null;
  }
};

const setCachedAthleteId = (userId: string, id: string) => {
  try {
    localStorage.setItem(`protraining_athlete_me_${userId}`, id);
  } catch {
    // Ignored in storage-restricted environments
  }
};

interface ActivityState {
  minutes: number;
  rpe: number | null;
}

const EMPTY_ACTIVITY: ActivityState = { minutes: 0, rpe: null };

const ACTIVITIES: {
  key: keyof DailyLoadSubmitRequest;
  label: string;
  icon: React.ReactNode;
  hint: string;
}[] = [
  { key: 'gym', label: 'Gimnasio', icon: <Dumbbell size={26} />, hint: 'Fuerza, pesas, movilidad' },
  {
    key: 'sportTraining',
    label: 'Entrenamiento del deporte',
    icon: <Activity size={26} />,
    hint: 'Práctica técnica/táctica',
  },
  { key: 'match1', label: 'Partido 1', icon: <Trophy size={26} />, hint: 'Primer partido del día' },
  {
    key: 'match2',
    label: 'Partido 2',
    icon: <Trophy size={26} />,
    hint: 'Segundo partido del día',
  },
  {
    key: 'individualWork',
    label: 'Trabajo individual',
    icon: <User size={26} />,
    hint: 'Extra, recuperación, técnica',
  },
];

type ViewMode = 'register' | 'view';

const activityFromLoad = (
  load: DailyLoadSubmitResponse | null,
  key: keyof DailyLoadSubmitRequest,
): ActivityState => {
  if (!load) return { ...EMPTY_ACTIVITY };
  const data = load[key as keyof DailyLoadSubmitResponse] as
    { minutes?: number; rpe?: number | null } | undefined;
  return { minutes: data?.minutes ?? 0, rpe: data?.rpe ?? null };
};

export const DailyLoadPage: React.FC = () => {
  const { user } = useAuth();
  const [athleteId, setAthleteId] = useState<string>(() => {
    return (user?.id ? getCachedAthleteId(user.id) : null) || '';
  });
  const [athleteResolutionError, setAthleteResolutionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const cachedId = getCachedAthleteId(user.id);
    if (typeof navigator === 'undefined' || navigator.onLine) {
      structureService
        .getMe()
        .then((me) => {
          if (me?.athleteId) {
            setAthleteId(me.athleteId);
            setCachedAthleteId(user.id, me.athleteId);
            setAthleteResolutionError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cachedId) {
            const msg =
              err instanceof Error
                ? err.message
                : 'No se pudo obtener el identificador del atleta vinculado a la cuenta.';
            setAthleteResolutionError(msg);
          }
        });
    }
  }, [user?.id]);

  // Mode: register vs view today's load
  const [viewMode, setViewMode] = useState<ViewMode>('register');
  const [todayLoad, setTodayLoad] = useState<DailyLoadSubmitResponse | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

  // Athlete week with completed days (KAN-446)
  const [week, setWeek] = useState<AthleteWeek | null>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  const fetchWeek = useCallback(async (id: string) => {
    if (!id) return;
    setIsLoadingWeek(true);
    try {
      const data = await getAthleteWeek(id);
      setWeek(data);
    } catch (err) {
      console.error('No se pudo obtener la semana del atleta', err);
      setWeek(null);
    } finally {
      setIsLoadingWeek(false);
    }
  }, []);

  const fetchTodayLoad = useCallback(async (id: string) => {
    if (!id) return;
    setIsLoadingToday(true);
    setTodayError(null);
    setIs404(false);
    try {
      const data = await getDailyLoad(id);
      setTodayLoad(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setIs404(true);
        setTodayLoad(null);
      } else {
        setTodayError(err instanceof Error ? err.message : 'Error al obtener la carga del día.');
        setTodayLoad(null);
      }
    } finally {
      setIsLoadingToday(false);
    }
  }, []);

  // Fetch week when athleteId becomes available
  useEffect(() => {
    if (!athleteId) return;
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void fetchWeek(athleteId);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [athleteId, fetchWeek]);

  // Load today's load on initial load or mode switch
  useEffect(() => {
    if (!athleteId) return;
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void fetchTodayLoad(athleteId);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [viewMode, athleteId, fetchTodayLoad]);

  // Registration mode state
  const [selectedActivity, setSelectedActivity] = useState<keyof DailyLoadSubmitRequest>('gym');
  const [regMinutes, setRegMinutes] = useState<number>(0);
  const [regRpe, setRegRpe] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DailyLoadSubmitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prefill inputs when selected activity or today's load changes
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (!isMounted) return;
      const state = activityFromLoad(todayLoad, selectedActivity);
      setRegMinutes(state.minutes);
      setRegRpe(state.rpe);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedActivity, todayLoad]);

  const validate = (): string | null => {
    if (regMinutes < 0) return 'Los minutos deben ser 0 o más.';
    if (regRpe !== null && (regRpe < 0 || regRpe > 10)) return 'El RPE debe estar entre 0 y 10.';
    if (regMinutes > 0 && regRpe === null)
      return 'El RPE es obligatorio si los minutos son mayores a 0.';
    if (regMinutes === 0 && regRpe === null)
      return 'Debe ingresar minutos mayores a 0 para registrar.';
    return null;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setResult(null);

    const err = validate();
    if (err) {
      setErrorMessage(err);
      return;
    }

    if (!athleteId) {
      setErrorMessage('No se pudo identificar al atleta. Reintentá en unos segundos.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Preserve other activities in today's payload
      const payload: DailyLoadSubmitRequest = {};
      for (const { key } of ACTIVITIES) {
        payload[key] = activityFromLoad(todayLoad, key);
      }
      payload[selectedActivity] = { minutes: regMinutes || 0, rpe: regRpe };

      const response = await submitDailyLoad(athleteId, payload);
      setResult(response);
      setTodayLoad(response);
      void fetchWeek(athleteId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la carga del día.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMeta = ACTIVITIES.find((a) => a.key === selectedActivity)!;

  // Result screen after successful registration
  if (result) {
    return (
      <div className="app-page-container">
        <PageHeader title="Carga del día" description="Registrá minutos y RPE por actividad" />
        <div className="app-page-body">
          <div className="dl-result-wrapper">
            <div className="dl-result">
              <div className="dl-result-icon" aria-hidden="true">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="dl-result-title">¡Carga registrada!</h2>
              <p className="dl-result-msg">{result.message}</p>
              <div className="dl-result-total">
                <p className="dl-result-total-value">{result.totalMinutes} min</p>
                <p className="dl-result-total-label">Total del día · {result.date}</p>
                <p className="dl-result-total-label">Carga del día: {result.totalLoad}</p>
              </div>
              <ul className="dl-result-list">
                {ACTIVITIES.map(({ key, label }) => (
                  <li key={key}>
                    <span>{label}</span>
                    <span className="dl-result-val">
                      {result[key]?.minutes ?? 0} min · RPE {result[key]?.rpe ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setRegMinutes(0);
                  setRegRpe(null);
                  setErrorMessage(null);
                }}
                className="dl-btn dl-btn-primary"
              >
                Registrar otra actividad
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-container">
      <PageHeader title="Carga del día" description="Registrá minutos y RPE por actividad" />

      <div className="app-page-body dl-page-body">
        {athleteResolutionError && (
          <div className="dl-amber" role="alert">
            <AlertTriangle size={18} />
            <span>{athleteResolutionError}</span>
          </div>
        )}

        {/* Week completion strip card (KAN-446) */}
        <section className="dl-week-card" aria-label="Semana del atleta">
          <div className="dl-week-header">
            <h2 className="dl-week-title">Tu semana</h2>
            <span className="dl-week-subtitle">Días con carga registrada</span>
          </div>
          <WeekCompletionStrip days={week?.days ?? []} isLoading={isLoadingWeek} />
          {!isLoadingWeek && (!week || week.days.length === 0) && (
            <p className="dl-week-empty">
              No se pudo cargar la semana. Reintentá en unos segundos.
            </p>
          )}
        </section>

        {/* Toggle Register / View today's load */}
        <div className="dl-toggle-wrapper">
          <div className="dl-toggle" role="tablist" aria-label="Modo de vista">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'register'}
              className={`dl-toggle-btn ${viewMode === 'register' ? 'dl-toggle-btn-active' : ''}`}
              onClick={() => setViewMode('register')}
            >
              <ClipboardList size={16} /> Registrar actividad
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'view'}
              className={`dl-toggle-btn ${viewMode === 'view' ? 'dl-toggle-btn-active' : ''}`}
              onClick={() => setViewMode('view')}
            >
              <Eye size={16} /> Ver carga de hoy
            </button>
          </div>
        </div>

        {viewMode === 'view' ? (
          <div className="dl-view-container">
            {isLoadingToday && <div className="dl-view-loading">Cargando carga del día…</div>}

            {!isLoadingToday && is404 && (
              <div className="dl-empty-card">
                <p className="dl-empty-text">Aún no registraste carga hoy</p>
                <p className="dl-empty-sub">
                  Seleccioná una actividad para comenzar a cargar tus minutos y nivel de esfuerzo.
                </p>
                <button
                  type="button"
                  className="dl-btn dl-btn-primary"
                  onClick={() => setViewMode('register')}
                >
                  <ClipboardList size={16} /> Ir a registrar
                </button>
              </div>
            )}

            {!isLoadingToday && todayError && (
              <div className="dl-error" role="alert">
                <AlertTriangle size={18} />
                <span>{todayError}</span>
              </div>
            )}

            {!isLoadingToday && todayLoad && (
              <div className="dl-view-content">
                <div className="dl-view-summary-banner">
                  <div className="dl-summary-metric">
                    <span className="dl-summary-metric-val">{todayLoad.totalMinutes} min</span>
                    <span className="dl-summary-metric-lbl">Total minutos · {todayLoad.date}</span>
                  </div>
                  <div className="dl-summary-divider" aria-hidden="true" />
                  <div className="dl-summary-metric">
                    <span className="dl-summary-metric-val dl-summary-metric-val--primary">
                      {todayLoad.totalLoad}
                    </span>
                    <span className="dl-summary-metric-lbl">Carga del día (minutos × RPE)</span>
                  </div>
                </div>

                {/* Responsive grid of activity cards */}
                <div className="dl-cards-grid">
                  {ACTIVITIES.map(({ key, label, icon, hint }) => {
                    const data = todayLoad[key as keyof DailyLoadSubmitResponse] as
                      { minutes: number; rpe: number | null } | undefined;
                    const hasMinutes = (data?.minutes ?? 0) > 0;
                    return (
                      <div
                        key={key}
                        className={`dl-summary-card ${hasMinutes ? 'dl-summary-card--active' : ''}`}
                      >
                        <div className="dl-summary-icon" aria-hidden="true">
                          {icon}
                        </div>
                        <div className="dl-summary-body">
                          <p className="dl-summary-label">{label}</p>
                          <p className="dl-summary-hint">{hint}</p>
                          <p className="dl-summary-value">
                            {data?.minutes ?? 0} min · RPE {data?.rpe ?? '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="dl-form-container">
            {/* Activity selector chips */}
            <div className="dl-chips" role="group" aria-label="Seleccionar actividad">
              {ACTIVITIES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`dl-chip ${selectedActivity === key ? 'dl-chip-active' : ''}`}
                  onClick={() => setSelectedActivity(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="dl-card">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="dl-icon-circle" aria-hidden="true">
                  {selectedMeta.icon}
                </div>
                <div>
                  <h2 className="dl-title">{selectedMeta.label}</h2>
                  <p className="dl-subtitle">{selectedMeta.hint}</p>
                </div>
              </div>

              <div className="dl-grid">
                <div className="dl-field">
                  <label htmlFor="dl-input-minutes">Minutos</label>
                  <input
                    id="dl-input-minutes"
                    type="number"
                    min={0}
                    value={regMinutes}
                    onChange={(e) => {
                      setRegMinutes(Number(e.target.value));
                      setErrorMessage(null);
                    }}
                    className="dl-input"
                  />
                </div>
                <div className="dl-field">
                  <label htmlFor="dl-input-rpe">RPE (0–10)</label>
                  <input
                    id="dl-input-rpe"
                    type="number"
                    min={0}
                    max={10}
                    value={regRpe ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRegRpe(v === '' ? null : Number(v));
                      setErrorMessage(null);
                    }}
                    className="dl-input"
                  />
                </div>
              </div>

              <p className="dl-hint">Si no hiciste esta actividad, dejá minutos en 0.</p>

              {errorMessage && (
                <div className="dl-error" role="alert">
                  <AlertTriangle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="dl-nav">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="dl-btn dl-btn-primary"
                >
                  <Send size={18} />
                  {isSubmitting ? 'Guardando...' : 'Guardar carga'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyLoadPage;

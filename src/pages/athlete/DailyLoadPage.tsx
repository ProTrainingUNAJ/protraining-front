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
  DailyLoadSubmitRequest,
  DailyLoadSubmitResponse,
} from '../../api/seguimientoService';
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
  { key: 'gym', label: 'Gimnasio', icon: <Dumbbell size={28} />, hint: 'Fuerza, pesas, movilidad' },
  {
    key: 'sportTraining',
    label: 'Entrenamiento del deporte',
    icon: <Activity size={28} />,
    hint: 'Práctica técnica/táctica',
  },
  { key: 'match1', label: 'Partido 1', icon: <Trophy size={28} />, hint: 'Primer partido del día' },
  {
    key: 'match2',
    label: 'Partido 2',
    icon: <Trophy size={28} />,
    hint: 'Segundo partido del día',
  },
  {
    key: 'individualWork',
    label: 'Trabajo individual',
    icon: <User size={28} />,
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

  // ---- Modo ver carga de hoy ----
  const [viewMode, setViewMode] = useState<ViewMode>('register');
  const [todayLoad, setTodayLoad] = useState<DailyLoadSubmitResponse | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

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

  // Carga inicial / al cambiar de modo
  useEffect(() => {
    if (!athleteId) return;
    if (viewMode === 'view') {
      let isMounted = true;
      const timer = setTimeout(() => {
        if (isMounted) void fetchTodayLoad(athleteId);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
    // En modo registro, precargamos la carga existente para no pisar otras actividades
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void fetchTodayLoad(athleteId);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [viewMode, athleteId, fetchTodayLoad]);

  // ---- Modo registrar ----
  const [selectedActivity, setSelectedActivity] = useState<keyof DailyLoadSubmitRequest>('gym');
  const [regMinutes, setRegMinutes] = useState<number>(0);
  const [regRpe, setRegRpe] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<DailyLoadSubmitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prefill inputs cuando cambia la actividad seleccionada o la carga existente
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
      // Preservar las demás actividades de la carga existente (si la hay)
      const payload: DailyLoadSubmitRequest = {};
      for (const { key } of ACTIVITIES) {
        payload[key] = activityFromLoad(todayLoad, key);
      }
      payload[selectedActivity] = { minutes: regMinutes || 0, rpe: regRpe };

      const response = await submitDailyLoad(athleteId, payload);
      setResult(response);
      setTodayLoad(response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la carga del día.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMeta = ACTIVITIES.find((a) => a.key === selectedActivity)!;

  // Pantalla de resultado (tras registrar)
  if (result) {
    return (
      <div className="dl-page">
        <div className="dl-result">
          <div className="dl-result-icon">
            <CheckCircle2 size={44} />
          </div>
          <h2 className="dl-result-title">¡Carga registrada!</h2>
          <p className="dl-result-msg">{result.message}</p>
          <div className="dl-result-total">
            <p className="dl-result-total-value">{result.totalMinutes} min</p>
            <p className="dl-result-total-label">Total del día · {result.date}</p>
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
    );
  }

  return (
    <div className="dl-page">
      <div className="dl-container">
        <PageHeader title="Carga del día" description="Registrá minutos y RPE por actividad" />

        {athleteResolutionError && (
          <div className="dl-amber">
            <AlertTriangle size={16} />
            {athleteResolutionError}
          </div>
        )}

        {/* Toggle Registrar / Ver carga de hoy */}
        <div className="dl-toggle">
          <button
            type="button"
            className={`dl-toggle-btn ${viewMode === 'register' ? 'dl-toggle-btn-active' : ''}`}
            onClick={() => setViewMode('register')}
          >
            <ClipboardList size={16} /> Registrar
          </button>
          <button
            type="button"
            className={`dl-toggle-btn ${viewMode === 'view' ? 'dl-toggle-btn-active' : ''}`}
            onClick={() => setViewMode('view')}
          >
            <Eye size={16} /> Ver carga de hoy
          </button>
        </div>

        {viewMode === 'view' ? (
          <div className="dl-view">
            {isLoadingToday && <div className="dl-view-loading">Cargando carga del día…</div>}

            {!isLoadingToday && is404 && (
              <div className="dl-empty">
                <p className="dl-empty-text">Aún no registraste carga hoy</p>
                <button
                  type="button"
                  className="dl-btn dl-btn-primary"
                  onClick={() => setViewMode('register')}
                >
                  Ir a registrar
                </button>
              </div>
            )}

            {!isLoadingToday && todayError && (
              <div className="dl-error">
                <AlertTriangle size={16} />
                {todayError}
              </div>
            )}

            {!isLoadingToday && todayLoad && (
              <>
                <div className="dl-result-total">
                  <p className="dl-result-total-value">{todayLoad.totalMinutes} min</p>
                  <p className="dl-result-total-label">Total del día · {todayLoad.date}</p>
                </div>

                {/* Listado (sin filtro) */}
                <div className="dl-cards">
                  {ACTIVITIES.map(({ key, label, icon }) => {
                    const data = todayLoad[key as keyof DailyLoadSubmitResponse] as
                      { minutes: number; rpe: number | null } | undefined;
                    return (
                      <div key={key} className="dl-summary-card">
                        <div className="dl-summary-icon">{icon}</div>
                        <div className="dl-summary-body">
                          <p className="dl-summary-label">{label}</p>
                          <p className="dl-summary-value">
                            {data?.minutes ?? 0} min · RPE {data?.rpe ?? '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Selector de actividad (chips) */}
            <div className="dl-chips">
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
                <div className="dl-icon-circle">{selectedMeta.icon}</div>
                <div>
                  <h2 className="dl-title">{selectedMeta.label}</h2>
                  <p className="dl-subtitle">{selectedMeta.hint}</p>
                </div>
              </div>

              <div className="dl-grid">
                <div className="dl-field">
                  <label>Minutos</label>
                  <input
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
                  <label>RPE (0–10)</label>
                  <input
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
            </div>

            {errorMessage && (
              <div className="dl-error">
                <AlertTriangle size={16} />
                {errorMessage}
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
          </>
        )}
      </div>
    </div>
  );
};

export default DailyLoadPage;

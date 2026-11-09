import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Zap,
  Clock,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
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
import { ConfettiCelebration } from '../../components/athlete/checkin/ConfettiCelebration';
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
  { key: 'gym', label: 'Gimnasio', icon: <Dumbbell size={24} />, hint: 'Fuerza y movilidad' },
  {
    key: 'sportTraining',
    label: 'Entrenamiento del deporte',
    icon: <Activity size={24} />,
    hint: 'Técnica y táctica',
  },
  { key: 'match1', label: 'Partido 1', icon: <Trophy size={24} />, hint: 'Primer partido' },
  {
    key: 'match2',
    label: 'Partido 2',
    icon: <Trophy size={24} />,
    hint: 'Segundo partido',
  },
  {
    key: 'individualWork',
    label: 'Trabajo individual',
    icon: <User size={24} />,
    hint: 'Extra y preventivo',
  },
];

type RpeTier = 'easy' | 'moderate' | 'demanding' | 'hard' | 'max';

interface RpeLevelMeta {
  val: number;
  title: string;
  desc: string;
  tier: RpeTier;
}

const RPE_LEVELS: RpeLevelMeta[] = [
  { val: 1, title: 'Muy liviano', desc: 'Recuperación activa, casi sin esfuerzo perceptible.', tier: 'easy' },
  { val: 2, title: 'Liviano', desc: 'Esfuerzo suave, respiración cómoda y tranquila.', tier: 'easy' },
  { val: 3, title: 'Moderado', desc: 'Ritmo aeróbico cómodo, podés mantener una conversación fluida.', tier: 'moderate' },
  { val: 4, title: 'Algo duro', desc: 'Respiración algo acelerada pero completamente bajo control.', tier: 'moderate' },
  { val: 5, title: 'Duro', desc: 'Esfuerzo constante, empieza a sentirse el trabajo muscular sostenido.', tier: 'demanding' },
  { val: 6, title: 'Exigente', desc: 'Fatiga progresiva, requiere concentración mental para sostener.', tier: 'demanding' },
  { val: 7, title: 'Muy duro', desc: 'Alta exigencia física, respiración agitada y pulsaciones altas.', tier: 'hard' },
  { val: 8, title: 'Muy intenso', desc: 'Esfuerzo límite, solo frases entrecortadas y gran demanda aeróbica.', tier: 'hard' },
  { val: 9, title: 'Casi máximo', desc: 'Esfuerzo extremo, muy difícil sostener el ritmo sin pausas.', tier: 'max' },
  { val: 10, title: 'Máximo absoluto', desc: 'Agotamiento total, diste el 100% absoluto de tu capacidad.', tier: 'max' },
];

const MINUTE_PRESETS = [15, 30, 45, 60, 90, 120];

const getLoadMotivation = (load: number) => {
  if (load >= 650) {
    return {
      badge: 'Impacto colosal',
      text: '¡Sesión titánica! Gran estímulo para tus adaptaciones competitivas. Cuidá tu hidratación y descanso.',
    };
  }
  if (load >= 400) {
    return {
      badge: 'Alta intensidad',
      text: '¡Tremendo entrenamiento! Suma clave para elevar tu potencia y condición física.',
    };
  }
  if (load >= 180) {
    return {
      badge: 'Buen volumen',
      text: '¡Muy buen trabajo cumplido! Acumulaste minutos de gran calidad para tu rendimiento.',
    };
  }
  return {
    badge: 'Recuperación / Activación',
    text: 'Estímulo suave y controlado para regenerar o afinar detalles técnicos.',
  };
};

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
      if (data === null) {
        setIs404(true);
        setTodayLoad(null);
      } else {
        setTodayLoad(data);
        setIs404(false);
      }
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ||
        (axios.isAxiosError(err) ? err.response?.status : undefined);
      if (status === 404) {
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
  const [showConfetti, setShowConfetti] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carousel navigation between activities
  const currentActivityIndex = ACTIVITIES.findIndex((a) => a.key === selectedActivity);
  const carouselTrackRef = useRef<HTMLDivElement>(null);

  const handlePrevActivity = () => {
    const nextIdx = (currentActivityIndex - 1 + ACTIVITIES.length) % ACTIVITIES.length;
    setSelectedActivity(ACTIVITIES[nextIdx].key);
  };

  const handleNextActivity = () => {
    const nextIdx = (currentActivityIndex + 1) % ACTIVITIES.length;
    setSelectedActivity(ACTIVITIES[nextIdx].key);
  };

  // Mobile sliding carousel: centrar automáticamente la actividad activa
  useEffect(() => {
    if (!carouselTrackRef.current) return;
    const track = carouselTrackRef.current;
    const activeCard = track.querySelector<HTMLElement>('.dl-carousel-card--active');
    if (activeCard && typeof activeCard.scrollIntoView === 'function') {
      activeCard.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedActivity]);

  // Mobile touch swipe listener: actualizar actividad según el scroll en mobile
  useEffect(() => {
    const track = carouselTrackRef.current;
    if (!track) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (track.scrollWidth <= track.clientWidth) return;
        const trackCenter = track.getBoundingClientRect().left + track.clientWidth / 2;
        const cards = Array.from(track.querySelectorAll<HTMLElement>('.dl-carousel-card'));
        let closestKey: keyof DailyLoadSubmitRequest | null = null;
        let minDistance = Infinity;

        cards.forEach((card) => {
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const dist = Math.abs(trackCenter - cardCenter);
          if (dist < minDistance) {
            minDistance = dist;
            const key = card.getAttribute('data-activity') as keyof DailyLoadSubmitRequest;
            if (key) closestKey = key;
          }
        });

        if (closestKey && closestKey !== selectedActivity) {
          setSelectedActivity(closestKey);
        }
      }, 120);
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedActivity]);

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
      setShowConfetti(true);
      void fetchWeek(athleteId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la carga del día.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMeta = ACTIVITIES.find((a) => a.key === selectedActivity)!;

  // Selected RPE metadata
  const selectedRpeMeta = regRpe !== null ? RPE_LEVELS.find((l) => l.val === regRpe) : null;

  // Live session training load calculation (minutes * RPE)
  const sessionLoad = regMinutes > 0 && regRpe !== null ? regMinutes * regRpe : 0;
  const loadMotivation = getLoadMotivation(sessionLoad);

  // Check if current activity has already been saved today
  const existingActivityData = todayLoad?.[selectedActivity as keyof DailyLoadSubmitResponse] as
    | { minutes: number; rpe: number | null }
    | undefined;
  const hasExistingRecord = (existingActivityData?.minutes ?? 0) > 0;

  // Completed days count for weekly streak gamification
  const completedDaysCount = week?.days ? week.days.filter((d) => d.completed).length : 0;

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

        {/* ── BURBUJA PRINCIPAL UNIFICADA (ANCHO COMPLETO IGUAL QUE MI RUTINA) ── */}
        <div className="dl-main-card">
          {/* 1. SECCIÓN SUPERIOR: TU SEMANA (INTEGRADA ADENTRO DE LA BURBUJA) */}
          <section className="dl-bubble-week-section" aria-label="Semana del atleta">
            <div className="dl-bubble-week-header">
              <div className="dl-week-title-wrap">
                <h2 className="dl-week-title">Tu semana</h2>
                <span className="dl-week-subtitle">Días con carga registrada</span>
              </div>
              {completedDaysCount > 0 && (
                <div className="dl-week-streak-badge">
                  <Flame size={15} className="dl-streak-icon" />
                  <span>{completedDaysCount} de 7 días completados</span>
                </div>
              )}
            </div>
            <WeekCompletionStrip days={week?.days ?? []} isLoading={isLoadingWeek} />
            {!isLoadingWeek && (!week || week.days.length === 0) && (
              <p className="dl-week-empty">
                No se pudo cargar la semana. Reintentá en unos segundos.
              </p>
            )}
          </section>

          {/* 2. BARRA DE CONTROL Y NAVEGACIÓN UNIFICADA (TÍTULO + TABS + FLECHAS) */}
          <div className="dl-control-nav-bar">
            <div className="dl-control-nav-left">
              {viewMode === 'register' ? (
                <span className="dl-carousel-eyebrow">
                  <Sparkles size={15} className="dl-sparkle-icon" />
                  <span>Seleccioná tu actividad</span>
                </span>
              ) : (
                <span className="dl-carousel-eyebrow">
                  <Sparkles size={15} className="dl-sparkle-icon" />
                  <span>Resumen de actividades</span>
                </span>
              )}
            </div>

            <div className="dl-tab-segmented" role="tablist" aria-label="Modo de vista">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'register'}
                className={`dl-tab-btn ${viewMode === 'register' ? 'dl-tab-btn--active' : ''}`}
                onClick={() => setViewMode('register')}
              >
                <ClipboardList size={16} />
                <span>Registrar actividad</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'view'}
                className={`dl-tab-btn ${viewMode === 'view' ? 'dl-tab-btn--active' : ''}`}
                onClick={() => setViewMode('view')}
              >
                <Eye size={16} />
                <span>Ver carga de hoy</span>
              </button>
            </div>

            <div className="dl-control-nav-right">
              {viewMode === 'register' ? (
                <div className="dl-carousel-arrows">
                  <button
                    type="button"
                    className="dl-carousel-arrow-btn"
                    onClick={handlePrevActivity}
                    aria-label="Actividad anterior"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    className="dl-carousel-arrow-btn"
                    onClick={handleNextActivity}
                    aria-label="Actividad siguiente"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              ) : (
                <div className="dl-control-nav-spacer" aria-hidden="true" />
              )}
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
                    <ClipboardList size={16} />
                    <span>Ir a registrar</span>
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
                <div className="dl-view-container">
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

                  {/* Responsive grid of activity cards con la misma estética y colores del carrusel */}
                  <div className="dl-cards-grid">
                    {ACTIVITIES.map(({ key, label, icon, hint }) => {
                      const data = todayLoad[key as keyof DailyLoadSubmitResponse] as
                        { minutes: number; rpe: number | null } | undefined;
                      const hasMinutes = (data?.minutes ?? 0) > 0;
                      return (
                        <div
                          key={key}
                          className={`dl-summary-card dl-summary-card--${key} ${hasMinutes ? 'dl-summary-card--active' : ''}`}
                        >
                          <div className="dl-card-badge-row">
                            {hasMinutes ? (
                              <span
                                className="dl-card-badge dl-card-badge--done"
                                title="Carga registrada hoy"
                              >
                                ✓ {data?.minutes}m
                              </span>
                            ) : (
                              <span className="dl-card-badge dl-card-badge--pending">0m</span>
                            )}
                          </div>

                          <div className="dl-card-icon-wrap" aria-hidden="true">
                            {icon}
                          </div>

                          <span className="dl-card-label">{label}</span>
                          <span className="dl-card-hint">{hint}</span>

                          <div className="dl-summary-value-wrap">
                            <span
                              className={`dl-summary-value-chip ${hasMinutes ? 'dl-summary-value-chip--active' : ''}`}
                            >
                              {data?.minutes ?? 0} min · RPE {data?.rpe ?? '—'}
                            </span>
                          </div>

                          <div className="dl-card-glow-bar" aria-hidden="true" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dl-register-flow">
              {/* 3. CARRUSEL INTERACTIVO, COLORIDO Y SIMÉTRICO DE ACTIVIDADES */}
              <div className="dl-carousel-container" aria-label="Carrusel de actividades">
                <div
                  ref={carouselTrackRef}
                  className="dl-carousel-track"
                  role="group"
                  aria-label="Seleccionar actividad"
                >
                  {ACTIVITIES.map(({ key, label, icon, hint }) => {
                    const data = todayLoad?.[key as keyof DailyLoadSubmitResponse] as
                      | { minutes: number; rpe: number | null }
                      | undefined;
                    const hasMinutes = (data?.minutes ?? 0) > 0;
                    const isSelected = selectedActivity === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        data-activity={key}
                        aria-label={label}
                        className={`dl-carousel-card dl-carousel-card--${key} ${isSelected ? 'dl-carousel-card--active' : ''} ${hasMinutes ? 'dl-carousel-card--completed' : ''}`}
                        onClick={() => setSelectedActivity(key)}
                      >
                        <div className="dl-card-badge-row">
                          {hasMinutes ? (
                            <span
                              className="dl-card-badge dl-card-badge--done"
                              title="Ya registrado hoy"
                            >
                              ✓ {data?.minutes}m
                            </span>
                          ) : (
                            <span className="dl-card-badge dl-card-badge--pending">
                              {isSelected ? 'Activo' : '0m'}
                            </span>
                          )}
                        </div>

                        <div className="dl-card-icon-wrap" aria-hidden="true">
                          {icon}
                        </div>

                        <span className="dl-card-label">{label}</span>
                        <span className="dl-card-hint">{hint}</span>

                        <div className="dl-card-glow-bar" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>

                {/* Dots del Carrusel */}
                <div
                  className="dl-carousel-dots"
                  role="tablist"
                  aria-label="Indicadores del carrusel"
                >
                  {ACTIVITIES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`dl-carousel-dot ${selectedActivity === key ? 'dl-carousel-dot--active' : ''}`}
                      onClick={() => setSelectedActivity(key)}
                      aria-label={`Ir a ${label}`}
                    />
                  ))}
                </div>
              </div>

              {/* Slot reservado para preservar la separación uniforme con o sin cartel verde */}
              <div className="dl-banner-slot">
                {hasExistingRecord && (
                  <div className="dl-already-banner">
                    <CheckCircle2 size={16} />
                    <span>
                      Ya registraste <strong>{existingActivityData?.minutes} min</strong> (RPE{' '}
                      <strong>{existingActivityData?.rpe ?? '—'}</strong>) hoy en{' '}
                      {selectedMeta.label.toLowerCase()}. Modificá los datos si querés actualizarla.
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Inputs y controles con máxima dopamina */}
              <div className="dl-inputs-section">
                {/* 1. Minutos de entrenamiento con Quick Presets */}
                <div className="dl-field-block">
                  <div className="dl-field-header">
                    <label htmlFor="dl-input-minutes" className="dl-field-title">
                      <Clock size={16} className="dl-field-title-icon" />
                      <span>Minutos dedicados</span>
                    </label>
                    <span className="dl-field-value-pill">{regMinutes} min</span>
                  </div>

                  <div className="dl-minutes-input-wrap">
                    <input
                      id="dl-input-minutes"
                      type="number"
                      min={0}
                      value={regMinutes}
                      onChange={(e) => {
                        setRegMinutes(Number(e.target.value));
                        setErrorMessage(null);
                      }}
                      className="dl-minutes-input"
                      placeholder="0"
                    />
                    <span className="dl-minutes-unit">min</span>
                  </div>

                  {/* Caja gemela de atajos rápidos alineada simétricamente con RPE */}
                  <div className="dl-minutes-presets-box">
                    <div className="dl-presets-box-header">
                      <span className="dl-presets-box-title">Atajos rápidos</span>
                      <span className="dl-presets-box-tag">Sugeridos</span>
                    </div>
                    <div className="dl-presets-wrap">
                      {MINUTE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`dl-preset-btn ${regMinutes === preset ? 'dl-preset-btn--active' : ''}`}
                          onClick={() => {
                            setRegMinutes(preset);
                            setErrorMessage(null);
                          }}
                        >
                          {preset}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Escala Interactiva de RPE (0 a 10) con feedback táctil y descriptivo */}
                <div className="dl-field-block">
                  <div className="dl-field-header">
                    <label htmlFor="dl-input-rpe" className="dl-field-title">
                      <Flame size={16} className="dl-field-title-icon" />
                      <span>RPE (0–10)</span>
                    </label>
                    <span className="dl-field-value-pill">
                      {regRpe !== null ? `Nivel ${regRpe}` : 'Sin seleccionar'}
                    </span>
                  </div>

                  {/* Input sincronizado para accesibilidad */}
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
                    className="dl-rpe-input-hidden"
                  />

                  {/* Barra interactiva de 10 botones táctiles */}
                  <div className="dl-rpe-bar-wrap">
                    <div className="dl-rpe-bar" role="group" aria-label="Escala de esfuerzo">
                      {RPE_LEVELS.map(({ val, tier }) => {
                        const isSelected = regRpe === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            className={`dl-rpe-btn dl-rpe-btn--${tier} ${isSelected ? 'dl-rpe-btn--selected' : ''}`}
                            onClick={() => {
                              setRegRpe(val);
                              setErrorMessage(null);
                            }}
                            aria-label={`Nivel ${val}`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tarjeta de feedback explicativa según el RPE (altura y estructura idéntica con o sin selección) */}
                  <div className="dl-rpe-feedback-box">
                    {selectedRpeMeta ? (
                      <>
                        <div className="dl-rpe-feedback-header">
                          <p className="dl-rpe-feedback-title">
                            RPE {selectedRpeMeta.val} · {selectedRpeMeta.title}
                          </p>
                          <span
                            className={`dl-rpe-feedback-tag dl-rpe-feedback-tag--${selectedRpeMeta.tier}`}
                          >
                            {selectedRpeMeta.tier === 'easy' && 'Recuperación'}
                            {selectedRpeMeta.tier === 'moderate' && 'Moderado'}
                            {selectedRpeMeta.tier === 'demanding' && 'Exigente'}
                            {selectedRpeMeta.tier === 'hard' && 'Muy Duro'}
                            {selectedRpeMeta.tier === 'max' && 'Máximo'}
                          </span>
                        </div>
                        <p className="dl-rpe-feedback-desc">{selectedRpeMeta.desc}</p>
                      </>
                    ) : (
                      <>
                        <div className="dl-rpe-feedback-header">
                          <p className="dl-rpe-feedback-title dl-rpe-feedback-title--muted">
                            Escala de esfuerzo físico
                          </p>
                          <span className="dl-rpe-feedback-tag dl-rpe-feedback-tag--empty">
                            0 a 10
                          </span>
                        </div>
                        <p className="dl-rpe-feedback-desc">
                          Tocá un número del 1 al 10 según la intensidad física sentida en la sesión.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 6. WIDGET DE IMPACTO / CARGA EN VIVO (UA - ANCHO COMPLETO CON REGLA GRADUADA) */}
              {sessionLoad > 0 && (
                <div className="dl-live-gauge" aria-label="Carga estimada de la sesión">
                  <div className="dl-live-gauge-top">
                    <div className="dl-live-gauge-label">
                      <Zap size={18} className="dl-live-gauge-icon" />
                      <span>Carga estimada de la sesión</span>
                    </div>
                    <span className="dl-live-gauge-badge">{loadMotivation.badge}</span>
                  </div>

                  <div className="dl-live-gauge-metrics">
                    <div className="dl-live-gauge-main-val">
                      <span className="dl-live-gauge-number">{sessionLoad}</span>
                      <span className="dl-live-gauge-unit">UA</span>
                    </div>
                    <span className="dl-live-gauge-formula">
                      {regMinutes} min × RPE {regRpe}
                    </span>
                  </div>

                  {/* Barra de progreso y regla métrica graduada (Mínimo a Máximo) */}
                  <div className="dl-gauge-bar-wrapper">
                    <div className="dl-live-gauge-progress" aria-hidden="true">
                      <div
                        className="dl-live-gauge-fill"
                        style={{
                          width: `${Math.min(100, Math.round((sessionLoad / 800) * 100))}%`,
                        }}
                      />
                    </div>

                    {/* Regla con medidas visuales (Ticks + Valores + Categorías) */}
                    <div className="dl-gauge-ruler" aria-hidden="true">
                      <div className="dl-ruler-tick" style={{ left: '0%' }}>
                        <span className="dl-ruler-line dl-ruler-line--main" />
                        <span className="dl-ruler-val">0 UA</span>
                        <span className="dl-ruler-tag">Mínimo</span>
                      </div>
                      <div className="dl-ruler-subtick" style={{ left: '12.5%' }} />
                      <div className="dl-ruler-tick" style={{ left: '25%' }}>
                        <span className="dl-ruler-line dl-ruler-line--main" />
                        <span className="dl-ruler-val">200 UA</span>
                        <span className="dl-ruler-tag">Suave</span>
                      </div>
                      <div className="dl-ruler-subtick" style={{ left: '37.5%' }} />
                      <div className="dl-ruler-tick" style={{ left: '50%' }}>
                        <span className="dl-ruler-line dl-ruler-line--main" />
                        <span className="dl-ruler-val">400 UA</span>
                        <span className="dl-ruler-tag">Moderado</span>
                      </div>
                      <div className="dl-ruler-subtick" style={{ left: '62.5%' }} />
                      <div className="dl-ruler-tick" style={{ left: '75%' }}>
                        <span className="dl-ruler-line dl-ruler-line--main" />
                        <span className="dl-ruler-val">600 UA</span>
                        <span className="dl-ruler-tag">Alto</span>
                      </div>
                      <div className="dl-ruler-subtick" style={{ left: '87.5%' }} />
                      <div className="dl-ruler-tick" style={{ left: '100%' }}>
                        <span className="dl-ruler-line dl-ruler-line--main" />
                        <span className="dl-ruler-val">800+ UA</span>
                        <span className="dl-ruler-tag">Máximo</span>
                      </div>
                    </div>
                  </div>

                  <p className="dl-live-gauge-footer">{loadMotivation.text}</p>
                </div>
              )}

              {errorMessage && (
                <div className="dl-error" role="alert">
                  <AlertTriangle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="dl-submit-wrap">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="dl-btn dl-btn-primary"
                >
                  <Send size={18} />
                  <span>
                    {isSubmitting
                      ? 'Guardando carga…'
                      : sessionLoad > 0
                        ? `Guardar carga (${sessionLoad} UA)`
                        : 'Guardar carga'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Diálogo translúcido de celebración al registrar con éxito (fondo visible con efecto glass) */}
      {result && (
        <div
          className="dl-result-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dl-result-title"
        >
          {showConfetti && <ConfettiCelebration durationMs={4500} particleCount={140} />}
          <div className="dl-result-modal">
            <div className="dl-result-icon" aria-hidden="true">
              <CheckCircle2 size={44} />
            </div>
            <h2 id="dl-result-title" className="dl-result-title">
              ¡Carga registrada!
            </h2>
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
                setShowConfetti(false);
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
      )}
    </div>
  );
};

export default DailyLoadPage;

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Shield,
  MapPin,
  Dumbbell,
  ClipboardList,
  Activity,
  Trophy,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { structureService } from '../../api/structureService';
import { matchService } from '../../services/matchService';
import {
  seasonPlanningService,
  PlannedSessionWithTime,
} from '../../services/seasonPlanningService';
import { todayRoutineService } from '../../api/todayRoutine';
import { getCheckInCompleted } from '../athlete/checkin/checkInHelper';
import { Match, AthleteMe } from '../../types/structure';
import { TodayRoutineResponse } from '../../api/generated/entrenamiento';
import { formatIsoDate } from '../../utils/argentinaDate';
import { formatTime } from '../../utils/calendarUtils';

type DaySchedule =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; sessions: PlannedSessionWithTime[] };

type AthleteDaySchedule =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'done';
      routine: TodayRoutineResponse | null;
      planningSessions: PlannedSessionWithTime[];
      isCheckInDone: boolean;
    };

const pad = (value: number) => String(value).padStart(2, '0');

async function loadTargetNames(): Promise<Record<string, string>> {
  const [organizations, athletes] = await Promise.all([
    structureService.getOrganizations().catch(() => []),
    structureService.getAthletes().catch(() => []),
  ]);
  const categories = (
    await Promise.all(
      organizations.map((organization) =>
        structureService.getCategories(organization.id).catch(() => []),
      ),
    )
  ).flat();

  const names: Record<string, string> = {};
  categories.forEach((category) => {
    names[category.id] = category.name;
  });
  athletes.forEach((athlete) => {
    names[athlete.id] = athlete.fullName ?? `${athlete.firstName} ${athlete.lastName}`;
  });
  return names;
}

export const CalendarButton: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isPF = user?.role === 'PreparadorFisico' || location.pathname.startsWith('/pf');
  const isAthlete = user?.role === 'Atleta' || location.pathname.startsWith('/athlete');

  // Selected date (YYYY-MM-DD) and routine schedule
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySchedule, setDaySchedule] = useState<DaySchedule | null>(null);
  const [athleteSchedule, setAthleteSchedule] = useState<AthleteDaySchedule | null>(null);
  const [targetNames, setTargetNames] = useState<Record<string, string> | null>(null);
  const [athleteMe, setAthleteMe] = useState<AthleteMe | null>(null);

  // Matches and scheduled trainings state
  const [matches, setMatches] = useState<Match[]>([]);

  // Resolve athlete identity and categories
  useEffect(() => {
    if (!isAthlete) return;
    let isMounted = true;
    structureService
      .getMe()
      .then((me) => {
        if (isMounted && me) {
          setAthleteMe(me);
        }
      })
      .catch(() => {
        // Ignored
      });
    return () => {
      isMounted = false;
    };
  }, [isAthlete, user?.id]);

  // Load matches
  const loadEvents = useCallback(async () => {
    try {
      if (isAthlete) {
        const me = athleteMe ?? (await structureService.getMe().catch(() => null));
        if (me?.categories && me.categories.length > 0) {
          const catIds = me.categories.map((c) => c.id);
          const fetchedMatches = await matchService.getMatches(catIds);
          setMatches(fetchedMatches);
          return;
        }
      } else {
        const orgs = await structureService.getOrganizations().catch(() => []);
        const catsNested = await Promise.all(
          orgs.map((org) => structureService.getCategories(org.id).catch(() => [])),
        );
        const catIds = catsNested.flat().map((c) => c.id);
        const fetchedMatches = await matchService.getMatches(catIds);
        setMatches(fetchedMatches);
        return;
      }
      setMatches([]);
    } catch {
      setMatches([]);
    }
  }, [isAthlete, athleteMe]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        if (isAthlete) {
          const me = await structureService.getMe().catch(() => null);
          if (isMounted && me) {
            setAthleteMe(me);
          }
          if (me?.categories && me.categories.length > 0) {
            const catIds = me.categories.map((c) => c.id);
            const fetchedMatches = await matchService.getMatches(catIds);
            if (isMounted) setMatches(fetchedMatches);
            return;
          }
        } else {
          const orgs = await structureService.getOrganizations().catch(() => []);
          const catsNested = await Promise.all(
            orgs.map((org) => structureService.getCategories(org.id).catch(() => [])),
          );
          const catIds = catsNested.flat().map((c) => c.id);
          const fetchedMatches = await matchService.getMatches(catIds);
          if (isMounted) setMatches(fetchedMatches);
          return;
        }
        if (isMounted) setMatches([]);
      } catch {
        if (isMounted) setMatches([]);
      }
    };
    void fetchInitial();
    return () => {
      isMounted = false;
    };
  }, [isAthlete]);

  // Synchronize when matches change anywhere
  useEffect(() => {
    const unsubMatches = matchService.subscribe(() => {
      void loadEvents();
    });
    return () => {
      unsubMatches();
    };
  }, [loadEvents]);

  // Map dates to events for fast dot lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { hasMatch: boolean; hasTraining: boolean }>();

    matches.forEach((m) => {
      const iso = m.matchDate.includes('T') ? m.matchDate.split('T')[0] : m.matchDate;
      const entry = map.get(iso) || { hasMatch: false, hasTraining: false };
      entry.hasMatch = true;
      map.set(iso, entry);
    });

    return map;
  }, [matches]);

  // Events for selected date
  const selectedMatches = useMemo(() => {
    if (!selectedDate) return [];
    return matches.filter((m) => {
      const iso = m.matchDate.includes('T') ? m.matchDate.split('T')[0] : m.matchDate;
      return iso === selectedDate;
    });
  }, [matches, selectedDate]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const daysOfWeek = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const fetchScheduleForDate = async (isoDate: string) => {
    setSelectedDate(isoDate);

    if (isAthlete) {
      setAthleteSchedule({ status: 'loading' });
      try {
        const [routineResult, planningSessions] = await Promise.all([
          todayRoutineService.getMyRoutine(isoDate).catch(() => null),
          seasonPlanningService
            .getSessionsForDate(isoDate, undefined, athleteMe?.categories)
            .catch(() => []),
        ]);

        const athleteId = athleteMe?.athleteId || user?.id || '';
        const isCheckInDone = Boolean(getCheckInCompleted(athleteId));

        setAthleteSchedule({
          status: 'done',
          routine: routineResult,
          planningSessions,
          isCheckInDone,
        });
      } catch (err: unknown) {
        setAthleteSchedule({
          status: 'error',
          message: err instanceof Error ? err.message : 'No se pudieron cargar las tareas del día.',
        });
      }
    } else {
      setDaySchedule({ status: 'loading' });
      try {
        const [sessions, names] = await Promise.all([
          seasonPlanningService.getSessionsForDate(isoDate),
          targetNames ?? loadTargetNames(),
        ]);
        setTargetNames(names);
        setDaySchedule({ status: 'done', sessions });
      } catch (err: unknown) {
        setDaySchedule({
          status: 'error',
          message: err instanceof Error ? err.message : 'No se pudo cargar la agenda del día.',
        });
      }
    }
  };

  const handleToggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !selectedDate) {
      const todayIso = `${year}-${pad(month + 1)}-${pad(todayDate)}`;
      void fetchScheduleForDate(todayIso);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const isoDate = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    void fetchScheduleForDate(isoDate);
  };

  const handleOpenPlan = (planId: string) => {
    setOpen(false);
    navigate(`/pf/planning/${planId}`);
  };

  const handleGoToPlanning = () => {
    setOpen(false);
    if (isPF) {
      navigate('/pf/planning');
    }
  };

  const handleGoToCalendar = () => {
    setOpen(false);
    if (isPF) {
      navigate('/pf/calendar');
    }
  };

  return (
    <div className="shell-calendar-wrap" ref={popoverRef}>
      <button
        type="button"
        className="shell-pill-btn shell-calendar-btn"
        onClick={handleToggleOpen}
        aria-label="Abrir calendario"
        title="Calendario y agenda de actividades"
        aria-expanded={open}
      >
        <CalendarIcon size={16} className="shell-calendar-icon" aria-hidden="true" />
        <span>Calendario</span>
      </button>

      {open && (
        <div className="shell-calendar-popover" role="dialog" aria-label="Vista de calendario">
          <div className="shell-calendar-header">
            <div className="shell-calendar-title">
              <strong>{monthNames[month]}</strong> <span>{year}</span>
            </div>
            <div className="shell-calendar-nav">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="shell-calendar-nav-btn"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="shell-calendar-nav-btn"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="shell-calendar-weekdays">
            {daysOfWeek.map((day) => (
              <span key={day} className="shell-calendar-weekday">
                {day}
              </span>
            ))}
          </div>

          <div className="shell-calendar-grid">
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="shell-calendar-cell empty" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const iso = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
              const isToday = isCurrentMonth && dayNum === todayDate;
              const isSelected = selectedDate === iso;
              const evt = eventsByDate.get(iso);
              const dayOfWeek = new Date(year, month, dayNum).getDay();
              const hasPlannedTraining = dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5;
              const showMatch = evt?.hasMatch;
              const showTraining = evt?.hasTraining || hasPlannedTraining;

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  className={`shell-calendar-cell is-clickable ${isToday ? 'is-today' : ''} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  onClick={() => handleSelectDay(dayNum)}
                  aria-label={isPF ? `Ver actividades del ${dayNum}` : `Ver tareas del ${dayNum}`}
                  aria-pressed={isSelected}
                >
                  <span>{dayNum}</span>
                  {(showMatch || showTraining) && (
                    <span className="shell-calendar-dots">
                      {showMatch && <span className="shell-calendar-dot match" title="Partido" />}
                      {showTraining && (
                        <span
                          className="shell-calendar-dot training"
                          title="Entrenamiento planificado"
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && (
            <div className="shell-calendar-agenda" aria-live="polite">
              <strong className="shell-calendar-agenda-title">
                {isAthlete
                  ? `Tareas del ${formatIsoDate(selectedDate).slice(0, 5)}`
                  : `Agenda del ${formatIsoDate(selectedDate).slice(0, 5)}`}
              </strong>

              {/* Matches for this date */}
              {selectedMatches.map((m) => (
                <div
                  key={m.id}
                  className="shell-calendar-agenda-item"
                  onClick={isPF ? handleGoToCalendar : undefined}
                  title={isPF ? 'Ver en Calendario de Temporada' : 'Partido oficial programado'}
                  role={isPF ? 'button' : undefined}
                  tabIndex={isPF ? 0 : undefined}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      width: '100%',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span className="shell-calendar-agenda-badge match">
                      {m.homeOrAway === 'Home' ? <Shield size={11} /> : <MapPin size={11} />}
                      {m.homeOrAway === 'Home'
                        ? 'Local'
                        : m.homeOrAway === 'Away'
                          ? 'Visitante'
                          : 'Neutral'}
                    </span>
                    <span className="shell-calendar-agenda-meta">
                      {formatTime(m.matchDate) ? `${formatTime(m.matchDate)} hs` : 'Sin horario'}
                    </span>
                  </div>
                  <span className="shell-calendar-agenda-plan">
                    <Trophy size={13} aria-hidden="true" /> VS {m.opponent}
                  </span>
                  {m.categoryName && (
                    <span className="shell-calendar-agenda-meta">{m.categoryName}</span>
                  )}
                </div>
              ))}

              {/* Tasks for athlete */}
              {isAthlete && (
                <>
                  {athleteSchedule && athleteSchedule.status === 'loading' && (
                    <p className="shell-calendar-agenda-empty">Cargando tareas del día…</p>
                  )}
                  {athleteSchedule && athleteSchedule.status === 'error' && (
                    <p className="shell-calendar-agenda-error">{athleteSchedule.message}</p>
                  )}
                  {athleteSchedule && athleteSchedule.status === 'done' && (
                    <>
                      {/* Routine task */}
                      {athleteSchedule.routine?.exercises &&
                      athleteSchedule.routine.exercises.length > 0 ? (
                        <button
                          type="button"
                          className="shell-calendar-agenda-item"
                          onClick={() => {
                            setOpen(false);
                            navigate(`/athlete/routine?date=${selectedDate}`);
                          }}
                          title="Abrir mi rutina de entrenamiento"
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span className="shell-calendar-agenda-badge training">
                              <Dumbbell size={11} />
                              <span>Rutina de Pesas</span>
                            </span>
                            <span className="shell-calendar-agenda-meta">
                              {athleteSchedule.routine.exercises.length}{' '}
                              {athleteSchedule.routine.exercises.length === 1
                                ? 'ejercicio'
                                : 'ejercicios'}
                            </span>
                          </div>
                          <span className="shell-calendar-agenda-plan">
                            <Dumbbell size={13} aria-hidden="true" /> Sesión de gimnasio
                          </span>
                          {athleteSchedule.routine.coachNotes && (
                            <span className="shell-calendar-agenda-meta">
                              {athleteSchedule.routine.coachNotes}
                            </span>
                          )}
                        </button>
                      ) : athleteSchedule.planningSessions.length > 0 ? (
                        athleteSchedule.planningSessions.map((item) => (
                          <button
                            type="button"
                            key={item.assignmentId}
                            className="shell-calendar-agenda-item"
                            onClick={() => {
                              setOpen(false);
                              navigate(`/athlete/routine?date=${selectedDate}`);
                            }}
                            title="Abrir la rutina de entrenamiento"
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                width: '100%',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span className="shell-calendar-agenda-badge training">
                                <Dumbbell size={11} />
                                <span>
                                  {item.sessionTime ? `${item.sessionTime} hs` : 'Rutina'}
                                </span>
                              </span>
                              <span className="shell-calendar-agenda-meta">
                                {item.exerciseCount} ejercicios
                              </span>
                            </div>
                            <span className="shell-calendar-agenda-plan">
                              <Dumbbell size={13} aria-hidden="true" /> {item.planName}:{' '}
                              {item.sessionName}
                            </span>
                          </button>
                        ))
                      ) : (
                        <button
                          type="button"
                          className="shell-calendar-agenda-item"
                          onClick={() => {
                            setOpen(false);
                            navigate(`/athlete/routine?date=${selectedDate}`);
                          }}
                          title="Ir a la rutina general"
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span className="shell-calendar-agenda-badge training">
                              <Dumbbell size={11} />
                              <span>Rutina</span>
                            </span>
                          </div>
                          <span
                            className="shell-calendar-agenda-plan"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Sin ejercicios asignados hoy
                          </span>
                          <span className="shell-calendar-agenda-meta">
                            Tocá para ver la rutina general
                          </span>
                        </button>
                      )}

                      {/* Daily Check-in task */}
                      <button
                        type="button"
                        className="shell-calendar-agenda-item"
                        onClick={() => {
                          setOpen(false);
                          navigate('/athlete/check-in');
                        }}
                        title="Ir a check-in diario"
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            className={`shell-calendar-agenda-badge ${
                              athleteSchedule.isCheckInDone ? 'training' : 'match'
                            }`}
                          >
                            <ClipboardList size={11} />
                            <span>
                              {athleteSchedule.isCheckInDone ? 'Completado' : 'Pendiente'}
                            </span>
                          </span>
                          <span className="shell-calendar-agenda-meta">Bienestar</span>
                        </div>
                        <span className="shell-calendar-agenda-plan">
                          {athleteSchedule.isCheckInDone ? (
                            <>
                              <CheckCircle2 size={13} aria-hidden="true" /> Check-in de bienestar
                              completado
                            </>
                          ) : (
                            <>
                              <ClipboardList size={13} aria-hidden="true" /> Check-in diario de
                              bienestar
                            </>
                          )}
                        </span>
                        <span className="shell-calendar-agenda-meta">
                          {athleteSchedule.isCheckInDone
                            ? 'Descanso, ánimo y molestias registrados'
                            : 'Registrar horas de sueño, dolor y fatiga'}
                        </span>
                      </button>

                      {/* Daily Load task */}
                      <button
                        type="button"
                        className="shell-calendar-agenda-item"
                        onClick={() => {
                          setOpen(false);
                          navigate('/athlete/daily-load');
                        }}
                        title="Registrar carga del día"
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span className="shell-calendar-agenda-badge training">
                            <Activity size={11} />
                            <span>Carga del Día</span>
                          </span>
                          <span className="shell-calendar-agenda-meta">RPE / Minutos</span>
                        </div>
                        <span className="shell-calendar-agenda-plan">
                          <Zap size={13} aria-hidden="true" /> Registrar esfuerzo y duración
                        </span>
                        <span className="shell-calendar-agenda-meta">
                          Gimnasio, entrenamiento y partido
                        </span>
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Tasks for coach (PF) */}
              {isPF && (
                <>
                  {daySchedule && daySchedule.status === 'loading' && (
                    <p className="shell-calendar-agenda-empty">Cargando rutinas…</p>
                  )}
                  {daySchedule && daySchedule.status === 'error' && (
                    <p className="shell-calendar-agenda-error">{daySchedule.message}</p>
                  )}
                  {daySchedule &&
                    daySchedule.status === 'done' &&
                    daySchedule.sessions.map((item) => {
                      const targetId = item.categoryId ?? item.athleteId ?? '';
                      return (
                        <button
                          type="button"
                          key={item.assignmentId}
                          className="shell-calendar-agenda-item"
                          onClick={() => handleOpenPlan(item.trainingPlanId)}
                          title="Abrir la planificación"
                        >
                          <span className="shell-calendar-agenda-plan">
                            {item.planName} · {item.sessionName}
                          </span>
                          <span className="shell-calendar-agenda-meta">
                            {targetNames?.[targetId] ?? (item.categoryId ? 'Categoría' : 'Atleta')}{' '}
                            · {item.exerciseCount}{' '}
                            {item.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
                          </span>
                        </button>
                      );
                    })}

                  {selectedMatches.length === 0 &&
                    daySchedule?.status === 'done' &&
                    daySchedule.sessions.length === 0 && (
                      <p className="shell-calendar-agenda-empty">
                        No hay actividades programadas este día.
                      </p>
                    )}
                </>
              )}
            </div>
          )}

          <div className="shell-calendar-footer">
            <span className="shell-calendar-today-badge">
              Hoy: {today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
            {isPF && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleGoToCalendar}
                  className="shell-calendar-action-btn"
                  title="Abrir vista de temporada completa"
                >
                  <span>Temporada</span>
                  <ArrowRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleGoToPlanning}
                  className="shell-calendar-action-btn"
                >
                  <span>Planificación</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
            {isAthlete && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/athlete/routine');
                  }}
                  className="shell-calendar-action-btn"
                  title="Ir a mi rutina de hoy"
                >
                  <Dumbbell size={13} />
                  <span>Mi Rutina</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/athlete/progress');
                  }}
                  className="shell-calendar-action-btn"
                  title="Ver mi perfil y progreso de atleta"
                >
                  <span>Mi Progreso</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

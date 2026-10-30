import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Shield,
  MapPin,
} from 'lucide-react';
import { structureService } from '../../api/structureService';
import { matchService } from '../../services/matchService';
import {
  seasonPlanningService,
  PlannedSessionWithTime,
} from '../../services/seasonPlanningService';
import { Match } from '../../types/structure';
import { formatIsoDate } from '../../utils/argentinaDate';
import { toIsoDate, formatTime } from '../../utils/calendarUtils';

type DaySchedule =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; sessions: PlannedSessionWithTime[] };

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
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isPF = location.pathname.startsWith('/pf');

  // Selected date (YYYY-MM-DD) and routine schedule
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySchedule, setDaySchedule] = useState<DaySchedule | null>(null);
  const [targetNames, setTargetNames] = useState<Record<string, string> | null>(null);

  // Matches and scheduled trainings state
  const [matches, setMatches] = useState<Match[]>([]);

  // Load matches
  const loadEvents = useCallback(async () => {
    try {
      const fetchedMatches = await matchService.getMatches([]);
      setMatches(fetchedMatches);
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const fetchedMatches = await matchService.getMatches([]);
        if (isMounted) {
          setMatches(fetchedMatches);
        }
      } catch {
        // Ignored
      }
    };
    void fetchInitial();
    return () => {
      isMounted = false;
    };
  }, []);

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
      const iso = toIsoDate(new Date(m.matchDate));
      const entry = map.get(iso) || { hasMatch: false, hasTraining: false };
      entry.hasMatch = true;
      map.set(iso, entry);
    });

    return map;
  }, [matches]);

  // Events for selected date
  const selectedMatches = useMemo(() => {
    if (!selectedDate) return [];
    return matches.filter((m) => toIsoDate(new Date(m.matchDate)) === selectedDate);
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

  const handleSelectDay = async (dayNum: number) => {
    const isoDate = `${year}-${pad(month + 1)}-${pad(dayNum)}`;

    if (!isPF) {
      setOpen(false);
      navigate(`/athlete/routine?date=${isoDate}`);
      return;
    }

    setSelectedDate(isoDate);
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
        onClick={() => setOpen(!open)}
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
              const hasPlannedTraining =
                isPF && (dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5);
              const showMatch = evt?.hasMatch;
              const showTraining = evt?.hasTraining || hasPlannedTraining;

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  className={`shell-calendar-cell is-clickable ${isToday ? 'is-today' : ''} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  onClick={() => void handleSelectDay(dayNum)}
                  aria-label={
                    isPF ? `Ver actividades del ${dayNum}` : `Ver la rutina del ${dayNum}`
                  }
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

          {isPF && selectedDate && (
            <div className="shell-calendar-agenda" aria-live="polite">
              <strong className="shell-calendar-agenda-title">
                Agenda del {formatIsoDate(selectedDate).slice(0, 5)}
              </strong>

              {/* Matches for this date */}
              {selectedMatches.map((m) => (
                <div
                  key={m.id}
                  className="shell-calendar-agenda-item"
                  onClick={handleGoToCalendar}
                  title="Ver en Calendario de Temporada"
                  role="button"
                  tabIndex={0}
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
                    <span className="shell-calendar-agenda-meta">{formatTime(m.matchDate)} hs</span>
                  </div>
                  <span className="shell-calendar-agenda-plan">VS {m.opponent}</span>
                  {m.categoryName && (
                    <span className="shell-calendar-agenda-meta">{m.categoryName}</span>
                  )}
                </div>
              ))}

              {/* Assigned plan sessions */}
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
                        {targetNames?.[targetId] ?? (item.categoryId ? 'Categoría' : 'Atleta')} ·{' '}
                        {item.exerciseCount} {item.exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
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
          </div>
        </div>
      )}
    </div>
  );
};

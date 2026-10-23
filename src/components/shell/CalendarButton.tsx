import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { trainingPlansService } from '../../api/trainingPlans';
import { structureService } from '../../api/structureService';
import { ScheduledSession } from '../../api/generated/entrenamiento';
import { formatIsoDate } from '../../utils/argentinaDate';

// Agenda del PF para el día elegido: las sesiones que tocan ese día en sus asignaciones
type DaySchedule =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'done'; sessions: ScheduledSession[] };

const pad = (value: number) => String(value).padStart(2, '0');

// Nombres de las categorías (de todas las organizaciones) y de los atletas del PF, por id
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

  // Día elegido en el calendario (AAAA-MM-DD) y su agenda (solo PF)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySchedule, setDaySchedule] = useState<DaySchedule | null>(null);
  // Nombres de categorías y atletas para mostrar a quién está asignada cada sesión (se cargan una vez)
  const [targetNames, setTargetNames] = useState<Record<string, string> | null>(null);

  // Cerrar al hacer clic fuera del popover
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

  // Información del mes
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
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7; // Lunes = 0
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

  // Atleta: abre "Mi rutina" de ese día. PF: muestra abajo las sesiones planificadas ese día.
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
        trainingPlansService.schedule(isoDate),
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
              const isToday = isCurrentMonth && dayNum === todayDate;

              const isSelected = selectedDate === `${year}-${pad(month + 1)}-${pad(dayNum)}`;

              return (
                <button
                  type="button"
                  key={`day-${dayNum}`}
                  className={`shell-calendar-cell is-clickable ${isToday ? 'is-today' : ''} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  onClick={() => void handleSelectDay(dayNum)}
                  aria-label={isPF ? `Ver las sesiones del ${dayNum}` : `Ver la rutina del ${dayNum}`}
                  aria-pressed={isSelected}
                >
                  <span>{dayNum}</span>
                </button>
              );
            })}
          </div>

          {isPF && selectedDate && daySchedule && (
            <div className="shell-calendar-agenda" aria-live="polite">
              <strong className="shell-calendar-agenda-title">
                Sesiones del {formatIsoDate(selectedDate).slice(0, 5)}
              </strong>
              {daySchedule.status === 'loading' && (
                <p className="shell-calendar-agenda-empty">Cargando…</p>
              )}
              {daySchedule.status === 'error' && (
                <p className="shell-calendar-agenda-error">{daySchedule.message}</p>
              )}
              {daySchedule.status === 'done' && daySchedule.sessions.length === 0 && (
                <p className="shell-calendar-agenda-empty">No hay sesiones planificadas ese día.</p>
              )}
              {daySchedule.status === 'done' &&
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
            </div>
          )}

          <div className="shell-calendar-footer">
            <span className="shell-calendar-today-badge">
              Hoy: {today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </span>
            {isPF && (
              <button
                type="button"
                onClick={handleGoToPlanning}
                className="shell-calendar-action-btn"
              >
                <span>Planificación</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export const CalendarButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isPF = location.pathname.startsWith('/pf');

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

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`shell-calendar-cell ${isToday ? 'is-today' : ''}`}
                >
                  <span>{dayNum}</span>
                </div>
              );
            })}
          </div>

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

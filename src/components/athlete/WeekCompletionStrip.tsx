import React from 'react';
import './WeekCompletionStrip.css';
import { CheckCircle2, Circle } from 'lucide-react';
import type { AthleteWeekDay } from '../../types/seguimiento';

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lun',
  Tuesday: 'Mar',
  Wednesday: 'Mié',
  Thursday: 'Jue',
  Friday: 'Vie',
  Saturday: 'Sáb',
  Sunday: 'Dom',
};

export interface WeekCompletionStripProps {
  days: AthleteWeekDay[];
  isLoading?: boolean;
}

export const WeekCompletionStrip: React.FC<WeekCompletionStripProps> = ({
  days,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="wcs-strip" aria-busy="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="wcs-day wcs-day--loading" />
        ))}
      </div>
    );
  }

  if (!days || days.length === 0) {
    return null;
  }

  return (
    <div className="wcs-strip" role="list" aria-label="Semana del atleta">
      {days.map((day) => {
        const label = DAY_LABELS[day.dayOfWeek] ?? day.dayOfWeek.slice(0, 3);
        return (
          <div
            key={day.date}
            role="listitem"
            className={`wcs-day ${day.completed ? 'wcs-day--completed' : 'wcs-day--pending'}`}
            aria-label={`${label}: ${day.completed ? 'completado' : 'pendiente'}`}
            title={day.date}
          >
            <span className="wcs-day-label">{label}</span>
            <span className="wcs-day-icon">
              {day.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </span>
          </div>
        );
      })}
    </div>
  );
};

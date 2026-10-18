import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface LiveClockWidgetProps {
  className?: string;
}

export const LiveClockWidget: React.FC<LiveClockWidgetProps> = ({ className = '' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  const shift =
    hours >= 6 && hours < 13
      ? 'Turno Mañana'
      : hours >= 13 && hours < 20
        ? 'Turno Tarde'
        : 'Turno Noche';

  const timeString = time.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateString = time.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className={`live-clock-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1rem 1.15rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Clock size={13} style={{ color: 'var(--stat-cyan)' }} />
          Hora en vivo
        </span>
        <span
          className="badge"
          style={{
            background: 'var(--stat-cyan-bg)',
            color: 'var(--stat-cyan)',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
          }}
        >
          {shift}
        </span>
      </div>

      <div>
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {timeString}
        </div>
        <p
          style={{
            margin: '0.25rem 0 0',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'capitalize',
          }}
        >
          {dateString}
        </p>
      </div>
    </div>
  );
};

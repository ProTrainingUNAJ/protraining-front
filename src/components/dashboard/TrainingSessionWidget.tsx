import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface TrainingSessionWidgetProps {
  locationName?: string;
  field?: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  className?: string;
}

export const TrainingSessionWidget: React.FC<TrainingSessionWidgetProps> = ({
  locationName = 'Predio UNAJ',
  field = 'Campo 1 (Fútbol 11)',
  startTime = '17:30',
  endTime = '19:15',
  className = '',
}) => {
  const [countdownText, setCountdownText] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    function computeStatus() {
      const now = new Date();
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const sessionStart = new Date(now);
      sessionStart.setHours(startH, startM, 0, 0);

      const sessionEnd = new Date(now);
      sessionEnd.setHours(endH, endM, 0, 0);

      const diffStart = sessionStart.getTime() - now.getTime();
      const diffEnd = sessionEnd.getTime() - now.getTime();

      if (diffStart <= 0 && diffEnd > 0) {
        setIsLive(true);
        const minsLeft = Math.floor(diffEnd / (1000 * 60));
        setCountdownText(`En curso (${minsLeft}m restantes)`);
      } else if (diffStart > 0) {
        setIsLive(false);
        const hoursLeft = Math.floor(diffStart / (1000 * 60 * 60));
        const minsLeft = Math.floor((diffStart % (1000 * 60 * 60)) / (1000 * 60));
        if (hoursLeft > 0) {
          setCountdownText(`Comienza en ${hoursLeft}h ${minsLeft}m`);
        } else {
          setCountdownText(`Comienza en ${minsLeft}m`);
        }
      } else {
        setIsLive(false);
        setCountdownText('Completada hoy');
      }
    }

    computeStatus();
    const timer = setInterval(computeStatus, 60000);
    return () => clearInterval(timer);
  }, [startTime, endTime]);

  return (
    <div
      className={`training-session-widget ${className}`}
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
          <MapPin size={13} style={{ color: 'var(--pain-level-4)' }} />
          Lugar & Horario
        </span>

        <span
          className="badge"
          style={{
            background: isLive ? 'var(--stat-green-bg)' : 'var(--bg-subtle)',
            color: isLive ? 'var(--stat-green)' : 'var(--text-secondary)',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          {isLive && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--stat-green)',
                boxShadow: '0 0 6px var(--stat-green)',
              }}
            />
          )}
          {countdownText}
        </span>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.35rem',
          }}
        >
          <span
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            {startTime}
          </span>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            a {endTime} hs
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            marginTop: '0.25rem',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{locationName}</span>
          <span>·</span>
          <span>{field}</span>
        </div>
      </div>
    </div>
  );
};

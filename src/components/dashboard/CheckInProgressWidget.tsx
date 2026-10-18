import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

interface CheckInProgressProps {
  completed?: number;
  total?: number;
  deadline?: string;
  className?: string;
}

export const CheckInProgressWidget: React.FC<CheckInProgressProps> = ({
  completed = 20,
  total = 24,
  deadline = '16:30 hs',
  className = '',
}) => {
  const percentage = Math.round((completed / total) * 100);

  return (
    <div
      className={`checkin-progress-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1.15rem',
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
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <CheckCircle2 size={14} style={{ color: 'var(--stat-green)' }} />
          Check-in Matutino
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Clock size={11} /> Límite {deadline}
        </span>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '0.45rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <span
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {completed}
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              / {total} atletas
            </span>
          </div>

          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: 'var(--stat-green)',
            }}
          >
            {percentage}%
          </span>
        </div>

        {/* Barra de progreso */}
        <div
          style={{
            width: '100%',
            height: '8px',
            background: 'var(--bg-subtle)',
            borderRadius: '9999px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: 'var(--grad-suite)',
              borderRadius: '9999px',
              transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>

      <p
        style={{
          margin: '0.5rem 0 0',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
        }}
      >
        {total - completed > 0
          ? `${total - completed} atletas pendientes antes del entrenamiento`
          : 'Plantel completo completó el check-in'}
      </p>
    </div>
  );
};

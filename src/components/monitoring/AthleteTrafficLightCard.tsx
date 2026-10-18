import React from 'react';
import { ChevronRight, AlertCircle, Moon, Activity } from 'lucide-react';
import { AthleteTrafficLightItem, TrafficLightStatus } from './trafficLight.types';

interface AthleteTrafficLightCardProps {
  athlete: AthleteTrafficLightItem;
  onClick: () => void;
  className?: string;
}

const STATUS_COLORS: Record<TrafficLightStatus, { ring: string; bg: string; text: string }> = {
  red: {
    ring: 'var(--pain-level-5)',
    bg: 'var(--pain-level-5-bg)',
    text: 'var(--pain-level-5)',
  },
  yellow: {
    ring: 'var(--warning-border)',
    bg: 'var(--warning-bg)',
    text: 'var(--warning-text)',
  },
  green: {
    ring: 'var(--stat-green)',
    bg: 'var(--stat-green-bg)',
    text: 'var(--stat-green)',
  },
  gray: {
    ring: 'var(--border)',
    bg: 'var(--bg-subtle)',
    text: 'var(--text-muted)',
  },
};

export const AthleteTrafficLightCard: React.FC<AthleteTrafficLightCardProps> = ({
  athlete,
  onClick,
  className = '',
}) => {
  const colors = STATUS_COLORS[athlete.status];
  const initials = athlete.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const maxPainLevel =
    athlete.pains && athlete.pains.length > 0 ? Math.max(...athlete.pains.map((p) => p.level)) : 0;

  return (
    <div
      onClick={onClick}
      className={`card athlete-traffic-light-card ${className}`}
      style={{
        margin: 0,
        padding: '1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        background: 'var(--bg-card)',
        position: 'relative',
        overflow: 'hidden',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Ver ficha rápida de ${athlete.name}, estado ${athlete.statusLabel}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
        {/* Anillo de color concéntrico SVG alrededor del avatar */}
        <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0 }}>
          <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="25" cy="25" r="22" fill="none" stroke="var(--border)" strokeWidth="2.5" />
            <circle
              cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke={colors.ring}
              strokeWidth="3.5"
              strokeDasharray="138"
              strokeDashoffset={athlete.status === 'gray' ? '69' : '0'}
              strokeLinecap="round"
            />
          </svg>

          {/* Avatar interior */}
          <div
            style={{
              position: 'absolute',
              inset: '6px',
              borderRadius: '50%',
              background: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              overflow: 'hidden',
            }}
          >
            {athlete.avatarUrl ? (
              <img
                src={athlete.avatarUrl}
                alt={athlete.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </div>

        {/* Nombre, posición y recomendación */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '0.98rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {athlete.name}
            </h4>
            <span
              className="badge"
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                background: colors.bg,
                color: colors.text,
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '0.15rem 0.5rem',
              }}
            >
              {athlete.statusLabel}
            </span>
          </div>

          <p
            style={{
              margin: '0.2rem 0 0',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {athlete.position} · {athlete.recommendation}
          </p>
        </div>
      </div>

      {/* Indicadores rápidos a la derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        {athlete.status !== 'gray' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            {maxPainLevel > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: maxPainLevel >= 4 ? 'var(--pain-level-5)' : 'var(--warning-text)',
                }}
                title={`Dolor máximo nivel ${maxPainLevel}/5`}
              >
                <AlertCircle size={13} /> {maxPainLevel}/5
              </span>
            )}

            {athlete.sleepHours !== undefined && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: 'var(--text-muted)',
                }}
                title={`${athlete.sleepHours} hs de sueño`}
              >
                <Moon size={13} /> {athlete.sleepHours}h
              </span>
            )}

            {athlete.rpe !== undefined && athlete.rpe > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: 'var(--stat-cyan)',
                  fontWeight: 600,
                }}
                title={`RPE ${athlete.rpe}/10`}
              >
                <Activity size={13} /> {athlete.rpe}
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Pendiente
          </span>
        )}

        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
      </div>
    </div>
  );
};

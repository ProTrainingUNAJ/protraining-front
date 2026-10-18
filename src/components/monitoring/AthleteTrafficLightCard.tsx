import React from 'react';
import { ChevronRight, AlertCircle, Moon, Activity } from 'lucide-react';
import { AthleteTrafficLightItem, TrafficLightStatus } from './trafficLight.types';

interface AthleteTrafficLightCardProps {
  athlete: AthleteTrafficLightItem;
  onClick: () => void;
  className?: string;
}

const STATUS_COLORS: Record<TrafficLightStatus, { ring: string; bg: string; text: string; border: string }> = {
  red: {
    ring: 'var(--traffic-red)',
    bg: 'var(--traffic-red-bg)',
    text: 'var(--traffic-red-text)',
    border: 'var(--traffic-red-border)',
  },
  yellow: {
    ring: 'var(--traffic-yellow)',
    bg: 'var(--traffic-yellow-bg)',
    text: 'var(--traffic-yellow-text)',
    border: 'var(--traffic-yellow-border)',
  },
  green: {
    ring: 'var(--traffic-green)',
    bg: 'var(--traffic-green-bg)',
    text: 'var(--traffic-green-text)',
    border: 'var(--traffic-green-border)',
  },
  gray: {
    ring: 'var(--traffic-gray)',
    bg: 'var(--traffic-gray-bg)',
    text: 'var(--traffic-gray-text)',
    border: 'var(--traffic-gray-border)',
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
        padding: '1.2rem 1.25rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.85rem',
        minHeight: '175px',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        background: 'var(--bg-card)',
        position: 'relative',
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
      {/* 1. Sección superior: Avatar, Nombre completo, Posición · División y Chevron */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.9rem',
          width: '100%',
        }}
      >
        {/* Anillo de color concéntrico SVG alrededor del avatar */}
        <div style={{ position: 'relative', width: '50px', height: '50px', flexShrink: 0, marginTop: '2px' }}>
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

        {/* Datos principales: Nombre y Posición · División */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1.25,
              }}
            >
              {athlete.name}
            </h4>
            <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>

          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              lineHeight: 1.3,
            }}
          >
            {athlete.position} · {athlete.category || 'Primera División'}
          </p>
        </div>
      </div>

      {/* 2. Sección intermedia: Badge de estado y Métricas rápidas (Dolor, Sueño, RPE) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          flexWrap: 'wrap',
          paddingTop: '0.1rem',
        }}
      >
        <span
          className="badge"
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '9999px',
            padding: '0.2rem 0.6rem',
            letterSpacing: '0.01em',
          }}
        >
          {athlete.statusLabel}
        </span>

        {/* Indicadores rápidos de métricas */}
        {athlete.status !== 'gray' ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.78rem',
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
                <AlertCircle size={14} /> {maxPainLevel}/5
              </span>
            )}

            {athlete.sleepHours !== undefined && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
                title={`${athlete.sleepHours} hs de sueño`}
              >
                <Moon size={14} /> {athlete.sleepHours}h
              </span>
            )}

            {athlete.rpe !== undefined && athlete.rpe > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: athlete.rpe >= 8 ? 'var(--pain-level-5)' : 'var(--cyan-accent)',
                }}
                title={`RPE de la última sesión: ${athlete.rpe}`}
              >
                <Activity size={14} /> {athlete.rpe}
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 600 }}>
            Pendiente
          </span>
        )}
      </div>

      {/* 3. Sección inferior: Estado con separación en color rojo / amarillo / verde */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '0.65rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          background: 'rgba(0, 0, 0, 0.015)',
          borderRadius: '8px',
          padding: '0.5rem 0.65rem',
          marginTop: '0.1rem',
        }}
      >
        {/* Barra vertical de separación en color rojo / amarillo / verde */}
        <div
          style={{
            width: '4px',
            borderRadius: '4px',
            backgroundColor: colors.ring,
            alignSelf: 'stretch',
            minHeight: '1.25rem',
            flexShrink: 0,
          }}
        />

        {/* Texto del estado / recomendación visible completo */}
        <p
          style={{
            margin: 0,
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            lineHeight: 1.4,
          }}
        >
          {athlete.recommendation ||
            (athlete.status === 'gray'
              ? 'Sin check-in completado el día de hoy.'
              : 'Apto para completar el 100% de la carga planificada.')}
        </p>
      </div>
    </div>
  );
};

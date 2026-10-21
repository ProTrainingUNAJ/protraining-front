import React from 'react';
import { ChevronRight, AlertCircle, Moon, Activity, Siren, Thermometer } from 'lucide-react';
import { AthleteTrafficLightItem, TrafficLightStatus } from './trafficLight.types';
import { AthleteAvatar } from './AthleteAvatar';

interface AthleteTrafficLightCardProps {
  athlete: AthleteTrafficLightItem;
  onClick: () => void;
  className?: string;
}

const STATUS_COLORS: Record<
  TrafficLightStatus,
  { ring: string; bg: string; text: string; border: string }
> = {
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

  const maxPainLevel =
    athlete.pains && athlete.pains.length > 0 ? Math.max(...athlete.pains.map((p) => p.level)) : 0;

  // Badge label: keeps default for green/gray; shows affected muscle or area for red/yellow
  const badgeLabel =
    athlete.status === 'green'
      ? 'Óptimos'
      : athlete.status === 'gray'
        ? 'Sin Check-in'
        : athlete.affectedMuscle || athlete.statusLabel;

  // Sin posición disponible (el semáforo del día no la trae), se muestra solo el plantel.
  const subtitle = [athlete.position, athlete.category].filter(Boolean).join(' · ') || 'Plantel';

  return (
    <div
      onClick={onClick}
      className={`card athlete-traffic-light-card ${className}`}
      style={{
        margin: 0,
        padding: '1.2rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '0.75rem',
        minHeight: '190px',
        height: '100%',
        boxSizing: 'border-box',
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
      aria-label={`Ver ficha rápida de ${athlete.name}, estado ${badgeLabel}`}
    >
      {/* 1. Sección superior: Avatar (foto o iniciales), Nombre, Posición · División y Chevron */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          width: '100%',
          height: '52px',
          boxSizing: 'border-box',
        }}
      >
        {/* Componente preparado para foto de perfil con fallback a iniciales */}
        <AthleteAvatar
          name={athlete.name}
          avatarUrl={athlete.avatarUrl}
          status={athlete.status}
          ringColor={colors.ring}
          size={48}
          showRing={true}
        />

        {/* Datos principales: Nombre y Posición · División */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '1.02rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={athlete.name}
            >
              {athlete.name}
            </h4>
            <ChevronRight size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>

          <p
            style={{
              margin: '0.2rem 0 0',
              fontSize: '0.81rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={subtitle}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* 2. Sección intermedia: Badge (músculo/estado) y Métricas (Dolor, Sueño, RPE) con altura fija */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          height: '28px',
          boxSizing: 'border-box',
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
            whiteSpace: 'nowrap',
          }}
        >
          {badgeLabel}
        </span>

        {/* Indicadores rápidos de métricas */}
        {athlete.status !== 'gray' ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              overflow: 'hidden',
              minWidth: 0,
            }}
          >
            {athlete.hasActiveInjury && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: 'var(--traffic-red-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Lesión activa reportada en el check-in de hoy"
              >
                <Siren size={14} /> Lesión
              </span>
            )}

            {athlete.isSick && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: 'var(--warning-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Reportó enfermedad en el check-in de hoy"
              >
                <Thermometer size={14} /> Enfermo
              </span>
            )}

            {maxPainLevel > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: maxPainLevel >= 4 ? 'var(--pain-level-5)' : 'var(--warning-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
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
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`RPE de la última sesión: ${athlete.rpe}`}
              >
                <Activity size={14} /> {athlete.rpe}
              </span>
            )}
          </div>
        ) : (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              fontWeight: 600,
            }}
          >
            Pendiente
          </span>
        )}
      </div>

      {/* 3. Sección inferior: Estado/Recomendación con separación de color (Altura fija alineada) */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          background: 'rgba(0, 0, 0, 0.015)',
          borderRadius: '8px',
          padding: '0.5rem 0.65rem',
          height: '54px',
          boxSizing: 'border-box',
        }}
      >
        {/* Barra vertical de separación en color con altura fija de 32px */}
        <div
          style={{
            width: '4px',
            height: '32px',
            borderRadius: '4px',
            backgroundColor: colors.ring,
            flexShrink: 0,
          }}
        />

        {/* Texto del estado / recomendación visible y alineado */}
        <p
          style={{
            margin: 0,
            fontSize: '0.80rem',
            fontWeight: 600,
            color: 'var(--text-main)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={athlete.recommendation}
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

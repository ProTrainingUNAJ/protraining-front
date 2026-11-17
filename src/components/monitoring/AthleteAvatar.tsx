import React from 'react';
import { TrafficLightStatus } from './trafficLight.types';
import { TrafficRing } from './TrafficRing';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface AthleteAvatarProps {
  name: string;
  avatarUrl?: string;
  status?: TrafficLightStatus;
  ringColor?: string;
  size?: number; // Tamaño en píxeles (por defecto 42, armonizado con asistencia)
  showRing?: boolean; // Muestra el anillo e iluminación de color del semáforo
  className?: string;
}

const STATUS_GLOW: Record<TrafficLightStatus, { ring: string; glow: string }> = {
  red: {
    ring: 'var(--traffic-red)',
    glow: '0 0 0 2px var(--traffic-red), 0 0 12px 2px rgb(239 68 68 / 0.55)',
  },
  yellow: {
    ring: 'var(--traffic-yellow)',
    glow: '0 0 0 2px var(--traffic-yellow), 0 0 12px 2px rgb(245 158 11 / 0.55)',
  },
  green: {
    ring: 'var(--traffic-green)',
    glow: '0 0 0 2px var(--traffic-green), 0 0 12px 2px rgb(16 185 129 / 0.55)',
  },
  gray: {
    ring: 'var(--traffic-gray-border)',
    glow: '0 0 0 1.5px var(--traffic-gray-border)',
  },
};

export const AthleteAvatar: React.FC<AthleteAvatarProps> = ({
  name,
  avatarUrl,
  status = 'gray',
  ringColor,
  size = 42,
  showRing = true,
  className = '',
}) => {
  const glowInfo = STATUS_GLOW[status] ?? STATUS_GLOW.gray;
  const effectiveRingColor = ringColor ?? glowInfo.ring;
  const ringInset = showRing ? 4 : 0;
  const innerSize = showRing ? size - ringInset * 2 : size;

  return (
    <div
      className={`athlete-avatar-container ${className}`}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        borderRadius: '50%',
        boxShadow: showRing ? glowInfo.glow : undefined,
        transition: 'box-shadow 0.2s ease',
      }}
      title={name}
    >
      {/* 1. Anillo concéntrico SVG del semáforo de dolor/readiness (KAN-365) */}
      {showRing && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <TrafficRing
            status={status}
            size={size}
            strokeWidth={3}
            progress={100}
            color={effectiveRingColor}
          />
        </div>
      )}

      {/* 2. Círculo interior: Foto de perfil del usuario o Iniciales como fallback */}
      <div
        style={{
          position: showRing ? 'absolute' : 'relative',
          inset: showRing ? `${ringInset}px` : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <ProfileAvatar src={avatarUrl} name={name} size={innerSize} shape="circle" />
      </div>
    </div>
  );
};

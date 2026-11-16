import React from 'react';
import { TrafficLightStatus } from './trafficLight.types';
import { TrafficRing } from './TrafficRing';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface AthleteAvatarProps {
  name: string;
  avatarUrl?: string;
  status?: TrafficLightStatus;
  ringColor?: string;
  size?: number; // Tamaño en píxeles (por defecto 48)
  showRing?: boolean; // Muestra el anillo concéntrico de color del semáforo
  className?: string;
}

export const AthleteAvatar: React.FC<AthleteAvatarProps> = ({
  name,
  avatarUrl,
  status = 'gray',
  ringColor = 'var(--traffic-gray)',
  size = 48,
  showRing = true,
  className = '',
}) => {
  const ringInset = showRing ? 5 : 0;
  const innerSize = showRing ? size - ringInset * 2 : size;

  return (
    <div
      className={`athlete-avatar-container ${className}`}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
      }}
      title={name}
    >
      {/* 1. Anillo concéntrico SVG del semáforo de dolor/readiness (KAN-365) */}
      {showRing && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <TrafficRing
            status={status}
            size={size}
            strokeWidth={3.5}
            progress={status === 'gray' ? 50 : 100}
            color={ringColor}
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

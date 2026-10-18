import React, { useState } from 'react';
import { TrafficLightStatus } from './trafficLight.types';

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
  const [imageError, setImageError] = useState(false);

  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const fontSize = Math.round(size * 0.32);
  const ringInset = showRing ? 5 : 0;

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
      {/* 1. Anillo concéntrico SVG del semáforo de dolor/readiness */}
      {showRing && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 50 50"
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
          aria-hidden="true"
        >
          <circle cx="25" cy="25" r="22" fill="none" stroke="var(--border)" strokeWidth="2.5" />
          <circle
            cx="25"
            cy="25"
            r="22"
            fill="none"
            stroke={ringColor}
            strokeWidth="3.5"
            strokeDasharray="138"
            strokeDashoffset={status === 'gray' ? '69' : '0'}
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* 2. Círculo interior: Foto de perfil del usuario o Iniciales como fallback */}
      <div
        style={{
          position: showRing ? 'absolute' : 'relative',
          inset: showRing ? `${ringInset}px` : 0,
          width: showRing ? undefined : `${size}px`,
          height: showRing ? undefined : `${size}px`,
          borderRadius: '50%',
          background: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: `${fontSize}px`,
          color: 'var(--text-main)',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={`Foto de perfil de ${name}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span aria-label={name}>{initials}</span>
        )}
      </div>
    </div>
  );
};

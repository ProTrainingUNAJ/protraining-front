import React from 'react';
import { TrafficLightStatus } from './trafficLight.types';

const TRAFFIC_RING_COLORS: Record<TrafficLightStatus, string> = {
  red: 'var(--traffic-red)',
  yellow: 'var(--traffic-yellow)',
  green: 'var(--traffic-green)',
  gray: 'var(--traffic-gray)',
};

interface TrafficRingProps {
  /** Estado del semáforo: define el color del anillo. */
  status: TrafficLightStatus;
  /** Tamaño en píxeles (por defecto 48). */
  size?: number;
  /** Grosor del trazo en la unidad del viewBox (por defecto 3.5). */
  strokeWidth?: number;
  /** Arco visible 0-100. Por defecto anillo completo; gris a la mitad (50). */
  progress?: number;
  /** Pista de fondo en color de borde (por defecto true). */
  showTrack?: boolean;
  /** Color del arco; sobrescribe el color derivado del estado. */
  color?: string;
  /** Etiqueta accesible del anillo. Sin ella se oculta del lector. */
  title?: string;
  className?: string;
  /** Contenido centrado superpuesto (ej: porcentaje). */
  children?: React.ReactNode;
}

// Anillo de color reutilizable del semáforo (KAN-365): SVG simple con pista,
// arco de color por estado y progreso opcional. Lo usan el avatar del atleta
// y cualquier indicador circular de las vistas del preparador físico.
export const TrafficRing: React.FC<TrafficRingProps> = ({
  status,
  size = 48,
  strokeWidth = 3.5,
  progress,
  showTrack = true,
  color: colorOverride,
  title,
  className = '',
  children,
}) => {
  // viewBox 50x50 con r=22 → circunferencia ≈ 138.23
  const circumference = 2 * Math.PI * 22;
  const clampedProgress = Math.min(100, Math.max(0, progress ?? 100));
  const dashOffset = circumference * (1 - clampedProgress / 100);
  const color = colorOverride ?? TRAFFIC_RING_COLORS[status];

  return (
    <div
      className={`traffic-ring ${className}`}
      style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        {showTrack && (
          <circle cx="25" cy="25" r="22" fill="none" stroke="var(--border)" strokeWidth="2.5" />
        )}
        <circle
          cx="25"
          cy="25"
          r="22"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      {children !== undefined && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

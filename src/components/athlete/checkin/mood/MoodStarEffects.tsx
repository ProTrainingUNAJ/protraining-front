import React from 'react';
import { BURST_STARS, AMBIENT_STARS } from './mood.types';

function renderStarSvg(type: 'four' | 'five', size: number, color: string) {
  if (type === 'four') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="-10 -10 20 20"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d="M 0 -10 Q 0 0 10 0 Q 0 0 0 10 Q 0 0 -10 0 Q 0 0 0 -10 Z"
          fill={color}
          filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.8)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 20 20"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polygon
        points="0,-8 2.4,-2.5 8.2,-2.5 3.5,0.9 5.3,6.2 0,2.6 -5.3,6.2 -3.5,0.9 -8.2,-2.5 -2.4,-2.5"
        fill={color}
        filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.8)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
      />
    </svg>
  );
}

interface MoodStarEffectsProps {
  isStarMood: boolean;
  burstKey: number;
  starPalette: string[];
}

export const MoodStarEffects: React.FC<MoodStarEffectsProps> = ({
  isStarMood,
  burstKey,
  starPalette,
}) => {
  if (!isStarMood) return null;

  return (
    <>
      {/* Ráfaga de estrellitas (Burst) que estalla al seleccionar Motivado o Excelente */}
      <div key={`burst-${burstKey}`} className="mood-burst-layer" aria-hidden="true">
        {BURST_STARS.map((s) => {
          const rad = (s.angle * Math.PI) / 180;
          const dx = Math.round(s.distance * Math.cos(rad));
          const dy = Math.round(s.distance * Math.sin(rad));
          const color = starPalette[s.colorIdx];

          return (
            <span
              key={`b-${s.id}`}
              className="mood-star-burst-item"
              style={{
                ['--star-dx' as string]: `${dx}px`,
                ['--star-dy' as string]: `${dy}px`,
                ['--star-rot' as string]: `${s.rot}deg`,
                animationDelay: `${s.delay}ms`,
              }}
            >
              {renderStarSvg(s.type, s.size, color)}
            </span>
          );
        })}
      </div>

      {/* Estrellitas ambientales continuas que titilan suavemente alrededor de la burbuja */}
      <div className="mood-ambient-layer" aria-hidden="true">
        {AMBIENT_STARS.map((s) => {
          const color = starPalette[s.colorIdx];
          return (
            <span
              key={`amb-${s.id}`}
              className="mood-star-ambient-item"
              style={{
                top: `${s.y}px`,
                left: `${s.x}px`,
                animationDuration: `${s.duration}s`,
                animationDelay: `${s.delay}s`,
              }}
            >
              {renderStarSvg(s.type, s.size, color)}
            </span>
          );
        })}
      </div>
    </>
  );
};

import React, { useState } from 'react';
import lineartUrl from '../../assets/front-anatomy-lineart.png';
import silhouetteUrl from '../../assets/front-body-silhouette.png';
import { FRONT_OFFICIAL_MUSCLES, FRONT_JOINTS, getColorByPainLevel } from './muscleMap.config';
import { OfficialMuscleGroup, JointRegion } from './muscleMap.types';

export interface MuscleMapFrontProps {
  selectedMuscles?: string[];
  musclePains?: Record<string, number>;
  muscleColors?: Record<string, string>;
  onMuscleClick?: (regionId: string) => void;
  onMuscleHover?: (region: OfficialMuscleGroup | JointRegion | null) => void;
  readOnly?: boolean;
  className?: string;
  sideContent?: React.ReactNode;
  hideHeader?: boolean;
}

export const MuscleMapFront: React.FC<MuscleMapFrontProps> = ({
  selectedMuscles = [],
  musclePains = {},
  muscleColors = {},
  onMuscleClick,
  onMuscleHover,
  readOnly = false,
  className = '',
  sideContent,
  hideHeader = false,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleMouseEnter = (region: OfficialMuscleGroup | JointRegion) => {
    if (readOnly) return;
    setHoveredId(region.id);
    onMuscleHover?.(region);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoveredId(null);
    onMuscleHover?.(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, regionId: string) => {
    if (readOnly) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onMuscleClick?.(regionId);
    }
  };

  return (
    <div className="muscle-map-view-column">
      {/* Anatomical view and perspective header */}
      {!hideHeader && (
        <div className="muscle-map-view-header">
          <span className="muscle-map-view-pill">Vista Frontal (Anterior)</span>
          <span className="muscle-map-view-sub">
            ← Lado Der. del atleta | Lado Izq. del atleta →
          </span>
        </div>
      )}

      <div className="muscle-map-view-row">
        <div className="muscle-map-svg-wrapper">
          <svg
            viewBox="0 0 380 680"
            className={`muscle-map-front-svg ${className}`}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '560px',
              display: 'block',
              userSelect: 'none',
              overflow: 'visible',
              background: 'transparent',
            }}
            aria-label="Mapa anatómico muscular y articular en vista frontal"
          >
            <defs>
              <filter id="muscle-glow-front" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="3"
                  floodColor="var(--muscle-outline-selected)"
                  floodOpacity="0.8"
                />
              </filter>
            </defs>

            {/* 1. Base skin silhouette (white body, 100% transparent exterior) */}
            <image
              href={silhouetteUrl}
              x="0"
              y="0"
              width="380"
              height="680"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              aria-hidden="true"
            />

            {/* 2. Interactive frontal SVG vector muscle regions */}
            <g id="front-interactive-muscles">
              {FRONT_OFFICIAL_MUSCLES.map((muscle) => {
                if (!muscle.frontPath) return null;

                const isSelected = selectedMuscles.includes(muscle.id);
                const isHovered = hoveredId === muscle.id;
                const painLevel = musclePains[muscle.id] || 0;
                const hasPain = painLevel > 0;

                let fillColor = 'rgba(255, 255, 255, 0.001)';
                if (hasPain) {
                  fillColor = getColorByPainLevel(painLevel);
                } else if (muscleColors[muscle.id]) {
                  fillColor = muscleColors[muscle.id];
                } else if (isHovered && !readOnly) {
                  fillColor = 'var(--muscle-hover-fill)';
                }

                const strokeColor = isSelected
                  ? 'var(--muscle-outline-selected)'
                  : isHovered
                    ? 'var(--muscle-outline-selected)'
                    : 'transparent';
                const strokeWidth = isSelected ? 3 : isHovered ? 2 : 0;

                return (
                  <path
                    key={`front-muscle-${muscle.id}`}
                    id={`front-muscle-${muscle.id}`}
                    d={muscle.frontPath}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    role="button"
                    tabIndex={readOnly ? -1 : 0}
                    aria-label={`${muscle.name}. ${
                      hasPain ? `Nivel de dolor ${painLevel}.` : 'Sin dolor registrado.'
                    } Vista frontal.`}
                    aria-pressed={isSelected}
                    filter={isSelected ? 'url(#muscle-glow-front)' : undefined}
                    style={{
                      cursor: readOnly ? 'default' : 'pointer',
                      transition: 'fill 0.18s ease, stroke 0.18s ease',
                      outline: 'none',
                    }}
                    onClick={() => !readOnly && onMuscleClick?.(muscle.id)}
                    onMouseEnter={() => handleMouseEnter(muscle)}
                    onMouseLeave={handleMouseLeave}
                    onFocus={() => handleMouseEnter(muscle)}
                    onBlur={handleMouseLeave}
                    onKeyDown={(e) => handleKeyDown(e, muscle.id)}
                  />
                );
              })}
            </g>

            {/* 3. Interactive joint regions (Sección 6) */}
            <g id="front-interactive-joints">
              {FRONT_JOINTS.map((joint) => {
                if (!joint.frontPath) return null;

                const isSelected = selectedMuscles.includes(joint.id);
                const isHovered = hoveredId === joint.id;
                const painLevel = musclePains[joint.id] || 0;
                const hasPain = painLevel > 0;

                let fillColor = 'rgba(255, 255, 255, 0.001)';
                if (hasPain) {
                  fillColor = getColorByPainLevel(painLevel);
                } else if (muscleColors[joint.id]) {
                  fillColor = muscleColors[joint.id];
                } else if (isHovered && !readOnly) {
                  fillColor = 'var(--muscle-hover-fill)';
                }

                const strokeColor = isSelected
                  ? 'var(--muscle-outline-selected)'
                  : isHovered
                    ? 'var(--muscle-outline-selected)'
                    : 'transparent';
                const strokeWidth = isSelected ? 3 : isHovered ? 2 : 0;

                return (
                  <path
                    key={`front-joint-${joint.id}`}
                    id={`front-joint-${joint.id}`}
                    d={joint.frontPath}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    role="button"
                    tabIndex={readOnly ? -1 : 0}
                    aria-label={`Articulación: ${joint.name}. ${
                      hasPain ? `Nivel de dolor ${painLevel}.` : 'Sin dolor registrado.'
                    } Vista frontal.`}
                    aria-pressed={isSelected}
                    filter={isSelected ? 'url(#muscle-glow-front)' : undefined}
                    style={{
                      cursor: readOnly ? 'default' : 'pointer',
                      transition: 'fill 0.18s ease, stroke 0.18s ease',
                      outline: 'none',
                    }}
                    onClick={() => !readOnly && onMuscleClick?.(joint.id)}
                    onMouseEnter={() => handleMouseEnter(joint)}
                    onMouseLeave={handleMouseLeave}
                    onFocus={() => handleMouseEnter(joint)}
                    onBlur={handleMouseLeave}
                    onKeyDown={(e) => handleKeyDown(e, joint.id)}
                  />
                );
              })}
            </g>

            {/* 4. Reference anatomical contour lineart layer (#023050 ink, transparent background) */}
            <image
              href={lineartUrl}
              x="0"
              y="0"
              width="380"
              height="680"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                opacity: 1,
              }}
              aria-hidden="true"
            />

            {/* 5. Círculos armónicos integrados al vector de líneas para articulaciones (rodillas, codos, muñecas, tobillos) */}
            <g id="front-joint-lineart-circles" style={{ pointerEvents: 'none' }}>
              {FRONT_JOINTS.map((joint) => {
                if (!joint.frontCenter) return null;
                const r = joint.id.startsWith('rodilla')
                  ? 13
                  : joint.id.startsWith('codo')
                    ? 11
                    : joint.id.startsWith('tobillo')
                      ? 9
                      : 8;
                return (
                  <circle
                    key={`front-lineart-circle-${joint.id}`}
                    cx={joint.frontCenter.x}
                    cy={joint.frontCenter.y}
                    r={r}
                    fill="none"
                    stroke="#023050"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </g>
          </svg>
        </div>
        {sideContent}
      </div>
    </div>
  );
};

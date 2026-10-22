import React, { useState } from 'react';
import lineartUrl from '../../assets/back-anatomy-lineart.png';
import silhouetteUrl from '../../assets/back-body-silhouette.png';
import { BACK_OFFICIAL_MUSCLES, BACK_JOINTS, getColorByPainLevel } from './muscleMap.config';
import { OfficialMuscleGroup, JointRegion } from './muscleMap.types';

export interface MuscleMapBackProps {
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

export const MuscleMapBack: React.FC<MuscleMapBackProps> = ({
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
          <span className="muscle-map-view-pill">Vista Posterior (Trasera)</span>
          <span className="muscle-map-view-sub">
            ← Lado Izq. del atleta | Lado Der. del atleta →
          </span>
        </div>
      )}

      <div className="muscle-map-view-row">
        <div className="muscle-map-svg-wrapper">
          <svg
            viewBox="0 0 380 680"
            className={`muscle-map-back-svg ${className}`}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '560px',
              display: 'block',
              userSelect: 'none',
              overflow: 'visible',
              background: 'transparent',
            }}
            aria-label="Mapa anatómico muscular y articular en vista posterior"
          >
            <defs>
              <filter id="muscle-glow-back" x="-20%" y="-20%" width="140%" height="140%">
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

            {/* 2. Interactive posterior SVG vector muscle regions */}
            <g id="back-interactive-muscles">
              {BACK_OFFICIAL_MUSCLES.map((muscle) => {
                if (!muscle.backPath) return null;

                const isSelected = selectedMuscles.includes(muscle.id);
                const isHovered = hoveredId === muscle.id;
                const painLevel = musclePains[muscle.id] || 0;
                const hasPain = painLevel > 0;

                let fillColor = 'var(--muscle-hit-transparent)';
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
                    key={`back-muscle-${muscle.id}`}
                    id={`back-muscle-${muscle.id}`}
                    d={muscle.backPath}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    role="button"
                    tabIndex={readOnly ? -1 : 0}
                    aria-label={`${muscle.name}. ${
                      hasPain ? `Nivel de dolor ${painLevel}.` : 'Sin dolor registrado.'
                    } Vista posterior.`}
                    aria-pressed={isSelected}
                    filter={isSelected ? 'url(#muscle-glow-back)' : undefined}
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
            <g id="back-interactive-joints">
              {BACK_JOINTS.map((joint) => {
                if (!joint.backPath) return null;

                const isSelected = selectedMuscles.includes(joint.id);
                const isHovered = hoveredId === joint.id;
                const painLevel = musclePains[joint.id] || 0;
                const hasPain = painLevel > 0;

                let fillColor = 'var(--muscle-hit-transparent)';
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
                    key={`back-joint-${joint.id}`}
                    id={`back-joint-${joint.id}`}
                    d={joint.backPath}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    role="button"
                    tabIndex={readOnly ? -1 : 0}
                    aria-label={`Articulación: ${joint.name}. ${
                      hasPain ? `Nivel de dolor ${painLevel}.` : 'Sin dolor registrado.'
                    } Vista posterior.`}
                    aria-pressed={isSelected}
                    filter={isSelected ? 'url(#muscle-glow-back)' : undefined}
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

            {/* 4. Reference anatomical contour lineart layer (Navy ink, transparent background) */}
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

            {/* 5. Círculos armónicos integrados al vector de líneas para articulaciones en vista posterior */}
            <g id="back-joint-lineart-circles" style={{ pointerEvents: 'none' }}>
              {BACK_JOINTS.map((joint) => {
                if (!joint.backCenter) return null;
                const r = joint.id.startsWith('rodilla')
                  ? 12
                  : joint.id.startsWith('codo')
                    ? 11
                    : joint.id.startsWith('tobillo')
                      ? 9
                      : 8;
                return (
                  <circle
                    key={`back-lineart-circle-${joint.id}`}
                    cx={joint.backCenter.x}
                    cy={joint.backCenter.y}
                    r={r}
                    fill="none"
                    stroke="var(--brand-navy)"
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

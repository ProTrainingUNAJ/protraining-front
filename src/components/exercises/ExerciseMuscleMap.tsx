import React, { useState, useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { getExerciseMuscleHighlight } from '../../utils/exerciseMuscleMapper';
import { ViewMode } from '../athlete/muscleMap.types';

export interface ExerciseMuscleMapProps {
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  /** Force a specific anatomical view instead of smart auto-detection */
  forceView?: ViewMode;
  /** Whether to show the legend indicators */
  showLegend?: boolean;
  /** Whether to show the view toggle chips */
  showViewToggle?: boolean;
  className?: string;
}

/**
 * ExerciseMuscleMap — Dedicated read-only muscle visualizer for exercises (KAN-320).
 * Reuses the SVG body silhouette with dual intensity levels (primary vs secondary).
 *
 * Acceptance Criteria:
 * - Given an exercise with target muscles, the silhouette highlights them with distinct intensities.
 * - Given an exercise with NO muscles loaded, it safely renders null with zero errors.
 */
export const ExerciseMuscleMap: React.FC<ExerciseMuscleMapProps> = ({
  primaryMuscles,
  secondaryMuscles,
  forceView,
  showLegend = true,
  showViewToggle = true,
  className = '',
}) => {
  const highlight = useMemo(
    () => getExerciseMuscleHighlight(primaryMuscles, secondaryMuscles),
    [primaryMuscles, secondaryMuscles],
  );

  const [userView, setUserView] = useState<ViewMode | null>(null);

  // CRITERION 2: If no muscles are defined, return null and do not crash
  if (!highlight.hasMuscles) {
    return null;
  }

  // Smart View: User selection takes precedence, then forced view, then recommended view
  const activeView: ViewMode = userView ?? forceView ?? highlight.recommendedView;

  const showFront = activeView === 'front' || activeView === 'both';
  const showBack = activeView === 'back' || activeView === 'both';

  return (
    <div
      className={`exercise-muscle-map-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.85rem',
        width: '100%',
        maxWidth: activeView === 'both' ? '680px' : '360px',
        margin: '0 auto',
      }}
    >
      {/* Smart View perspective selector & legend bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
          width: '100%',
          padding: '0.4rem 0.6rem',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          fontSize: '0.8rem',
        }}
      >
        {/* View toggle */}
        {showViewToggle && (
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-surface)',
              padding: '0.15rem',
              borderRadius: '9999px',
              border: '1px solid var(--border)',
            }}
            role="tablist"
            aria-label="Seleccionar perspectiva anatómica"
          >
            <button
              type="button"
              className={`touch-chip ${activeView === 'front' ? 'active' : ''}`}
              onClick={() => setUserView('front')}
              style={{
                padding: '0.2rem 0.65rem',
                fontSize: '0.75rem',
                minHeight: '26px',
                borderRadius: '9999px',
                border: 'none',
              }}
            >
              Frente
            </button>
            <button
              type="button"
              className={`touch-chip ${activeView === 'back' ? 'active' : ''}`}
              onClick={() => setUserView('back')}
              style={{
                padding: '0.2rem 0.65rem',
                fontSize: '0.75rem',
                minHeight: '26px',
                borderRadius: '9999px',
                border: 'none',
              }}
            >
              Espalda
            </button>
            <button
              type="button"
              className={`touch-chip ${activeView === 'both' ? 'active' : ''}`}
              onClick={() => setUserView('both')}
              style={{
                padding: '0.2rem 0.65rem',
                fontSize: '0.75rem',
                minHeight: '26px',
                borderRadius: '9999px',
                border: 'none',
              }}
            >
              Ambos
            </button>
          </div>
        )}

        {/* Dual intensity legend */}
        {showLegend && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.85rem',
              marginLeft: 'auto',
            }}
          >
            {highlight.primaryCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: 'var(--muscle-exercise-primary)',
                  }}
                  aria-hidden="true"
                />
                Principal
              </span>
            )}
            {highlight.secondaryCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: 'var(--muscle-exercise-secondary)',
                  }}
                  aria-hidden="true"
                />
                Secundario
              </span>
            )}
          </div>
        )}
      </div>

      {/* SVG Silhouettes grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            activeView === 'both' ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr',
          gap: '1rem',
          width: '100%',
          justifyItems: 'center',
        }}
      >
        {showFront && (
          <div
            style={{
              width: '100%',
              maxWidth: '300px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <MuscleMapFront
              readOnly={true}
              muscleColors={highlight.muscleColors}
              hideHeader={false}
            />
          </div>
        )}

        {showBack && (
          <div
            style={{
              width: '100%',
              maxWidth: '300px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              padding: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <MuscleMapBack
              readOnly={true}
              muscleColors={highlight.muscleColors}
              hideHeader={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

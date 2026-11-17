import React, { useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { extractSessionMuscles } from '../../utils/sessionMuscles';
import type { TodayRoutineExercise } from '../../api/generated/entrenamiento';

export interface RoutineSessionMuscleMapProps {
  exercises: TodayRoutineExercise[];
  className?: string;
  height?: number;
}

export const RoutineSessionMuscleMap: React.FC<RoutineSessionMuscleMapProps> = ({
  exercises,
  className = '',
  height = 96,
}) => {
  const { highlight, muscleNames } = useMemo(() => extractSessionMuscles(exercises), [exercises]);

  const tooltip = useMemo(() => {
    if (muscleNames.length === 0) {
      return 'Músculos de la sesión del día';
    }
    return `Músculos trabajados hoy: ${muscleNames.join(', ')}`;
  }, [muscleNames]);

  return (
    <div
      className={`routine-hero-muscle-minimap ${className}`}
      title={tooltip}
      aria-label={tooltip}
      role="img"
      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
    >
      <div
        className="routine-hero-muscle-silhouette"
        style={{ width: '48px', height: `${height}px`, display: 'flex', alignItems: 'center' }}
      >
        <MuscleMapFront readOnly={true} hideHeader={true} muscleColors={highlight.muscleColors} />
      </div>
      <div
        className="routine-hero-muscle-silhouette"
        style={{ width: '48px', height: `${height}px`, display: 'flex', alignItems: 'center' }}
      >
        <MuscleMapBack readOnly={true} hideHeader={true} muscleColors={highlight.muscleColors} />
      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { getExerciseMuscleHighlight } from '../../utils/exerciseMuscleMapper';

export interface PlanMuscleMapProps {
  targetMuscles?: string[];
  secondaryMuscles?: string[];
  name?: string;
  objective?: string | null;
}

export const PlanMuscleMap: React.FC<PlanMuscleMapProps> = ({
  targetMuscles,
  secondaryMuscles,
  name,
  objective,
}) => {
  // Obtener músculos explícitos de la API o inferir por texto si fuera necesario (KAN-623)
  const { effectivePrimary, effectiveSecondary } = useMemo(() => {
    const hasExplicitPrimary = targetMuscles && targetMuscles.length > 0;
    const hasExplicitSecondary = secondaryMuscles && secondaryMuscles.length > 0;

    if (hasExplicitPrimary || hasExplicitSecondary) {
      return {
        effectivePrimary: targetMuscles ?? [],
        effectiveSecondary: secondaryMuscles ?? [],
      };
    }

    const combined = `${name || ''} ${objective || ''}`.toLowerCase();
    const primary: string[] = [];
    const secondary: string[] = [];

    if (/b[ií]ceps|brazo/i.test(combined)) {
      primary.push('biceps');
      secondary.push('forearms', 'abdominals');
    }
    if (/tr[ií]ceps/i.test(combined)) {
      primary.push('triceps');
      secondary.push('shoulders');
    }
    if (/pecho|pectoral/i.test(combined)) {
      primary.push('chest');
      secondary.push('triceps', 'shoulders');
    }
    if (/espalda|dorsal|lat/i.test(combined)) {
      primary.push('lats');
      secondary.push('biceps', 'middle back');
    }
    if (/pierna|cu[aá]driceps/i.test(combined)) {
      primary.push('quadriceps');
      secondary.push('glutes', 'hamstrings');
    }
    if (/isquio|femoral/i.test(combined)) {
      primary.push('hamstrings');
      secondary.push('glutes', 'lower back');
    }
    if (/gl[uú]teo/i.test(combined)) {
      primary.push('glutes');
      secondary.push('hamstrings');
    }
    if (/gemelo|pantorrilla/i.test(combined)) {
      primary.push('calves');
    }
    if (/hombro|deltoide/i.test(combined)) {
      primary.push('shoulders');
      secondary.push('traps', 'triceps');
    }
    if (/abdomen|core/i.test(combined)) {
      primary.push('abdominals');
    }

    return { effectivePrimary: primary, effectiveSecondary: secondary };
  }, [targetMuscles, secondaryMuscles, name, objective]);

  const highlight = useMemo(
    () =>
      getExerciseMuscleHighlight(effectivePrimary, effectiveSecondary, {
        primary: '#0284c7', // Celeste para músculos primarios (KAN-623)
        secondary: '#94a3b8', // Gris para músculos secundarios (KAN-623)
      }),
    [effectivePrimary, effectiveSecondary],
  );

  return (
    <div
      className="plan-card-muscle-map"
      aria-label="Mapa muscular anatómico de la planificación"
      role="img"
    >
      <div className="plan-card-muscle-silhouette">
        <MuscleMapFront
          readOnly={true}
          hideHeader={true}
          hideFooter={true}
          muscleColors={highlight.muscleColors}
        />
      </div>
      <div className="plan-card-muscle-silhouette">
        <MuscleMapBack
          readOnly={true}
          hideHeader={true}
          hideFooter={true}
          muscleColors={highlight.muscleColors}
        />
      </div>
    </div>
  );
};

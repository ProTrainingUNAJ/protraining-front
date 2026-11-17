import React, { useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { getExerciseMuscleHighlight } from '../../utils/exerciseMuscleMapper';

export interface PlanMuscleMapProps {
  targetMuscles?: string[];
  name?: string;
  objective?: string | null;
}

export const PlanMuscleMap: React.FC<PlanMuscleMapProps> = ({
  targetMuscles,
  name,
  objective,
}) => {
  // Obtener músculos explícitos de la API o inferir por texto si fuera necesario
  const effectiveMuscles = useMemo(() => {
    if (targetMuscles && targetMuscles.length > 0) {
      return targetMuscles;
    }
    const combined = `${name || ''} ${objective || ''}`.toLowerCase();
    const matches: string[] = [];
    if (/b[ií]ceps|brazo/i.test(combined)) matches.push('biceps');
    if (/tr[ií]ceps/i.test(combined)) matches.push('triceps');
    if (/pecho|pectoral/i.test(combined)) matches.push('chest');
    if (/espalda|dorsal|lat/i.test(combined)) matches.push('lats');
    if (/pierna|cu[aá]driceps/i.test(combined)) matches.push('quadriceps');
    if (/isquio|femoral/i.test(combined)) matches.push('hamstrings');
    if (/gl[uú]teo/i.test(combined)) matches.push('glutes');
    if (/gemelo|pantorrilla/i.test(combined)) matches.push('calves');
    if (/hombro|deltoide/i.test(combined)) matches.push('shoulders');
    if (/abdomen|core/i.test(combined)) matches.push('abdominals');
    return matches;
  }, [targetMuscles, name, objective]);

  const highlight = useMemo(
    () => getExerciseMuscleHighlight(effectiveMuscles),
    [effectiveMuscles],
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
          muscleColors={highlight.muscleColors}
        />
      </div>
      <div className="plan-card-muscle-silhouette">
        <MuscleMapBack
          readOnly={true}
          hideHeader={true}
          muscleColors={highlight.muscleColors}
        />
      </div>
    </div>
  );
};

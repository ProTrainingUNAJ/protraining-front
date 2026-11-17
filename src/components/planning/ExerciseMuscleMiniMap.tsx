import React, { useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { getExerciseMuscleHighlight } from '../../utils/exerciseMuscleMapper';

export interface ExerciseMuscleMiniMapProps {
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  muscleGroup?: string;
  exerciseName?: string;
}

export const ExerciseMuscleMiniMap: React.FC<ExerciseMuscleMiniMapProps> = ({
  primaryMuscles,
  secondaryMuscles,
  muscleGroup,
  exerciseName = '',
}) => {
  const { effectivePrimary, effectiveSecondary } = useMemo(() => {
    const hasExplicitPrimary = primaryMuscles && primaryMuscles.length > 0;
    const hasExplicitSecondary = secondaryMuscles && secondaryMuscles.length > 0;

    if (hasExplicitPrimary || hasExplicitSecondary) {
      return {
        effectivePrimary: primaryMuscles ?? [],
        effectiveSecondary: secondaryMuscles ?? [],
      };
    }

    // Inferencia por nombre o grupo muscular para ejercicios sin metadatos
    const text = `${exerciseName} ${muscleGroup || ''}`.toLowerCase();
    const inferredPrimary: string[] = [];
    const inferredSecondary: string[] = [];

    if (/sentadilla|squat|estocada|prensa|cu[aá]driceps/i.test(text)) {
      inferredPrimary.push('quadriceps');
      inferredSecondary.push('glutes', 'hamstrings');
    } else if (/press.*banca|bench|pecho|pectoral|apertura|flexi[oó]n/i.test(text)) {
      inferredPrimary.push('chest');
      inferredSecondary.push('triceps', 'shoulders');
    } else if (/peso muerto|deadlift|isquio|femoral/i.test(text)) {
      inferredPrimary.push('hamstrings');
      inferredSecondary.push('glutes', 'lower back');
    } else if (/remo|row|dominada|pull[- ]?up|dorsal|lat|jal[oó]n|espalda/i.test(text)) {
      inferredPrimary.push('lats');
      inferredSecondary.push('biceps', 'middle back');
    } else if (/press.*militar|overhead|hombro|deltoide/i.test(text)) {
      inferredPrimary.push('shoulders');
      inferredSecondary.push('triceps', 'traps');
    } else if (/b[ií]ceps|curl/i.test(text)) {
      inferredPrimary.push('biceps');
      inferredSecondary.push('forearms');
    } else if (/tr[ií]ceps|fondos|pushdown/i.test(text)) {
      inferredPrimary.push('triceps');
      inferredSecondary.push('shoulders');
    } else if (/gl[uú]teo|hip thrust/i.test(text)) {
      inferredPrimary.push('glutes');
      inferredSecondary.push('hamstrings');
    } else if (/gemelo|calves|pantorrilla/i.test(text)) {
      inferredPrimary.push('calves');
    } else if (/plank|abdominal|core|crunch/i.test(text)) {
      inferredPrimary.push('abdominals');
    }

    return {
      effectivePrimary: inferredPrimary,
      effectiveSecondary: inferredSecondary,
    };
  }, [primaryMuscles, secondaryMuscles, muscleGroup, exerciseName]);

  const highlight = useMemo(
    () =>
      getExerciseMuscleHighlight(effectivePrimary, effectiveSecondary, {
        primary: '#0284c7', // Azul principal para músculos primarios (según diseño)
        secondary: '#94a3b8', // Gris azulado para músculos secundarios/estabilizadores
      }),
    [effectivePrimary, effectiveSecondary],
  );

  return (
    <div
      className="plan-exercise-muscle-map"
      aria-label={`Músculos involucrados en ${exerciseName || 'ejercicio'}`}
      role="img"
    >
      <div className="plan-exercise-muscle-silhouette">
        <MuscleMapFront readOnly={true} hideHeader={true} muscleColors={highlight.muscleColors} />
      </div>
      <div className="plan-exercise-muscle-silhouette">
        <MuscleMapBack readOnly={true} hideHeader={true} muscleColors={highlight.muscleColors} />
      </div>
    </div>
  );
};

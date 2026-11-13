import { describe, it, expect } from 'vitest';
import {
  normalizeMuscleString,
  resolveMuscleIds,
  getExerciseMuscleHighlight,
  getMuscleSpanishName,
} from '../exerciseMuscleMapper';

describe('exerciseMuscleMapper', () => {
  describe('normalizeMuscleString', () => {
    it('normalizes strings removing accents, lowercasing and trimming', () => {
      expect(normalizeMuscleString('  Bíceps ')).toBe('biceps');
      expect(normalizeMuscleString('Cuádriceps')).toBe('cuadriceps');
      expect(normalizeMuscleString('GLÚTEOS')).toBe('gluteos');
    });
  });

  describe('resolveMuscleIds', () => {
    it('translates free-exercise-db muscle names to SVG anatomical IDs (Criterion 1)', () => {
      const bicepsIds = resolveMuscleIds(['biceps']);
      expect(bicepsIds).toContain('biceps_derecho');
      expect(bicepsIds).toContain('biceps_izquierdo');

      const chestIds = resolveMuscleIds(['chest']);
      expect(chestIds).toContain('pecho_derecho');
      expect(chestIds).toContain('pecho_izquierdo');

      const quadIds = resolveMuscleIds(['quadriceps']);
      expect(quadIds).toContain('cuadriceps_derecho');
      expect(quadIds).toContain('cuadriceps_izquierdo');

      const gluteIds = resolveMuscleIds(['glutes']);
      expect(gluteIds).toContain('gluteo_derecho');
      expect(gluteIds).toContain('gluteo_izquierdo');
    });

    it('returns empty array when given empty list or invalid names', () => {
      expect(resolveMuscleIds([])).toEqual([]);
      expect(resolveMuscleIds(['inexistente_xyz'])).toEqual([]);
    });
  });

  describe('getExerciseMuscleHighlight (Dual Intensity & Smart View)', () => {
    it('highlights primary muscles with strong intensity and secondary with moderate intensity (Criterion 1)', () => {
      const highlight = getExerciseMuscleHighlight(['biceps'], ['forearms']);

      expect(highlight.hasMuscles).toBe(true);
      expect(highlight.primaryCount).toBeGreaterThan(0);
      expect(highlight.secondaryCount).toBeGreaterThan(0);

      // Primary muscles must receive primary color token
      expect(highlight.muscleColors['biceps_derecho']).toBe('var(--muscle-exercise-primary)');
      expect(highlight.muscleColors['biceps_izquierdo']).toBe('var(--muscle-exercise-primary)');

      // Secondary muscles must receive secondary color token
      expect(highlight.muscleColors['antebrazo_derecho']).toBe('var(--muscle-exercise-secondary)');
    });

    it('returns hasMuscles=false and empty colors when exercise has NO muscles defined (Criterion 2)', () => {
      const highlightNull = getExerciseMuscleHighlight(null, null);
      expect(highlightNull.hasMuscles).toBe(false);
      expect(highlightNull.muscleColors).toEqual({});
      expect(highlightNull.primaryCount).toBe(0);
      expect(highlightNull.secondaryCount).toBe(0);

      const highlightEmpty = getExerciseMuscleHighlight([], []);
      expect(highlightEmpty.hasMuscles).toBe(false);
      expect(highlightEmpty.muscleColors).toEqual({});
    });

    it('correctly recommends front perspective for anterior muscles', () => {
      const highlight = getExerciseMuscleHighlight(['chest', 'abdominals']);
      expect(highlight.recommendedView).toBe('front');
    });

    it('correctly recommends back perspective for posterior muscles', () => {
      const highlight = getExerciseMuscleHighlight(['glutes', 'lats']);
      expect(highlight.recommendedView).toBe('back');
    });

    it('recommends both perspectives when muscles span both planes', () => {
      const highlight = getExerciseMuscleHighlight(['quadriceps'], ['hamstrings']);
      expect(highlight.recommendedView).toBe('both');
    });
  });

  describe('getMuscleSpanishName (KAN-557)', () => {
    it('translates common muscle names from free-exercise-db to Spanish', () => {
      expect(getMuscleSpanishName('biceps')).toBe('Bíceps');
      expect(getMuscleSpanishName('quadriceps')).toBe('Cuádriceps');
      expect(getMuscleSpanishName('chest')).toBe('Pectorales');
      expect(getMuscleSpanishName('glutes')).toBe('Glúteos');
      expect(getMuscleSpanishName('hamstrings')).toBe('Isquiotibiales');
      expect(getMuscleSpanishName('calves')).toBe('Gemelos');
      expect(getMuscleSpanishName('shoulders')).toBe('Hombros');
      expect(getMuscleSpanishName('triceps')).toBe('Tríceps');
      expect(getMuscleSpanishName('lats')).toBe('Dorsales');
      expect(getMuscleSpanishName('abdominals')).toBe('Abdominales');
      expect(getMuscleSpanishName('forearms')).toBe('Antebrazos');
      expect(getMuscleSpanishName('traps')).toBe('Trapecios');
      expect(getMuscleSpanishName('adductors')).toBe('Aductores');
      expect(getMuscleSpanishName('abductors')).toBe('Abductores');
      expect(getMuscleSpanishName('neck')).toBe('Cuello');
    });

    it('correctly translates compound muscle names', () => {
      expect(getMuscleSpanishName('middle back')).toBe('Espalda media');
      expect(getMuscleSpanishName('lower back')).toBe('Espalda baja');
    });

    it('handles uppercase, accents, and surrounding whitespace gracefully', () => {
      expect(getMuscleSpanishName('  BICEPS  ')).toBe('Bíceps');
      expect(getMuscleSpanishName('QUADRICEPS')).toBe('Cuádriceps');
      expect(getMuscleSpanishName('Cuádriceps')).toBe('Cuádriceps');
      expect(getMuscleSpanishName('Glúteos')).toBe('Glúteos');
      expect(getMuscleSpanishName('  middle back ')).toBe('Espalda media');
    });

    it('gracefully returns capitalized fallback for unknown or custom muscles without crashing', () => {
      expect(getMuscleSpanishName('serratus anterior')).toBe('Serratus anterior');
      expect(getMuscleSpanishName('custom_muscle')).toBe('Custom_muscle');
    });

    it('returns empty string for empty, null, or non-string inputs', () => {
      expect(getMuscleSpanishName('')).toBe('');
      expect(getMuscleSpanishName('   ')).toBe('');
      expect(getMuscleSpanishName(null)).toBe('');
      expect(getMuscleSpanishName(undefined)).toBe('');
      expect(getMuscleSpanishName(123 as unknown as string)).toBe('');
    });
  });
});

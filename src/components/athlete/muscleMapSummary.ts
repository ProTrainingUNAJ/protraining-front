import { INJURY_PALETTE_ITEM } from './muscleMap.config';

interface SummaryRegion {
  id: string;
  name: string;
}

interface MuscleMapSummaryInput {
  regions: SummaryRegion[];
  musclePains: Record<string, number>;
  muscleColors: Record<string, string>;
  selectedMuscles: string[];
  viewLabel: string;
}

/**
 * Texto accesible del mapa muscular en modo lectura: resume las zonas con
 * dolor o lesión y las marcadas (p. ej. músculos que trabaja un ejercicio),
 * usando los nombres del catálogo oficial del mapa.
 */
export function describeMuscleMap({
  regions,
  musclePains,
  muscleColors,
  selectedMuscles,
  viewLabel,
}: MuscleMapSummaryInput): string {
  const painParts: string[] = [];
  const markedParts: string[] = [];

  regions.forEach((region) => {
    const level = musclePains[region.id] || 0;
    if (level >= INJURY_PALETTE_ITEM.level) {
      painParts.push(`${region.name} (lesión)`);
    } else if (level > 0) {
      painParts.push(`${region.name} (nivel ${level})`);
    } else if (muscleColors[region.id] || selectedMuscles.includes(region.id)) {
      markedParts.push(region.name);
    }
  });

  const prefix = `Mapa muscular, ${viewLabel}`;
  if (painParts.length === 0 && markedParts.length === 0) {
    return `${prefix}: sin zonas marcadas`;
  }

  const sections: string[] = [];
  if (painParts.length > 0) sections.push(`dolor en ${painParts.join(', ')}`);
  if (markedParts.length > 0) sections.push(`zonas marcadas: ${markedParts.join(', ')}`);
  return `${prefix}: ${sections.join('; ')}`;
}

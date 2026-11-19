import type { AthleteTrafficLightItem } from '../components/monitoring/trafficLight.types';

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'atleta';
  return trimmed.split(/\s+/)[0] || 'atleta';
}

function getPainSummary(athlete: Pick<AthleteTrafficLightItem, 'affectedMuscle' | 'pains'>): string {
  if (athlete.affectedMuscle?.trim()) {
    return athlete.affectedMuscle.trim();
  }
  if (athlete.pains && athlete.pains.length > 0) {
    return athlete.pains.map((p) => p.zone).filter(Boolean).join(', ');
  }
  return '';
}

/**
 * Genera una plantilla fija en español (sin IA) según el estado real del atleta en el semáforo.
 */
export function buildPfToAthleteMessage(
  athlete: Pick<
    AthleteTrafficLightItem,
    'name' | 'status' | 'isSick' | 'hasActiveInjury' | 'hasDayConflict' | 'affectedMuscle' | 'pains'
  >,
): string {
  const firstName = getFirstName(athlete.name);
  const painSummary = getPainSummary(athlete);

  if (athlete.isSick) {
    return `Hola ${firstName}, vi que reportaste síntomas o malestar en tu check-in de hoy. ¿Cómo te sentís ahora? Priorizá descansar y avisame antes de entrenar.`;
  }

  if (athlete.hasActiveInjury) {
    const zoneText = painSummary ? ` en ${painSummary}` : '';
    return `Hola ${firstName}, vi el reporte de lesión activa${zoneText} en tu check-in de hoy. ¿Cómo venís con eso? Vamos a adaptar la sesión de hoy para cuidarte.`;
  }

  if (athlete.hasDayConflict) {
    const zoneText = painSummary ? ` en ${painSummary}` : '';
    return `Hola ${firstName}, vi que marcaste molestia${zoneText} y la rutina de hoy carga esa zona. Contame cómo estás así ajustamos los ejercicios antes de empezar.`;
  }

  switch (athlete.status) {
    case 'red':
      return `Hola ${firstName}, vi tu check-in de hoy en rojo. ¿Cómo te sentís físicamente? Escribime antes de entrenar así evaluamos bajar la carga.`;
    case 'yellow':
      return `Hola ${firstName}, vi tu check-in de hoy en amarillo. ¿Cómo venís de energía y descanso? Avisame si necesitás ajustar algo de la rutina.`;
    case 'gray':
      return `Hola ${firstName}, todavía no veo tu check-in de hoy en ProTraining. Cuando puedas completalo así reviso cómo estás para la sesión.`;
    case 'green':
    default:
      return `Hola ${firstName}, ¡vi tu check-in en verde! Todo listo para la sesión de hoy. Cualquier duda me escribís por acá.`;
  }
}

/**
 * Genera una plantilla fija en español para que el atleta contacte a su Preparador Físico.
 */
export function buildAthleteToPfMessage(athleteName?: string): string {
  const trimmed = athleteName?.trim();
  if (trimmed) {
    return `Hola profe, soy ${trimmed}. Te escribo desde ProTraining para consultarte sobre mi entrenamiento.`;
  }
  return 'Hola profe, te escribo desde ProTraining para consultarte sobre mi entrenamiento.';
}

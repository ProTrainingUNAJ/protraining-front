import type { AthleteTrafficLightItem } from '../components/monitoring/trafficLight.types';

// Mismos umbrales que el motor del semáforo (Seguimiento · TrafficLightEngine).
const LOW_SLEEP_HOURS = 8;
const HIGH_EFFORT_RPE = 7;
const INJURY_LEVEL = 6;

/**
 * Motivos legibles de por qué un atleta está en rojo o amarillo hoy (KAN-594), en orden de
 * gravedad. Si el check-in no trae ningún dato estructurado que lo explique, se usa el motivo
 * que calculó el motor (`recommendation`).
 */
export function buildAttentionReasons(athlete: AthleteTrafficLightItem): string[] {
  const reasons: string[] = [];

  const pains = [...(athlete.pains ?? [])].sort((a, b) => b.level - a.level);
  const injuries = pains.filter((pain) => pain.level >= INJURY_LEVEL);
  const painOnly = pains.filter((pain) => pain.level < INJURY_LEVEL);

  if (injuries.length > 0) {
    reasons.push(`Lesión activa · ${injuries.map((pain) => pain.zone).join(', ')}`);
  } else if (athlete.hasActiveInjury) {
    reasons.push('Lesión activa');
  }
  for (const pain of painOnly) {
    reasons.push(`Dolor ${lowerFirst(pain.zone)} · nivel ${pain.level}`);
  }
  if (athlete.isSick) reasons.push('Enfermedad');
  if (typeof athlete.sleepHours === 'number' && athlete.sleepHours < LOW_SLEEP_HOURS) {
    reasons.push(`Durmió ${formatHours(athlete.sleepHours)} h`);
  }
  if (typeof athlete.rpe === 'number' && athlete.rpe > HIGH_EFFORT_RPE) {
    reasons.push(`Esfuerzo alto · RPE ${athlete.rpe}`);
  }

  if (reasons.length === 0 && athlete.recommendation.trim()) {
    reasons.push(athlete.recommendation.trim());
  }
  return reasons;
}

/** Atletas en rojo primero y después en amarillo, cada grupo por nombre. */
export function sortByAttention(athletes: AthleteTrafficLightItem[]): AthleteTrafficLightItem[] {
  const weight = { red: 0, yellow: 1, green: 2, gray: 3 } as const;
  return [...athletes].sort(
    (a, b) => weight[a.status] - weight[b.status] || a.name.localeCompare(b.name, 'es'),
  );
}

/**
 * "Nicolás, Agustina y 2 más": primeros nombres, sin repetir apellidos, para no llenar una
 * tarjeta con una lista entera.
 */
export function summarizeNames(names: string[], max = 2, firstNameOnly = true): string {
  const shown = names.slice(0, max).map((name) => (firstNameOnly ? firstName(name) : name));
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} y ${rest} más`;
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} y ${shown[shown.length - 1]}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

// "Cuádriceps derecho" → "cuádriceps derecho": va en el medio de la frase ("Dolor cuádriceps…")
function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase('es') + text.slice(1);
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', ',');
}

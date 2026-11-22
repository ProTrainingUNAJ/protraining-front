import { OFFICIAL_JOINTS, OFFICIAL_MUSCLE_GROUPS } from '../components/athlete/muscleMap.config';

const CLINICAL_ZONE_LABELS: Record<string, string> = {
  pecho: 'Pecho',
  hombros: 'Hombros',
  hombro: 'Hombro',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuadriceps: 'Cuádriceps',
  gluteos: 'Glúteos',
  isquiotibiales: 'Isquiotibiales',
  gemelos: 'Gemelos',
  trapecios: 'Trapecios',
  dorsales: 'Dorsales',
  oblicuos: 'Oblicuos',
  antebrazos: 'Antebrazos',
  manos: 'Manos',
  pies: 'Pies',
  cuello_trapecios: 'Cuello y trapecios',
  lumbar: 'Lumbar',
  rodilla: 'Rodilla',
};

const ZONE_LABELS: Record<string, string> = {
  ...CLINICAL_ZONE_LABELS,
  ...Object.fromEntries(OFFICIAL_MUSCLE_GROUPS.map((m) => [m.id, m.name])),
  ...Object.fromEntries(OFFICIAL_JOINTS.map((j) => [j.id, j.name])),
};

function formatZoneId(zoneId: string): string {
  const known = ZONE_LABELS[zoneId.toLowerCase()];
  if (known) return known;

  const clean = zoneId.replace(/_/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : zoneId;
}

function formatSingleZoneToken(zoneId: string, levelRaw: string): string {
  const level = Number(levelRaw);
  const label = formatZoneId(zoneId);
  if (!Number.isFinite(level) || level <= 0) return label;
  return level >= 6 ? `${label} [Nivel 6 - Lesión activa]` : `${label} [Nivel ${level}]`;
}

/**
 * Si `reason` contiene pares crudos tipo "abdominales:1,biceps_izquierdo:6",
 * los traduce a etiquetas legibles; si ya viene formateado desde el backend, lo deja intacto.
 */
export function formatAlertReason(reason: string): string {
  if (!reason) return reason;

  return reason.replace(/\b([a-z_]+:[1-6](?:,[a-z_]+:[1-6])*)\b/gi, (rawList) =>
    rawList
      .split(',')
      .map((entry) => {
        const [zoneId, level] = entry.split(':').map((s) => s.trim());
        return formatSingleZoneToken(zoneId, level);
      })
      .join(', '),
  );
}

import { parsePainZones } from '../api/seguimientoService';
import { PROTRAINING_MUSCLES } from '../components/athlete/bodyMuscleData';

const KNOWN_ZONE_LABELS = new Set(PROTRAINING_MUSCLES.map((m) => m.name));

function formatUnknownZone(zoneId: string): string {
  const clean = zoneId.replace(/_/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : zoneId;
}

function formatSingleZone(zone: string, level: number): string {
  const label = KNOWN_ZONE_LABELS.has(zone) ? zone : formatUnknownZone(zone);
  if (!Number.isFinite(level) || level <= 0) return label;
  return level >= 6 ? `${label} [Lesión activa]` : `${label} [Nivel ${level}]`;
}

/**
 * Si `reason` contiene pares crudos después de "en zona: " (ej. "abdominales:1,biceps_izquierdo:6"),
 * los traduce a etiquetas legibles; si ya viene formateado desde el backend o tiene métricas como "ACWR:1.3", lo deja intacto.
 */
export function formatAlertReason(reason: string): string {
  if (!reason) return reason;

  return reason.replace(
    /(en zona:\s*)([a-z0-9_]+:[1-6](?:\s*,\s*[a-z0-9_]+:[1-6])*)(?!(?:\.\d|\d))/gi,
    (full, prefix: string, rawList: string) => {
      const parsed = parsePainZones(rawList);
      if (parsed.length === 0) return full;

      const formatted = parsed.map((item) => formatSingleZone(item.zone, item.level)).join(', ');
      return `${prefix}${formatted}`;
    },
  );
}

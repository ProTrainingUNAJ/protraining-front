import type { AthleteEvolutionResponse, EvolutionDataPoint } from '../api/generated/seguimiento';

export type MetricKey = 'cmj' | 'squat' | 'sprint' | 'fatigue' | 'yoyo';

export interface MetricHistoryPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricDefinition {
  key: MetricKey;
  name: string;
  shortName: string;
  category: string;
  unit: string;
  currentValue: number;
  initialValue: number;
  deltaPercent: string;
  deltaAbsolute: string;
  // Si el cambio entre la primera y la última medición es una mejora (en sprint y fatiga, bajar es mejorar)
  isPositiveImprovement: boolean;
  color: string;
  gradientId: string;
  data: MetricHistoryPoint[];
  description: string;
}

interface MetricPresentation {
  shortName: string;
  category: string;
  description: string;
  lowerIsBetter: boolean;
}

// Textos fijos de cada métrica; los valores salen siempre de la evolución real del atleta
export const METRIC_PRESENTATION: Record<MetricKey, MetricPresentation> = {
  cmj: {
    shortName: 'Salto CMJ',
    category: 'Potencia',
    description: 'Altura del salto con contramovimiento en los tests de campo.',
    lowerIsBetter: false,
  },
  squat: {
    shortName: '1RM Sentadilla',
    category: 'Fuerza máxima',
    description: 'Récord máximo de sentadilla aprobado por tu preparador físico.',
    lowerIsBetter: false,
  },
  sprint: {
    shortName: 'Sprint',
    category: 'Velocidad',
    description: 'Tiempo en los tests de velocidad de campo.',
    lowerIsBetter: true,
  },
  fatigue: {
    shortName: 'Fatiga diaria',
    category: 'Bienestar',
    description: 'Nivel de fatiga que reportaste en el check-in de cada día.',
    lowerIsBetter: true,
  },
  yoyo: {
    shortName: 'Resistencia',
    category: 'Resistencia',
    description: 'Distancia recorrida en los tests de resistencia (Yo-Yo intermitente o Cooper).',
    lowerIsBetter: false,
  },
};

export const METRIC_KEYS: MetricKey[] = ['cmj', 'squat', 'sprint', 'fatigue', 'yoyo'];

const formatNumber = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 1 });

// "2026-10-08" o "2026-10-08T00:00:00Z" → "08/10", sin pasar por la zona horaria del navegador
const formatShortDate = (date: string) => {
  const [, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}`;
};

function buildMetric(
  key: MetricKey,
  name: string,
  unit: string,
  points: EvolutionDataPoint[],
): MetricDefinition | null {
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const presentation = METRIC_PRESENTATION[key];
  const initialValue = sorted[0].value;
  const currentValue = sorted[sorted.length - 1].value;
  const diff = currentValue - initialValue;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const percent = initialValue !== 0 ? Math.abs((diff / initialValue) * 100) : null;

  return {
    key,
    name,
    shortName: presentation.shortName,
    category: presentation.category,
    unit,
    currentValue,
    initialValue,
    deltaPercent: percent === null ? '—' : `${sign}${formatNumber(percent)}%`,
    deltaAbsolute: `${sign}${formatNumber(Math.abs(diff))} ${unit}`,
    isPositiveImprovement: presentation.lowerIsBetter ? diff <= 0 : diff >= 0,
    color: 'var(--secondary)',
    gradientId: `grad-${key}`,
    data: sorted.map((p) => ({
      date: formatShortDate(p.date),
      value: p.value,
      label: `${formatNumber(p.value)} ${unit}`,
    })),
    description: presentation.description,
  };
}

const matches = (text: string, pattern: RegExp) => pattern.test(text.toLowerCase());

// Arma las métricas de Progreso a partir de la evolución real; una métrica sin mediciones no aparece
export function buildEvolutionMetrics(
  evolution: AthleteEvolutionResponse | null | undefined,
): Partial<Record<MetricKey, MetricDefinition>> {
  if (!evolution) return {};

  const result: Partial<Record<MetricKey, MetricDefinition>> = {};
  const add = (metric: MetricDefinition | null) => {
    if (metric) result[metric.key] = metric;
  };

  const tests = evolution.fitnessTests ?? [];
  const findTest = (pattern: RegExp) =>
    tests.find((t) => matches(`${t.testName} ${t.motorCapacity}`, pattern));

  // La capacidad llega del catálogo de Seguimiento en inglés (Velocity, Endurance…); el nombre, en español.
  // Resistencia: solo tests que se miden en distancia (Yo-Yo, Cooper), para que "más" siempre sea mejora.
  const yoyo = findTest(/yo-?yo|intermitente|cooper/);
  const cmj = findTest(/salto|cmj|jump/);
  const sprint = tests.find(
    (t) =>
      t !== yoyo &&
      matches(`${t.testName} ${t.motorCapacity}`, /sprint|velocidad|velocity|speed/),
  );

  if (cmj) add(buildMetric('cmj', cmj.testName, cmj.unit, cmj.points));
  if (sprint) add(buildMetric('sprint', sprint.testName, sprint.unit, sprint.points));
  if (yoyo) add(buildMetric('yoyo', yoyo.testName, yoyo.unit, yoyo.points));

  const strength = evolution.strength ?? [];
  const squat = strength.find((s) => matches(s.exerciseName, /sentadilla|squat/));
  if (squat) {
    add(buildMetric('squat', `1RM ${squat.exerciseName}`, squat.unit, squat.points));
  }

  const fatiguePoints = evolution.wellness?.fatiguePoints ?? [];
  add(buildMetric('fatigue', 'Fatiga reportada en el check-in', '/5', fatiguePoints));

  return result;
}

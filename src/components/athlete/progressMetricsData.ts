export interface MetricHistoryPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricDefinition {
  key: 'cmj' | 'squat' | 'sprint' | 'rpe' | 'yoyo';
  name: string;
  shortName: string;
  category: string;
  unit: string;
  currentValue: number;
  initialValue: number;
  deltaPercent: string;
  deltaAbsolute: string;
  isPositiveImprovement: boolean; // Para sprints, bajar tiempo es positivo
  color: string;
  gradientId: string;
  data: MetricHistoryPoint[];
  description: string;
}

export const EVOLUTION_METRICS: Record<
  'cmj' | 'squat' | 'sprint' | 'rpe' | 'yoyo',
  MetricDefinition
> = {
  cmj: {
    key: 'cmj',
    name: 'Salto Vertical con Contramovimiento (CMJ)',
    shortName: 'Salto CMJ',
    category: 'Potencia Muscular',
    unit: 'cm',
    currentValue: 42.5,
    initialValue: 38.2,
    deltaPercent: '+11.2%',
    deltaAbsolute: '+4.3 cm',
    isPositiveImprovement: true,
    color: 'var(--stat-cyan)',
    gradientId: 'grad-cmj',
    description: 'Capacidad de salto vertical y producción de potencia rápida en tren inferior.',
    data: [
      { date: 'Jun', value: 38.2, label: '38.2 cm' },
      { date: 'Jul', value: 39.5, label: '39.5 cm' },
      { date: 'Ago', value: 40.4, label: '40.4 cm' },
      { date: 'Sep', value: 41.2, label: '41.2 cm' },
      { date: 'Oct', value: 42.5, label: '42.5 cm' },
    ],
  },
  squat: {
    key: 'squat',
    name: '1RM Estimado en Sentadilla Trasera',
    shortName: '1RM Sentadilla',
    category: 'Fuerza Máxima',
    unit: 'kg',
    currentValue: 135,
    initialValue: 115,
    deltaPercent: '+17.4%',
    deltaAbsolute: '+20.0 kg',
    isPositiveImprovement: true,
    color: 'var(--stat-purple)',
    gradientId: 'grad-squat',
    description:
      'Nivel de fuerza máxima estructural en miembros inferiores calculada a 1 repetición.',
    data: [
      { date: 'Jun', value: 115, label: '115 kg' },
      { date: 'Jul', value: 120, label: '120 kg' },
      { date: 'Ago', value: 125, label: '125 kg' },
      { date: 'Sep', value: 130, label: '130 kg' },
      { date: 'Oct', value: 135, label: '135 kg' },
    ],
  },
  sprint: {
    key: 'sprint',
    name: 'Sprint 30 metros (Fotocélulas)',
    shortName: 'Sprint 30m',
    category: 'Velocidad',
    unit: 'seg',
    currentValue: 3.98,
    initialValue: 4.15,
    deltaPercent: '-4.1%',
    deltaAbsolute: '-0.17 seg',
    isPositiveImprovement: true,
    color: 'var(--pain-level-4)',
    gradientId: 'grad-sprint',
    description: 'Tiempo cronometrado con fotocélulas en aceleración y velocidad lanzada a 30m.',
    data: [
      { date: 'Jun', value: 4.15, label: '4.15 s' },
      { date: 'Jul', value: 4.09, label: '4.09 s' },
      { date: 'Ago', value: 4.04, label: '4.04 s' },
      { date: 'Sep', value: 4.01, label: '4.01 s' },
      { date: 'Oct', value: 3.98, label: '3.98 s' },
    ],
  },
  rpe: {
    key: 'rpe',
    name: 'Carga Semanal RPE (Escala Borg)',
    shortName: 'Carga RPE',
    category: 'Monitoreo de Cargas',
    unit: '/10',
    currentValue: 7.2,
    initialValue: 6.4,
    deltaPercent: '+12.5%',
    deltaAbsolute: '+0.8 pts',
    isPositiveImprovement: true,
    color: 'var(--secondary)',
    gradientId: 'grad-rpe',
    description: 'Percepción de esfuerzo acumulado semanal para prevenir picos lesivos.',
    data: [
      { date: 'Sem 1', value: 6.4, label: '6.4 pts' },
      { date: 'Sem 2', value: 7.0, label: '7.0 pts' },
      { date: 'Sem 3', value: 7.8, label: '7.8 pts' },
      { date: 'Sem 4', value: 6.9, label: '6.9 pts' },
      { date: 'Sem 5', value: 7.2, label: '7.2 pts' },
    ],
  },
  yoyo: {
    key: 'yoyo',
    name: 'Test Yo-Yo de Recuperación Intermitente (Nivel 1)',
    shortName: 'Test Yo-Yo',
    category: 'Resistencia Aeróbica',
    unit: 'm',
    currentValue: 2040,
    initialValue: 1680,
    deltaPercent: '+21.4%',
    deltaAbsolute: '+360 m',
    isPositiveImprovement: true,
    color: 'var(--stat-green)',
    gradientId: 'grad-yoyo',
    description: 'Distancia total recorrida en test intermitente de máxima exigencia aeróbica.',
    data: [
      { date: 'Jun', value: 1680, label: '1.680 m' },
      { date: 'Jul', value: 1760, label: '1.760 m' },
      { date: 'Ago', value: 1880, label: '1.880 m' },
      { date: 'Sep', value: 1960, label: '1.960 m' },
      { date: 'Oct', value: 2040, label: '2.040 m' },
    ],
  },
};

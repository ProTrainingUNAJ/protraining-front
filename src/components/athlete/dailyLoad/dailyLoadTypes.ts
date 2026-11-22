import type { DailyLoadSubmitRequest } from '../../../api/seguimientoService';

export type ActivityKey = keyof DailyLoadSubmitRequest; // 'gym' | 'sportTraining' | 'match1' | 'match2' | 'individualWork'

export type MainCategory = 'gym' | 'sportTraining' | 'match' | 'individualWork';

export interface ActivityDefinition {
  key: ActivityKey;
  mainCategory: MainCategory;
  name: string;
  matchSubLabel?: string;
  matchIdentifier?: 1 | 2;
  description: string;
}

export const MAIN_CATEGORIES = [
  {
    id: 'gym' as const,
    label: 'Gimnasio',
    hint: 'Fuerza y movilidad',
    defaultKey: 'gym' as ActivityKey,
  },
  {
    id: 'sportTraining' as const,
    label: 'Entrenamiento deportivo',
    hint: 'Técnica y táctica',
    defaultKey: 'sportTraining' as ActivityKey,
  },
  {
    id: 'match' as const,
    label: 'Partido',
    hint: 'Oficial o amistoso',
    defaultKey: 'match1' as ActivityKey,
  },
  {
    id: 'individualWork' as const,
    label: 'Trabajo individual',
    hint: 'Preventivo y complementario',
    defaultKey: 'individualWork' as ActivityKey,
  },
];

export const ACTIVITY_DEFINITIONS: Record<ActivityKey, ActivityDefinition> = {
  gym: {
    key: 'gym',
    mainCategory: 'gym',
    name: 'Gimnasio',
    description: 'Fuerza y movilidad',
  },
  sportTraining: {
    key: 'sportTraining',
    mainCategory: 'sportTraining',
    name: 'Entrenamiento deportivo',
    description: 'Técnica y táctica',
  },
  match1: {
    key: 'match1',
    mainCategory: 'match',
    name: 'Partido',
    matchSubLabel: 'Partido 1',
    matchIdentifier: 1,
    description: 'Primer partido / Titular',
  },
  match2: {
    key: 'match2',
    mainCategory: 'match',
    name: 'Partido',
    matchSubLabel: 'Partido 2',
    matchIdentifier: 2,
    description: 'Segundo partido / Suplente',
  },
  individualWork: {
    key: 'individualWork',
    mainCategory: 'individualWork',
    name: 'Trabajo individual',
    description: 'Preventivo y complementario',
  },
};

export const ALL_ACTIVITY_KEYS: ActivityKey[] = [
  'gym',
  'sportTraining',
  'match1',
  'match2',
  'individualWork',
];

export type RpeTier = 'easy' | 'moderate' | 'demanding' | 'hard' | 'max';

export interface RpeLevelMeta {
  val: number;
  title: string;
  desc: string;
  tier: RpeTier;
}

export const RPE_LEVELS: RpeLevelMeta[] = [
  {
    val: 1,
    title: 'Muy liviano',
    desc: 'Recuperación activa, casi sin esfuerzo perceptible.',
    tier: 'easy',
  },
  {
    val: 2,
    title: 'Liviano',
    desc: 'Esfuerzo suave, respiración cómoda y tranquila.',
    tier: 'easy',
  },
  {
    val: 3,
    title: 'Moderado',
    desc: 'Ritmo aeróbico cómodo, podés mantener una conversación fluida.',
    tier: 'moderate',
  },
  {
    val: 4,
    title: 'Algo duro',
    desc: 'Respiración algo acelerada pero completamente bajo control.',
    tier: 'moderate',
  },
  {
    val: 5,
    title: 'Duro',
    desc: 'Esfuerzo constante, empieza a sentirse el trabajo muscular sostenido.',
    tier: 'demanding',
  },
  {
    val: 6,
    title: 'Exigente',
    desc: 'Fatiga progresiva, requiere concentración mental para sostener.',
    tier: 'demanding',
  },
  {
    val: 7,
    title: 'Muy duro',
    desc: 'Alta exigencia física, respiración agitada y pulsaciones altas.',
    tier: 'hard',
  },
  {
    val: 8,
    title: 'Muy intenso',
    desc: 'Esfuerzo límite, solo frases entrecortadas y gran demanda aeróbica.',
    tier: 'hard',
  },
  {
    val: 9,
    title: 'Casi máximo',
    desc: 'Esfuerzo extremo, muy difícil sostener el ritmo sin pausas.',
    tier: 'max',
  },
  {
    val: 10,
    title: 'Máximo absoluto',
    desc: 'Agotamiento total, diste el 100% absoluto de tu capacidad.',
    tier: 'max',
  },
];

export const MINUTE_PRESETS = [15, 30, 45, 60, 90, 120];

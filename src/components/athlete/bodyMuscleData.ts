export interface MuscleGroupItem {
  id: string;
  name: string;
  view: 'front' | 'back' | 'both';
  category: 'Tren Superior' | 'Tren Inferior' | 'Zona Media';
  frontCenter?: { x: number; y: number };
  backCenter?: { x: number; y: number };
  polygons: string[];
}

export interface PainLevelOption {
  level: number;
  name: string;
  color: string;
  desc: string;
}

export const PAIN_LEVELS: PainLevelOption[] = [
  { level: 1, name: 'Leve', color: '#20C56B', desc: 'Sensación leve / ligera tirantez' },
  { level: 2, name: 'Molestia', color: '#84CC16', desc: 'Molestia perceptible al movimiento' },
  { level: 3, name: 'Moderado', color: '#F4B400', desc: 'Dolor limitante pero tolerable' },
  { level: 4, name: 'Fuerte', color: '#FF781F', desc: 'Dolor agudo que restringe la carga' },
  { level: 5, name: 'Agudo', color: '#F04444', desc: 'Dolor severo / impedimento total' },
];

export const getPainColor = (level?: number): string => {
  const item = PAIN_LEVELS.find((p) => p.level === level);
  return item ? item.color : '#023050';
};

export const PROTRAINING_MUSCLES: MuscleGroupItem[] = [
  {
    id: 'pecho',
    name: 'Pecho',
    view: 'front',
    category: 'Tren Superior',
    frontCenter: { x: 291, y: 174 },
    polygons: [
      '222,142 288,142 288,206 230,206 222,175',
      '294,142 360,142 360,175 352,206 294,206',
    ],
  },
  {
    id: 'hombros',
    name: 'Hombros',
    view: 'both',
    category: 'Tren Superior',
    frontCenter: { x: 291, y: 162 },
    backCenter: { x: 732, y: 168 },
    polygons: [
      '180,118 222,102 236,138 214,198 180,165',
      '360,102 402,118 402,165 368,198 346,138',
      '620,135 660,132 662,175 645,198 620,170',
      '802,132 842,135 842,170 817,198 800,175',
    ],
  },
  {
    id: 'biceps',
    name: 'Bíceps',
    view: 'front',
    category: 'Tren Superior',
    frontCenter: { x: 289, y: 232 },
    polygons: ['175,200 216,192 218,260 182,262', '366,192 407,200 400,262 364,260'],
  },
  {
    id: 'abdominales',
    name: 'Abdominales',
    view: 'front',
    category: 'Zona Media',
    frontCenter: { x: 292, y: 283 },
    polygons: ['230,208 352,208 358,285 335,358 247,358 224,285'],
  },
  {
    id: 'cuadriceps',
    name: 'Cuádriceps',
    view: 'front',
    category: 'Tren Inferior',
    frontCenter: { x: 292, y: 413 },
    polygons: ['214,338 288,338 276,468 222,465', '294,338 368,338 360,465 306,468'],
  },
  {
    id: 'espalda_alta',
    name: 'Espalda alta',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 732, y: 157 },
    polygons: ['664,120 798,120 802,188 732,228 662,188'],
  },
  {
    id: 'espalda_media',
    name: 'Espalda media',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 732, y: 226 },
    polygons: ['663,190 732,225 801,190 798,260 732,260 665,260'],
  },
  {
    id: 'espalda_baja',
    name: 'Espalda baja',
    view: 'back',
    category: 'Zona Media',
    backCenter: { x: 732, y: 292 },
    polygons: ['670,262 794,262 792,322 672,322'],
  },
  {
    id: 'triceps',
    name: 'Tríceps',
    view: 'back',
    category: 'Tren Superior',
    backCenter: { x: 732, y: 232 },
    polygons: ['615,192 658,192 654,264 620,264', '804,192 847,192 842,264 808,264'],
  },
  {
    id: 'gluteos',
    name: 'Gluteos',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 733, y: 359 },
    polygons: ['665,322 798,322 795,392 732,392 668,392'],
  },
  {
    id: 'isquiotibiales',
    name: 'Isquiotibiales',
    view: 'back',
    category: 'Tren Inferior',
    backCenter: { x: 732, y: 448 },
    polygons: ['658,394 728,394 722,504 664,504', '736,394 806,394 800,504 742,504'],
  },
  {
    id: 'gemelos',
    name: 'Gemelos',
    view: 'both',
    category: 'Tren Inferior',
    frontCenter: { x: 291, y: 554 },
    backCenter: { x: 732, y: 552 },
    polygons: [
      '216,492 274,492 270,642 224,642',
      '308,492 366,492 358,642 312,642',
      '656,504 712,504 706,642 662,642',
      '752,504 808,504 802,642 758,642',
    ],
  },
];

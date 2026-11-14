export const ATHLETE_DASHBOARD_STORAGE_KEY = 'protraining_bento_rows_athlete_v8';
export const DAILY_LOAD_CARD_ID = 'a-daily-load';
export const DAILY_TRAFFIC_LIGHT_CARD_ID = 'a-daily-traffic-light';

export interface StoredCard {
  id: string;
  name: string;
  colSpan: number;
  type: string;
  chartMetric?: string;
}

export interface StoredRow {
  id: string;
  name: string;
  className: string;
  cards: StoredCard[];
}

// Inicio del atleta por defecto (antes de que lo personalice)
export const DEFAULT_ATHLETE_ROWS: StoredRow[] = [
  {
    id: 'row-1',
    name: 'Fila 1 · Indicadores en Vivo',
    className: 'wireframe-row-1',
    cards: [
      { id: 'a-session', name: 'Predio y Horario', colSpan: 1, type: 'training-session' },
      {
        id: 'a-daily-traffic-light',
        name: 'Semáforo Diario',
        colSpan: 1,
        type: 'daily-traffic-light',
      },
      { id: 'a-r1-3', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
    ],
  },
  {
    id: 'row-2',
    name: 'Fila 2 · Mi Estado y Rutina',
    className: 'wireframe-row-2',
    cards: [
      { id: 'a-daily-load', name: 'Carga del Día', colSpan: 1, type: 'daily-load' },
      { id: 'a-r2-2', name: 'Módulo 2-B', colSpan: 1, type: 'empty' },
      { id: 'a-r2-3', name: 'Módulo 2-C', colSpan: 1, type: 'empty' },
    ],
  },
  {
    id: 'row-3',
    name: 'Fila 3 · Suite y Carga',
    className: 'wireframe-row-3',
    cards: [
      { id: 'a-suite', name: 'ProTraining Atleta', colSpan: 1, type: 'suite' },
      {
        id: 'a-chart-cmj',
        name: 'Evolución Salto CMJ',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'cmj',
      },
    ],
  },
  {
    id: 'row-4',
    name: 'Fila 4 · Rendimiento y Métricas',
    className: 'wireframe-row-4',
    cards: [
      {
        id: 'a-chart-squat',
        name: 'Sentadilla 1RM',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'squat',
      },
      {
        id: 'a-chart-sprint',
        name: 'Sprint 30m',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'sprint',
      },
      {
        id: 'a-chart-yoyo',
        name: 'Resistencia',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'yoyo',
      },
    ],
  },
];

export const DAILY_LOAD_CARD: StoredCard = {
  id: DAILY_LOAD_CARD_ID,
  name: 'Carga del Día',
  colSpan: 1,
  type: 'daily-load',
};

export const DAILY_TRAFFIC_LIGHT_CARD: StoredCard = {
  id: DAILY_TRAFFIC_LIGHT_CARD_ID,
  name: 'Semáforo Diario',
  colSpan: 1,
  type: 'daily-traffic-light',
};

/**
 * Checks if the daily load widget is currently pinned in the athlete's bento dashboard.
 */
export const isDailyLoadWidgetPinned = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const saved = localStorage.getItem(ATHLETE_DASHBOARD_STORAGE_KEY);
    if (!saved) return false;
    const rows = JSON.parse(saved) as StoredRow[];
    if (!Array.isArray(rows)) return false;
    return rows.some((row) =>
      row.cards?.some((card) => card.type === 'daily-load' || card.id === DAILY_LOAD_CARD_ID),
    );
  } catch {
    return false;
  }
};

/**
 * Pins the Daily Load widget into row-2 of the athlete's bento dashboard.
 * If an empty slot exists in row-2, replaces it; otherwise replaces the first slot.
 */
export const pinDailyLoadWidget = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    let rows: StoredRow[] = [];
    const saved = localStorage.getItem(ATHLETE_DASHBOARD_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rows = parsed;
        }
      } catch {
        rows = [];
      }
    }

    // Do nothing if already pinned
    const alreadyPinned = rows.some((r) =>
      r.cards?.some((c) => c.type === 'daily-load' || c.id === DAILY_LOAD_CARD_ID),
    );
    if (alreadyPinned) return true;

    // Initialize with default athlete layout if no previous layout exists
    if (rows.length === 0) {
      rows = [
        {
          id: 'row-1',
          name: 'Fila 1 · Indicadores en Vivo',
          className: 'wireframe-row-1',
          cards: [
            { id: 'a-session', name: 'Predio y Horario', colSpan: 1, type: 'training-session' },
            { ...DAILY_TRAFFIC_LIGHT_CARD },
            { id: 'a-r1-3', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
          ],
        },
        {
          id: 'row-2',
          name: 'Fila 2 · Mi Estado y Rutina',
          className: 'wireframe-row-2',
          cards: [
            { ...DAILY_LOAD_CARD },
            { id: 'a-r2-2', name: 'Módulo 2-B', colSpan: 1, type: 'empty' },
            { id: 'a-r2-3', name: 'Módulo 2-C', colSpan: 1, type: 'empty' },
          ],
        },
        {
          id: 'row-3',
          name: 'Fila 3 · Suite y Carga',
          className: 'wireframe-row-3',
          cards: [
            { id: 'a-suite', name: 'ProTraining Atleta', colSpan: 1, type: 'suite' },
            {
              id: 'a-chart-cmj',
              name: 'Evolución Salto CMJ',
              colSpan: 1,
              type: 'progress-chart',
              chartMetric: 'cmj',
            },
          ],
        },
        {
          id: 'row-4',
          name: 'Fila 4 · Rendimiento y Métricas',
          className: 'wireframe-row-4',
          cards: [
            {
              id: 'a-chart-squat',
              name: 'Sentadilla 1RM',
              colSpan: 1,
              type: 'progress-chart',
              chartMetric: 'squat',
            },
            {
              id: 'a-chart-sprint',
              name: 'Sprint 30m',
              colSpan: 1,
              type: 'progress-chart',
              chartMetric: 'sprint',
            },
            {
              id: 'a-chart-yoyo',
              name: 'Resistencia',
              colSpan: 1,
              type: 'progress-chart',
              chartMetric: 'yoyo',
            },
          ],
        },
      ];
    } else {
      // Find row-2 and replace first empty slot
      const row2 = rows.find((r) => r.id === 'row-2');
      if (row2 && Array.isArray(row2.cards)) {
        const emptyIdx = row2.cards.findIndex((c) => c.type === 'empty');
        if (emptyIdx !== -1) {
          row2.cards[emptyIdx] = { ...DAILY_LOAD_CARD };
        } else {
          // Si no hay lugar vacío en row-2, buscar si hay algún slot vacío en el dashboard
          let placed = false;
          for (const row of rows) {
            const idx = row.cards.findIndex((c) => c.type === 'empty');
            if (idx !== -1) {
              row.cards[idx] = { ...DAILY_LOAD_CARD };
              placed = true;
              break;
            }
          }
          if (!placed) {
            // No hay espacio vacío disponible; no se reemplaza ninguna tarjeta existente
            return false;
          }
        }
      } else {
        rows.splice(1, 0, {
          id: 'row-2',
          name: 'Fila 2 · Mi Estado y Rutina',
          className: 'wireframe-row-2',
          cards: [
            { ...DAILY_LOAD_CARD },
            { id: 'a-r2-2', name: 'Módulo 2-B', colSpan: 1, type: 'empty' },
            { id: 'a-r2-3', name: 'Módulo 2-C', colSpan: 1, type: 'empty' },
          ],
        });
      }
    }

    localStorage.setItem(ATHLETE_DASHBOARD_STORAGE_KEY, JSON.stringify(rows));
    window.dispatchEvent(new Event('protraining-dashboard-layout-changed'));
    return true;
  } catch {
    return false;
  }
};

const readAthleteRows = (): StoredRow[] | null => {
  try {
    const saved = localStorage.getItem(ATHLETE_DASHBOARD_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as StoredRow[]) : null;
  } catch {
    return null;
  }
};

/**
 * Gráficos de Progreso fijados en el Inicio del atleta: métrica → nombre de la tarjeta.
 * Sin layout guardado, el Inicio usa el de defecto que recibe por parámetro.
 */
export const getPinnedProgressCharts = (defaultRows: StoredRow[]): Record<string, string> => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  const rows = readAthleteRows() ?? defaultRows;
  const pinned: Record<string, string> = {};
  rows.forEach((row) =>
    row.cards?.forEach((card) => {
      if (card.type === 'progress-chart' && card.chartMetric) {
        pinned[card.chartMetric] = card.name;
      }
    }),
  );
  return pinned;
};

/** Lugares libres del Inicio del atleta donde se puede fijar un gráfico. */
export const getEmptyDashboardSlots = (defaultRows: StoredRow[]): StoredCard[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const rows = readAthleteRows() ?? defaultRows;
  return rows.flatMap((row) => row.cards?.filter((card) => card.type === 'empty') ?? []);
};

/**
 * Fija un gráfico de Progreso en el Inicio del atleta: en la tarjeta elegida o en el primer lugar libre.
 * Devuelve el nombre del lugar que ocupó, o null si no había lugar.
 */
export const pinProgressChart = (
  defaultRows: StoredRow[],
  metricKey: string,
  chartName: string,
  targetCardId?: string,
): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const rows: StoredRow[] = JSON.parse(JSON.stringify(readAthleteRows() ?? defaultRows));
    for (const row of rows) {
      const idx = row.cards.findIndex((card) =>
        targetCardId ? card.id === targetCardId : card.type === 'empty',
      );
      if (idx !== -1) {
        const slotName = row.cards[idx].name;
        row.cards[idx] = {
          ...row.cards[idx],
          type: 'progress-chart',
          chartMetric: metricKey,
          name: chartName,
        };
        localStorage.setItem(ATHLETE_DASHBOARD_STORAGE_KEY, JSON.stringify(rows));
        window.dispatchEvent(new Event('protraining-dashboard-layout-changed'));
        return slotName;
      }
    }
    return null;
  } catch {
    return null;
  }
};

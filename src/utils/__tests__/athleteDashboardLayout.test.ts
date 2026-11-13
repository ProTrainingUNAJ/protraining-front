import { describe, it, expect, beforeEach } from 'vitest';
import {
  ATHLETE_DASHBOARD_STORAGE_KEY,
  DAILY_LOAD_CARD_ID,
  isDailyLoadWidgetPinned,
  pinDailyLoadWidget,
} from '../athleteDashboardLayout';

describe('athleteDashboardLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('devuelve false si no hay datos en localStorage', () => {
    expect(isDailyLoadWidgetPinned()).toBe(false);
  });

  it('ancla el widget en row-2 reemplazando el primer slot vacío cuando no había layout previo', () => {
    const success = pinDailyLoadWidget();
    expect(success).toBe(true);
    expect(isDailyLoadWidgetPinned()).toBe(true);

    const saved = JSON.parse(localStorage.getItem(ATHLETE_DASHBOARD_STORAGE_KEY)!);
    const row2 = saved.find((r: { id: string }) => r.id === 'row-2');
    expect(row2).toBeDefined();
    expect(row2.cards[0].id).toBe(DAILY_LOAD_CARD_ID);
    expect(row2.cards[0].type).toBe('daily-load');
  });

  it('reemplaza el primer slot vacío en row-2 si ya existía un layout guardado', () => {
    const initialRows = [
      {
        id: 'row-1',
        name: 'Fila 1',
        className: 'wireframe-row-1',
        cards: [{ id: 'c1', name: 'Módulo', colSpan: 1, type: 'empty' }],
      },
      {
        id: 'row-2',
        name: 'Fila 2',
        className: 'wireframe-row-2',
        cards: [
          { id: 'c2-1', name: 'Módulo Vacío', colSpan: 1, type: 'empty' },
          { id: 'c2-2', name: 'Módulo Vacío 2', colSpan: 1, type: 'empty' },
        ],
      },
    ];
    localStorage.setItem(ATHLETE_DASHBOARD_STORAGE_KEY, JSON.stringify(initialRows));

    expect(isDailyLoadWidgetPinned()).toBe(false);
    pinDailyLoadWidget();
    expect(isDailyLoadWidgetPinned()).toBe(true);

    const saved = JSON.parse(localStorage.getItem(ATHLETE_DASHBOARD_STORAGE_KEY)!);
    const row2 = saved.find((r: { id: string }) => r.id === 'row-2');
    expect(row2.cards[0].type).toBe('daily-load');
    expect(row2.cards[1].type).toBe('empty');
  });

  it('no reemplaza ninguna tarjeta si no hay lugares vacíos disponibles y devuelve false', () => {
    const fullRows = [
      {
        id: 'row-1',
        name: 'Fila 1',
        className: 'wireframe-row-1',
        cards: [{ id: 'c1', name: 'Sesión', colSpan: 1, type: 'training-session' }],
      },
      {
        id: 'row-2',
        name: 'Fila 2',
        className: 'wireframe-row-2',
        cards: [
          { id: 'c2-1', name: 'Tarjeta Ocupada 1', colSpan: 1, type: 'progress-chart' },
          { id: 'c2-2', name: 'Tarjeta Ocupada 2', colSpan: 1, type: 'suite' },
        ],
      },
    ];
    localStorage.setItem(ATHLETE_DASHBOARD_STORAGE_KEY, JSON.stringify(fullRows));

    const result = pinDailyLoadWidget();
    expect(result).toBe(false);
    expect(isDailyLoadWidgetPinned()).toBe(false);

    const saved = JSON.parse(localStorage.getItem(ATHLETE_DASHBOARD_STORAGE_KEY)!);
    const row2 = saved.find((r: { id: string }) => r.id === 'row-2');
    expect(row2.cards[0].name).toBe('Tarjeta Ocupada 1');
    expect(row2.cards[1].name).toBe('Tarjeta Ocupada 2');
  });
});

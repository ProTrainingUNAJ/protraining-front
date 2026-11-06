import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { OneRepMaxProgressionChart } from '../OneRepMaxProgressionChart';
import { athleteRecordsService } from '../../../api/athleteRecords';
import { AthleteRecordItem } from '../../../types/athleteRecords';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 300 }),
  };
});

describe('OneRepMaxProgressionChart (KAN-436 / #141)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('CRITERIO 1: DADO un atleta con 3 récords de sentadilla CUANDO abre "Mi evolución" y elige sentadilla ENTONCES ve la línea con los 3 puntos y sus fechas', async () => {
    const mockRecords: AthleteRecordItem[] = [
      {
        id: 'rec-1',
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        weightKg: 100,
        origin: 'TestedInSession',
        achievedAt: '2026-08-10T10:00:00Z',
      },
      {
        id: 'rec-2',
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        weightKg: 110,
        origin: 'Reported',
        achievedAt: '2026-09-15T10:00:00Z',
      },
      {
        id: 'rec-3',
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        weightKg: 120,
        origin: 'EstimatedEpley',
        achievedAt: '2026-10-20T10:00:00Z',
      },
      {
        id: 'rec-4',
        exerciseId: 'ex-bench',
        exerciseName: 'Press de banca',
        weightKg: 80,
        origin: 'Epley',
        achievedAt: '2026-09-01T10:00:00Z',
      },
    ];

    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue(mockRecords);

    render(<OneRepMaxProgressionChart athleteId="ath-1" />);

    // Esperar a que cargue
    await waitFor(() => {
      expect(screen.queryByText(/Cargando evolución/i)).toBeNull();
    });

    const selector = screen.getByTestId('exercise-selector') as HTMLSelectElement;
    expect(selector).toBeDefined();

    // Seleccionar Sentadilla trasera
    fireEvent.change(selector, { target: { value: 'ex-squat' } });

    // Verificar que el gráfico se renderiza
    expect(screen.getByTestId('rm-line-chart-wrap')).toBeDefined();

    // Verificar que las fechas de los 3 récords de sentadilla están en el gráfico
    await waitFor(() => {
      expect(screen.getByText('10/08/2026')).toBeDefined();
      expect(screen.getByText('15/09/2026')).toBeDefined();
      expect(screen.getByText('20/10/2026')).toBeDefined();
    });

    // Con 3 récords NO debe mostrar el aviso de evolución insuficiente
    expect(screen.queryByText('Todavía no hay evolución para mostrar')).toBeNull();
  });

  it('CRITERIO 2: DADO un atleta sin récords CUANDO abre la pestaña ENTONCES ve el estado vacío, sin errores', async () => {
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);

    render(<OneRepMaxProgressionChart athleteId="ath-empty" />);

    await waitFor(() => {
      expect(screen.queryByText(/Cargando evolución/i)).toBeNull();
    });

    // Estado vacío visible y sin errores
    expect(screen.getByText('Sin récords cargados')).toBeDefined();
    expect(
      screen.getByText('Todavía no hay récords registrados para mostrar la evolución.'),
    ).toBeDefined();
    expect(screen.queryByTestId('exercise-selector')).toBeNull();
  });

  it('DADO un atleta con 1 solo récord CUANDO se muestra el gráfico ENTONCES ve el punto con el texto "Todavía no hay evolución para mostrar"', async () => {
    const singleRecord: AthleteRecordItem[] = [
      {
        id: 'rec-single',
        exerciseId: 'ex-deadlift',
        exerciseName: 'Peso muerto',
        weightKg: 140,
        origin: 'TestedInSession',
        achievedAt: '2026-10-01T12:00:00Z',
      },
    ];

    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue(singleRecord);

    render(<OneRepMaxProgressionChart athleteId="ath-single" />);

    await waitFor(() => {
      expect(screen.queryByText(/Cargando evolución/i)).toBeNull();
    });

    // Se ve el selector con el único ejercicio con récord
    expect(screen.getByText('Peso muerto')).toBeDefined();

    // Se muestra el punto con su fecha
    expect(screen.getByText('01/10/2026')).toBeDefined();

    // Y el texto explícito requerido
    expect(screen.getByText('Todavía no hay evolución para mostrar')).toBeDefined();
  });

  it('Selector de ejercicio: solo muestra ejercicios que tienen al menos un récord', async () => {
    const mockRecords: AthleteRecordItem[] = [
      {
        id: 'rec-1',
        exerciseId: 'ex-squat',
        exerciseName: 'Sentadilla trasera',
        weightKg: 100,
        origin: 'TestedInSession',
        achievedAt: '2026-08-10T10:00:00Z',
      },
      {
        id: 'rec-2',
        exerciseId: 'ex-bench',
        exerciseName: 'Press de banca',
        weightKg: 85,
        origin: 'Reported',
        achievedAt: '2026-09-01T10:00:00Z',
      },
    ];

    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue(mockRecords);

    render(<OneRepMaxProgressionChart athleteId="ath-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-selector')).toBeDefined();
    });

    const selector = screen.getByTestId('exercise-selector') as HTMLSelectElement;
    const options = Array.from(selector.options).map((opt) => opt.text);

    // Solo debe incluir los dos ejercicios presentes en el historial
    expect(options).toEqual(['Press de banca', 'Sentadilla trasera']);
    expect(options).not.toContain('Dominadas');
  });

  it('Maneja error de la API mostrando el banner de alerta', async () => {
    vi.spyOn(athleteRecordsService, 'listHistory').mockRejectedValue(
      new Error('Error de red al consultar el historial.'),
    );

    render(<OneRepMaxProgressionChart athleteId="ath-error" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Error de red al consultar el historial.')).toBeDefined();
    });
  });

  it('CRITERIO KAN-435: muestra advertencia explícita cuando Entrenamiento está en modo degradado (strengthUnavailable)', async () => {
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);

    render(<OneRepMaxProgressionChart athleteId="ath-1" strengthUnavailable={true} />);

    await waitFor(() => {
      expect(screen.queryByText(/Cargando evolución/i)).toBeNull();
    });

    expect(screen.getByTestId('strength-unavailable-alert')).toBeDefined();
    expect(
      screen.getByText('No pudimos cargar los récords de fuerza en este momento.'),
    ).toBeDefined();
    // No debe engañar diciendo que el atleta no tiene récords cargados
    expect(screen.queryByText('Sin récords cargados')).toBeNull();
  });

  it('CRITERIO KAN-434 / KAN-435: maneja atleta ajeno o no existente mostrando error 404 "Atleta no encontrado"', async () => {
    vi.spyOn(athleteRecordsService, 'listHistory').mockRejectedValue(
      new Error('Atleta no encontrado'),
    );

    render(<OneRepMaxProgressionChart athleteId="ath-other-pf" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Atleta no encontrado')).toBeDefined();
    });
  });
});

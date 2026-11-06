import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AthleteRecordsModal } from '../AthleteRecordsModal';
import { athleteRecordsService } from '../../../api/athleteRecords';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 300 }),
  };
});

describe('AthleteRecordsModal - Pestaña Evolución para el PF (KAN-436 / #141)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('permite al PF alternar entre la pestaña Récords y la pestaña Evolución', async () => {
    vi.spyOn(athleteRecordsService, 'listCurrent').mockResolvedValue([]);
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);

    render(<AthleteRecordsModal athleteId="ath-10" athleteName="Mateo Rossi" onClose={vi.fn()} />);

    // Modal abierto con título y tabs
    expect(screen.getByText('Récords de Mateo Rossi')).toBeDefined();
    expect(screen.getByRole('tab', { name: /Récords/i })).toBeDefined();
    const evolutionTab = screen.getByTestId('tab-evolucion-pf');
    expect(evolutionTab).toBeDefined();

    // Por defecto inicia en Récords
    expect(screen.getByText('Cargar un récord')).toBeDefined();

    // El PF toca la pestaña Evolución
    fireEvent.click(evolutionTab);

    // Muestra el componente de evolución
    await waitFor(() => {
      expect(screen.getByText('Sin récords cargados')).toBeDefined();
    });
  });

  it('inicia directamente en la pestaña Evolución si se le pasa initialTab="evolution"', async () => {
    vi.spyOn(athleteRecordsService, 'listCurrent').mockResolvedValue([]);
    vi.spyOn(athleteRecordsService, 'listHistory').mockResolvedValue([]);

    render(
      <AthleteRecordsModal
        athleteId="ath-10"
        athleteName="Mateo Rossi"
        initialTab="evolution"
        onClose={vi.fn()}
      />,
    );

    // Directamente en evolución
    await waitFor(() => {
      expect(screen.getByText('Sin récords cargados')).toBeDefined();
    });
    expect(screen.queryByText('Cargar un récord')).toBeNull();
  });
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecordsReliabilityPanel } from '../RecordsReliabilityPanel';
import { recordsReliabilityService } from '../../../api/recordsReliability';

vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 600, height: 64 }),
  };
});

vi.mock('../../../api/recordsReliability', () => ({
  recordsReliabilityService: {
    getByCategory: vi.fn(),
  },
}));

vi.mock('../../athletes/AthleteRecordsModal', () => ({
  AthleteRecordsModal: ({ athleteId, athleteName }: { athleteId: string; athleteName: string }) => (
    <div role="dialog" aria-label="detalle-atleta">
      {athleteId}:{athleteName}
    </div>
  ),
}));

const summary = {
  categoryId: 'cat-1',
  totalAthletes: 2,
  totalRecords: 8,
  groups: [
    {
      group: 'Tested',
      athleteCount: 1,
      recordCount: 1,
      percentage: 12.5,
      athletes: [{ athleteId: 'a1', name: 'Martín', recordCount: 1 }],
    },
    {
      group: 'Reported',
      athleteCount: 1,
      recordCount: 2,
      percentage: 25,
      athletes: [{ athleteId: 'a1', name: 'Martín', recordCount: 2 }],
    },
    {
      group: 'Estimated',
      athleteCount: 1,
      recordCount: 5,
      percentage: 62.5,
      athletes: [{ athleteId: 'a1', name: 'Martín', recordCount: 5 }],
    },
    {
      group: 'NoData',
      athleteCount: 1,
      recordCount: 0,
      percentage: 50,
      athletes: [{ athleteId: 'a2', name: 'Jesica', recordCount: 0 }],
    },
  ],
};

const onlyNoDataSummary = {
  categoryId: 'cat-1',
  totalAthletes: 2,
  totalRecords: 0,
  groups: [
    { group: 'Tested', athleteCount: 0, recordCount: 0, percentage: 0, athletes: [] },
    { group: 'Reported', athleteCount: 0, recordCount: 0, percentage: 0, athletes: [] },
    { group: 'Estimated', athleteCount: 0, recordCount: 0, percentage: 0, athletes: [] },
    {
      group: 'NoData',
      athleteCount: 2,
      recordCount: 0,
      percentage: 100,
      athletes: [
        { athleteId: 'a2', name: 'Jesica', recordCount: 0 },
        { athleteId: 'a3', name: 'Santiago', recordCount: 0 },
      ],
    },
  ],
};

describe('RecordsReliabilityPanel - dashboard de confiabilidad (KAN-417)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el gráfico y los 4 botones de leyenda con los récords por estado', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(summary as never);

    render(<RecordsReliabilityPanel categoryId="cat-1" />);

    await waitFor(() =>
      expect(screen.getByText(/2 atletas en la categoría · 8 récords cargados/i)).toBeDefined(),
    );

    expect(screen.getByRole('button', { name: 'Testeado (1)' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reportado (2)' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Estimado (5)' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sin datos (1 atleta)' })).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Confiabilidad de las marcas' })).toBeDefined();
    expect(screen.getByText(/puede aparecer en más de un grupo/i)).toBeDefined();
    expect(screen.getByText(/Sin datos: 1 atleta sin récords/i)).toBeDefined();
  });

  it('al hacer clic en Sin datos muestra a Jesica sin récords', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(summary as never);

    render(<RecordsReliabilityPanel categoryId="cat-1" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sin datos (1 atleta)' })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sin datos (1 atleta)' }));

    const detail = screen.getByRole('status');
    expect(detail.textContent).toContain('Sin datos (1 atleta)');
    expect(detail.textContent).toContain('Jesica');
    expect(detail.textContent).toContain('sin récords');
    expect(detail.textContent).toContain('Recomendado: tomarle un test para tener su marca base.');
    expect(
      screen.getByRole('button', { name: 'Sin datos (1 atleta)' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('Martín aparece en Testeado con 1 récord y en Reportado con 2', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(summary as never);

    render(<RecordsReliabilityPanel categoryId="cat-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Testeado (1)' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Testeado (1)' }));
    let detail = screen.getByRole('status');
    expect(detail.textContent).toContain('Testeado (1 récord)');
    expect(detail.textContent).toContain('Martín');
    expect(detail.textContent).toContain('1 récord');
    expect(detail.textContent).not.toContain('sin récords');

    fireEvent.click(screen.getByRole('button', { name: 'Reportado (2)' }));
    detail = screen.getByRole('status');
    expect(detail.textContent).toContain('Reportado (2 récords)');
    expect(detail.textContent).toContain('Martín');
    expect(detail.textContent).toContain('2 récords');
    expect(detail.textContent).not.toContain('Jesica');
  });

  it('Martín aparece en Estimado con sus 5 récords', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(summary as never);

    render(<RecordsReliabilityPanel categoryId="cat-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Estimado (5)' })).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'Estimado (5)' }));

    const detail = screen.getByRole('status');
    expect(detail.textContent).toContain('Estimado (5 récords)');
    expect(detail.textContent).toContain('Martín');
    expect(detail.textContent).toContain('5 récords');
  });

  it('al hacer clic en el segmento Testeado del gráfico muestra a Martín', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(summary as never);

    const { container } = render(<RecordsReliabilityPanel categoryId="cat-1" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Testeado (1)' })).toBeDefined());

    const testedSegment = container.querySelector('path[fill="var(--stat-green)"]');
    expect(testedSegment).not.toBeNull();

    fireEvent.click(testedSegment as Element);

    const detail = screen.getByRole('status');
    expect(detail.textContent).toContain('Testeado (1 récord)');
    expect(detail.textContent).toContain('Martín');
  });

  it('cada atleta del detalle tiene un botón Ver detalle que abre sus marcas', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(summary as never);

    render(<RecordsReliabilityPanel categoryId="cat-1" />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sin datos (1 atleta)' })).toBeDefined(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sin datos (1 atleta)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle' }));

    const dialog = screen.getByRole('dialog', { name: 'detalle-atleta' });
    expect(dialog.textContent).toContain('a2');
    expect(dialog.textContent).toContain('Jesica');
  });

  it('con una categoría sin récords muestra Sin datos y no grafica segmentos', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce(
      onlyNoDataSummary as never,
    );

    const { container } = render(<RecordsReliabilityPanel categoryId="cat-1" />);

    await waitFor(() =>
      expect(screen.getByText(/2 atletas en la categoría · 0 récords cargados/i)).toBeDefined(),
    );

    expect(screen.getByText('No hay récords cargados en la categoría.')).toBeDefined();
    expect(screen.getByText(/Sin datos: 2 atletas sin récords/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sin datos (2 atletas)' })).toBeDefined();
    expect(container.querySelector('path[fill="var(--stat-green)"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Sin datos (2 atletas)' }));
    const detail = screen.getByRole('status');
    expect(detail.textContent).toContain('Sin datos (2 atletas)');
    expect(detail.textContent).toContain('Jesica');
    expect(detail.textContent).toContain('Santiago');
  });

  it('muestra el error y permite reintentar', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockRejectedValueOnce(
      new Error('No se pudo cargar el resumen.'),
    );

    render(<RecordsReliabilityPanel categoryId="cat-1" />);

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar el resumen.'),
    );
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined();
  });

  it('con una categoría vacía no renderiza el gráfico', async () => {
    vi.mocked(recordsReliabilityService.getByCategory).mockResolvedValueOnce({
      categoryId: 'cat-1',
      totalAthletes: 0,
      totalRecords: 0,
      groups: [],
    } as never);

    render(<RecordsReliabilityPanel categoryId="cat-1" />);

    await waitFor(() =>
      expect(screen.getByText(/0 atletas en la categoría · 0 récords cargados/i)).toBeDefined(),
    );

    expect(screen.queryByRole('group', { name: 'Grupos de confiabilidad' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sin datos (0 atletas)' })).toBeNull();
    expect(screen.queryByText('No hay atletas en este grupo.')).toBeNull();
  });
});

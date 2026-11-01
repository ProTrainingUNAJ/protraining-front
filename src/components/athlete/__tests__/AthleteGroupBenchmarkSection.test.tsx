import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AthleteGroupBenchmarkSection } from '../AthleteGroupBenchmarkSection';
import { athleteBenchmarkService } from '../../../services/athleteBenchmarkService';
import { structureService } from '../../../api/structureService';
import { GroupBenchmarkResponse } from '../../../types/benchmark';
import { AthleteMe, Category } from '../../../types/structure';

describe('AthleteGroupBenchmarkSection (KAN-449 / KAN-450)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockCategories: Category[] = [
    { id: 'cat-sub20', organizationId: 'org-1', name: 'Sub 20', athletesCount: 15 },
    { id: 'cat-primera', organizationId: 'org-1', name: 'Primera División', athletesCount: 20 },
  ];

  const createMockAthleteMe = (categories: Category[]): AthleteMe => ({
    athleteId: 'ath-1',
    firstName: 'Lucas',
    lastName: 'Romero',
    fullName: 'Lucas Romero',
    active: true,
    categories,
  });

  it('CRITERIO OBLIGATORIO: DADO un atleta autenticado, CUANDO abre su perfil, ENTONCES visualiza sus propios números y el promedio de su grupo, y el salto por debajo del promedio queda marcado como punto a mejorar', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue(createMockAthleteMe(mockCategories));

    const mockBenchmarkResponse: GroupBenchmarkResponse = {
      athleteId: 'ath-1',
      categoryId: 'cat-sub20',
      categoryName: 'Sub 20',
      metrics: [
        {
          dimension: 'Salto Vertical CMJ',
          unit: 'cm',
          athleteValue: 30.0,
          groupAverage: 35.0,
          difference: -5.0,
          percentageDifference: -14.29,
          direction: 'HigherIsBetter',
          status: 'BelowAverage',
          isWeakestPoint: true,
          trend: '14.3% por debajo del promedio',
        },
        {
          dimension: 'Sprint 30m',
          unit: 's',
          athleteValue: 4.1,
          groupAverage: 4.3,
          difference: -0.2,
          percentageDifference: 4.65,
          direction: 'LowerIsBetter',
          status: 'AboveAverage',
          isWeakestPoint: false,
          trend: '4.7% por encima del promedio',
        },
      ],
    };

    const getBenchmarkSpy = vi
      .spyOn(athleteBenchmarkService, 'getMyGroupBenchmark')
      .mockResolvedValue(mockBenchmarkResponse);

    render(<AthleteGroupBenchmarkSection athleteId="ath-1" />);

    // Esperar a que cargue el título y los datos
    expect(await screen.findByText('Mis Números vs. Promedio del Grupo')).toBeDefined();

    // Verificamos que se llame con el atleta y la categoría
    await waitFor(() => {
      expect(getBenchmarkSpy).toHaveBeenCalledWith('ath-1', 'cat-sub20');
    });

    // Verificamos el banner de punto a mejorar
    const alertBanner = await screen.findByTestId('weakest-point-alert');
    expect(alertBanner).toBeDefined();
    expect(alertBanner.textContent).toContain('Salto Vertical CMJ');
    expect(alertBanner.textContent).toContain('Principal punto a mejorar');

    // Verificamos la tarjeta de Salto Vertical CMJ
    const jumpCard = await screen.findByTestId('benchmark-card-Salto Vertical CMJ');
    expect(jumpCard).toBeDefined();
    expect(screen.getByTestId('athlete-val-Salto Vertical CMJ').textContent).toContain('30 cm');
    expect(screen.getByTestId('group-avg-Salto Vertical CMJ').textContent).toContain('35 cm');

    // Verificamos badge accesible de Punto a mejorar
    const jumpBadge = screen.getByTestId('badge-status-Salto Vertical CMJ');
    expect(jumpBadge.textContent).toContain('Punto a mejorar');

    // Verificamos la métrica de Sprint 30m (AboveAverage -> Superior al promedio)
    const sprintCard = screen.getByTestId('benchmark-card-Sprint 30m');
    expect(sprintCard).toBeDefined();
    expect(screen.getByTestId('athlete-val-Sprint 30m').textContent).toContain('4.1 s');
    expect(screen.getByTestId('group-avg-Sprint 30m').textContent).toContain('4.3 s');
    const sprintBadge = screen.getByTestId('badge-status-Sprint 30m');
    expect(sprintBadge.textContent).toContain('Superior al promedio');
  });

  it('PRIVACIDAD (KAN-450): Solo muestra promedios anónimos de la categoría y nunca expone IDs ni datos de otros compañeros', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue(
      createMockAthleteMe([mockCategories[0]]),
    );

    const mockBenchmarkResponse: GroupBenchmarkResponse = {
      athleteId: 'ath-1',
      categoryId: 'cat-sub20',
      categoryName: 'Sub 20',
      metrics: [
        {
          dimension: 'Resistencia Yo-Yo',
          unit: 'm',
          athleteValue: 1800,
          groupAverage: 1750,
          difference: 50,
          percentageDifference: 2.86,
          direction: 'HigherIsBetter',
          status: 'AboveAverage',
          isWeakestPoint: false,
          trend: '2.9% por encima del promedio',
        },
      ],
    };

    vi.spyOn(athleteBenchmarkService, 'getMyGroupBenchmark').mockResolvedValue(mockBenchmarkResponse);

    const { container } = render(<AthleteGroupBenchmarkSection athleteId="ath-1" />);

    expect(await screen.findByText('Mis Números vs. Promedio del Grupo')).toBeDefined();

    // Esperar a que la carga finalice y los datos del benchmark estén estables
    await waitFor(() => {
      expect(screen.queryByText(/Consultando promedios/i)).toBeNull();
      expect(container.textContent).toContain('Promedio categoría');
      expect(container.textContent).toContain('1750 m');
    });

    // Ningún ID o dato de terceros debe estar presente
    expect(container.textContent).not.toContain('ath-2');
    expect(container.textContent).not.toContain('Compañero');
    expect(container.textContent).not.toContain('peer');
  });

  it('permite cambiar entre categorías asignadas al atleta (N:N)', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue(createMockAthleteMe(mockCategories));

    const getBenchmarkSpy = vi
      .spyOn(athleteBenchmarkService, 'getMyGroupBenchmark')
      .mockResolvedValue({
        athleteId: 'ath-1',
        categoryId: 'cat-sub20',
        categoryName: 'Sub 20',
        metrics: [],
      });

    render(<AthleteGroupBenchmarkSection athleteId="ath-1" />);

    expect(await screen.findByText('Mis Números vs. Promedio del Grupo')).toBeDefined();

    const select = (await screen.findByTestId('benchmark-category-select')) as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.value).toBe('cat-sub20');

    // Cambiamos a Primera División
    fireEvent.change(select, { target: { value: 'cat-primera' } });

    await waitFor(() => {
      expect(getBenchmarkSpy).toHaveBeenCalledWith('ath-1', 'cat-primera');
    });
  });

  it('muestra estado vacío cuando no hay métricas de tests registradas', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue(
      createMockAthleteMe([mockCategories[0]]),
    );

    vi.spyOn(athleteBenchmarkService, 'getMyGroupBenchmark').mockResolvedValue({
      athleteId: 'ath-1',
      categoryId: 'cat-sub20',
      categoryName: 'Sub 20',
      metrics: [],
    });

    render(<AthleteGroupBenchmarkSection athleteId="ath-1" />);

    expect(
      await screen.findByText('Sin evaluaciones comparativas disponibles'),
    ).toBeDefined();
    expect(
      screen.getByText(/Aún no se registraron evaluaciones físicas/i),
    ).toBeDefined();
  });

  it('muestra mensaje de error amigable cuando falla la carga', async () => {
    vi.spyOn(structureService, 'getMe').mockResolvedValue(
      createMockAthleteMe([mockCategories[0]]),
    );

    vi.spyOn(athleteBenchmarkService, 'getMyGroupBenchmark').mockRejectedValue(
      new Error('Error de conexión con el servicio'),
    );

    render(<AthleteGroupBenchmarkSection athleteId="ath-1" />);

    expect(await screen.findByText(/Error de conexión con el servicio/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Recargar métricas de comparación/i })).toBeDefined();
  });
});

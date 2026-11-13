import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrainingPage } from '../TrainingPage';
import * as entrenamientoApi from '../../../api/generated/entrenamiento';

vi.mock('../../../api/generated/entrenamiento', async () => {
  const actual = await vi.importActual<typeof entrenamientoApi>(
    '../../../api/generated/entrenamiento',
  );
  return {
    ...actual,
    listExercises: vi.fn(),
  };
});

describe('TrainingPage · Filtro por Músculo Puntual', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(entrenamientoApi.listExercises).mockResolvedValue({
      data: {
        items: [
          {
            id: 'ex-1',
            name: 'Peso muerto rumano',
            category: 'Fuerza',
            muscleGroup: 'Piernas',
            equipment: 'barra con pesas',
            primaryMuscles: ['isquiotibiales'],
            variants: [],
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    } as unknown as Awaited<ReturnType<typeof entrenamientoApi.listExercises>>);
  });

  it('al tocar Piernas muestra la segunda fila con sus submúsculos y permite filtrar por Isquiotibiales', async () => {
    render(
      <MemoryRouter>
        <TrainingPage />
      </MemoryRouter>,
    );

    // Initial load without category/muscle
    await waitFor(() => {
      expect(entrenamientoApi.listExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            muscleGroup: undefined,
            muscle: undefined,
          }),
        }),
      );
    });

    // Sub-muscles are not visible initially
    expect(screen.queryByRole('button', { name: 'Isquiotibiales' })).toBeNull();

    // Click 'Piernas'
    fireEvent.click(screen.getByRole('button', { name: 'Piernas' }));

    // Second row appears with Cuádriceps, Isquiotibiales, Glúteos, Gemelos, Aductores
    expect(await screen.findByRole('button', { name: 'Cuádriceps' })).toBeTruthy();
    const isquiosBtn = screen.getByRole('button', { name: 'Isquiotibiales' });
    expect(isquiosBtn).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Glúteos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Gemelos' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Aductores' })).toBeTruthy();

    // Click 'Isquiotibiales'
    fireEvent.click(isquiosBtn);

    await waitFor(() => {
      expect(entrenamientoApi.listExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            muscleGroup: 'Piernas',
            muscle: 'isquiotibiales',
          }),
        }),
      );
    });

    expect(await screen.findByText('Peso muerto rumano')).toBeTruthy();
  });

  it('muestra "No hay ejercicios para ese músculo" cuando no hay coincidencias', async () => {
    vi.mocked(entrenamientoApi.listExercises).mockResolvedValue({
      data: {
        items: [],
        page: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
      },
    } as unknown as Awaited<ReturnType<typeof entrenamientoApi.listExercises>>);

    render(
      <MemoryRouter>
        <TrainingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Piernas' }));
    const isquiosBtn = await screen.findByRole('button', { name: 'Isquiotibiales' });
    fireEvent.click(isquiosBtn);

    expect(await screen.findByText('No hay ejercicios para ese músculo')).toBeTruthy();
    expect(
      screen.getByText('Prueba seleccionando otro músculo o limpiando el filtro.'),
    ).toBeTruthy();
  });

  it('DADO la biblioteca CUANDO se filtra por «distancia» ENTONCES aparecen pasadas y sprints (KAN-453)', async () => {
    vi.mocked(entrenamientoApi.listExercises).mockImplementation((async (
      options: Parameters<typeof entrenamientoApi.listExercises>[0],
    ) => {
      if (options?.query?.exerciseType === 'Distance') {
        return {
          data: {
            items: [
              {
                id: 'ex-pasadas',
                name: 'Pasadas',
                category: 'Carrera',
                muscleGroup: 'Piernas',
                exerciseType: 'Distance',
                equipment: 'solo el cuerpo',
                primaryMuscles: ['cuádriceps', 'gemelos'],
                variants: [],
              },
              {
                id: 'ex-sprints',
                name: 'Sprints',
                category: 'Velocidad',
                muscleGroup: 'Piernas',
                exerciseType: 'Distance',
                equipment: 'solo el cuerpo',
                primaryMuscles: ['cuádriceps', 'glúteos'],
                variants: [],
              },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 2,
            totalPages: 1,
          },
        } as unknown as Awaited<ReturnType<typeof entrenamientoApi.listExercises>>;
      }
      return {
        data: {
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 0,
          totalPages: 0,
        },
      } as unknown as Awaited<ReturnType<typeof entrenamientoApi.listExercises>>;
    }) as never);

    render(
      <MemoryRouter>
        <TrainingPage />
      </MemoryRouter>,
    );

    const distanciaBtn = await screen.findByRole('button', { name: 'Distancia' });
    expect(distanciaBtn).toBeTruthy();
    fireEvent.click(distanciaBtn);

    await waitFor(() => {
      expect(entrenamientoApi.listExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            exerciseType: 'Distance',
          }),
        }),
      );
    });

    expect(await screen.findByText('Pasadas')).toBeTruthy();
    expect(await screen.findByText('Sprints')).toBeTruthy();
    const badges = screen.getAllByText('Distancia');
    expect(badges.length).toBeGreaterThan(0);
  });
});

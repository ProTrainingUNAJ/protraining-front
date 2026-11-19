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

  it('al seleccionar Pecho o Core no muestra subchips redundantes ni el contenedor de submúsculos (KAN-633)', async () => {
    render(
      <MemoryRouter>
        <TrainingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pecho' }));

    await waitFor(() => {
      expect(entrenamientoApi.listExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            muscleGroup: 'Pecho',
            muscle: undefined,
          }),
        }),
      );
    });

    expect(screen.queryByLabelText('Filtro por músculo puntual')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Pecho' })).toHaveLength(1);

    // Mismo comportamiento para Core
    fireEvent.click(screen.getByRole('button', { name: 'Core' }));

    await waitFor(() => {
      expect(entrenamientoApi.listExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            muscleGroup: 'Core',
            muscle: undefined,
          }),
        }),
      );
    });

    expect(screen.queryByLabelText('Filtro por músculo puntual')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Abdominales' })).toBeNull();
  });

  it('al seleccionar Hombros muestra Cuello y no duplica Hombros como subchip (KAN-633)', async () => {
    render(
      <MemoryRouter>
        <TrainingPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hombros' }));

    expect(await screen.findByRole('button', { name: 'Cuello' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Hombros' })).toHaveLength(1);
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

  describe('Modal de Detalle Ampliado (KAN-625)', () => {
    it('abre el modal con técnica y anatomía al hacer clic en la foto del ejercicio y lo cierra con Entendido', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      const mediaBtn = await screen.findByRole('button', {
        name: /ver técnica y anatomía de peso muerto rumano/i,
      });
      fireEvent.click(mediaBtn);

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(screen.getByText('Pautas para una buena técnica')).toBeTruthy();
      expect(screen.getByText(/Postura y alineación:/i)).toBeTruthy();

      const entendidoBtn = screen.getByRole('button', { name: /entendido/i });
      fireEvent.click(entendidoBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it('abre el modal con técnica y anatomía al hacer clic en el nombre del ejercicio', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      const titleBtn = await screen.findByTitle('Ver técnica y anatomía de Peso muerto rumano');
      fireEvent.click(titleBtn);

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(screen.getByText('Músculos Involucrados')).toBeTruthy();

      const closeBtn = screen.getByRole('button', { name: /cerrar detalle del ejercicio/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    it('abre el modal con técnica y anatomía al hacer clic en el botón Anatomía', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      const anatomiaBtn = await screen.findByRole('button', { name: 'Anatomía' });
      fireEvent.click(anatomiaBtn);

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(screen.getByText('Pautas para una buena técnica')).toBeTruthy();
    });
  });
});

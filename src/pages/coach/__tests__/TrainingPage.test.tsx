import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TrainingPage } from '../TrainingPage';
import * as entrenamientoApi from '../../../api/generated/entrenamiento';
import { exercisesService } from '../../../api/exercises';

vi.mock('../../../api/generated/entrenamiento', async () => {
  const actual = await vi.importActual<typeof entrenamientoApi>(
    '../../../api/generated/entrenamiento',
  );
  return {
    ...actual,
    listExercises: vi.fn(),
  };
});

vi.mock('../../../api/exercises', () => ({
  exercisesService: {
    updateVideoUrl: vi.fn(),
  },
}));

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

    it('permite agregar un video de YouTube desde el modal en la biblioteca (KAN-659)', async () => {
      vi.mocked(exercisesService.updateVideoUrl).mockResolvedValue(undefined);

      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      fireEvent.click(await screen.findByRole('button', { name: 'Anatomía' }));
      fireEvent.click(await screen.findByRole('button', { name: /agregar video de youtube/i }));

      const input = screen.getByLabelText(/link de video de youtube/i);
      fireEvent.change(input, {
        target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^guardar$/i }));

      await waitFor(() => {
        expect(exercisesService.updateVideoUrl).toHaveBeenCalledWith(
          'ex-1',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        );
      });
      expect(await screen.findByRole('button', { name: /cambiar video/i })).toBeTruthy();
    });
  });

  describe('Rediseño UX/UI de Filtros y Responsive (KAN-640)', () => {
    it('al seleccionar Espalda muestra únicamente los submúsculos de Espalda y limpia la selección previa', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      // Primero seleccionamos Piernas y un submúsculo
      fireEvent.click(screen.getByRole('button', { name: 'Piernas' }));
      const isquiosBtn = await screen.findByRole('button', { name: 'Isquiotibiales' });
      fireEvent.click(isquiosBtn);

      // Ahora seleccionamos Espalda
      fireEvent.click(screen.getByRole('button', { name: 'Espalda' }));

      // Los submúsculos de Piernas ya no deben existir
      expect(screen.queryByRole('button', { name: 'Isquiotibiales' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Cuádriceps' })).toBeNull();

      // Deben verse los submúsculos específicos de Espalda
      expect(screen.getByRole('button', { name: 'Dorsales' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Espalda media' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Espalda baja' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Trapecios' })).toBeTruthy();

      // Al volver a Todos, la tercera fila se oculta
      fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
      expect(screen.queryByRole('button', { name: 'Dorsales' })).toBeNull();
    });

    it('permite filtrar por modalidad con dropdown y restablecer a Todos los tipos', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      // Abrir selector de modalidad
      const triggerBtn = screen.getByTestId('training-type-trigger');
      expect(triggerBtn.textContent).toContain('Modalidad');
      fireEvent.click(triggerBtn);

      // Seleccionar Distancia
      const distanciaBtn = await screen.findByRole('button', { name: 'Distancia' });
      fireEvent.click(distanciaBtn);

      // El disparador ahora muestra Distancia
      const triggerActivo = screen.getByTestId('training-type-trigger');
      expect(triggerActivo.textContent).toContain('Distancia');

      // Volver a abrir y seleccionar Todos los tipos
      fireEvent.click(triggerActivo);
      const todosTiposBtn = await screen.findByRole('button', { name: 'Todos los tipos' });
      fireEvent.click(todosTiposBtn);

      // Vuelve a mostrar Modalidad
      expect(screen.getByTestId('training-type-trigger').textContent).toContain('Modalidad');
    });

    it('permite limpiar el buscador con el botón X', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      const input = screen.getByLabelText(
        'Buscar por ejercicio o grupo muscular',
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Press banca' } });
      expect(input.value).toBe('Press banca');

      const clearBtn = screen.getByRole('button', { name: 'Borrar búsqueda' });
      fireEvent.click(clearBtn);

      expect(input.value).toBe('');
    });
  });

  describe('Paginación con flechas', () => {
    it('navega entre páginas con Anterior y Siguiente manteniendo 24 ejercicios por página', async () => {
      const makeItems = (pageNum: number, count: number) =>
        Array.from({ length: count }, (_, idx) => ({
          id: `ex-p${pageNum}-${idx + 1}`,
          name: `Ejercicio P${pageNum}-${idx + 1}`,
          category: 'Fuerza',
          muscleGroup: 'Core',
          equipment: 'solo el cuerpo',
          primaryMuscles: ['abdominales'],
          variants: [],
        }));

      vi.mocked(entrenamientoApi.listExercises).mockImplementation((async (
        options: Parameters<typeof entrenamientoApi.listExercises>[0],
      ) => {
        const currentPage = options?.query?.page ?? 1;
        const count = currentPage === 3 ? 5 : 24;
        return {
          data: {
            items: makeItems(currentPage, count),
            page: currentPage,
            pageSize: 24,
            totalCount: 53,
            totalPages: 3,
          },
        } as unknown as Awaited<ReturnType<typeof entrenamientoApi.listExercises>>;
      }) as never);

      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Ejercicio P1-1')).toBeTruthy();
      expect(entrenamientoApi.listExercises).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            page: 1,
            pageSize: 24,
          }),
        }),
      );
      expect(screen.getByText('Página 1 de 3')).toBeTruthy();
      expect(screen.getByText(/Mostrando 1–24\s+de 53 ejercicios/)).toBeTruthy();

      const prevBtn = screen.getByRole('button', { name: 'Página anterior' }) as HTMLButtonElement;
      const nextBtn = screen.getByRole('button', { name: 'Página siguiente' }) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(false);

      // Pasar a página 2
      fireEvent.click(nextBtn);

      expect(await screen.findByText('Ejercicio P2-1')).toBeTruthy();
      expect(screen.queryByText('Ejercicio P1-1')).toBeNull();
      expect(screen.getByText('Página 2 de 3')).toBeTruthy();
      expect(screen.getByText(/Mostrando 25–48\s+de 53 ejercicios/)).toBeTruthy();
      expect(prevBtn.disabled).toBe(false);
      expect(nextBtn.disabled).toBe(false);

      // Pasar a la última página (3)
      fireEvent.click(nextBtn);

      expect(await screen.findByText('Ejercicio P3-5')).toBeTruthy();
      expect(screen.getByText('Página 3 de 3')).toBeTruthy();
      expect(screen.getByText(/Mostrando 49–53\s+de 53 ejercicios/)).toBeTruthy();
      expect(nextBtn.disabled).toBe(true);

      // Volver a página 2
      fireEvent.click(prevBtn);

      expect(await screen.findByText('Ejercicio P2-1')).toBeTruthy();
      expect(screen.getByText('Página 2 de 3')).toBeTruthy();
    });

    it('vuelve a la página 1 al cambiar un filtro estando en otra página', async () => {
      vi.mocked(entrenamientoApi.listExercises).mockImplementation((async (
        options: Parameters<typeof entrenamientoApi.listExercises>[0],
      ) => {
        const currentPage = options?.query?.page ?? 1;
        const isPiernas = options?.query?.muscleGroup === 'Piernas';
        return {
          data: {
            items: [
              {
                id: isPiernas ? 'ex-piernas-1' : `ex-p${currentPage}`,
                name: isPiernas ? 'Sentadilla' : `Ejercicio página ${currentPage}`,
                category: 'Fuerza',
                muscleGroup: isPiernas ? 'Piernas' : 'Core',
                equipment: 'solo el cuerpo',
                primaryMuscles: ['cuádriceps'],
                variants: [],
              },
            ],
            page: currentPage,
            pageSize: 24,
            totalCount: isPiernas ? 1 : 48,
            totalPages: isPiernas ? 1 : 2,
          },
        } as unknown as Awaited<ReturnType<typeof entrenamientoApi.listExercises>>;
      }) as never);

      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Ejercicio página 1')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
      expect(await screen.findByText('Ejercicio página 2')).toBeTruthy();

      // Al filtrar por Piernas debe pedir page: 1
      fireEvent.click(screen.getByRole('button', { name: 'Piernas' }));

      await waitFor(() => {
        expect(entrenamientoApi.listExercises).toHaveBeenLastCalledWith(
          expect.objectContaining({
            query: expect.objectContaining({
              page: 1,
              muscleGroup: 'Piernas',
            }),
          }),
        );
      });

      expect(await screen.findByText('Sentadilla')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Página siguiente' })).toBeNull();
    });

    it('no muestra controles de paginación cuando hay una sola página', async () => {
      render(
        <MemoryRouter>
          <TrainingPage />
        </MemoryRouter>,
      );

      expect(await screen.findByText('Peso muerto rumano')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Página anterior' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Página siguiente' })).toBeNull();
    });
  });
});

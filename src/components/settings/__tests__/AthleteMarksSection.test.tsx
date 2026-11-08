import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AthleteMarksSection } from '../AthleteMarksSection';
import { athleteRecordsService } from '../../../api/athleteRecords';
import { structureService } from '../../../api/structureService';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getMe: vi.fn(),
  },
}));

vi.mock('../../../api/athleteRecords', () => ({
  athleteRecordsService: {
    listCurrent: vi.fn(),
    declareOnboarding: vi.fn(),
  },
}));

// El modal real depende de la API del catálogo: en el test exponemos dos ejercicios.
vi.mock('../../planning/ExercisePickerModal', () => ({
  ExercisePickerModal: ({
    onSelect,
    onClose,
  }: {
    onSelect: (exercise: Record<string, unknown>) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Selector de ejercicios">
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 'ex-1',
            name: 'Sentadilla',
            muscleGroup: 'Piernas',
            equipment: 'Barra',
            images: [],
          })
        }
      >
        Elegir sentadilla
      </button>
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 'ex-2',
            name: 'Peso muerto',
            muscleGroup: 'Piernas',
            equipment: 'Barra',
            images: [],
          })
        }
      >
        Elegir peso muerto
      </button>
      <button type="button" onClick={onClose}>
        Cerrar selector
      </button>
    </div>
  ),
}));

const createdRecord = (id: string, exerciseId: string, exerciseName: string, weight: number) => ({
  id,
  exerciseId,
  exerciseName,
  weightKg: weight,
  origin: 'EstimatedEpley' as const,
  achievedAt: '2026-11-07T10:00:00Z',
});

async function addMark(exerciseButton: string, weight: string) {
  const chooseBtn = await screen.findByRole('button', { name: 'Elegir ejercicio' });
  await waitFor(() => expect((chooseBtn as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(chooseBtn);
  const exBtn = await screen.findByRole('button', { name: exerciseButton });
  fireEvent.click(exBtn);
  fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: weight } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
}

describe('AthleteMarksSection - Mis marcas (KAN-417)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    vi.mocked(structureService.getMe).mockResolvedValue({
      athleteId: 'ath-1',
      firstName: 'Lucía',
      lastName: 'Martínez',
      fullName: 'Lucía Martínez',
      active: true,
      categories: [],
    });
    vi.mocked(athleteRecordsService.listCurrent).mockResolvedValue([]);
  });

  it('lista las marcas existentes como solo lectura', async () => {
    vi.mocked(athleteRecordsService.listCurrent).mockResolvedValueOnce([
      createdRecord('rec-1', 'ex-1', 'Sentadilla', 120),
    ]);

    render(<AthleteMarksSection />);

    await waitFor(() => expect(screen.getByText('Sentadilla')).toBeDefined());
    expect(screen.getByText('120 kg')).toBeDefined();
    expect(screen.getByText('Estimada (onboarding)')).toBeDefined();
    expect(
      screen.getByText(
        'Ya la tenés cargada; tu PF la administra. Estas marcas son solo de lectura.',
      ),
    ).toBeDefined();
  });

  it('rechaza pesos fuera del rango 1–500 y valores no numéricos', async () => {
    render(<AthleteMarksSection />);
    await waitFor(() =>
      expect(screen.getByText('Todavía no tenés marcas cargadas.')).toBeDefined(),
    );

    await addMark('Elegir sentadilla', '0');
    expect(screen.getByRole('alert').textContent).toContain('entre 1 y 500 kg');

    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '501' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('alert').textContent).toContain('entre 1 y 500 kg');

    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('alert').textContent).toContain('entre 1 y 500 kg');

    // Un input numérico descarta el texto y queda vacío en jsdom.
    fireEvent.change(screen.getByLabelText('Peso (kg)'), { target: { value: 'texto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(screen.getByRole('alert').textContent).toContain('Ingresá un peso en kg válido.');
  });

  it('rechaza un ejercicio duplicado en el borrador', async () => {
    render(<AthleteMarksSection />);
    await waitFor(() =>
      expect(screen.getByText('Todavía no tenés marcas cargadas.')).toBeDefined(),
    );

    await addMark('Elegir sentadilla', '100');
    expect(screen.queryByRole('alert')).toBeNull();

    await addMark('Elegir sentadilla', '110');
    expect(screen.getByRole('alert').textContent).toContain(
      'Ya agregaste una marca para ese ejercicio.',
    );
  });

  it('rechaza guardar sin marcas cargadas', async () => {
    render(<AthleteMarksSection />);
    await waitFor(() =>
      expect(screen.getByText('Todavía no tenés marcas cargadas.')).toBeDefined(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Guardar marcas' }));

    expect(screen.getByRole('alert').textContent).toContain(
      'Cargá al menos una marca antes de guardar.',
    );
    expect(athleteRecordsService.declareOnboarding).not.toHaveBeenCalled();
  });

  it('envía las marcas y muestra el resultado parcial', async () => {
    vi.mocked(athleteRecordsService.declareOnboarding).mockResolvedValueOnce([
      createdRecord('rec-1', 'ex-1', 'Sentadilla', 100),
    ]);

    render(<AthleteMarksSection />);
    await waitFor(() =>
      expect(screen.getByText('Todavía no tenés marcas cargadas.')).toBeDefined(),
    );

    await addMark('Elegir sentadilla', '100');
    await addMark('Elegir peso muerto', '140');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar marcas' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Se cargaron 1.'));
    expect(screen.getByRole('status').textContent).toContain('Ya tenías 1.');
    expect(athleteRecordsService.declareOnboarding).toHaveBeenCalledWith([
      { exerciseId: 'ex-1', weightOneRepMaxKg: 100 },
      { exerciseId: 'ex-2', weightOneRepMaxKg: 140 },
    ]);
  });

  it('avisa cuando el back no creó ninguna marca', async () => {
    vi.mocked(athleteRecordsService.declareOnboarding).mockResolvedValueOnce([]);

    render(<AthleteMarksSection />);
    await waitFor(() =>
      expect(screen.getByText('Todavía no tenés marcas cargadas.')).toBeDefined(),
    );

    await addMark('Elegir sentadilla', '100');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar marcas' }));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain(
        'No se modificó ninguna: ya tenías marca en todos esos ejercicios.',
      ),
    );
  });

  it('muestra el mensaje del back cuando el guardado falla', async () => {
    vi.mocked(athleteRecordsService.declareOnboarding).mockRejectedValueOnce(
      new Error('El peso debe estar entre 1 y 500 kg.'),
    );

    render(<AthleteMarksSection />);
    await waitFor(() =>
      expect(screen.getByText('Todavía no tenés marcas cargadas.')).toBeDefined(),
    );

    await addMark('Elegir sentadilla', '100');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar marcas' }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'El peso debe estar entre 1 y 500 kg.',
      ),
    );
  });
});

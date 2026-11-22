import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { HabitsRecommendationBar } from '../HabitsRecommendationBar';

const { generateHabitsMock } = vi.hoisted(() => ({ generateHabitsMock: vi.fn() }));

vi.mock('../../../api/recommendations', () => ({
  recommendationsService: { generateHabitsForAthlete: generateHabitsMock },
}));

const athletes = [
  { id: 'ath-martin', name: 'Martín Pérez' },
  { id: 'ath-santino', name: 'Santino Vega' },
];

describe('HabitsRecommendationBar (KAN-634)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no deja generar hasta que se elige un atleta', () => {
    render(<HabitsRecommendationBar athletes={athletes} onGenerated={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Generar' }).hasAttribute('disabled')).toBe(true);
  });

  it('genera la recomendación del atleta elegido y avisa con su nombre', async () => {
    generateHabitsMock.mockResolvedValue(undefined);
    const onGenerated = vi.fn();
    render(
      <HabitsRecommendationBar athletes={athletes} onGenerated={onGenerated} onError={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Atleta para la recomendación de hábitos'), {
      target: { value: 'ath-martin' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith('Martín Pérez'));
    expect(generateHabitsMock).toHaveBeenCalledWith('ath-martin');
  });

  it('si el back lo rechaza (interruptor apagado o tutor), muestra el motivo', async () => {
    generateHabitsMock.mockRejectedValue(
      new Error('El tutor no habilitó las recomendaciones de alimentación para este atleta.'),
    );
    const onError = vi.fn();
    const onGenerated = vi.fn();
    render(
      <HabitsRecommendationBar athletes={athletes} onGenerated={onGenerated} onError={onError} />,
    );

    fireEvent.change(screen.getByLabelText('Atleta para la recomendación de hábitos'), {
      target: { value: 'ath-santino' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'El tutor no habilitó las recomendaciones de alimentación para este atleta.',
      ),
    );
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('permite buscar y seleccionar un atleta a través del dropdown interactivo con foto (KAN-654)', async () => {
    generateHabitsMock.mockResolvedValue(undefined);
    const onGenerated = vi.fn();
    render(
      <HabitsRecommendationBar
        athletes={[
          { id: 'ath-martin', name: 'Martín Pérez', categoryNames: ['Primera División'] },
          { id: 'ath-santino', name: 'Santino Vega', categoryNames: ['Reserva'] },
        ]}
        onGenerated={onGenerated}
        onError={vi.fn()}
      />,
    );

    // Abrimos el menú interactivo
    const triggerBtn = screen.getByLabelText('Desplegar lista de atletas para hábitos');
    fireEvent.click(triggerBtn);

    // Buscador interactivo
    const searchInput = screen.getByPlaceholderText(/Buscar atleta por nombre o categoría/i);
    fireEvent.change(searchInput, { target: { value: 'Santino' } });

    // Clic en la opción filtrada dentro del dropdown listbox
    const listbox = screen.getByRole('listbox');
    const option = within(listbox).getByRole('option', { name: /Santino Vega/i });
    fireEvent.click(option);

    // Verificamos que se seleccionó en el botón trigger
    expect(triggerBtn.textContent).toContain('Santino Vega');

    // Disparamos generar
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledWith('Santino Vega'));
    expect(generateHabitsMock).toHaveBeenCalledWith('ath-santino');
  });
});

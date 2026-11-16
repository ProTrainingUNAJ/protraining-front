import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SessionCard } from '../SessionCard';
import { DraftSession } from '../../../types/trainingPlans';

// KAN-542: flechas para reordenar los ejercicios de una sesión.
const session: DraftSession = {
  key: 's1',
  id: 'id-s1',
  name: 'Fuerza',
  order: 1,
  dayOfWeek: 1,
  coachNotes: '',
  nextExerciseOrder: 3,
  exercises: [
    {
      key: 'squat',
      id: 'id-squat',
      exerciseId: 'ex-squat',
      exerciseName: 'Sentadilla',
      order: 1,
      sets: 3,
      reps: 8,
      targetPercentage: 70,
    },
    {
      key: 'bench',
      id: 'id-bench',
      exerciseId: 'ex-bench',
      exerciseName: 'Press de banca',
      order: 2,
      sets: 3,
      reps: 8,
      targetPercentage: 70,
    },
  ],
};

const renderCard = (onChange = vi.fn()) =>
  render(
    <SessionCard
      session={session}
      disabled={false}
      onChange={onChange}
      onRemove={vi.fn()}
      onAddExercise={vi.fn()}
    />,
  );

describe('SessionCard', () => {
  it('deshabilita subir el primero y bajar el último', () => {
    renderCard();

    expect((screen.getByLabelText('Subir Sentadilla') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Bajar Sentadilla') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('Subir Press de banca') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((screen.getByLabelText('Bajar Press de banca') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('al subir el press, la sesión queda con el press primero', () => {
    const onChange = vi.fn();
    renderCard(onChange);

    fireEvent.click(screen.getByLabelText('Subir Press de banca'));

    const update = onChange.mock.calls[0][0] as (s: DraftSession) => DraftSession;
    const next = update(session);
    expect(next.exercises.map((e) => e.exerciseName)).toEqual(['Press de banca', 'Sentadilla']);
    expect(next.exercises.map((e) => e.order)).toEqual([1, 2]);
  });

  it('sin otra sesión el mismo día, no muestra flechas de sesión', () => {
    renderCard();

    expect(screen.queryByLabelText('Subir la sesión Fuerza')).toBeNull();
  });

  it('llama a onSwapExercise al hacer clic en cambiar ejercicio (KAN-413)', () => {
    const onSwapExercise = vi.fn();
    render(
      <SessionCard
        session={session}
        disabled={false}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        onAddExercise={vi.fn()}
        onSwapExercise={onSwapExercise}
      />,
    );

    const swapButton = screen.getByLabelText('Cambiar Sentadilla');
    expect(swapButton).toBeTruthy();
    fireEvent.click(swapButton);

    expect(onSwapExercise).toHaveBeenCalledWith('squat');
  });

  it('permite elegir la hora de la sesión con input de 24 hs (KAN-559)', () => {
    const onChange = vi.fn();
    renderCard(onChange);

    const timeInput = screen.getByLabelText('Hora de la sesión') as HTMLInputElement;
    expect(timeInput).toBeTruthy();
    expect(timeInput.value).toBe('');

    fireEvent.change(timeInput, { target: { value: '18:00' } });

    const update = onChange.mock.calls[0][0] as (s: DraftSession) => DraftSession;
    const next = update(session);
    expect(next.startTime).toBe('18:00');
  });

  it('si se vacía el input de hora, startTime pasa a ser null (KAN-559)', () => {
    const sessionWithTime: DraftSession = { ...session, startTime: '18:00' };
    const onChange = vi.fn();
    render(
      <SessionCard
        session={sessionWithTime}
        disabled={false}
        onChange={onChange}
        onRemove={vi.fn()}
        onAddExercise={vi.fn()}
      />,
    );

    const timeInput = screen.getByLabelText('Hora de la sesión') as HTMLInputElement;
    expect(timeInput.value).toBe('18:00');

    fireEvent.change(timeInput, { target: { value: '' } });

    const update = onChange.mock.calls[0][0] as (s: DraftSession) => DraftSession;
    const next = update(sessionWithTime);
    expect(next.startTime).toBeNull();
  });
});

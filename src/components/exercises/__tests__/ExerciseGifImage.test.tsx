import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExerciseGifImage } from '../ExerciseGifImage';
import type { ExerciseMediaDto } from '../../../api/generated/entrenamiento';

const PHOTOS = [
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/0.jpg',
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Squat/1.jpg',
];

const MEDIA: ExerciseMediaDto[] = [
  {
    source: 'repdb',
    kind: 'frames',
    urls: ['https://repdb/squat-start.webp', 'https://repdb/squat-peak.webp'],
    credit: 'Exercise data by RepDB (repdb.co)',
    creditUrl: 'https://repdb.co',
    license: 'RepDB Free Tier',
  },
  {
    source: 'everkinetic',
    kind: 'frames',
    urls: ['https://ek/0001-relaxation.png', 'https://ek/0001-tension.png'],
    credit: 'Everkinetic',
    creditUrl: 'https://github.com/everkinetic/data',
    license: 'CC BY-SA 4.0',
  },
];

const currentSrc = () => screen.getByRole('img').getAttribute('src');

describe('ExerciseGifImage (KAN-549)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra primero la ilustración de RepDB con su crédito', () => {
    render(<ExerciseGifImage images={PHOTOS} media={MEDIA} name="Sentadilla con barra" />);

    expect(currentSrc()).toBe('https://repdb/squat-start.webp');
    expect(screen.getByText('Ilustración')).toBeTruthy();
    const credit = screen.getByRole('link', { name: 'Exercise data by RepDB (repdb.co)' });
    expect(credit.getAttribute('href')).toBe('https://repdb.co');
  });

  it('alterna las dos poses de la ilustración cada 0,8 s', () => {
    vi.useFakeTimers();
    render(<ExerciseGifImage images={PHOTOS} media={MEDIA} name="Sentadilla con barra" />);

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(currentSrc()).toBe('https://repdb/squat-peak.webp');

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(currentSrc()).toBe('https://repdb/squat-start.webp');
  });

  it('si la ilustración de RepDB no carga, pasa al dibujo de Everkinetic con su crédito', () => {
    render(<ExerciseGifImage images={PHOTOS} media={MEDIA} name="Sentadilla con barra" />);

    fireEvent.error(screen.getByRole('img'));

    expect(currentSrc()).toBe('https://ek/0001-relaxation.png');
    expect(screen.getByText('Ilustración')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Everkinetic' })).toBeTruthy();
  });

  it('un GIF (animación) se muestra sin alternar fotogramas', () => {
    const gif: ExerciseMediaDto[] = [
      { ...MEDIA[0], kind: 'gif', urls: ['https://repdb/squat.webp'] },
    ];
    render(<ExerciseGifImage images={PHOTOS} media={gif} name="Sentadilla con barra" />);

    expect(currentSrc()).toBe('https://repdb/squat.webp');
    expect(screen.getByText('Animación')).toBeTruthy();
  });

  it('si no carga ninguna ilustración, muestra las fotos de siempre, sin crédito de terceros', () => {
    render(<ExerciseGifImage images={PHOTOS} media={MEDIA} name="Sentadilla con barra" />);

    fireEvent.error(screen.getByRole('img'));
    fireEvent.error(screen.getByRole('img'));

    expect(currentSrc()).toBe(PHOTOS[0]);
    expect(screen.getByText('GIF • 2 fotos')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('sin ilustraciones se comporta como antes: alterna las dos fotos', () => {
    vi.useFakeTimers();
    render(<ExerciseGifImage images={PHOTOS} name="Sentadilla con barra" />);

    expect(currentSrc()).toBe(PHOTOS[0]);
    act(() => {
      vi.advanceTimersByTime(480);
    });
    expect(currentSrc()).toBe(PHOTOS[1]);
  });

  it('si falla todo, no muestra nada y no rompe', () => {
    const { container } = render(<ExerciseGifImage images={PHOTOS} name="Sentadilla con barra" />);

    fireEvent.error(screen.getByRole('img'));

    expect(container.firstChild).toBeNull();
  });

  it('al cambiar de ejercicio vuelve a la primera capa', () => {
    const { rerender } = render(
      <ExerciseGifImage images={PHOTOS} media={MEDIA} name="Sentadilla con barra" />,
    );
    fireEvent.error(screen.getByRole('img'));
    expect(currentSrc()).toBe('https://ek/0001-relaxation.png');

    const otherMedia: ExerciseMediaDto[] = [
      { ...MEDIA[0], urls: ['https://repdb/bench-start.webp', 'https://repdb/bench-peak.webp'] },
    ];
    rerender(<ExerciseGifImage images={[]} media={otherMedia} name="Press de banca" />);

    expect(currentSrc()).toBe('https://repdb/bench-start.webp');
  });
});

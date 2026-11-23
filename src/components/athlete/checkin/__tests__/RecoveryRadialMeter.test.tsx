import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryRadialMeter } from '../recovery/RecoveryRadialMeter';
import { CheckInRecoverySlide } from '../CheckInRecoverySlide';
import {
  MetricKey,
  METRIC_ORDER,
  DEFAULT_RECOVERY_VALUES,
  getMetricProgressPct,
  getValueFromHorizontalPct,
  getMetricDisplayInfo,
} from '../recovery/recovery.types';

describe('RecoveryRadialMeter - Rediseño con 4 barras horizontales y controles laterales', () => {
  const defaultProps = {
    activeMetric: 'sleepHours' as MetricKey,
    sleepHours: 8,
    sleepQuality: 4,
    fatigueLevel: 2,
    muscleSoreness: 1,
    onSelectMetric: vi.fn(),
    onValueChange: vi.fn(),
    onDecrement: vi.fn(),
    onIncrement: vi.fn(),
    isMin: false,
    isMax: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Renderizado de las cuatro barras horizontales independientes', () => {
    it('elimina los anillos circulares concéntricos SVG y renderiza 4 barras horizontales', () => {
      const { container } = render(<RecoveryRadialMeter {...defaultProps} />);

      expect(container.querySelector('.recovery-meter-svg')).toBeNull();

      const cards = container.querySelectorAll('.recovery-bar-card');
      expect(cards.length).toBe(4);

      for (const key of METRIC_ORDER) {
        expect(screen.getByTestId(`recovery-bar-track-${key}`)).toBeTruthy();
        expect(screen.getByTestId(`recovery-bar-fill-${key}`)).toBeTruthy();
      }

      expect(screen.getByText(/Horas de sueño/i)).toBeDefined();
      expect(screen.getByText(/Calidad del descanso/i)).toBeDefined();
      expect(screen.getByText(/Nivel de fatiga muscular/i)).toBeDefined();
      expect(screen.getByText(/Dolor muscular/i)).toBeDefined();
    });

    it('muestra claramente el valor actual y su estado (o Neutro cuando no está respondido)', () => {
      render(
        <RecoveryRadialMeter
          {...defaultProps}
          sleepHours={8}
          sleepQuality={null}
          fatigueLevel={2}
          muscleSoreness={1}
        />,
      );

      expect(screen.getByText('8 horas')).toBeDefined();
      expect(screen.getByText('Óptimo')).toBeDefined();
      expect(screen.getByText('Neutro')).toBeDefined();
      expect(screen.getByText('Sin marcar')).toBeDefined();
      expect(screen.getByText('fresco')).toBeDefined();
      expect(screen.getByText('sin dolor')).toBeDefined();
    });

    it('verifica que los valores preajustados (DEFAULT_RECOVERY_VALUES) muestren 8 horas y Nivel 5/5 en las restantes', () => {
      render(
        <RecoveryRadialMeter
          {...defaultProps}
          sleepHours={DEFAULT_RECOVERY_VALUES.sleepHours}
          sleepQuality={DEFAULT_RECOVERY_VALUES.sleepQuality}
          fatigueLevel={DEFAULT_RECOVERY_VALUES.fatigueLevel}
          muscleSoreness={DEFAULT_RECOVERY_VALUES.muscleSoreness}
        />,
      );

      expect(screen.getByText('8 horas')).toBeDefined();
      expect(screen.getByText('excelente')).toBeDefined();
      expect(screen.getByText('enérgico')).toBeDefined();
      expect(screen.getByText('sin dolor')).toBeDefined();
      expect(screen.getAllByText('Nivel 5/5').length).toBe(3);
    });
  });

  describe('2. Botones de incremento (+) y decremento (−) en los extremos de la barra', () => {
    it('ubica el botón − a la izquierda y el botón + a la derecha de la barra horizontal', () => {
      const { container } = render(<RecoveryRadialMeter {...defaultProps} />);
      const activeCard = container.querySelector('.recovery-bar-card.is-active');
      expect(activeCard).toBeTruthy();

      const controlsRow = activeCard?.querySelector('.recovery-bar-controls-row');
      expect(controlsRow).toBeTruthy();

      const children = Array.from(controlsRow?.children ?? []);
      expect(children.length).toBe(3);
      expect(children[0].classList.contains('recovery-bar-stepper-minus')).toBe(true);
      expect(children[1].classList.contains('recovery-bar-track')).toBe(true);
      expect(children[2].classList.contains('recovery-bar-stepper-plus')).toBe(true);
    });

    it('los botones − y + modifican únicamente el indicador seleccionado y respetan límites', () => {
      const onDecrement = vi.fn();
      const onIncrement = vi.fn();

      render(
        <RecoveryRadialMeter
          {...defaultProps}
          activeMetric="sleepHours"
          onDecrement={onDecrement}
          onIncrement={onIncrement}
        />,
      );

      const minusBtn = screen.getByLabelText('Disminuir valor');
      const plusBtn = screen.getByLabelText('Aumentar valor');

      fireEvent.click(minusBtn);
      expect(onDecrement).toHaveBeenCalledTimes(1);

      fireEvent.click(plusBtn);
      expect(onIncrement).toHaveBeenCalledTimes(1);

      // Los botones de los indicadores no seleccionados están deshabilitados
      const inactivePlusBtn = screen.getByLabelText('Aumentar Calidad del descanso');
      expect((inactivePlusBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('en CheckInRecoverySlide los botones − y + actualizan solo el indicador activo', () => {
      const onSleepHoursChange = vi.fn();
      const onSleepQualityChange = vi.fn();
      const onFatigueChange = vi.fn();
      const onSorenessChange = vi.fn();

      render(
        <CheckInRecoverySlide
          sleepHours={8}
          onSleepHoursChange={onSleepHoursChange}
          sleepQuality={3}
          onSleepQualityChange={onSleepQualityChange}
          fatigueLevel={3}
          onFatigueChange={onFatigueChange}
          muscleSoreness={2}
          onSorenessChange={onSorenessChange}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByLabelText('Aumentar valor'));
      expect(onSleepHoursChange).toHaveBeenCalledWith(9);
      expect(onSleepQualityChange).not.toHaveBeenCalled();

      // Seleccionar Calidad del descanso y presionar −
      fireEvent.click(screen.getByLabelText(/Seleccionar indicador Calidad del descanso/i));
      fireEvent.click(screen.getByLabelText('Disminuir valor'));
      expect(onSleepQualityChange).toHaveBeenCalledWith(2);
    });
  });

  describe('3. Interacción táctil sobre las barras horizontales', () => {
    it('calcula correctamente el porcentaje y valor horizontal de cada métrica', () => {
      expect(getMetricProgressPct('sleepHours', null)).toBe(0);
      expect(getMetricProgressPct('sleepHours', 6)).toBeCloseTo(0.5);
      expect(getValueFromHorizontalPct(0.5, 'sleepHours')).toBe(6);
      expect(getValueFromHorizontalPct(1, 'sleepQuality')).toBe(5);
      expect(getValueFromHorizontalPct(1, 'fatigueLevel')).toBe(1);
      expect(getValueFromHorizontalPct(0, 'muscleSoreness')).toBe(5);
      expect(getMetricDisplayInfo('sleepHours', null).valueText).toBe('Neutro');
    });

    it('al tocar otra barra primero solo la selecciona sin cambiar su valor', () => {
      const onValueChange = vi.fn();
      const onSelectMetric = vi.fn();

      render(
        <RecoveryRadialMeter
          {...defaultProps}
          activeMetric="sleepQuality"
          sleepHours={8}
          onSelectMetric={onSelectMetric}
          onValueChange={onValueChange}
        />,
      );

      const sleepTrack = screen.getByTestId('recovery-bar-track-sleepHours');
      fireEvent.pointerDown(sleepTrack, { clientX: 120, clientY: 10, pointerId: 1 });

      expect(onSelectMetric).toHaveBeenCalledWith('sleepHours');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('una vez seleccionada la barra, un toque o arrastre sobre ella modifica su valor', () => {
      const onValueChange = vi.fn();
      const onSelectMetric = vi.fn();

      render(
        <RecoveryRadialMeter
          {...defaultProps}
          activeMetric="sleepHours"
          sleepHours={4}
          onSelectMetric={onSelectMetric}
          onValueChange={onValueChange}
        />,
      );

      const sleepTrack = screen.getByTestId('recovery-bar-track-sleepHours');
      vi.spyOn(sleepTrack, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 240,
        height: 18,
        right: 240,
        bottom: 18,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      fireEvent.pointerDown(sleepTrack, { clientX: 180, clientY: 9, pointerId: 1 });
      expect(onValueChange).toHaveBeenCalledWith('sleepHours', 9);
    });
  });

  describe('4. Destaque visual del indicador seleccionado y accesibilidad', () => {
    it('selecciona un indicador al hacer clic en su tarjeta o etiqueta', () => {
      render(<RecoveryRadialMeter {...defaultProps} />);

      const qualityCard = screen.getByLabelText(/Seleccionar indicador Calidad del descanso/i);
      fireEvent.click(qualityCard);

      expect(defaultProps.onSelectMetric).toHaveBeenCalledWith('sleepQuality');
    });

    it('soporta navegación y selección mediante teclado (Enter / Espacio / Flechas)', () => {
      render(<RecoveryRadialMeter {...defaultProps} />);

      const sorenessCard = screen.getByLabelText(/Seleccionar indicador Dolor muscular/i);
      fireEvent.keyDown(sorenessCard, { key: 'Enter' });
      expect(defaultProps.onSelectMetric).toHaveBeenCalledWith('muscleSoreness');

      const activeCard = screen.getByLabelText(/Seleccionar indicador Horas de sueño/i);
      fireEvent.keyDown(activeCard, { key: 'ArrowRight' });
      expect(defaultProps.onIncrement).toHaveBeenCalledTimes(1);
    });

    it('aplica clases activas de resaltado al indicador seleccionado y menor protagonismo al resto', () => {
      const { container } = render(
        <RecoveryRadialMeter {...defaultProps} activeMetric="fatigueLevel" />,
      );

      const activeCard = container.querySelector('.recovery-bar-card.is-active');
      expect(activeCard?.getAttribute('data-metric')).toBe('fatigueLevel');

      const inactiveCards = container.querySelectorAll('.recovery-bar-card.is-inactive');
      expect(inactiveCards.length).toBe(3);

      const activeTrack = container.querySelector('.recovery-bar-track.is-active');
      expect(activeTrack).toBeTruthy();

      const activeText = screen.getByText(/Nivel de fatiga muscular/i);
      expect(activeText.classList.contains('is-active')).toBe(true);
    });
  });
});

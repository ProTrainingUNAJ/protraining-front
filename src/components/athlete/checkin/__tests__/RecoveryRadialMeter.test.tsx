import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryRadialMeter } from '../recovery/RecoveryRadialMeter';
import {
  MetricKey,
  getMetricFromPoint,
  getValueFromPoint,
  CX,
  CY,
  METRIC_CONFIGS,
  STROKE_WIDTH,
  ACTIVE_STROKE_WIDTH,
} from '../recovery/recovery.types';

describe('RecoveryRadialMeter - Optimización táctil avanzada (Touch-First)', () => {
  const defaultProps = {
    activeMetric: 'sleepHours' as MetricKey,
    sleepHours: 8,
    sleepQuality: 4,
    fatigueLevel: 2,
    muscleSoreness: 1,
    onSelectMetric: vi.fn(),
    onValueChange: vi.fn(),
    getArcEndAngle: vi.fn((key: MetricKey) => {
      const cfg = METRIC_CONFIGS[key];
      return (cfg.startAngle + 120) % 360;
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Geometría y dimensiones optimizadas para dedos', () => {
    it('los anillos tienen una separación radial amplia y grosor ergonómico', () => {
      expect(STROKE_WIDTH).toBeGreaterThanOrEqual(20);
      expect(ACTIVE_STROKE_WIDTH).toBeGreaterThan(STROKE_WIDTH);

      const rSleepHours = METRIC_CONFIGS.sleepHours.radius;
      const rQuality = METRIC_CONFIGS.sleepQuality.radius;
      const rFatigue = METRIC_CONFIGS.fatigueLevel.radius;
      const rSoreness = METRIC_CONFIGS.muscleSoreness.radius;

      // La separación entre centros de anillos consecutivos debe ser de al menos 44px
      expect(rSleepHours - rQuality).toBeGreaterThanOrEqual(44);
      expect(rQuality - rFatigue).toBeGreaterThanOrEqual(44);
      expect(rFatigue - rSoreness).toBeGreaterThanOrEqual(44);

      // El espacio libre visible (entre bordes) debe ser de al menos 18px
      const freeSpace = rSleepHours - rQuality - STROKE_WIDTH;
      expect(freeSpace).toBeGreaterThanOrEqual(18);
    });

    it('renderiza el SVG con viewBox responsivo y las 4 opciones de bienestar', () => {
      const { container } = render(<RecoveryRadialMeter {...defaultProps} />);
      const svg = container.querySelector('.recovery-meter-svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 520 465');

      expect(screen.getByText(/Horas de sueño/i)).toBeDefined();
      expect(screen.getByText(/Calidad del descanso/i)).toBeDefined();
      expect(screen.getByText(/Nivel de fatiga muscular/i)).toBeDefined();
      expect(screen.getByText(/Dolor muscular/i)).toBeDefined();
    });
  });

  describe('2. Detección táctil inteligente por hit-testing radial (getMetricFromPoint)', () => {
    it('detecta correctamente cada anillo según la distancia radial al centro', () => {
      // sleepHours (anillo exterior, R=205)
      expect(getMetricFromPoint(CX + 205, CY)).toBe('sleepHours');
      // sleepQuality (R=157)
      expect(getMetricFromPoint(CX + 157, CY)).toBe('sleepQuality');
      // fatigueLevel (R=109)
      expect(getMetricFromPoint(CX + 109, CY)).toBe('fatigueLevel');
      // muscleSoreness (anillo interior, R=61)
      expect(getMetricFromPoint(CX + 61, CY)).toBe('muscleSoreness');
    });

    it('devuelve null si el toque ocurre fuera del área de los anillos (centro o muy lejos)', () => {
      // Centro hueco del gráfico
      expect(getMetricFromPoint(CX, CY)).toBeNull();
      expect(getMetricFromPoint(CX + 20, CY)).toBeNull();

      // Fuera del radio máximo
      expect(getMetricFromPoint(CX + 350, CY)).toBeNull();
    });

    it('aplica histéresis en zonas ambiguas para evitar saltos erráticos por temblor del dedo', () => {
      // Frontera entre fatiga (109) y dolor (61) está nominalmente en 85.
      // Si el usuario ya tiene seleccionada la fatiga, a 83px mantiene fatiga (gracias a la histéresis de 8px)
      expect(getMetricFromPoint(CX + 83, CY, 'fatigueLevel')).toBe('fatigueLevel');

      // Si el usuario ya tenía seleccionado dolor muscular, a 83px mantiene dolor muscular
      expect(getMetricFromPoint(CX + 83, CY, 'muscleSoreness')).toBe('muscleSoreness');

      // Si el desplazamiento supera el umbral de histéresis (ej. 70px), conmuta a dolor muscular
      expect(getMetricFromPoint(CX + 70, CY, 'fatigueLevel')).toBe('muscleSoreness');
    });
  });

  describe('3. Mover la barra táctilmente (getValueFromPoint)', () => {
    it('calcula correctamente el valor al deslizar sobre el arco', () => {
      // Para horas de sueño (0 a 12)
      // Cerca del inicio del arco (arriba a la izquierda): 0 o 1 hora
      const startCfg = METRIC_CONFIGS.sleepHours;
      expect(getValueFromPoint(CX, CY - startCfg.radius, 'sleepHours')).toBeGreaterThanOrEqual(0);

      // En el extremo derecho (90°, 3 o'clock): valor alto
      const midVal = getValueFromPoint(CX + startCfg.radius, CY, 'sleepHours');
      expect(midVal).toBeGreaterThanOrEqual(4);
      expect(midVal).toBeLessThanOrEqual(12);
    });

    it('al tocar otra barra primero solo la selecciona sin cambiar su valor', () => {
      const onValueChange = vi.fn();
      const onSelectMetric = vi.fn();
      const { container } = render(
        <RecoveryRadialMeter
          {...defaultProps}
          activeMetric="sleepQuality"
          sleepHours={0}
          onSelectMetric={onSelectMetric}
          onValueChange={onValueChange}
        />,
      );
      const svg = container.querySelector('.recovery-meter-svg');
      expect(svg).toBeTruthy();

      if (svg) {
        vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 520,
          height: 465,
          right: 520,
          bottom: 465,
          x: 0,
          y: 0,
          toJSON: () => {},
        });

        // Simular toque en el cuadrante derecho del anillo de horas de sueño (R=205)
        fireEvent.pointerDown(svg, {
          clientX: CX + 205,
          clientY: CY,
          pointerId: 1,
        });

        // Primero debe seleccionar horas de sueño (porque el activo era sleepQuality)
        expect(onSelectMetric).toHaveBeenCalledWith('sleepHours');
        // NO debe cambiar el valor en el primer toque de selección
        expect(onValueChange).not.toHaveBeenCalled();
      }
    });

    it('una vez marcada la barra, un segundo toque o arrastre sí modifica el valor', () => {
      const onValueChange = vi.fn();
      const onSelectMetric = vi.fn();
      const { container } = render(
        <RecoveryRadialMeter
          {...defaultProps}
          activeMetric="sleepHours"
          sleepHours={0}
          onSelectMetric={onSelectMetric}
          onValueChange={onValueChange}
        />,
      );
      const svg = container.querySelector('.recovery-meter-svg');
      expect(svg).toBeTruthy();

      if (svg) {
        vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
          left: 0,
          top: 0,
          width: 520,
          height: 465,
          right: 520,
          bottom: 465,
          x: 0,
          y: 0,
          toJSON: () => {},
        });

        // Tocar sobre la barra que YA está activa (R=205)
        fireEvent.pointerDown(svg, {
          clientX: CX + 205,
          clientY: CY,
          pointerId: 1,
        });

        // Al estar ya activa, sí actualiza el valor según las coordenadas
        expect(onValueChange).toHaveBeenCalledWith('sleepHours', expect.any(Number));
      }
    });
  });

  describe('4. Feedback visual y alternativas accesibles de selección', () => {
    it('selecciona un indicador al hacer clic en su etiqueta o insignia lateral', () => {
      render(<RecoveryRadialMeter {...defaultProps} />);

      const qualityGroup = screen.getByLabelText(/Seleccionar indicador Calidad del descanso/i);
      fireEvent.click(qualityGroup);

      expect(defaultProps.onSelectMetric).toHaveBeenCalledWith('sleepQuality');
    });

    it('soporta navegación y selección mediante teclado (Enter / Espacio)', () => {
      render(<RecoveryRadialMeter {...defaultProps} />);

      const sorenessGroup = screen.getByLabelText(/Seleccionar indicador Dolor muscular/i);
      fireEvent.keyDown(sorenessGroup, { key: 'Enter' });

      expect(defaultProps.onSelectMetric).toHaveBeenCalledWith('muscleSoreness');
    });

    it('aplica clases activas de resaltado al indicador actualmente seleccionado', () => {
      const { container } = render(
        <RecoveryRadialMeter {...defaultProps} activeMetric="fatigueLevel" />,
      );

      // Carril base activo
      const activeTrack = container.querySelector('.recovery-track-arc.is-active');
      expect(activeTrack).toBeTruthy();

      // Texto activo
      const activeText = screen.getByText(/Nivel de fatiga muscular/i);
      expect(activeText.classList.contains('is-active')).toBe(true);
    });
  });
});

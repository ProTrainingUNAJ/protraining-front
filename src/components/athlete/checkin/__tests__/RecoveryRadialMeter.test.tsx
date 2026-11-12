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
      expect(STROKE_WIDTH).toBeGreaterThanOrEqual(26);
      expect(ACTIVE_STROKE_WIDTH).toBeGreaterThan(STROKE_WIDTH);

      const rSleepHours = METRIC_CONFIGS.sleepHours.radius;
      const rQuality = METRIC_CONFIGS.sleepQuality.radius;
      const rFatigue = METRIC_CONFIGS.fatigueLevel.radius;
      const rSoreness = METRIC_CONFIGS.muscleSoreness.radius;

      // La separación entre centros de anillos consecutivos debe ser de al menos 50px
      expect(rSleepHours - rQuality).toBeGreaterThanOrEqual(50);
      expect(rQuality - rFatigue).toBeGreaterThanOrEqual(50);
      expect(rFatigue - rSoreness).toBeGreaterThanOrEqual(50);

      // El espacio libre visible (entre bordes) debe ser de al menos 20px
      const freeSpace = rSleepHours - rQuality - STROKE_WIDTH;
      expect(freeSpace).toBeGreaterThanOrEqual(20);
    });

    it('renderiza el SVG con viewBox responsivo y las 4 opciones de bienestar', () => {
      const { container } = render(<RecoveryRadialMeter {...defaultProps} />);
      const svg = container.querySelector('.recovery-meter-svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 580 440');

      expect(screen.getByText(/Horas de sueño/i)).toBeDefined();
      expect(screen.getByText(/Calidad del descanso/i)).toBeDefined();
      expect(screen.getByText(/Nivel de fatiga muscular/i)).toBeDefined();
      expect(screen.getByText(/Dolor muscular/i)).toBeDefined();
    });
  });

  describe('2. Detección táctil inteligente por hit-testing radial (getMetricFromPoint)', () => {
    it('detecta correctamente cada anillo según la distancia radial al centro', () => {
      // sleepHours (anillo exterior, R=226)
      expect(getMetricFromPoint(CX + 226, CY)).toBe('sleepHours');
      // sleepQuality (R=174)
      expect(getMetricFromPoint(CX + 174, CY)).toBe('sleepQuality');
      // fatigueLevel (R=122)
      expect(getMetricFromPoint(CX + 122, CY)).toBe('fatigueLevel');
      // muscleSoreness (anillo interior, R=70)
      expect(getMetricFromPoint(CX + 70, CY)).toBe('muscleSoreness');
    });

    it('devuelve null si el toque ocurre fuera del área de los anillos (centro o muy lejos)', () => {
      // Centro hueco del gráfico
      expect(getMetricFromPoint(CX, CY)).toBeNull();
      expect(getMetricFromPoint(CX + 20, CY)).toBeNull();

      // Fuera del radio máximo
      expect(getMetricFromPoint(CX + 350, CY)).toBeNull();
    });

    it('aplica histéresis en zonas ambiguas para evitar saltos erráticos por temblor del dedo', () => {
      // Frontera entre fatiga (122) y dolor (70) está nominalmente en 96.
      // Si el usuario ya tiene seleccionada la fatiga, a 94px mantiene fatiga (gracias a la histéresis de 8px)
      expect(getMetricFromPoint(CX + 94, CY, 'fatigueLevel')).toBe('fatigueLevel');

      // Si el usuario ya tenía seleccionado dolor muscular, a 94px mantiene dolor muscular
      expect(getMetricFromPoint(CX + 94, CY, 'muscleSoreness')).toBe('muscleSoreness');

      // Si el desplazamiento supera el umbral de histéresis (ej. 80px), conmuta a dolor muscular
      expect(getMetricFromPoint(CX + 80, CY, 'fatigueLevel')).toBe('muscleSoreness');
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
      expect(midVal).toBeGreaterThanOrEqual(6);
      expect(midVal).toBeLessThanOrEqual(12);
    });

    it('ejecuta onValueChange al interactuar táctilmente con un anillo', () => {
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
          width: 580,
          height: 440,
          right: 580,
          bottom: 440,
          x: 0,
          y: 0,
          toJSON: () => {},
        });

        // Simular toque en el cuadrante derecho del anillo de horas de sueño (R=226)
        fireEvent.pointerDown(svg, {
          clientX: CX + 226,
          clientY: CY,
          pointerId: 1,
        });

        // Debe seleccionar horas de sueño (porque el activo era sleepQuality)
        expect(onSelectMetric).toHaveBeenCalledWith('sleepHours');
        // Debe actualizar el valor porque pasó de 0 a un valor positivo
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

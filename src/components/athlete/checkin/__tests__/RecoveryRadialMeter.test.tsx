import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecoveryRadialMeter } from '../recovery/RecoveryRadialMeter';
import {
  MetricKey,
  getMetricFromPoint,
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
      expect(STROKE_WIDTH).toBeGreaterThanOrEqual(30);
      expect(ACTIVE_STROKE_WIDTH).toBeGreaterThan(STROKE_WIDTH);

      const rSleepHours = METRIC_CONFIGS.sleepHours.radius;
      const rQuality = METRIC_CONFIGS.sleepQuality.radius;
      const rFatigue = METRIC_CONFIGS.fatigueLevel.radius;
      const rSoreness = METRIC_CONFIGS.muscleSoreness.radius;

      // La separación entre centros de anillos consecutivos debe ser al menos de 48px
      expect(rSleepHours - rQuality).toBeGreaterThanOrEqual(48);
      expect(rQuality - rFatigue).toBeGreaterThanOrEqual(48);
      expect(rFatigue - rSoreness).toBeGreaterThanOrEqual(48);

      // El espacio libre visible (entre bordes) debe ser de al menos 15px
      const freeSpace = rSleepHours - rQuality - STROKE_WIDTH;
      expect(freeSpace).toBeGreaterThanOrEqual(15);
    });

    it('renderiza el SVG con viewBox responsivo y las 4 opciones de bienestar', () => {
      const { container } = render(<RecoveryRadialMeter {...defaultProps} />);
      const svg = container.querySelector('.recovery-meter-svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 630 570');

      expect(screen.getByText(/Horas de sueño/i)).toBeDefined();
      expect(screen.getByText(/Calidad del descanso/i)).toBeDefined();
      expect(screen.getByText(/Nivel de fatiga muscular/i)).toBeDefined();
      expect(screen.getByText(/Dolor muscular/i)).toBeDefined();
    });
  });

  describe('2. Detección táctil inteligente por hit-testing radial (getMetricFromPoint)', () => {
    it('detecta correctamente cada anillo según la distancia radial al centro', () => {
      // sleepHours (anillo exterior, R=246)
      expect(getMetricFromPoint(CX + 246, CY)).toBe('sleepHours');
      // sleepQuality (R=194)
      expect(getMetricFromPoint(CX + 194, CY)).toBe('sleepQuality');
      // fatigueLevel (R=142)
      expect(getMetricFromPoint(CX + 142, CY)).toBe('fatigueLevel');
      // muscleSoreness (anillo interior, R=90)
      expect(getMetricFromPoint(CX + 90, CY)).toBe('muscleSoreness');
    });

    it('devuelve null si el toque ocurre fuera del área de los anillos (centro o muy lejos)', () => {
      // Centro hueco del gráfico
      expect(getMetricFromPoint(CX, CY)).toBeNull();
      expect(getMetricFromPoint(CX + 20, CY)).toBeNull();

      // Fuera del radio máximo
      expect(getMetricFromPoint(CX + 350, CY)).toBeNull();
    });

    it('aplica histéresis en zonas ambiguas para evitar saltos erráticos por temblor del dedo', () => {
      // Frontera entre fatiga (142) y dolor (90) está nominalmente en 116.
      // Si el usuario ya tiene seleccionada la fatiga, a 114px mantiene fatiga (gracias a la histéresis de 8px)
      expect(getMetricFromPoint(CX + 114, CY, 'fatigueLevel')).toBe('fatigueLevel');

      // Si el usuario ya tenía seleccionado dolor muscular, a 114px mantiene dolor muscular
      expect(getMetricFromPoint(CX + 114, CY, 'muscleSoreness')).toBe('muscleSoreness');

      // Si el desplazamiento supera el umbral de histéresis (ej. 102px), conmuta a dolor muscular
      expect(getMetricFromPoint(CX + 102, CY, 'fatigueLevel')).toBe('muscleSoreness');
    });
  });

  describe('3. Feedback visual y alternativas accesibles de selección', () => {
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

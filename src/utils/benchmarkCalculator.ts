import { AthleteBenchmarkItem, ImprovementDirection, PerformanceStatus } from '../types/benchmark';

/**
 * Detecta si en una prueba un menor valor representa un mejor rendimiento (ej. pruebas de tiempo/sprint)
 * o si un mayor valor representa un mejor rendimiento (ej. salto, peso, repeticiones, distancia).
 */
export function detectImprovementDirection(
  unit: string,
  testName = '',
  motorSkill = '',
): ImprovementDirection {
  const normalizedUnit = (unit || '').trim().toLowerCase();
  const normalizedName = (testName || '').trim().toLowerCase();
  const normalizedSkill = (motorSkill || '').trim().toLowerCase();

  // Unidades de tiempo -> Menor tiempo es mejor
  const timeUnits = ['s', 'seg', 'segundo', 'segundos', 'min', 'minuto', 'minutos', 'ms'];
  if (timeUnits.includes(normalizedUnit)) {
    return 'lower_is_better';
  }

  // Si la capacidad es velocidad o agilidad y el nombre sugiere carrera/sprint y la unidad es tiempo
  if (
    (normalizedSkill === 'velocity' || normalizedSkill === 'agility') &&
    (normalizedName.includes('sprint') ||
      normalizedName.includes('carrera') ||
      normalizedName.includes('tiempo'))
  ) {
    return 'lower_is_better';
  }

  // Por defecto (altura, distancia, fuerza, repeticiones, potencia, etc.): Mayor es mejor
  return 'higher_is_better';
}

/**
 * Calcula el estado individual de un test frente al promedio grupal.
 */
export function calculateBenchmarkItem(
  testName: string,
  unit: string,
  athleteValue: number | null | undefined,
  groupAverage: number | null | undefined,
  options?: {
    testId?: string;
    motorSkill?: string;
    athleteTestedDate?: string | null;
    testedAthleteCount?: number;
    direction?: ImprovementDirection;
  },
): AthleteBenchmarkItem {
  const hasAthleteValue =
    athleteValue !== null && athleteValue !== undefined && !Number.isNaN(athleteValue);
  const hasGroupAverage =
    groupAverage !== null &&
    groupAverage !== undefined &&
    !Number.isNaN(groupAverage) &&
    groupAverage > 0;

  const direction =
    options?.direction || detectImprovementDirection(unit, testName, options?.motorSkill);

  if (!hasAthleteValue || !hasGroupAverage) {
    return {
      testId: options?.testId,
      testName,
      motorSkill: options?.motorSkill,
      unit,
      athleteValue: hasAthleteValue ? (athleteValue as number) : null,
      groupAverage: hasGroupAverage ? (groupAverage as number) : null,
      direction,
      absoluteDelta: null,
      percentageDelta: null,
      status: 'insufficient_data',
      isWeakestPoint: false,
      athleteTestedDate: options?.athleteTestedDate,
      testedAthleteCount: options?.testedAthleteCount,
    };
  }

  const athlete = athleteValue as number;
  const avg = groupAverage as number;

  let absoluteDelta: number;
  let percentageDelta: number;

  if (direction === 'higher_is_better') {
    // Mayor es mejor: si atleta < avg, delta es negativo (desventaja)
    absoluteDelta = Math.round((athlete - avg) * 10) / 10;
    percentageDelta = Math.round(((athlete - avg) / avg) * 1000) / 10;
  } else {
    // Menor tiempo es mejor: si atleta > avg (tardó más), delta es negativo (desventaja)
    // En términos de diferencia de tiempo mostramos cuánto más/menos tardó
    absoluteDelta = Math.round((athlete - avg) * 10) / 10;
    percentageDelta = Math.round(((avg - athlete) / avg) * 1000) / 10;
  }

  // Umbral neutro de tolerancia del +- 2%
  let status: PerformanceStatus;
  if (percentageDelta < -2.0) {
    status = 'below_average';
  } else if (percentageDelta > 2.0) {
    status = 'above_average';
  } else {
    status = 'on_average';
  }

  return {
    testId: options?.testId,
    testName,
    motorSkill: options?.motorSkill,
    unit,
    athleteValue: athlete,
    groupAverage: avg,
    direction,
    absoluteDelta,
    percentageDelta,
    status,
    isWeakestPoint: false,
    athleteTestedDate: options?.athleteTestedDate,
    testedAthleteCount: options?.testedAthleteCount,
  };
}

/**
 * Evalúa una lista completa de tests para un atleta frente al promedio de su categoría,
 * identificando con precisión matemática cuál es el "Punto más débil" (mayor desventaja relativa).
 */
export function evaluateCategoryBenchmark(items: AthleteBenchmarkItem[]): AthleteBenchmarkItem[] {
  // Identificamos todos los tests que están por debajo del promedio con porcentaje de desventaja válido
  const belowAverageItems = items.filter(
    (item) =>
      item.status === 'below_average' && item.percentageDelta !== null && item.percentageDelta < 0,
  );

  let weakestItem: AthleteBenchmarkItem | null = null;
  if (belowAverageItems.length > 0) {
    // El punto más débil es el que tiene el percentageDelta más negativo (mayor desventaja relativa frente al grupo)
    weakestItem = belowAverageItems.reduce((worst, current) => {
      const currentDelta = current.percentageDelta ?? 0;
      const worstDelta = worst.percentageDelta ?? 0;
      return currentDelta < worstDelta ? current : worst;
    }, belowAverageItems[0]);
  }

  return items.map((item) => ({
    ...item,
    isWeakestPoint:
      weakestItem !== null &&
      item.testName === weakestItem.testName &&
      item.unit === weakestItem.unit,
  }));
}

/**
 * Formatea la diferencia para presentación en interfaz.
 */
export function formatBenchmarkDelta(item: AthleteBenchmarkItem): string {
  if (item.absoluteDelta === null || item.percentageDelta === null) {
    return 'Sin datos para comparar';
  }

  const sign = item.absoluteDelta > 0 ? '+' : '';
  const pctSign = item.percentageDelta > 0 ? '+' : '';

  return `${sign}${item.absoluteDelta} ${item.unit} (${pctSign}${item.percentageDelta}%)`;
}

/**
 * Información de presentación accesible del badge de estado.
 */
export function getStatusBadgeInfo(
  status: PerformanceStatus,
  isWeakestPoint = false,
): {
  label: string;
  variant: 'danger' | 'warning' | 'success' | 'neutral' | 'secondary';
  ariaDescription: string;
} {
  if (isWeakestPoint) {
    return {
      label: 'Punto más débil',
      variant: 'danger',
      ariaDescription:
        'Resultado con la mayor desventaja relativa respecto al promedio de la categoría',
    };
  }

  switch (status) {
    case 'below_average':
      return {
        label: 'Punto a mejorar',
        variant: 'warning',
        ariaDescription: 'Resultado por debajo del promedio de la categoría',
      };
    case 'above_average':
      return {
        label: 'Por encima del promedio',
        variant: 'success',
        ariaDescription: 'Resultado superior al promedio de la categoría',
      };
    case 'on_average':
      return {
        label: 'En el promedio',
        variant: 'neutral',
        ariaDescription: 'Resultado equivalente al promedio de la categoría',
      };
    case 'insufficient_data':
    default:
      return {
        label: 'Sin datos suficientes',
        variant: 'secondary',
        ariaDescription: 'No se registran mediciones o promedio de grupo disponible',
      };
  }
}

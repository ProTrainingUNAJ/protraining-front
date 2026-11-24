export function calculateTimeTarget(
  bestTimeSeconds: number | null | undefined,
  intensityPercentage: number | null | undefined,
): number | null {
  if (!bestTimeSeconds || !intensityPercentage || intensityPercentage <= 0) {
    return null;
  }
  const rawTarget = bestTimeSeconds / (intensityPercentage / 100);
  return Math.round(rawTarget * 10) / 10;
}

export interface TimeTargetEvaluation {
  isAchieved: boolean;
  differenceSeconds: number | null;
  statusLabel: string;
}

/*Evalúa si el tiempo realizado por el atleta cumple o supera la meta prescrita.
  En carrera/velocidad: tiempo menor o igual a la meta significa cumplida.
*/
export function evaluateTimeTarget(
  performedTimeSeconds: number | null | undefined,
  targetTimeSeconds: number | null | undefined,
): TimeTargetEvaluation | null {
  if (performedTimeSeconds == null || isNaN(performedTimeSeconds) || performedTimeSeconds <= 0) {
    return null;
  }
  // Si no hay meta prescrita (ritmo libre), cualquier tiempo registrado es válido
  if (targetTimeSeconds == null || targetTimeSeconds <= 0) {
    return {
      isAchieved: true,
      differenceSeconds: null,
      statusLabel: 'Completada',
    };
  }
  const diff = Math.round((performedTimeSeconds - targetTimeSeconds) * 10) / 10;
  const isAchieved = performedTimeSeconds <= targetTimeSeconds;
  return {
    isAchieved,
    differenceSeconds: diff,
    statusLabel: isAchieved ? 'Cumplida' : 'Superó la meta',
  };
}

export interface FormattedTargetTime {
  value: string;
  unit: string;
  text: string;
}

export function formatTargetTime(seconds: number): FormattedTargetTime {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const rem = Math.round((seconds - mins * 60) * 10) / 10;
    if (rem === 0) {
      return { value: String(mins), unit: 'min', text: `${mins} min` };
    }
    const remStr = Number.isInteger(rem)
      ? String(rem)
      : rem.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return { value: `${mins} min ${remStr}`, unit: 's', text: `${mins} min ${remStr} s` };
  }

  const value = Number.isInteger(seconds)
    ? String(seconds)
    : seconds.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return { value, unit: 's', text: `${value} s` };
}

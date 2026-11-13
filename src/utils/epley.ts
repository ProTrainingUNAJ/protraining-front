/**
 * Utilidades para el cálculo de 1RM con la fórmula de Epley y escalón conservador (KAN-392 / #097).
 */

export interface EpleyResult {
  estimated1Rm: number | null;
  proposedWeight: number | null;
  isEligibleForProposal: boolean;
  isHigherThanCurrent: boolean;
  message: string;
}

/**
 * Redondea hacia abajo al múltiplo de escalón (por defecto 2.5 kg, correspondiente a los discos de gimnasio).
 * Ejemplo: 108 kg -> 107.5 kg.
 */
export function roundDownToBarbellStep(weight: number, step = 2.5): number {
  if (weight <= 0) return 0;
  // Usamos Math.round para evitar imprecisiones de coma flotante en JavaScript
  return Math.floor(Math.round((weight / step) * 1000) / 1000) * step;
}

/**
 * Calcula el 1RM estimado mediante Epley y evalúa si genera propuesta de récord nuevo.
 *
 * Fórmula: 1RM = peso * (1 + repeticiones / 30).
 * Regla: Solo aplica con 1 a 10 repeticiones; con más, la fórmula pierde precisión y no se calcula.
 *
 * @param weight Peso levantado en kg (mayor a 0)
 * @param reps Repeticiones completadas (1 a 10)
 * @param current1Rm Récord vigente del atleta en este ejercicio, o null/undefined si no tiene
 */
export function calculateEpley(
  weight: number,
  reps: number,
  current1Rm?: number | null,
): EpleyResult {
  if (weight <= 0 || reps <= 0) {
    return {
      estimated1Rm: null,
      proposedWeight: null,
      isEligibleForProposal: false,
      isHigherThanCurrent: false,
      message: 'Ingresá un peso y repeticiones mayores a 0.',
    };
  }

  // Con más de 10 repeticiones la fórmula de Epley pierde precisión y no se calcula propuesta
  if (reps > 10) {
    return {
      estimated1Rm: null,
      proposedWeight: null,
      isEligibleForProposal: false,
      isHigherThanCurrent: false,
      message:
        'Epley solo calcula 1RM estimado con 1 a 10 repeticiones. Con más de 10 reps no se calcula propuesta de récord.',
    };
  }

  // 1RM estimado = peso * (1 + repeticiones / 30)
  const rawEstimated = weight * (1 + reps / 30);
  // Redondeo visual a 1 decimal para la estimación teórica
  const estimated1Rm = Math.round(rawEstimated * 10) / 10;
  // Escalón conservador: redondeo hacia abajo a múltiplo de 2.5 kg
  const proposedWeight = roundDownToBarbellStep(estimated1Rm, 2.5);

  // Si no tiene récord vigente, el primer récord lo carga el PF (KAN-537)
  if (current1Rm === undefined || current1Rm === null) {
    return {
      estimated1Rm,
      proposedWeight,
      isEligibleForProposal: false,
      isHigherThanCurrent: false,
      message:
        'Aún no tenés récord vigente registrado. El primer récord lo carga tu preparador físico.',
    };
  }

  const isHigherThanCurrent = proposedWeight > current1Rm;

  if (isHigherThanCurrent) {
    return {
      estimated1Rm,
      proposedWeight,
      isEligibleForProposal: true,
      isHigherThanCurrent: true,
      message: `¡Supera tu récord vigente de ${current1Rm} kg! Se generará una propuesta de ${proposedWeight} kg para tu PF.`,
    };
  }

  return {
    estimated1Rm,
    proposedWeight,
    isEligibleForProposal: false,
    isHigherThanCurrent: false,
    message: `Récord vigente: ${current1Rm} kg. La propuesta calculada (${proposedWeight} kg) no supera tu marca actual.`,
  };
}

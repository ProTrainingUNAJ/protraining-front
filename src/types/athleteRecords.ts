// Récord (1RM) de un atleta en un ejercicio, como lo muestra el PF.
export type RecordOrigin = 'TestedInSession' | 'Reported' | 'EstimatedEpley' | 'Epley';

export interface AthleteRecordItem {
  id: string;
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  origin: RecordOrigin;
  achievedAt: string;
}

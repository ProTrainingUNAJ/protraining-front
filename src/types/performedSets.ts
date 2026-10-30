export interface PerformedSetInputItem {
  exerciseId: string;
  weight: number;
  reps: number;
}

export interface RecordPerformedSetsResult {
  recordedSetsCount: number;
  proposalsGeneratedCount: number;
}

export interface StoredPerformedSet {
  exerciseId: string;
  weight: number;
  reps: number;
  recordedAt: string;
  proposalsGenerated?: number;
}

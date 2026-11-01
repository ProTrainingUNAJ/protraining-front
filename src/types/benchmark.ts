export type PerformanceStatus =
  'above_average' | 'on_average' | 'below_average' | 'insufficient_data';

export type ImprovementDirection = 'higher_is_better' | 'lower_is_better';

export interface AthleteBenchmarkItem {
  testId?: string;
  testName: string;
  motorSkill?: string;
  unit: string;
  athleteValue: number | null;
  groupAverage: number | null;
  direction: ImprovementDirection;
  absoluteDelta: number | null;
  percentageDelta: number | null;
  status: PerformanceStatus;
  isWeakestPoint: boolean;
  athleteTestedDate?: string | null;
  testedAthleteCount?: number;
}

export interface CategoryBenchmarkSummary {
  categoryId: string;
  categoryName: string;
  athleteId: string;
  athleteName: string;
  athleteCount: number;
  items: AthleteBenchmarkItem[];
  weakestPoint: AthleteBenchmarkItem | null;
  areasToImproveCount: number;
}

/**
 * Contratos de respuesta directa del endpoint GET /api/v1/athletes/{athleteId}/group-benchmark (KAN-449)
 */
export interface GroupBenchmarkMetric {
  dimension: string;
  athleteValue: number;
  groupAverage: number;
  unit?: string;
  difference?: number;
  percentageDifference?: number;
  direction?: 'HigherIsBetter' | 'LowerIsBetter';
  status?: 'BelowAverage' | 'Neutral' | 'AboveAverage';
  isWeakestPoint?: boolean;
  trend?: string;
}

export interface GroupBenchmarkResponse {
  athleteId: string;
  categoryId: string;
  categoryName?: string;
  metrics: GroupBenchmarkMetric[];
}

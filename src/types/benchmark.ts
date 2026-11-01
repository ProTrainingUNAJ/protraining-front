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

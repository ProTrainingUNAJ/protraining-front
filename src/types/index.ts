export * from './auth';

export interface UserSession {
  token: string;
  fullName: string;
  email: string;
  role: 'PF' | 'Athlete';
  accountId: string;
  athleteId?: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  categoriesCount: number;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  athletesCount: number;
}

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  medicalConditions?: string;
  emergencyContact?: string;
  categoryNames: string[];
  activeInjuriesCount: number;
}

export interface TodayRoutine {
  athleteId: string;
  athleteName: string;
  date: string;
  exercises: TodayRoutineItem[];
  hasActiveInjuries: boolean;
}

export interface TodayRoutineItem {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  percentage: number;
  prescribedWeightKg: number;
  currentOneRepMax: number;
}

export interface CheckInItem {
  id: string;
  athleteId: string;
  date: string;
  effortRate: number;
  sleepHours: number;
  moodRate: number;
  painZones: string;
}

export interface InjuryItem {
  id: string;
  athleteId: string;
  bodyZone: string;
  notes: string;
  status: 1 | 2 | 3; // 1 = Active, 2 = InRecovery, 3 = Cleared
  createdAt: string;
}

export interface PreventiveAlert {
  id: string;
  athleteId: string;
  athleteName: string;
  dateGenerated: string;
  severity: string;
  reason: string;
  suggestion: string;
  isReviewed: boolean;
}

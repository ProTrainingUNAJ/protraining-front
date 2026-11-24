export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  categoriesCount: number;
  athletesCount?: number;
  hasPhoto?: boolean;
  photoUpdatedAt?: string | null;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string | null;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string | null;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  athletesCount: number;
  organizationName?: string;
}

export interface CreateCategoryRequest {
  organizationId?: string;
  name: string;
  description?: string | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string | null;
}

export interface AthleteCategoryMembership {
  id: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
}

export interface AthleteGuardianConsent {
  isSigned: boolean;
  consentDate: string;
  isMinor: boolean;
  guardianName?: string | null;
  guardianEmail?: string | null;
  guardianPhone?: string | null;
  allowsPhysicalTraining: boolean;
  allowsHabitsRecommendations: boolean;
}

export interface Athlete {
  id: string;
  accountId?: string | null;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  telegramUsername?: string | null;
  isMinor?: boolean;
  guardianConsent?: AthleteGuardianConsent | null;
  active?: boolean;
  categoryNames?: string[];
  categories?: AthleteCategoryMembership[];
  emergencyContact?: string | null;
  activeInjuriesCount?: number;
  hasPhoto?: boolean;
  photoUpdatedAt?: string | null;
  weightKg?: number | null;
  athleticGoal?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  physicalProfileUpdatedAt?: string | null;
}

export const ATHLETE_GENDER_OPTIONS = ['Masculino', 'Femenino'] as const;
export type AthleteGenderOption = (typeof ATHLETE_GENDER_OPTIONS)[number];

export const ATHLETIC_GOAL_OPTIONS = [
  'Objetivo no informado',
  'Ganar masa muscular',
  'Rendimiento deportivo',
  'Mantener',
] as const;

export type AthleticGoalOption = (typeof ATHLETIC_GOAL_OPTIONS)[number];

export interface UpdatePhysicalProfileRequest {
  weightKg?: number | null;
  athleticGoal?: string | null;
  birthDate?: string | null;
  gender?: string | null;
}

export interface CreateAthleteRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  telegramUsername?: string | null;
  birthDate?: string;
  categoryIds?: string[];
  emergencyContact?: string | null;
}

export interface AthleteMe {
  athleteId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  active: boolean;
  categories: Category[];
  hasSignedConsent?: boolean;
  isMinor?: boolean;
  weightKg?: number | null;
  athleticGoal?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  physicalProfileUpdatedAt?: string | null;
}

export type CompetitiveEventVenue = 'Home' | 'Away' | 'Neutral';
export type CompetitiveEventType = 'Official' | 'Friendly' | 'Tournament';

export interface CompetitiveEvent {
  id: string;
  categoryId?: string;
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm:ss
  opponent: string;
  venue: CompetitiveEventVenue;
  type: CompetitiveEventType;
  notes?: string | null;
}

export interface CreateCompetitiveEventRequest {
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm:ss
  opponent: string;
  venue: CompetitiveEventVenue;
  type: CompetitiveEventType;
  notes?: string | null;
}

export type SeasonPhaseType = 'Preseason' | 'Competitive' | 'Transition';

export interface SeasonPhase {
  id: string;
  categoryId?: string;
  name: string;
  type: SeasonPhaseType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  notes?: string | null;
}

export type HomeOrAway = CompetitiveEventVenue;

export interface Match {
  id: string;
  categoryId: string;
  opponent: string;
  matchDate: string;
  startTime?: string | null;
  homeOrAway: HomeOrAway;
  type?: CompetitiveEventType;
  notes?: string | null;
  categoryName?: string;
  organizationName?: string;
  organizationId?: string;
}

export interface CreateMatchRequest {
  opponent: string;
  date?: string; // YYYY-MM-DD
  startTime?: string | null; // HH:mm:ss
  matchDate?: string; // Formato combinado opcional
  homeOrAway: HomeOrAway;
  type?: CompetitiveEventType;
  notes?: string | null;
}

export interface CategoryInvitation {
  token: string;
  expiresAt: string;
  categoryId: string;
  categoryName: string;
  invitationUrl: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description?: string | null;
  categoriesCount: number;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string | null;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  athletesCount: number;
}

export interface CreateCategoryRequest {
  organizationId?: string;
  name: string;
  description?: string | null;
}

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone: string;
  isMinor?: boolean;
  active?: boolean;
  categoryNames?: string[];
  categories?: Array<{ id: string; name: string }>;
  emergencyContact?: string | null;
  activeInjuriesCount?: number;
}

export interface CreateAthleteRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
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
  homeOrAway: HomeOrAway;
  type?: CompetitiveEventType;
  notes?: string | null;
  categoryName?: string;
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

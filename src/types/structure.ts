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

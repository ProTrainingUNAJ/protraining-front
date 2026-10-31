import { httpClient, extractErrorMessage } from './axiosClient';
import { matchesApi } from './matches';
import {
  Organization,
  CreateOrganizationRequest,
  Category,
  CreateCategoryRequest,
  Athlete,
  CreateAthleteRequest,
  AthleteMe,
  Match,
  CreateMatchRequest,
  CompetitiveEvent,
  CreateCompetitiveEventRequest,
  SeasonPhase,
} from '../types/structure';

interface RawOrganization {
  id: string;
  nombre?: string;
  name?: string;
  descripcion?: string | null;
  description?: string | null;
  categoriasCount?: number;
  categoriesCount?: number;
}

interface RawCategory {
  id: string;
  organizacionId?: string;
  organizationId?: string;
  nombre?: string;
  name?: string;
  descripcion?: string | null;
  description?: string | null;
  atletasCount?: number;
  athletesCount?: number;
}

interface RawAthleteCategory {
  id?: string;
  nombre?: string;
  name?: string;
}

interface RawAthlete {
  id: string;
  nombre?: string;
  firstName?: string;
  apellido?: string;
  lastName?: string;
  nombreCompleto?: string;
  fullName?: string;
  email?: string;
  telefono?: string;
  phone?: string;
  esMenorDeEdad?: boolean;
  isMinor?: boolean;
  activo?: boolean;
  active?: boolean;
  categorias?: Array<RawAthleteCategory | string>;
  categories?: Array<RawAthleteCategory | string>;
  categoryNames?: string[];
  contactoEmergencia?: string | null;
  emergencyContact?: string | null;
  activeInjuriesCount?: number;
}

function mapOrganization(raw: RawOrganization): Organization {
  return {
    id: raw.id,
    name: raw.nombre ?? raw.name ?? '',
    description: raw.descripcion ?? raw.description ?? null,
    categoriesCount: raw.categoriasCount ?? raw.categoriesCount ?? 0,
  };
}

function mapCategory(raw: RawCategory): Category {
  return {
    id: raw.id,
    organizationId: raw.organizacionId ?? raw.organizationId ?? '',
    name: raw.nombre ?? raw.name ?? '',
    description: raw.descripcion ?? raw.description ?? null,
    athletesCount: raw.atletasCount ?? raw.athletesCount ?? 0,
  };
}

function mapAthlete(raw: RawAthlete): Athlete {
  const firstName = raw.nombre ?? raw.firstName ?? '';
  const lastName = raw.apellido ?? raw.lastName ?? '';
  const fullName = raw.nombreCompleto ?? raw.fullName ?? `${firstName} ${lastName}`.trim();

  const rawCats = raw.categorias ?? raw.categories ?? [];
  const categories = rawCats.map((c) => {
    if (typeof c === 'string') {
      return { id: c, name: c };
    }
    return {
      id: c.id ?? '',
      name: c.nombre ?? c.name ?? '',
    };
  });

  const categoryNames = raw.categoryNames ?? categories.map((c) => c.name).filter(Boolean);

  return {
    id: raw.id,
    firstName,
    lastName,
    fullName: fullName || 'Sin nombre',
    email: raw.email ?? '',
    phone: raw.telefono ?? raw.phone ?? '',
    isMinor: raw.esMenorDeEdad ?? raw.isMinor ?? false,
    active: raw.activo ?? raw.active ?? true,
    categories,
    categoryNames,
    emergencyContact: raw.contactoEmergencia ?? raw.emergencyContact ?? null,
    activeInjuriesCount: raw.activeInjuriesCount ?? 0,
  };
}

export const structureService = {
  async getOrganizations(): Promise<Organization[]> {
    try {
      const response = await httpClient.get<RawOrganization[]>('/estructura/api/v1/organizations');
      return (response.data || []).map(mapOrganization);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async createOrganization(req: CreateOrganizationRequest): Promise<Organization> {
    try {
      const response = await httpClient.post<RawOrganization>('/estructura/api/v1/organizations', {
        name: req.name.trim(),
        description: req.description?.trim() || null,
      });
      return mapOrganization(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async getCategories(organizationId: string): Promise<Category[]> {
    try {
      const response = await httpClient.get<RawCategory[]>('/estructura/api/v1/categories', {
        params: { organizationId },
      });
      return (response.data || []).map(mapCategory);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async createCategory(organizationId: string, req: CreateCategoryRequest): Promise<Category> {
    try {
      const response = await httpClient.post<RawCategory>('/estructura/api/v1/categories', {
        organizationId,
        name: req.name.trim(),
        description: req.description?.trim() || null,
      });
      return mapCategory(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async getAthletes(params?: { categoriaId?: string; soloActivos?: boolean }): Promise<Athlete[]> {
    try {
      const response = await httpClient.get<RawAthlete[]>('/estructura/api/v1/athletes', {
        params: {
          categoriaId: params?.categoriaId,
          soloActivos: params?.soloActivos ?? true,
        },
      });
      return (response.data || []).map(mapAthlete);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async createAthlete(req: CreateAthleteRequest): Promise<Athlete> {
    try {
      const response = await httpClient.post<RawAthlete>('/estructura/api/v1/athletes', {
        firstName: req.firstName.trim(),
        lastName: req.lastName.trim(),
        email: req.email.trim(),
        phone: req.phone.trim(),
        emergencyContact: req.emergencyContact?.trim() || null,
      });
      return mapAthlete(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  // Ids de los atletas de una categoría (GET /categories/{id}/athletes).
  async getCategoryAthleteIds(categoryId: string): Promise<string[]> {
    try {
      const response = await httpClient.get<RawAthlete[]>(
        `/estructura/api/v1/categories/${categoryId}/athletes`,
      );
      return (response.data || []).map((athlete) => athlete.id);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  // El back no manda las cantidades en los listados: se cuentan a partir de las relaciones.
  async withCategoryCounts(organizations: Organization[]): Promise<Organization[]> {
    return Promise.all(
      organizations.map(async (organization) => ({
        ...organization,
        categoriesCount: (await this.getCategories(organization.id).catch(() => [])).length,
      })),
    );
  },

  async withAthleteCounts(categories: Category[]): Promise<Category[]> {
    return Promise.all(
      categories.map(async (category) => ({
        ...category,
        athletesCount: (await this.getCategoryAthleteIds(category.id).catch(() => [])).length,
      })),
    );
  },

  // El listado de atletas no trae sus categorías: se arman con los atletas de cada categoría.
  async withCategories(athletes: Athlete[], categories: Category[]): Promise<Athlete[]> {
    const memberships = await Promise.all(
      categories.map(async (category) => ({
        category,
        athleteIds: await this.getCategoryAthleteIds(category.id).catch(() => [] as string[]),
      })),
    );

    return athletes.map((athlete) => {
      const athleteCategories = memberships
        .filter(({ athleteIds }) => athleteIds.includes(athlete.id))
        .map(({ category }) => ({ id: category.id, name: category.name }));
      return {
        ...athlete,
        categories: athleteCategories,
        categoryNames: athleteCategories.map((category) => category.name),
      };
    });
  },

  async assignAthleteCategory(athleteId: string, categoryId: string): Promise<void> {
    try {
      await httpClient.post(`/estructura/api/v1/athletes/${athleteId}/categories/${categoryId}`);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async unassignAthleteCategory(athleteId: string, categoryId: string): Promise<void> {
    try {
      await httpClient.delete(`/estructura/api/v1/athletes/${athleteId}/categories/${categoryId}`);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Retrieves the currently logged-in athlete identity from Structure microservice.
   * Resolves the token account id into the actual athleteId and category memberships (KAN-329).
   */
  async getMe(): Promise<AthleteMe> {
    try {
      const response = await httpClient.get<AthleteMe>('/estructura/api/v1/me');
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Obtiene los eventos competitivos oficiales registrados en Estructura (KAN-402 y KAN-403)
   */
  async getCategoryEvents(
    categoryId: string,
    params?: { from?: string; to?: string },
  ): Promise<CompetitiveEvent[]> {
    return matchesApi.getCategoryEvents(categoryId, params);
  },

  /**
   * Crea un evento competitivo oficial en Estructura (KAN-402 y KAN-403)
   */
  async createCategoryEvent(
    categoryId: string,
    data: CreateCompetitiveEventRequest,
  ): Promise<CompetitiveEvent> {
    return matchesApi.createCategoryEvent(categoryId, data);
  },

  /**
   * Obtiene las fases de temporada de la categoría en Estructura (KAN-402 y KAN-403)
   */
  async getCategorySeasonPhases(categoryId: string): Promise<SeasonPhase[]> {
    return matchesApi.getCategorySeasonPhases(categoryId);
  },

  /**
   * Obtiene los partidos de la categoría consumiendo los eventos competitivos de Estructura (KAN-402 / KAN-403)
   */
  async getCategoryMatches(categoryId: string): Promise<Match[]> {
    return matchesApi.getCategoryMatches(categoryId);
  },

  /**
   * Registra un partido oficial enviándolo a la API de eventos competitivos de Estructura (KAN-402 / KAN-403)
   */
  async createCategoryMatch(categoryId: string, data: CreateMatchRequest): Promise<Match> {
    return matchesApi.createCategoryMatch(categoryId, data);
  },
};

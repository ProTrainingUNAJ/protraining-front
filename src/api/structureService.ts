import { httpClient, extractErrorMessage } from './axiosClient';
import { matchesApi } from './matches';
import {
  getMyConsent as getMyConsentApi,
  registerMyConsent as registerMyConsentApi,
  type GetMyConsentResponse,
  type RegisterAdultConsentRequest,
} from './generated/estructura';
import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  Athlete,
  AthleteGuardianConsent,
  CreateAthleteRequest,
  AthleteMe,
  UpdatePhysicalProfileRequest,
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
  atletasCount?: number;
  athletesCount?: number;
  hasPhoto?: boolean;
  photoUpdatedAt?: string | null;
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
  accountId?: string | null;
  nombre?: string;
  firstName?: string;
  apellido?: string;
  lastName?: string;
  nombreCompleto?: string;
  fullName?: string;
  email?: string;
  telefono?: string;
  phone?: string;
  telegramUsername?: string | null;
  esMenorDeEdad?: boolean;
  isMinor?: boolean;
  guardianConsent?: AthleteGuardianConsent | null;
  activo?: boolean;
  active?: boolean;
  categorias?: Array<RawAthleteCategory | string>;
  categories?: Array<RawAthleteCategory | string>;
  categoryNames?: string[];
  contactoEmergencia?: string | null;
  emergencyContact?: string | null;
  activeInjuriesCount?: number;
  hasPhoto?: boolean;
  photoUpdatedAt?: string | null;
  weightKg?: number | null;
  pesoKg?: number | null;
  athleticGoal?: string | null;
  objetivoAtletico?: string | null;
  physicalProfileUpdatedAt?: string | null;
}

function mapOrganization(raw: RawOrganization): Organization {
  return {
    id: raw.id,
    name: raw.nombre ?? raw.name ?? '',
    description: raw.descripcion ?? raw.description ?? null,
    categoriesCount: raw.categoriasCount ?? raw.categoriesCount ?? 0,
    athletesCount: raw.atletasCount ?? raw.athletesCount ?? 0,
    hasPhoto: raw.hasPhoto ?? false,
    photoUpdatedAt: raw.photoUpdatedAt ?? null,
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
    accountId: raw.accountId ?? null,
    firstName,
    lastName,
    fullName: fullName || 'Sin nombre',
    email: raw.email ?? '',
    phone: raw.telefono ?? raw.phone ?? '',
    telegramUsername: raw.telegramUsername ?? null,
    isMinor: raw.esMenorDeEdad ?? raw.isMinor ?? false,
    guardianConsent: raw.guardianConsent ?? null,
    active: raw.activo ?? raw.active ?? true,
    categories,
    categoryNames,
    emergencyContact: raw.contactoEmergencia ?? raw.emergencyContact ?? null,
    activeInjuriesCount: raw.activeInjuriesCount ?? 0,
    hasPhoto: raw.hasPhoto ?? false,
    photoUpdatedAt: raw.photoUpdatedAt ?? null,
    weightKg:
      raw.weightKg !== undefined && raw.weightKg !== null
        ? Number(raw.weightKg)
        : raw.pesoKg !== undefined && raw.pesoKg !== null
          ? Number(raw.pesoKg)
          : null,
    athleticGoal: raw.athleticGoal ?? raw.objetivoAtletico ?? null,
    physicalProfileUpdatedAt: raw.physicalProfileUpdatedAt ?? null,
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

  async updateOrganization(id: string, req: UpdateOrganizationRequest): Promise<Organization> {
    try {
      const response = await httpClient.put<RawOrganization>(
        `/estructura/api/v1/organizations/${id}`,
        {
          name: req.name !== undefined ? req.name.trim() : undefined,
          description: req.description !== undefined ? req.description?.trim() || null : undefined,
        },
      );
      return mapOrganization(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async deleteOrganization(id: string): Promise<void> {
    try {
      await httpClient.delete(`/estructura/api/v1/organizations/${id}`);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async getCategories(organizationId?: string): Promise<Category[]> {
    try {
      const response = await httpClient.get<RawCategory[]>('/estructura/api/v1/categories', {
        params: organizationId ? { organizationId } : undefined,
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

  async updateCategory(id: string, req: UpdateCategoryRequest): Promise<Category> {
    try {
      const response = await httpClient.put<RawCategory>(`/estructura/api/v1/categories/${id}`, {
        name: req.name !== undefined ? req.name.trim() : undefined,
        description: req.description !== undefined ? req.description?.trim() || null : undefined,
      });
      return mapCategory(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      await httpClient.delete(`/estructura/api/v1/categories/${id}`);
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
        telegramUsername: req.telegramUsername?.trim() || null,
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

  // Atletas completos pertenecientes a una categoría (GET /categories/{id}/athletes).
  async getCategoryAthletes(categoryId: string): Promise<Athlete[]> {
    try {
      const response = await httpClient.get<RawAthlete[]>(
        `/estructura/api/v1/categories/${categoryId}/athletes`,
      );
      return (response.data || []).map(mapAthlete);
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

  // Obtiene organizaciones con conteo de categorías y atletas calculados
  async withStructureCounts(organizations: Organization[]): Promise<Organization[]> {
    return Promise.all(
      organizations.map(async (organization) => {
        if (
          typeof organization.categoriesCount === 'number' &&
          organization.categoriesCount > 0 &&
          typeof organization.athletesCount === 'number' &&
          organization.athletesCount >= 0
        ) {
          return organization;
        }
        try {
          const cats = await this.getCategories(organization.id).catch(() => [] as Category[]);
          const catsWithAthletes = await this.withAthleteCounts(cats).catch(() => [] as Category[]);
          const athletesTotal = catsWithAthletes.reduce(
            (acc, curr) => acc + (curr.athletesCount || 0),
            0,
          );
          return {
            ...organization,
            categoriesCount: cats.length,
            athletesCount: athletesTotal,
          };
        } catch {
          return {
            ...organization,
            categoriesCount: organization.categoriesCount || 0,
            athletesCount: organization.athletesCount || 0,
          };
        }
      }),
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
  async withCategories(
    athletes: Athlete[],
    categories: Category[],
    organizations?: Organization[],
  ): Promise<Athlete[]> {
    const orgMap = new Map((organizations || []).map((o) => [o.id, o.name]));
    const memberships = await Promise.all(
      categories.map(async (category) => ({
        category,
        athleteIds: await this.getCategoryAthleteIds(category.id).catch(() => [] as string[]),
      })),
    );

    return athletes.map((athlete) => {
      const athleteCategories = memberships
        .filter(({ athleteIds }) => athleteIds.includes(athlete.id))
        .map(({ category }) => ({
          id: category.id,
          name: category.name,
          organizationId: category.organizationId,
          organizationName: orgMap.get(category.organizationId) || undefined,
        }));
      return {
        ...athlete,
        categories: athleteCategories,
        categoryNames: athleteCategories.map((category) => category.name),
      };
    });
  },

  async updateAthleteStatus(
    athleteId: string,
    active: boolean,
    accountId?: string | null,
  ): Promise<Athlete> {
    try {
      const response = await httpClient.patch<Athlete>(
        `/estructura/api/v1/athletes/${athleteId}/status`,
        { active },
      );
      if (accountId) {
        try {
          await httpClient.patch(`/identidad/api/v1/users/athletes/${accountId}/status`, {
            isActive: active,
          });
        } catch (identidadErr) {
          console.error('Error al sincronizar estado del atleta con identidad:', identidadErr);
          throw new Error(
            `No se pudo sincronizar el acceso del usuario en Identidad: ${extractErrorMessage(identidadErr)}`,
            { cause: identidadErr },
          );
        }
      }
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async updateAthleteEmail(
    athleteId: string,
    email: string,
    accountId?: string | null,
  ): Promise<Athlete> {
    try {
      const response = await httpClient.patch<Athlete>(
        `/estructura/api/v1/athletes/${athleteId}/email`,
        { email },
      );
      if (accountId) {
        try {
          await httpClient.patch(`/identidad/api/v1/users/athletes/${accountId}/email`, { email });
        } catch {
          // Silencioso si falla la sincronización con identidad
        }
      }
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async updateAthlete(
    athleteId: string,
    payload: {
      phone?: string;
      emergencyContact?: string | null;
      telegramUsername?: string | null;
    },
  ): Promise<Athlete> {
    try {
      const response = await httpClient.put<RawAthlete>(
        `/estructura/api/v1/athletes/${athleteId}`,
        {
          ...(payload.phone !== undefined ? { phone: payload.phone.trim() } : {}),
          ...(payload.emergencyContact !== undefined
            ? { emergencyContact: payload.emergencyContact?.trim() || null }
            : {}),
          ...(payload.telegramUsername !== undefined
            ? { telegramUsername: payload.telegramUsername?.trim() || '' }
            : {}),
        },
      );
      return mapAthlete(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  async updateAthletePhone(
    athleteId: string,
    phone: string,
    accountId?: string | null,
  ): Promise<Athlete> {
    try {
      const response = await httpClient.patch<Athlete>(
        `/estructura/api/v1/athletes/${athleteId}/phone`,
        { phone },
      );
      if (accountId) {
        try {
          await httpClient.patch(`/identidad/api/v1/users/athletes/${accountId}/phone`, {
            phoneNumber: phone,
          });
        } catch {
          // Silencioso si falla la sincronización con identidad
        }
      }
      return response.data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
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
   * Actualiza el perfil físico (peso y objetivo deportivo) de un atleta por el PF (KAN-479 / KAN-664).
   */
  async updateAthletePhysicalProfile(
    athleteId: string,
    req: UpdatePhysicalProfileRequest,
  ): Promise<Athlete> {
    try {
      const response = await httpClient.patch<RawAthlete>(
        `/estructura/api/v1/athletes/${athleteId}/physical-profile`,
        {
          weightKg:
            req.weightKg !== undefined && req.weightKg !== null ? Number(req.weightKg) : null,
          athleticGoal: req.athleticGoal?.trim() || null,
        },
      );
      return mapAthlete(response.data);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Autoservicio del atleta: actualiza su propio peso y objetivo deportivo (KAN-479 / KAN-664).
   */
  async updateMyPhysicalProfile(req: UpdatePhysicalProfileRequest): Promise<{
    weightKg?: number | null;
    athleticGoal?: string | null;
    physicalProfileUpdatedAt?: string | null;
  }> {
    try {
      const response = await httpClient.patch<{
        weightKg?: number | null;
        athleticGoal?: string;
        physicalProfileUpdatedAt?: string | null;
      }>('/estructura/api/v1/me/physical-profile', {
        weightKg: req.weightKg !== undefined && req.weightKg !== null ? Number(req.weightKg) : null,
        athleticGoal: req.athleticGoal?.trim() || null,
      });
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

  /**
   * Obtiene el estado del consentimiento digital del atleta autenticado (KAN-326) usando SDK OpenAPI.
   */
  async getMyConsent(): Promise<GetMyConsentResponse> {
    try {
      const { data } = await getMyConsentApi({ throwOnError: true });
      return data;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Registra el consentimiento digital para un atleta adulto autenticado (KAN-326) usando SDK OpenAPI.
   */
  async registerMyConsent(data: RegisterAdultConsentRequest): Promise<GetMyConsentResponse> {
    try {
      const { data: responseData } = await registerMyConsentApi({
        body: data,
        throwOnError: true,
      });
      return responseData;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Devuelve la URL del endpoint de foto del atleta (WebP) con soporte de cache-busting opcional (KAN-512).
   */
  getAthletePhotoUrl(athleteId: string, photoUpdatedAt?: string | null): string {
    const base = `/estructura/api/v1/athletes/${athleteId}/photo`;
    return photoUpdatedAt ? `${base}?v=${encodeURIComponent(photoUpdatedAt)}` : base;
  },

  /**
   * Obtiene la foto del atleta con token Bearer como Blob URL (KAN-512).
   */
  async getAthletePhotoBlob(athleteId: string, photoUpdatedAt?: string | null): Promise<string> {
    const url = this.getAthletePhotoUrl(athleteId, photoUpdatedAt);
    const { data } = await httpClient.get(url, { responseType: 'blob' });
    return URL.createObjectURL(data);
  },

  /**
   * Sube una foto de perfil en formato WebP para el atleta (KAN-512).
   */
  async uploadAthletePhoto(athleteId: string, file: File): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await httpClient.put(`/estructura/api/v1/athletes/${athleteId}/photo`, formData);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Elimina la foto de perfil del atleta (KAN-512).
   */
  async deleteAthletePhoto(athleteId: string): Promise<void> {
    try {
      await httpClient.delete(`/estructura/api/v1/athletes/${athleteId}/photo`);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Devuelve la URL del logo de la organización con soporte de cache-busting opcional (KAN-512).
   */
  getOrganizationPhotoUrl(organizationId: string, photoUpdatedAt?: string | null): string {
    const base = `/estructura/api/v1/organizations/${organizationId}/photo`;
    return photoUpdatedAt ? `${base}?v=${encodeURIComponent(photoUpdatedAt)}` : base;
  },

  /**
   * Obtiene el logo de la organización con token Bearer como Blob URL (KAN-512).
   */
  async getOrganizationPhotoBlob(
    organizationId: string,
    photoUpdatedAt?: string | null,
  ): Promise<string> {
    const url = this.getOrganizationPhotoUrl(organizationId, photoUpdatedAt);
    const { data } = await httpClient.get(url, { responseType: 'blob' });
    return URL.createObjectURL(data);
  },

  /**
   * Sube el logo en formato WebP para la organización (KAN-512).
   */
  async uploadOrganizationPhoto(organizationId: string, file: File): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await httpClient.put(`/estructura/api/v1/organizations/${organizationId}/photo`, formData);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Elimina el logo de la organización (KAN-512).
   */
  async deleteOrganizationPhoto(organizationId: string): Promise<void> {
    try {
      await httpClient.delete(`/estructura/api/v1/organizations/${organizationId}/photo`);
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },
};

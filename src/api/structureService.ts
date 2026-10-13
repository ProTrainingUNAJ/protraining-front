import { httpClient, extractErrorMessage } from './axiosClient';
import {
  Organization,
  CreateOrganizationRequest,
  Category,
  CreateCategoryRequest,
  Athlete,
  CreateAthleteRequest,
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
  condicionesMedicas?: string | null;
  medicalConditions?: string | null;
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
    medicalConditions: raw.condicionesMedicas ?? raw.medicalConditions ?? null,
    activeInjuriesCount: raw.activeInjuriesCount ?? 0,
  };
}

export const structureService = {
  async getOrganizations(): Promise<Organization[]> {
    try {
      const response = await httpClient.get<RawOrganization[]>('/estructura/api/v1/organizaciones');
      return (response.data || []).map(mapOrganization);
    } catch (err: unknown) {
      try {
        const fallback = await httpClient.get<RawOrganization[]>('/estructura/api/organizations');
        return (fallback.data || []).map(mapOrganization);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async createOrganization(req: CreateOrganizationRequest): Promise<Organization> {
    const payload = {
      nombre: req.name.trim(),
      name: req.name.trim(),
      descripcion: req.description?.trim() || null,
      description: req.description?.trim() || null,
    };

    try {
      const response = await httpClient.post<RawOrganization>(
        '/estructura/api/v1/organizaciones',
        payload,
      );
      return mapOrganization(response.data);
    } catch (err: unknown) {
      try {
        const fallback = await httpClient.post<RawOrganization>(
          '/estructura/api/organizations',
          payload,
        );
        return mapOrganization(fallback.data);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async getCategories(organizationId: string): Promise<Category[]> {
    try {
      const response = await httpClient.get<RawCategory[]>(
        `/estructura/api/v1/organizaciones/${organizationId}/categorias`,
      );
      return (response.data || []).map(mapCategory);
    } catch (err: unknown) {
      try {
        const fallback = await httpClient.get<RawCategory[]>(
          `/estructura/api/categories?organizationId=${organizationId}`,
        );
        return (fallback.data || []).map(mapCategory);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async createCategory(organizationId: string, req: CreateCategoryRequest): Promise<Category> {
    const payload = {
      nombre: req.name.trim(),
      name: req.name.trim(),
      descripcion: req.description?.trim() || null,
      description: req.description?.trim() || null,
    };

    try {
      const response = await httpClient.post<RawCategory>(
        `/estructura/api/v1/organizaciones/${organizationId}/categorias`,
        payload,
      );
      return mapCategory(response.data);
    } catch (err: unknown) {
      try {
        const fallback = await httpClient.post<RawCategory>(
          `/estructura/api/categories?organizationId=${organizationId}`,
          payload,
        );
        return mapCategory(fallback.data);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async getAthletes(params?: { categoriaId?: string; soloActivos?: boolean }): Promise<Athlete[]> {
    try {
      const response = await httpClient.get<RawAthlete[]>('/estructura/api/v1/atletas', {
        params: {
          categoriaId: params?.categoriaId,
          soloActivos: params?.soloActivos ?? true,
        },
      });
      return (response.data || []).map(mapAthlete);
    } catch (err: unknown) {
      try {
        const fallback = await httpClient.get<RawAthlete[]>('/estructura/api/athletes');
        return (fallback.data || []).map(mapAthlete);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async createAthlete(req: CreateAthleteRequest): Promise<Athlete> {
    const payload = {
      nombre: req.firstName.trim(),
      firstName: req.firstName.trim(),
      apellido: req.lastName.trim(),
      lastName: req.lastName.trim(),
      email: req.email.trim(),
      telefono: req.phone.trim(),
      phone: req.phone.trim(),
      categorias: req.categoryIds || [],
      categoryIds: req.categoryIds || [],
      contactoEmergencia: req.emergencyContact?.trim() || null,
      emergencyContact: req.emergencyContact?.trim() || null,
      condicionesMedicas: req.medicalConditions?.trim() || null,
      medicalConditions: req.medicalConditions?.trim() || null,
    };

    try {
      const response = await httpClient.post<RawAthlete>('/estructura/api/v1/atletas', payload);
      return mapAthlete(response.data);
    } catch (err: unknown) {
      try {
        const fallback = await httpClient.post<RawAthlete>('/estructura/api/athletes', payload);
        return mapAthlete(fallback.data);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async assignAthleteCategory(athleteId: string, categoryId: string): Promise<void> {
    try {
      await httpClient.post(`/estructura/api/v1/atletas/${athleteId}/categorias/${categoryId}`);
    } catch (err: unknown) {
      try {
        await httpClient.post(`/estructura/api/athletes/${athleteId}/categories/${categoryId}`);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },

  async unassignAthleteCategory(athleteId: string, categoryId: string): Promise<void> {
    try {
      await httpClient.delete(`/estructura/api/v1/atletas/${athleteId}/categorias/${categoryId}`);
    } catch (err: unknown) {
      try {
        await httpClient.delete(`/estructura/api/athletes/${athleteId}/categories/${categoryId}`);
      } catch {
        throw new Error(extractErrorMessage(err));
      }
    }
  },
};

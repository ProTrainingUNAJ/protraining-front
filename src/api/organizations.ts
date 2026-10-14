import { ensureApiConfigured } from './clientConfig';
import {
  listarOrganizaciones,
  crearOrganizacion,
  type Organizacion,
  type CrearOrganizacionRequest,
} from './generated/estructura';
import type { Organization, CreateOrganizationRequest } from '../types/structure';

ensureApiConfigured();

function mapOrganization(raw: Organizacion): Organization {
  return {
    id: raw.id,
    name: raw.nombre,
    description: raw.descripcion ?? null,
    categoriesCount: raw.categoriasCount ?? 0,
  };
}

/**
 * Obtiene todas las organizaciones / clubes del preparador físico autenticado
 */
export async function getOrganizations(): Promise<Organization[]> {
  ensureApiConfigured();
  const res = await listarOrganizaciones({ throwOnError: true });
  const data = (res.data || []) as Organizacion[];
  return data.map(mapOrganization);
}

/**
 * Crea una nueva organización / club
 */
export async function createOrganization(req: CreateOrganizationRequest): Promise<Organization> {
  ensureApiConfigured();
  const body: CrearOrganizacionRequest = {
    nombre: req.name.trim(),
    descripcion: req.description?.trim() || undefined,
  };

  const res = await crearOrganizacion({
    body,
    throwOnError: true,
  });

  return mapOrganization(res.data as Organizacion);
}

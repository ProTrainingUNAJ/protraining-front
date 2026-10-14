import { ensureApiConfigured } from './clientConfig';
import {
  listarAtletas,
  crearAtleta,
  asignarAtletaCategoria,
  desasignarAtletaCategoria,
  generarInvitacionAtleta,
  type Atleta,
  type CrearAtletaRequest,
} from './generated/estructura';
import type { Athlete, CreateAthleteRequest } from '../types/structure';

ensureApiConfigured();

function mapAthlete(raw: Atleta): Athlete {
  const firstName = raw.nombre ?? '';
  const lastName = raw.apellido ?? '';
  const fullName = raw.nombreCompleto || `${firstName} ${lastName}`.trim();
  const catIds = raw.categorias ?? [];

  return {
    id: raw.id,
    firstName,
    lastName,
    fullName: fullName || 'Sin nombre',
    email: raw.email ?? '',
    phone: raw.telefono ?? '',
    isMinor: raw.esMenorDeEdad ?? false,
    active: raw.activo ?? true,
    categoryNames: catIds,
    categories: catIds.map((id) => ({ id, name: id })),
    emergencyContact: raw.contactoEmergencia ?? null,
    medicalConditions: raw.condicionesMedicas ?? null,
    activeInjuriesCount: raw.lesionesActivasCount ?? 0,
  };
}

/**
 * Obtiene el listado de atletas, con filtros opcionales de categoría y estado activo
 */
export async function getAthletes(params?: {
  categoriaId?: string;
  soloActivos?: boolean;
}): Promise<Athlete[]> {
  ensureApiConfigured();
  const res = await listarAtletas({
    query: {
      categoriaId: params?.categoriaId,
      soloActivos: params?.soloActivos ?? true,
    },
    throwOnError: true,
  });
  const data = (res.data || []) as Atleta[];
  return data.map(mapAthlete);
}

/**
 * Da de alta un nuevo atleta en el sistema
 */
export async function createAthlete(req: CreateAthleteRequest): Promise<Athlete> {
  ensureApiConfigured();
  const body: CrearAtletaRequest = {
    nombre: req.firstName.trim(),
    apellido: req.lastName.trim(),
    email: req.email.trim(),
    telefono: req.phone.trim(),
    categoriaIds: req.categoryIds,
    esMenorDeEdad: false,
    contactoEmergencia: req.emergencyContact?.trim() || undefined,
    condicionesMedicas: req.medicalConditions?.trim() || undefined,
  };

  const res = await crearAtleta({
    body,
    throwOnError: true,
  });

  return mapAthlete(res.data as Atleta);
}

/**
 * Asigna un atleta a una categoría específica
 */
export async function assignAthleteCategory(athleteId: string, categoryId: string): Promise<void> {
  ensureApiConfigured();
  await asignarAtletaCategoria({
    path: {
      atletaId: athleteId,
      categoriaId: categoryId,
    },
    throwOnError: true,
  });
}

/**
 * Desasigna un atleta de una categoría
 */
export async function unassignAthleteCategory(
  athleteId: string,
  categoryId: string,
): Promise<void> {
  ensureApiConfigured();
  await desasignarAtletaCategoria({
    path: {
      atletaId: athleteId,
      categoriaId: categoryId,
    },
    throwOnError: true,
  });
}

/**
 * Genera el enlace de invitación para el atleta
 */
export async function generateAthleteInvite(athleteId: string): Promise<string> {
  ensureApiConfigured();
  const res = await generarInvitacionAtleta({
    path: { atletaId: athleteId },
    throwOnError: true,
  });
  return (res.data as { invitacionUrl?: string })?.invitacionUrl || '';
}

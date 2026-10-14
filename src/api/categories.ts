import { ensureApiConfigured } from './clientConfig';
import {
  listarCategorias,
  crearCategoria,
  type Categoria,
  type CrearCategoriaRequest,
} from './generated/estructura';
import type { Category, CreateCategoryRequest } from '../types/structure';

ensureApiConfigured();

function mapCategory(raw: Categoria): Category {
  return {
    id: raw.id,
    organizationId: raw.organizacionId,
    name: raw.nombre,
    description: raw.descripcion ?? null,
    athletesCount: raw.atletasCount ?? 0,
  };
}

/**
 * Obtiene las categorías de una organización específica
 */
export async function getCategories(organizationId: string): Promise<Category[]> {
  ensureApiConfigured();
  const res = await listarCategorias({
    path: { organizacionId: organizationId },
    throwOnError: true,
  });
  const data = (res.data || []) as Categoria[];
  return data.map(mapCategory);
}

/**
 * Crea una nueva categoría dentro de una organización
 */
export async function createCategory(
  organizationId: string,
  req: CreateCategoryRequest,
): Promise<Category> {
  ensureApiConfigured();
  const body: CrearCategoriaRequest = {
    nombre: req.name.trim(),
    descripcion: req.description?.trim() || undefined,
  };

  const res = await crearCategoria({
    path: { organizacionId: organizationId },
    body,
    throwOnError: true,
  });

  return mapCategory(res.data as Categoria);
}

import { structureService } from './structureService';
import { getCategoryTrafficLightToday, mapTrafficLightSummaryToItem } from './seguimientoService';
import { dayAdjustmentsService } from './dayAdjustments';
import type { AthleteTrafficLightItem } from '../components/monitoring/trafficLight.types';
import type { Athlete } from '../types/structure';

// Datos de contacto de la ficha, con la misma regla que Seguimiento: a un menor se le escribe al
// tutor, nunca a él (KAN-503).
function contactFieldsOf(detail?: Athlete): Partial<AthleteTrafficLightItem> {
  if (!detail) return {};
  const isMinor = Boolean(detail.isMinor);
  return {
    phone: isMinor ? null : (detail.phone ?? null),
    telegramUsername: isMinor ? null : (detail.telegramUsername ?? null),
    isMinor,
    guardianPhone: detail.guardianConsent?.guardianPhone ?? null,
    guardianName: detail.guardianConsent?.guardianName ?? null,
    // Sin foto cargada no se pide la imagen (evita un 404 por atleta)
    avatarUrl: detail.hasPhoto
      ? structureService.getAthletePhotoUrl(detail.id, detail.photoUpdatedAt)
      : undefined,
  };
}

export interface CoachTodayOverview {
  /** Atletas del semáforo de hoy de todas las categorías del PF, sin repetir. */
  athletes: AthleteTrafficLightItem[];
  /** Alguna categoría no respondió: los datos están incompletos, pero se muestran. */
  partial: boolean;
  /**
   * Ids de los atletas de cada categoría que respondió. Permite contar cómo llega el plantel de
   * una sesión puntual (Próximo entrenamiento). Un atleta puede estar en más de una categoría.
   */
  athleteIdsByCategory?: Record<string, string[]>;
}

/**
 * Semáforo de hoy de todo el plantel del PF para el Inicio (KAN-594).
 *
 * Distingue "error" de "vacío" (principio "datos reales o nada"):
 * - si no se pueden leer las organizaciones, o fallan TODAS las categorías, lanza un error;
 *   el Inicio muestra el error con "Reintentar" en vez de ceros que parecen reales;
 * - si falla solo alguna categoría, devuelve el resto con `partial: true`.
 *
 * Marca `hasDayConflict` en los atletas cuya rutina de hoy carga una zona con dolor, con una
 * sola consulta por categoría y solo en las categorías con dolor reportado (mismo criterio que
 * Seguimiento, KAN-574). Si el Asistente no responde, se sigue sin esa marca.
 */
export async function fetchCoachTodayOverview(): Promise<CoachTodayOverview> {
  const organizations = await structureService.getOrganizations();

  let partial = false;
  const categoriesByOrg = await Promise.all(
    organizations.map((organization) =>
      structureService.getCategories(organization.id).catch(() => {
        partial = true;
        return [];
      }),
    ),
  );
  const categories = categoriesByOrg.flat();
  if (categories.length === 0) {
    if (partial) throw new Error('No se pudieron consultar tus categorías.');
    return { athletes: [], partial: false, athleteIdsByCategory: {} };
  }

  const results = await Promise.all(
    categories.map(async (category) => {
      try {
        // La ficha (teléfono, tutor, foto) es un extra: si falla, se sigue sin "Escribirle"
        const [summaries, details] = await Promise.all([
          getCategoryTrafficLightToday(category.id),
          structureService.getAthletes({ categoriaId: category.id }).catch((): Athlete[] => []),
        ]);
        const detailById = new Map(details.map((d) => [d.id.toLowerCase(), d]));
        return {
          categoryId: category.id,
          ok: true,
          hasPain: summaries.some((s) => Boolean(s.indicators?.painZones?.trim())),
          items: summaries.map((summary) => ({
            ...mapTrafficLightSummaryToItem(summary, category.name),
            ...contactFieldsOf(detailById.get(summary.athleteId.toLowerCase())),
          })),
        };
      } catch {
        return { categoryId: category.id, ok: false, hasPain: false, items: [] };
      }
    }),
  );

  if (results.every((result) => !result.ok)) {
    throw new Error('No se pudo consultar el semáforo del día.');
  }
  if (results.some((result) => !result.ok)) partial = true;

  const conflicted = new Set<string>();
  const categoriesWithPain = results.filter((result) => result.ok && result.hasPain);
  const conflictsByCategory = await Promise.all(
    categoriesWithPain.map((result) =>
      dayAdjustmentsService.getCategoryDayConflicts(result.categoryId).catch(() => null),
    ),
  );
  for (const response of conflictsByCategory) {
    for (const entry of response?.athletes ?? []) {
      if (entry.hasConflicts && entry.athleteId) conflicted.add(entry.athleteId.toLowerCase());
    }
  }

  // Un atleta puede pertenecer a más de una categoría: se deduplica por id.
  const seen = new Set<string>();
  const athletes: AthleteTrafficLightItem[] = [];
  for (const item of results.flatMap((result) => result.items)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    athletes.push({ ...item, hasDayConflict: conflicted.has(item.id.toLowerCase()) });
  }

  const athleteIdsByCategory: Record<string, string[]> = {};
  for (const result of results) {
    if (result.ok) athleteIdsByCategory[result.categoryId] = result.items.map((item) => item.id);
  }

  return { athletes, partial, athleteIdsByCategory };
}

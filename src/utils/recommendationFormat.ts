import type { AthleteRecommendation, RecommendationStatusFilter } from '../api/recommendations';

/**
 * Capitaliza únicamente la primera letra para mostrar motivos del motor en UI
 * sin alterar los textos literales almacenados en el backend.
 */
export function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function getRecommendationCountLabel(
  count: number,
  statusTab: RecommendationStatusFilter,
): string {
  switch (statusTab) {
    case 'Pending':
      return count === 1 ? '1 pendiente' : `${count} pendientes`;
    case 'Approved':
      return count === 1 ? '1 aprobada' : `${count} aprobadas`;
    case 'Discarded':
      return count === 1 ? '1 descartada' : `${count} descartadas`;
  }
}

export function getRecommendationDisplaySubtitle(
  subtitle: string | null | undefined,
  recommendations: AthleteRecommendation[],
): string {
  if (subtitle?.trim()) return subtitle.trim();

  const uniqueCategories = Array.from(
    new Set(
      recommendations
        .map((rec) => rec.categoryName?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  return uniqueCategories.join(', ') || 'Plantel deportivo';
}

export type TextBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;
/** Énfasis de Markdown que a veces escribe la IA (*palabra* o **palabra**): se muestra sin asteriscos. */
const MARKDOWN_EMPHASIS = /\*{1,2}([^*\n]+?)\*{1,2}/g;
const stripEmphasis = (text: string) => text.replace(MARKDOWN_EMPHASIS, '$1');

/** Parte el texto en párrafos (una línea = un párrafo) y agrupa en lista las líneas con viñeta. */
export function splitRecommendationText(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      const item = capitalizeFirst(stripEmphasis(line.replace(BULLET, '')));
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'list') last.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else {
      blocks.push({ kind: 'paragraph', text: capitalizeFirst(stripEmphasis(line)) });
    }
  }
  return blocks;
}

export interface HabitsSection {
  title: string;
  blocks: TextBlock[];
}

const PROTEIN_PREFIX = /^prote[ií]na diaria orientativa/i;
const REFERRAL_PREFIX = /^antes de hacer cambios/i;
/** Títulos de las dos primeras partes, en el orden en que el Asistente arma el texto. */
const HABITS_TITLES = ['Comidas', 'Hidratación y descanso'];

/**
 * Separa el texto de una recomendación de hábitos en secciones con título (KAN-660).
 *
 * El Asistente lo arma uniendo con saltos de línea, siempre en este orden: comidas, hidratación y
 * descanso, proteína orientativa (si hay), derivación a un profesional (si hay) y aviso legal.
 * Acá solo se le pone título a cada parte: no se agrega ni se cambia contenido. El aviso legal se
 * saca del cuerpo porque la tarjeta ya lo muestra aparte. Si el texto viene en un solo bloque
 * (recomendaciones viejas o redactadas distinto), devuelve null y se muestra como antes.
 */
export function splitHabitsSections(
  text: string,
  legalDisclaimer?: string | null,
): HabitsSection[] | null {
  const disclaimer = legalDisclaimer?.trim().toLowerCase();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !disclaimer || line.toLowerCase() !== disclaimer);

  const general: string[] = [];
  let protein: string | null = null;
  let referral: string | null = null;
  for (const line of lines) {
    if (PROTEIN_PREFIX.test(line)) protein = line;
    else if (REFERRAL_PREFIX.test(line)) referral = line;
    else general.push(line);
  }

  // Sin al menos dos partes no hay secciones que mostrar
  if (general.length + (protein ? 1 : 0) + (referral ? 1 : 0) < 2) return null;

  const sections: HabitsSection[] = [];
  general.forEach((line, index) => {
    const blocks = splitRecommendationText(line);
    if (index < HABITS_TITLES.length) {
      sections.push({ title: HABITS_TITLES[index], blocks });
    } else {
      // Partes extra (poco común): se suman a la última sección con título
      sections[sections.length - 1].blocks.push(...blocks);
    }
  });
  if (protein) sections.push({ title: 'Proteína', blocks: splitRecommendationText(protein) });
  if (referral) {
    sections.push({
      title: 'Consultá a un profesional',
      blocks: splitRecommendationText(referral),
    });
  }
  return sections;
}

/**
 * Vista previa corta de una recomendación (campanita del atleta, KAN-660): el primer párrafo,
 * cortado en una palabra con "…" si pasa del máximo. El texto completo queda en el Inicio.
 */
export function previewRecommendationText(text: string, maxChars = 180): string {
  const firstLine =
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? '';
  const plain = firstLine.replace(/\*{1,2}([^*\n]+?)\*{1,2}/g, '$1');
  const hasMore = plain.length > maxChars || text.trim().length > firstLine.length;
  if (plain.length <= maxChars) return hasMore ? `${plain.replace(/[.,;:]?$/, '')}…` : plain;
  const cut = plain.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '')}…`;
}

/**
 * Capitaliza únicamente la primera letra para mostrar motivos del motor en UI
 * sin alterar los textos literales almacenados en el backend.
 */
export function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export type TextBlock = { kind: 'paragraph'; text: string } | { kind: 'list'; items: string[] };

const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;

/** Parte el texto en párrafos (una línea = un párrafo) y agrupa en lista las líneas con viñeta. */
export function splitRecommendationText(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      const item = capitalizeFirst(line.replace(BULLET, ''));
      const last = blocks[blocks.length - 1];
      if (last?.kind === 'list') last.items.push(item);
      else blocks.push({ kind: 'list', items: [item] });
    } else {
      blocks.push({ kind: 'paragraph', text: capitalizeFirst(line) });
    }
  }
  return blocks;
}

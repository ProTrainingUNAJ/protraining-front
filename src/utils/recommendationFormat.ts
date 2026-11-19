/**
 * Capitaliza únicamente la primera letra para mostrar motivos del motor en UI
 * sin alterar los textos literales almacenados en el backend.
 */
export function capitalizeFirst(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

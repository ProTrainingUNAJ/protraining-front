/**
 * Copia texto al portapapeles usando Clipboard API.
 * Devuelve true únicamente si la escritura fue exitosa; nunca reporta éxito si falla.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

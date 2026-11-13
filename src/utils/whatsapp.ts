/**
 * Construye el enlace universal a WhatsApp (wa.me) para abrir un chat directo.
 * Cumple con el criterio de codificar parámetros con encodeURIComponent
 * y devolver null si no hay número de teléfono cargado.
 */
export function buildWhatsAppLink(
  phoneNumber?: string | null,
  initialText?: string,
): string | null {
  if (!phoneNumber) return null;

  // Remueve cualquier carácter que no sea dígito por seguridad
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  if (cleanDigits.length === 0) return null;

  const baseUrl = `https://wa.me/${cleanDigits}`;
  if (initialText && initialText.trim().length > 0) {
    return `${baseUrl}?text=${encodeURIComponent(initialText.trim())}`;
  }

  return baseUrl;
}

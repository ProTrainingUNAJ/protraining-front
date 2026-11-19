const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z0-9_]{5,32}$/;

/**
 * Normaliza un username de Telegram: recorta espacios, quita un único '@' inicial
 * y devuelve null si queda vacío o no cumple el formato válido.
 */
export function normalizeTelegramUsername(username?: string | null): string | null {
  if (!username) return null;
  const trimmed = username.trim();
  if (!trimmed) return null;
  const withoutLeadingAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  if (!TELEGRAM_USERNAME_REGEX.test(withoutLeadingAt)) {
    return null;
  }
  return withoutLeadingAt;
}

/**
 * Valida un username de Telegram opcional y devuelve un mensaje de error en español si es inválido,
 * o null si es válido o está vacío.
 */
export function validateTelegramUsername(username?: string | null): string | null {
  if (!username || !username.trim()) {
    return null;
  }
  const trimmed = username.trim();
  const withoutLeadingAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  if (withoutLeadingAt.includes('@')) {
    return "El usuario de Telegram no puede contener múltiples '@'.";
  }
  if (withoutLeadingAt.length < 5 || withoutLeadingAt.length > 32) {
    return 'El usuario de Telegram debe tener entre 5 y 32 caracteres.';
  }
  if (!TELEGRAM_USERNAME_REGEX.test(withoutLeadingAt)) {
    return 'El usuario de Telegram solo puede contener letras, números y guión bajo.';
  }
  return null;
}

/**
 * Construye el deep-link oficial de Telegram (https://t.me/<username>).
 * Nota: Telegram no soporta precargar texto en chats privados mediante query params como WhatsApp.
 */
export function buildTelegramLink(username?: string | null): string | null {
  const normalized = normalizeTelegramUsername(username);
  if (!normalized) return null;
  return `https://t.me/${normalized}`;
}

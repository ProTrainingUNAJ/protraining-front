import { useCallback, useEffect, useState } from 'react';

export const SIDEBAR_EXPANDED_STORAGE_KEY = 'protraining_sidebar_expanded';

// Desde este ancho el menú lateral arranca desplegado (ícono + nombre)
export const SIDEBAR_WIDE_QUERY = '(min-width: 1280px)';

function readStoredChoice(): boolean | null {
  try {
    const value = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
  } catch {
    // Almacenamiento bloqueado (modo privado, permisos): se usa el default por ancho
    return null;
  }
}

function writeStoredChoice(expanded: boolean): void {
  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(expanded));
  } catch {
    // Si no se puede guardar, la elección vale solo para esta sesión
  }
}

function matchesWide(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(SIDEBAR_WIDE_QUERY).matches;
}

/**
 * Estado del menú lateral de escritorio (plegado / desplegado).
 * Si el usuario ya eligió, gana su elección guardada; si no, se despliega en
 * pantallas de 1280 px o más y se pliega entre 992 y 1279 px.
 */
export function useSidebarExpanded(): { expanded: boolean; toggle: () => void } {
  const [storedChoice, setStoredChoice] = useState<boolean | null>(readStoredChoice);
  const [isWide, setIsWide] = useState<boolean>(matchesWide);

  // Sin elección guardada, el default sigue al ancho de la ventana
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia(SIDEBAR_WIDE_QUERY);
    const handleChange = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  const expanded = storedChoice ?? isWide;

  const toggle = useCallback(() => {
    const next = !expanded;
    setStoredChoice(next);
    writeStoredChoice(next);
  }, [expanded]);

  return { expanded, toggle };
}

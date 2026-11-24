import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from '../AppShell';
import { SIDEBAR_EXPANDED_STORAGE_KEY } from '../../../hooks/useSidebarExpanded';

// Los botones del encabezado y el perfil hacen llamadas a la API: acá solo interesa el menú lateral
vi.mock('../ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('../NotificationsButton', () => ({ NotificationsButton: () => null }));
vi.mock('../CalendarButton', () => ({ CalendarButton: () => null }));
vi.mock('../../athlete/ContactPfButton', () => ({ ContactPfButton: () => null }));
vi.mock('../UserSidebarProfile', () => ({ UserSidebarProfile: () => null }));

function mockViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const min = /min-width:\s*(\d+)px/.exec(query);
      const max = /max-width:\s*(\d+)px/.exec(query);
      const matches =
        (min ? width >= Number(min[1]) : true) && (max ? width <= Number(max[1]) : true);
      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

function renderShell(role: 'pf' | 'athlete' = 'pf') {
  const root = role === 'pf' ? '/pf' : '/athlete';
  return render(
    <MemoryRouter initialEntries={[root]}>
      <Routes>
        <Route path={root} element={<AppShell role={role} />}>
          <Route index element={<p>Contenido</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function getDesktopSidebar(container: HTMLElement): HTMLElement {
  const sidebar = container.querySelector<HTMLElement>('.app-sidebar-desktop');
  if (!sidebar) throw new Error('No se encontró el menú lateral de escritorio');
  return sidebar;
}

describe('AppShell – menú lateral plegable en escritorio', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it.each([1440, 1280])('arranca desplegado a %i px', (width) => {
    mockViewport(width);
    const { container } = renderShell();

    const toggle = screen.getByRole('button', { name: 'Ocultar nombres' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('title')).toBe('Ocultar nombres');
    expect(getDesktopSidebar(container).classList.contains('is-expanded')).toBe(true);
  });

  it('arranca plegado a 1024 px', () => {
    mockViewport(1024);
    const { container } = renderShell();

    const toggle = screen.getByRole('button', { name: 'Mostrar nombres' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(getDesktopSidebar(container).classList.contains('is-collapsed')).toBe(true);
  });

  it('el botón alterna aria-expanded y su texto', () => {
    mockViewport(1440);
    const { container } = renderShell();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar nombres' }));

    const toggle = screen.getByRole('button', { name: 'Mostrar nombres' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('title')).toBe('Mostrar nombres');
    expect(getDesktopSidebar(container).classList.contains('is-collapsed')).toBe(true);

    fireEvent.click(toggle);
    expect(
      screen.getByRole('button', { name: 'Ocultar nombres' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('guarda la elección en localStorage', () => {
    mockViewport(1440);
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar nombres' }));
    expect(window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nombres' }));
    expect(window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)).toBe('true');
  });

  it('la elección guardada gana sobre el default por ancho (PF y atleta)', () => {
    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, 'false');
    mockViewport(1440);
    const { unmount } = renderShell('pf');
    expect(
      screen.getByRole('button', { name: 'Mostrar nombres' }).getAttribute('aria-expanded'),
    ).toBe('false');
    unmount();

    window.localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, 'true');
    mockViewport(1024);
    renderShell('athlete');
    expect(
      screen.getByRole('button', { name: 'Ocultar nombres' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('si localStorage falla, usa el default por ancho y el botón sigue andando', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    mockViewport(1024);
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar nombres' }));
    expect(
      screen.getByRole('button', { name: 'Ocultar nombres' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('el drawer de celular no muestra el botón de plegar', () => {
    mockViewport(390);
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }));
    const drawer = screen.getByRole('dialog', { name: 'Menú de navegación móvil' });
    expect(drawer.querySelector('.app-sidebar-toggle')).toBeNull();
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsView } from '../SettingsView';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'pf-01',
      fullName: 'Profe Test',
      email: 'profe@test.com',
      role: 'PreparadorFisico',
      phoneNumber: '+54 9 11 1234-5678',
      pfId: null,
      mustChangePassword: false,
    },
    updateCurrentUser: vi.fn(),
    logout: vi.fn(),
    themePreference: 'system',
    setThemePreference: vi.fn(),
  }),
}));

vi.mock('../../../api/users', () => ({
  usersService: {
    updateProfile: vi.fn(),
    deactivateAccount: vi.fn(),
    getMyPhotoUrl: vi.fn(() => null),
    uploadMyPhoto: vi.fn(),
    deleteMyPhoto: vi.fn(),
    updatePfHabitsRecommendations: vi.fn().mockResolvedValue({ enabled: true }),
    getPfHabitsRecommendations: vi.fn().mockResolvedValue({ enabled: true }),
  },
}));

vi.mock('../../../api/pushNotifications', () => ({
  isPushSupported: () => false,
  isUserSubscribed: vi.fn().mockResolvedValue(false),
  getNotificationPermission: () => 'default',
}));

describe('Estabilidad de Layout y Pestañas en Configuración (KAN-598)', () => {
  it('renderiza el contenedor con clase settings-tab-container y el panel con settings-tab-panel', () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    const tabContainer = container.querySelector('.settings-tab-container');
    expect(tabContainer).not.toBeNull();

    const tabPanel = container.querySelector('.settings-tab-panel');
    expect(tabPanel).not.toBeNull();
    expect(tabPanel?.getAttribute('role')).toBe('tabpanel');
  });

  it('mantiene el botón Guardar Cambios visible y fijo en el header al alternar de pestaña (PF)', () => {
    render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    // En Perfil el botón Guardar Cambios debe estar en el header
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDefined();

    // Cambiar a Apariencia
    const appearanceTab = screen.getByRole('tab', { name: /Apariencia/i });
    fireEvent.click(appearanceTab);
    expect(screen.getByText('Apariencia e Interfaz')).toBeDefined();

    // El botón Guardar Cambios sigue presente en el header (layout fijo sin desplazamiento)
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDefined();

    // Cambiar a Seguridad
    const securityTab = screen.getByRole('tab', { name: /Seguridad/i });
    fireEvent.click(securityTab);
    expect(screen.getByText('Cuenta de Google')).toBeDefined();
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDefined();

    // Cambiar a Notificaciones
    const notificationsTab = screen.getByRole('tab', { name: /Notificaciones/i });
    fireEvent.click(notificationsTab);
    expect(screen.getByText('Ajustes de Notificaciones')).toBeDefined();

    // El botón Guardar Cambios sigue presente en el header
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDefined();
  });

  it('asigna atributos de accesibilidad ARIA a las pestañas y al panel activo', () => {
    render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const profileTab = screen.getByRole('tab', { name: /Perfil/i });
    const marksTab = screen.getByRole('tab', { name: /Mis marcas/i });

    expect(profileTab.getAttribute('aria-selected')).toBe('true');
    expect(marksTab.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(marksTab);

    expect(marksTab.getAttribute('aria-selected')).toBe('true');
    expect(profileTab.getAttribute('aria-selected')).toBe('false');

    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-marks');
  });

  it('cuenta con la clase settings-page-container para reordenar en mobile el boton Guardar Cambios debajo de las pestañas (KAN-660)', () => {
    const { container } = render(
      <MemoryRouter>
        <SettingsView role="athlete" />
      </MemoryRouter>,
    );

    const pageContainer = container.querySelector('.settings-page-container');
    expect(pageContainer).not.toBeNull();
    expect(container.querySelector('.app-page-header')).not.toBeNull();
    expect(container.querySelector('.settings-tab-list')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Guardar Cambios/i })).toBeDefined();
  });

  it('en Apariencia el inglés aparece como "Próximamente" y deshabilitado (KAN-660)', () => {
    render(
      <MemoryRouter>
        <SettingsView role="pf" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /Apariencia/i }));

    const english = screen.getByRole('option', {
      name: /English — Próximamente/,
    }) as HTMLOptionElement;
    expect(english.disabled).toBe(true);
    const select = screen.getByLabelText('Idioma de la Interfaz') as HTMLSelectElement;
    expect(select.value).toBe('es');
    expect(screen.getByText(/El inglés llega próximamente/)).toBeDefined();
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clearLocal: vi.fn(),
  clearOffline: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  state: { expiredHandler: null as (() => void) | null },
}));

vi.mock('../../api/axiosClient', () => ({
  onAuthExpired: (handler: () => void) => {
    mocks.state.expiredHandler = handler;
    return () => {
      mocks.state.expiredHandler = null;
    };
  },
  saveStoredSession: vi.fn(),
}));

vi.mock('../../api/authService', () => ({
  authService: {
    getValidSession: () => null,
    logout: mocks.logout,
  },
}));

vi.mock('../../components/athlete/checkin/checkInHelper', () => ({
  clearAllCheckInData: mocks.clearLocal,
}));

vi.mock('../../services/checkInOfflineService', () => ({
  clearAllOfflineCheckIns: mocks.clearOffline,
}));

import { AuthProvider, useAuth } from '../AuthContext';

const Consumer = () => {
  const { logout } = useAuth();
  return <button onClick={logout}>Salir</button>;
};

describe('limpieza del check-in al cerrar sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.expiredHandler = null;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    });
  });

  it('limpia el almacenamiento local y los pendientes de IndexedDB al hacer logout', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));

    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.clearLocal).toHaveBeenCalledTimes(1);
    expect(mocks.clearOffline).toHaveBeenCalledTimes(1);
  });

  it('limpia ambos almacenamientos cuando expira el token', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(mocks.state.expiredHandler).not.toBeNull();
    mocks.state.expiredHandler?.();

    expect(mocks.clearLocal).toHaveBeenCalledTimes(1);
    expect(mocks.clearOffline).toHaveBeenCalledTimes(1);
  });
});

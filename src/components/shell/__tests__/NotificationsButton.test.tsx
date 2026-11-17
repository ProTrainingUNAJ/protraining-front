import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationsButton } from '../NotificationsButton';
import { alertsService } from '../../../api/alertsService';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../api/alertsService', () => ({
  alertsService: {
    getPendingAlerts: vi.fn(),
    applyNoticeAction: vi.fn(),
    archiveAlert: vi.fn(),
  },
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedGetPendingAlerts = vi.mocked(alertsService.getPendingAlerts);
const mockedUseAuth = vi.mocked(useAuth);

describe('NotificationsButton (Centro de Avisos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('no renderiza la campana si el rol no es PreparadorFisico', () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'Atleta' } } as never);

    render(<NotificationsButton />);

    expect(screen.queryByTitle('Centro de Avisos')).toBeNull();
  });

  it('muestra un estado vacío amigable cuando el back de avisos falla', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);
    mockedGetPendingAlerts.mockRejectedValue(new Error('Request failed with status code 500'));

    render(<NotificationsButton />);
    fireEvent.click(screen.getByTitle('Centro de Avisos'));

    await waitFor(() => {
      expect(screen.getByText('Sin avisos pendientes por el momento')).toBeTruthy();
    });
    expect(screen.queryByText('Request failed with status code 500')).toBeNull();
  });

  it('muestra los avisos reales con su acción de un clic', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);
    mockedGetPendingAlerts.mockResolvedValue([
      {
        id: 'alert-1',
        athleteId: 'ath-1',
        athleteName: 'Lucas Fernández',
        generatedAt: '08:00',
        severity: 'High',
        reason: 'Sobrecarga acumulada',
        suggestion: 'Programar una sesión de descarga',
        reviewed: false,
        canApplyWithOneClick: true,
        actionType: 'routine_adjustment',
        actionLabel: 'Aplicar ajuste recomendado',
      },
    ]);

    render(<NotificationsButton />);
    fireEvent.click(screen.getByTitle('Centro de Avisos'));

    await waitFor(() => {
      expect(screen.getByText('Lucas Fernández')).toBeTruthy();
    });
    expect(screen.getByText('Aplicar ajuste recomendado')).toBeTruthy();
  });
});

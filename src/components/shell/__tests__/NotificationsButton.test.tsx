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
const mockedApplyNoticeAction = vi.mocked(alertsService.applyNoticeAction);
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

  it('permite aplicar el ajuste de carga en un clic con confirmación visual (KAN-478)', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);
    const mateoAlert = {
      id: 'alert-mateo',
      athleteId: 'ath-mateo',
      athleteName: 'Mateo González',
      generatedAt: '08:30',
      severity: 'High' as const,
      reason: 'Fatiga acumulada por volumen de partidos',
      suggestion: 'Reducir carga un 20% en la sesión de hoy',
      reviewed: false,
      canApplyWithOneClick: true,
      actionType: 'load_reduction' as const,
      actionLabel: 'Aplicar ajuste (1 clic)',
    };
    mockedGetPendingAlerts.mockResolvedValue([mateoAlert]);
    mockedApplyNoticeAction.mockResolvedValue({
      success: true,
      message: 'Ajuste preventivo aplicado exitosamente en Entrenamiento.',
    });

    render(<NotificationsButton />);
    fireEvent.click(screen.getByTitle('Centro de Avisos'));

    await waitFor(() => {
      expect(screen.getByText('Mateo González')).toBeTruthy();
    });

    const button = screen.getByRole('button', {
      name: /aplicar ajuste \(1 clic\): Mateo González/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedApplyNoticeAction).toHaveBeenCalledWith(mateoAlert);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Ajuste preventivo aplicado exitosamente en Entrenamiento.'),
      ).toBeTruthy();
    });
  });

  it('muestra el mensaje de error si Entrenamiento falla al aplicar el ajuste en un clic (KAN-478 / KAN-373)', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);
    const mateoAlert = {
      id: 'alert-mateo-err',
      athleteId: 'ath-mateo',
      athleteName: 'Mateo González',
      generatedAt: '08:30',
      severity: 'High' as const,
      reason: 'Fatiga acumulada',
      suggestion: 'Reducir carga un 20%',
      reviewed: false,
      canApplyWithOneClick: true,
      actionType: 'load_reduction' as const,
      actionLabel: 'Aplicar ajuste (1 clic)',
    };
    mockedGetPendingAlerts.mockResolvedValue([mateoAlert]);
    mockedApplyNoticeAction.mockRejectedValue(
      new Error('El atleta no tiene una sesión de entrenamiento programada para el día de hoy.'),
    );

    render(<NotificationsButton />);
    fireEvent.click(screen.getByTitle('Centro de Avisos'));

    await waitFor(() => {
      expect(screen.getByText('Mateo González')).toBeTruthy();
    });

    const button = screen.getByRole('button', {
      name: /aplicar ajuste \(1 clic\): Mateo González/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(
          'El atleta no tiene una sesión de entrenamiento programada para el día de hoy.',
        ),
      ).toBeTruthy();
    });

    // El aviso no se elimina de la lista
    expect(screen.getByText('Mateo González')).toBeTruthy();
  });

  it('formatea zonas crudas legacy dentro del motivo del aviso (KAN-631)', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);
    mockedGetPendingAlerts.mockResolvedValue([
      {
        id: 'alert-legacy-zones',
        athleteId: 'ath-99',
        athleteName: 'Mateo Fernández',
        generatedAt: '00:10',
        severity: 'High',
        reason:
          'Riesgo de lesión inminente: el atleta reporta lesión activa o molestia aguda en zona: abdominales:1,biceps_izquierdo:6,pecho_derecho:5 en sus check-ins recientes.',
        suggestion: 'Suspender ejercicios que sobrecarguen la zona afectada.',
        reviewed: false,
        canApplyWithOneClick: true,
        actionLabel: 'Marcar como revisado',
      },
    ]);

    render(<NotificationsButton />);
    fireEvent.click(screen.getByTitle('Centro de Avisos'));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Abdominales \[Nivel 1\], Bíceps izquierdo \[Nivel 6 - Lesión activa\], Pecho derecho \[Nivel 5\]/,
        ),
      ).toBeTruthy();
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NotificationsButton } from '../NotificationsButton';
import { ALERTS_CHANGED_EVENT, alertsService } from '../../../api/alertsService';
import { recommendationsService } from '../../../api/recommendations';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../api/alertsService', () => ({
  ALERTS_CHANGED_EVENT: 'protraining-alerts-changed',
  alertsService: {
    getPendingAlerts: vi.fn(),
    applyNoticeAction: vi.fn(),
    archiveAlert: vi.fn(),
  },
}));
vi.mock('../../../api/recommendations', () => ({
  recommendationsService: {
    listMyRecommendations: vi.fn(),
  },
}));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockedGetPendingAlerts = vi.mocked(alertsService.getPendingAlerts);
const mockedApplyNoticeAction = vi.mocked(alertsService.applyNoticeAction);
const mockedListMyRecommendations = vi.mocked(recommendationsService.listMyRecommendations);
const mockedUseAuth = vi.mocked(useAuth);

describe('NotificationsButton (Centro de Avisos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no renderiza la campana ni consulta endpoints si el usuario no está autenticado', () => {
    mockedUseAuth.mockReturnValue({ user: null } as never);

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );

    expect(screen.queryByTitle('Centro de Avisos')).toBeNull();
    expect(screen.queryByTitle('Notificaciones')).toBeNull();
    expect(mockedGetPendingAlerts).not.toHaveBeenCalled();
    expect(mockedListMyRecommendations).not.toHaveBeenCalled();
  });

  it('para Atleta renderiza la campana de Notificaciones con recomendaciones aprobadas, sin avisos exclusivos del PF y soporta Escape', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'Atleta' } } as never);
    mockedListMyRecommendations.mockResolvedValue([
      {
        id: 'rec-1',
        type: 'Training',
        categoryName: 'Primera',
        title: 'Mantener volumen de fuerza',
        reason: 'buena tolerancia semanal',
        recommendationText: 'Continuá con la progresión planificada esta semana.',
      } as never,
    ]);

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );

    expect(mockedGetPendingAlerts).not.toHaveBeenCalled();
    const bellBtn = await screen.findByRole('button', {
      name: /Notificaciones \(1 disponibles\)/i,
    });
    expect(screen.queryByTitle('Centro de Avisos')).toBeNull();

    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Mantener volumen de fuerza')).toBeTruthy();
    });
    expect(screen.getByText('Continuá con la progresión planificada esta semana.')).toBeTruthy();
    expect(screen.queryByText(/Aplicar con 1 clic/i)).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Notificaciones' })).toBeNull();
    });
  });

  it('para Atleta muestra un adelanto de la recomendación y lleva al Inicio a leerla completa (KAN-660)', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'Atleta' } } as never);
    const longText = `${'Comé proteínas de calidad en cada comida principal '.repeat(6)}final.\nTomá agua.`;
    mockedListMyRecommendations.mockResolvedValue([
      {
        id: 'rec-h',
        type: 'Habits',
        title: 'Recomendación de hábitos',
        reason: 'Objetivo: Mantener.',
        recommendationText: longText,
        legalDisclaimer: 'Consultá a un nutricionista.',
      } as never,
    ]);

    function ShowLocation() {
      const location = useLocation();
      return <p data-testid="location">{location.pathname + location.hash}</p>;
    }

    render(
      <MemoryRouter initialEntries={['/athlete/routine']}>
        <NotificationsButton />
        <Routes>
          <Route path="*" element={<ShowLocation />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Notificaciones/i }));

    const preview = await screen.findByText(/^Comé proteínas de calidad/);
    expect(preview.textContent?.endsWith('…')).toBe(true);
    expect(preview.textContent!.length).toBeLessThanOrEqual(181);
    expect(screen.queryByText(/Tomá agua/)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: /Ver recomendación completa: Recomendación de hábitos/ }),
    );
    expect(screen.getByTestId('location').textContent).toBe('/athlete#recomendaciones');
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Notificaciones' })).toBeNull();
    });
  });

  it('para Atleta muestra estado amigable cuando no hay notificaciones o falla la carga', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'Atleta' } } as never);
    mockedListMyRecommendations.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTitle('Notificaciones'));

    await waitFor(() => {
      expect(screen.getByText('Sin notificaciones por el momento')).toBeTruthy();
    });
    expect(screen.queryByText('Network error')).toBeNull();
  });

  it('muestra un estado vacío amigable cuando el back de avisos falla', async () => {
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);
    mockedGetPendingAlerts.mockRejectedValue(new Error('Request failed with status code 500'));

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );
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

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );
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

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );
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

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );
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

    render(
      <MemoryRouter>
        <NotificationsButton />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTitle('Centro de Avisos'));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Abdominales \[Nivel 1\], Bíceps izquierdo \[Lesión activa\], Pecho derecho \[Nivel 5\]/,
        ),
      ).toBeTruthy();
    });
  });

  it('emite ALERTS_CHANGED_EVENT una sola vez y retira el aviso tras aprobarlo exitosamente (regresión KAN-594 / KAN-643)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);

    const mateoAlert = {
      id: 'alert-mateo-sync',
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

    const onAlertsChanged = vi.fn();
    window.addEventListener(ALERTS_CHANGED_EVENT, onAlertsChanged);

    try {
      render(
        <MemoryRouter>
          <NotificationsButton />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByTitle('Centro de Avisos'));

      await waitFor(() => {
        expect(screen.getByText('Mateo González')).toBeTruthy();
      });

      // Una vez cargado el aviso inicial, si se dispara ALERTS_CHANGED_EVENT la campana recarga;
      // devolvemos lista vacía en la siguiente consulta tras la aprobación
      mockedGetPendingAlerts.mockResolvedValue([]);

      const applyBtn = screen.getByRole('button', {
        name: /aplicar ajuste \(1 clic\): Mateo González/i,
      });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(mockedApplyNoticeAction).toHaveBeenCalledWith(mateoAlert);
        expect(
          screen.getByText('Ajuste preventivo aplicado exitosamente en Entrenamiento.'),
        ).toBeTruthy();
      });

      // Antes de cumplirse los 1500ms del temporizador, aún no se emitió el evento
      expect(onAlertsChanged).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      expect(onAlertsChanged).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Mateo González')).toBeNull();
    } finally {
      window.removeEventListener(ALERTS_CHANGED_EVENT, onAlertsChanged);
    }
  });

  it('no emite ALERTS_CHANGED_EVENT ni retira el aviso cuando la aprobación falla (regresión KAN-594 / KAN-643)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedUseAuth.mockReturnValue({ user: { role: 'PreparadorFisico' } } as never);

    const mateoAlert = {
      id: 'alert-mateo-fail-sync',
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
      new Error('No se pudo aplicar el ajuste. Verificá la conexión y reintentá.'),
    );

    const onAlertsChanged = vi.fn();
    window.addEventListener(ALERTS_CHANGED_EVENT, onAlertsChanged);

    try {
      render(
        <MemoryRouter>
          <NotificationsButton />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByTitle('Centro de Avisos'));

      await waitFor(() => {
        expect(screen.getByText('Mateo González')).toBeTruthy();
      });

      const applyBtn = screen.getByRole('button', {
        name: /aplicar ajuste \(1 clic\): Mateo González/i,
      });
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(
          screen.getByText('No se pudo aplicar el ajuste. Verificá la conexión y reintentá.'),
        ).toBeTruthy();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(onAlertsChanged).not.toHaveBeenCalled();
      expect(screen.getByText('Mateo González')).toBeTruthy();
    } finally {
      window.removeEventListener(ALERTS_CHANGED_EVENT, onAlertsChanged);
    }
  });
});

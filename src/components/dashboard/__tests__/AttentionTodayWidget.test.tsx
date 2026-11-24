import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AttentionTodayWidget } from '../AttentionTodayWidget';
import { alertsService } from '../../../api/alertsService';
import type { AthleteTrafficLightItem } from '../../monitoring/trafficLight.types';
import type { NoticeItem } from '../../../types/alerts';

vi.mock('../../../api/alertsService', () => ({
  ALERTS_CHANGED_EVENT: 'protraining-alerts-changed',
  alertsService: {
    getPendingAlerts: vi.fn(),
    applyNoticeAction: vi.fn(),
    applyToNextSession: vi.fn(),
    archiveAlert: vi.fn(),
  },
}));

const athlete = (over: Partial<AthleteTrafficLightItem>): AthleteTrafficLightItem => ({
  id: 'ath-1',
  name: 'Mateo Ríos',
  position: '',
  category: 'Primera División',
  status: 'yellow',
  statusLabel: 'Amarillo',
  recommendation: 'Esfuerzo alto',
  rpe: 9,
  phone: '1150000013',
  ...over,
});

const notice = (over: Partial<NoticeItem>): NoticeItem => ({
  id: 'al-1',
  athleteId: 'ATH-1',
  athleteName: 'Mateo Ríos',
  generatedAt: '03:00',
  severity: 'High',
  reason: 'Carga aguda alta',
  suggestion: 'Bajar 30 % el volumen de hoy',
  reviewed: false,
  canApplyWithOneClick: true,
  actionType: 'load_reduction',
  actionLabel: 'Aplicar ajuste (1 clic)',
  ...over,
});

function renderWidget(athletes: AthleteTrafficLightItem[], onAdjustRoutine = vi.fn()) {
  return render(
    <MemoryRouter>
      <AttentionTodayWidget
        athletes={athletes}
        onViewProfile={vi.fn()}
        onAdjustRoutine={onAdjustRoutine}
      />
    </MemoryRouter>,
  );
}

describe('AttentionTodayWidget · qué hacer (KAN-594)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la sugerencia del aviso y la aplica en un clic, avisando a la campana', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockResolvedValue([notice({})]);
    vi.mocked(alertsService.applyNoticeAction).mockResolvedValue({ success: true, message: 'ok' });
    const listener = vi.fn();
    window.addEventListener('protraining-alerts-changed', listener);

    renderWidget([athlete({})]);

    expect(await screen.findByText(/Bajar 30 % el volumen de hoy/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Aplicar ajuste para Mateo Ríos/ }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Aplicado'));
    expect(alertsService.applyNoticeAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'al-1' }),
    );
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('protraining-alerts-changed', listener);
  });

  it('un aviso de ajuste de rutina abre la propuesta del día, no se aplica a ciegas', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockResolvedValue([
      notice({ actionType: 'routine_adjustment', suggestion: 'Cambiar el press' }),
    ]);
    const onAdjust = vi.fn();
    renderWidget([athlete({ hasDayConflict: true })], onAdjust);

    fireEvent.click(await screen.findByRole('button', { name: /Ver propuesta para Mateo Ríos/ }));
    expect(onAdjust).toHaveBeenCalledWith(expect.objectContaining({ id: 'ath-1' }));
    expect(alertsService.applyNoticeAction).not.toHaveBeenCalled();
    // Es la misma acción que "Ajustar rutina": no se muestran las dos
    expect(screen.queryByRole('button', { name: /Ajustar rutina de hoy/ })).toBeNull();
  });

  it('si el Asistente no responde, se ve el motivo sin sugerencia', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockRejectedValue(new Error('caído'));
    renderWidget([athlete({})]);
    expect(await screen.findByText('Esfuerzo alto · RPE 9')).toBeDefined();
    await waitFor(() => expect(alertsService.getPendingAlerts).toHaveBeenCalled());
    expect(screen.queryByText(/Qué hacer/)).toBeNull();
  });

  it('si hoy no tiene sesión, ofrece aplicar el ajuste a la próxima sesión en vez de un error (KAN-481)', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockResolvedValue([notice({})]);
    vi.mocked(alertsService.applyNoticeAction).mockRejectedValue(
      new Error('El atleta no tiene una sesión de entrenamiento programada para el día de hoy.'),
    );
    vi.mocked(alertsService.applyToNextSession).mockResolvedValue({
      success: true,
      message: 'Ajuste preventivo aplicado a la próxima sesión (26/11).',
      sessionDate: '2026-11-26',
    });
    const changed = vi.fn();
    window.addEventListener('protraining-alerts-changed', changed);
    renderWidget([athlete({})]);

    fireEvent.click(await screen.findByRole('button', { name: /Aplicar ajuste para Mateo Ríos/ }));

    expect(
      await screen.findByText(/Hoy no entrena\. Podés dejar el ajuste aplicado/),
    ).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: /Aplicar en la próxima sesión de Mateo Ríos/ }),
    );

    expect(await screen.findByText(/Aplicado para el jue 26\/11/)).toBeDefined();
    expect(alertsService.applyToNextSession).toHaveBeenCalledWith('al-1');
    expect(changed).toHaveBeenCalled();
    window.removeEventListener('protraining-alerts-changed', changed);
  });

  it('si tampoco tiene sesión en la semana, muestra el motivo del back', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockResolvedValue([notice({})]);
    vi.mocked(alertsService.applyNoticeAction).mockRejectedValue(
      new Error('El atleta no tiene una sesión de entrenamiento programada para el día de hoy.'),
    );
    vi.mocked(alertsService.applyToNextSession).mockRejectedValue(
      new Error('El atleta no tiene sesiones de entrenamiento programadas en los próximos 7 días.'),
    );
    renderWidget([athlete({})]);

    fireEvent.click(await screen.findByRole('button', { name: /Aplicar ajuste para Mateo Ríos/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: /Aplicar en la próxima sesión de Mateo Ríos/ }),
    );

    expect((await screen.findByRole('alert')).textContent).toContain('próximos 7 días');
  });

  it('WhatsApp va al tutor si el atleta es menor', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockResolvedValue([]);
    renderWidget([athlete({ isMinor: true, phone: null, guardianPhone: '1155554444' })]);
    const link = await screen.findByRole('link', { name: /tutor de Mateo Ríos por WhatsApp/ });
    expect(link.getAttribute('href')).toContain('1155554444');
  });

  it('sin conflicto con la rutina de hoy no ofrece la propuesta: explica y deja marcar revisado', async () => {
    vi.mocked(alertsService.getPendingAlerts).mockResolvedValue([
      notice({ actionType: 'routine_adjustment', suggestion: 'Cambiar el press' }),
    ]);
    vi.mocked(alertsService.archiveAlert).mockResolvedValue();
    const onAdjust = vi.fn();
    renderWidget([athlete({ hasDayConflict: false })], onAdjust);

    expect(await screen.findByText(/Hoy su rutina no carga esa zona/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Ver propuesta/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Marcar revisado para Mateo Ríos/ }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Revisado'));
    expect(alertsService.archiveAlert).toHaveBeenCalledWith('al-1');
    expect(onAdjust).not.toHaveBeenCalled();
  });
});

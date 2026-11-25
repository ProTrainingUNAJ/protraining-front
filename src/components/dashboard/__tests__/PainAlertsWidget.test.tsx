import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PainAlertsWidget } from '../PainAlertsWidget';
import type { AthleteTrafficLightItem } from '../../monitoring/trafficLight.types';

function athlete(overrides: Partial<AthleteTrafficLightItem>): AthleteTrafficLightItem {
  return {
    id: 'ath',
    name: 'Atleta',
    position: '',
    category: 'Primera',
    status: 'yellow',
    statusLabel: '',
    recommendation: '',
    ...overrides,
  };
}

const TEAM: AthleteTrafficLightItem[] = [
  athlete({
    id: 'diego',
    name: 'Diego Funes',
    pains: [{ zone: 'Cuádriceps', muscleId: 'cuadriceps_derecho', level: 3 }],
    hasDayConflict: true,
  }),
  athlete({
    id: 'valentina',
    name: 'Valentina Ruiz',
    pains: [{ zone: 'Cuádriceps', muscleId: 'cuadriceps_derecho', level: 3 }],
  }),
  athlete({
    id: 'lucas',
    name: 'Lucas Gómez',
    status: 'red',
    hasActiveInjury: true,
    pains: [{ zone: 'Isquiotibiales', muscleId: 'isquiotibial_derecho', level: 6 }],
  }),
  athlete({ id: 'facundo', name: 'Facundo Sosa', status: 'green' }),
];

function renderWidget(props: Partial<React.ComponentProps<typeof PainAlertsWidget>> = {}) {
  return render(
    <MemoryRouter>
      <PainAlertsWidget athletes={TEAM} {...props} />
    </MemoryRouter>,
  );
}

describe('PainAlertsWidget · mapa del cuerpo del plantel (KAN-594)', () => {
  it('muestra una línea por zona con quiénes la marcaron y el mapa como una sola imagen', () => {
    renderWidget();

    // Cuenta atletas con dolor (Diego, Valentina y Lucas), no zonas
    expect(screen.getByText('3', { selector: '.dash-w__count' })).toBeDefined();
    // Un ítem por zona, la más grave primero
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Isquiotibiales · Lucas (lesión activa)');
    expect(items[1].textContent).toContain('Cuádriceps · Diego, Valentina (nivel 3)');

    const map = screen.getByRole('img', { name: /Mapa del cuerpo del plantel/ });
    expect(map.getAttribute('aria-label')).toContain('Cuádriceps, Diego, Valentina (nivel 3)');
    // Las regiones del mapa no se anuncian como botones
    expect(screen.queryAllByRole('button', { name: /Vista frontal|Vista dorsal/ })).toHaveLength(0);
  });

  it('mantiene "Ajustar rutina" junto al atleta cuya rutina de hoy carga la zona', () => {
    const onAdjustRoutine = vi.fn();
    renderWidget({ onAdjustRoutine });

    const adjust = screen.getByRole('button', { name: 'Ajustar rutina de hoy de Diego Funes' });
    fireEvent.click(adjust);
    expect(onAdjustRoutine).toHaveBeenCalledWith(expect.objectContaining({ id: 'diego' }));
    expect(screen.getAllByRole('button', { name: /Ajustar rutina/ })).toHaveLength(1);
  });

  it('sin dolores muestra una línea neutra y no dibuja el mapa', () => {
    renderWidget({ athletes: [athlete({ id: 'facundo', status: 'green' })] });

    expect(screen.getByText('Sin dolores reportados hoy.')).toBeDefined();
    expect(screen.queryByRole('img', { name: /Mapa del cuerpo/ })).toBeNull();
  });

  it('si el servicio falla muestra el error con Reintentar en lugar del mapa', () => {
    const onRetry = vi.fn();
    renderWidget({ error: 'No se pudo consultar el semáforo del día.', onRetry });

    expect(screen.getByRole('alert').textContent).toContain('No se pudo consultar');
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});

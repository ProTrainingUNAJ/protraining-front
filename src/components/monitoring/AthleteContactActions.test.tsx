import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AthleteContactActions } from './AthleteContactActions';
import type { AthleteTrafficLightItem } from './trafficLight.types';

const baseAthlete: AthleteTrafficLightItem = {
  id: 'ath-1',
  name: 'Lucas Fernández',
  position: 'Delantero',
  category: 'Primera',
  status: 'red',
  statusLabel: 'Alerta',
  recommendation: 'Bajar carga',
};

describe('AthleteContactActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra estado Sin canales de contacto cuando no hay teléfono ni Telegram', () => {
    render(<AthleteContactActions athlete={baseAthlete} />);
    expect(screen.getByText(/Sin canales de contacto/i)).toBeTruthy();
  });

  it('renderiza WhatsApp con mensaje prellenado según estado del atleta y Telegram con link t.me', () => {
    render(
      <AthleteContactActions
        athlete={{
          ...baseAthlete,
          phone: '+54 9 11 2345-6789',
          telegramUsername: '@lucas_fernandez',
        }}
      />,
    );

    const wa = screen.getByRole('link', { name: /Contactar a Lucas Fernández por WhatsApp/i });
    expect(wa.getAttribute('href')).toContain('https://wa.me/5491123456789?text=');
    expect(wa.getAttribute('href')).toContain('rojo');

    const tg = screen.getByRole('link', { name: /Contactar a Lucas Fernández por Telegram/i });
    expect(tg.getAttribute('href')).toBe('https://t.me/lucas_fernandez');
  });

  it('copia el mensaje al portapapeles al hacer clic en Telegram y muestra fallback si falla', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <AthleteContactActions
        athlete={{
          ...baseAthlete,
          telegramUsername: 'lucas_fernandez',
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole('link', { name: /Contactar a Lucas Fernández por Telegram/i }),
    );
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
    expect(await screen.findByText(/Copiá este mensaje manualmente para Telegram/i)).toBeTruthy();
  });

  it('en contexto attendance con atleta ausente usa mensaje de invitación a completar rutina', () => {
    render(
      <AthleteContactActions
        athlete={{
          ...baseAthlete,
          status: 'green',
          phone: '+54 9 11 2345-6789',
        }}
        context="attendance"
        isPresent={false}
      />,
    );

    const wa = screen.getByRole('link', { name: /Contactar a Lucas Fernández por WhatsApp/i });
    const href = decodeURIComponent(wa.getAttribute('href') ?? '');
    expect(href).toContain('todavía no registraste tu entrenamiento de hoy');
    expect(href).toContain('para que se tome el presente');
  });

  it('en contexto attendance con atleta presente usa mensaje de felicitación por la sesión', () => {
    render(
      <AthleteContactActions
        athlete={{
          ...baseAthlete,
          status: 'gray',
          phone: '+54 9 11 2345-6789',
        }}
        context="attendance"
        isPresent={true}
      />,
    );

    const wa = screen.getByRole('link', { name: /Contactar a Lucas Fernández por WhatsApp/i });
    const href = decodeURIComponent(wa.getAttribute('href') ?? '');
    expect(href).toContain('vi que ya registraste tu carga de hoy en ProTraining');
    expect(href).toContain('¡Excelente sesión!');
  });
});

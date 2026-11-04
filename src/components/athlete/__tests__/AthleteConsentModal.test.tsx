import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AthleteConsentModal } from '../AthleteConsentModal';

describe('AthleteConsentModal (KAN-326)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('se presenta bloqueante al atleta mayor sin permitir omisión ni botones de cierre', () => {
    render(
      <AthleteConsentModal
        athleteName="Julián Álvarez"
        isOpen={true}
        isMinor={false}
        onConsentSigned={vi.fn()}
      />,
    );

    expect(screen.getByText('Consentimiento Médico y Deportivo Obligatorio')).toBeDefined();
    expect(screen.getByText(/Bienvenido a ProTraining, Julián Álvarez/i)).toBeDefined();

    // No debe existir botón para cerrar ni cancelar
    expect(screen.queryByRole('button', { name: /Cerrar/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar/i })).toBeNull();

    // El botón de firma debe estar deshabilitado inicialmente
    const signBtn = screen.getByRole('button', {
      name: 'Firmar y Aceptar Consentimiento',
    });
    expect((signBtn as HTMLButtonElement).disabled).toBe(true);

    // Las dos casillas deben arrancar desmarcadas (la de hábitos no viene tildada de entrada)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(false);
  });

  it('habilita la firma al tildar la aceptación obligatoria y la casilla de hábitos arranca sin tildar', () => {
    const onConsentSigned = vi.fn();

    render(
      <AthleteConsentModal
        athleteName="Julián Álvarez"
        isOpen={true}
        isMinor={false}
        onConsentSigned={onConsentSigned}
      />,
    );

    const requiredCheckbox = screen.getByRole('checkbox', {
      name: /\(Obligatorio\)/i,
    });
    expect((requiredCheckbox as HTMLInputElement).checked).toBe(false);

    // Tildar solo la casilla obligatoria
    fireEvent.click(requiredCheckbox);
    expect((requiredCheckbox as HTMLInputElement).checked).toBe(true);

    const signBtn = screen.getByRole('button', {
      name: 'Firmar y Aceptar Consentimiento',
    });
    expect((signBtn as HTMLButtonElement).disabled).toBe(false);

    // Firmar sin tildar hábitos (debe enviarse false)
    fireEvent.click(signBtn);

    expect(onConsentSigned).toHaveBeenCalledTimes(1);
    expect(onConsentSigned).toHaveBeenCalledWith({
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: false,
    });
  });

  it('permite tildar hábitos opcionales explícitamente', () => {
    const onConsentSigned = vi.fn();

    render(
      <AthleteConsentModal
        athleteName="Julián Álvarez"
        isOpen={true}
        isMinor={false}
        onConsentSigned={onConsentSigned}
      />,
    );

    const requiredCheckbox = screen.getByRole('checkbox', {
      name: /\(Obligatorio\)/i,
    });
    const habitsCheckbox = screen.getByRole('checkbox', {
      name: /recomendaciones personalizadas de hábitos/i,
    });

    fireEvent.click(requiredCheckbox);
    fireEvent.click(habitsCheckbox);

    const signBtn = screen.getByRole('button', {
      name: 'Firmar y Aceptar Consentimiento',
    });
    fireEvent.click(signBtn);

    expect(onConsentSigned).toHaveBeenCalledWith({
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: true,
    });
  });

  it('muestra aviso claro para menores sin casillas de firma cuando falta consentimiento del tutor', () => {
    const onConsentSigned = vi.fn();

    render(
      <AthleteConsentModal
        athleteName="Mateo Messi"
        isOpen={true}
        isMinor={true}
        hasGuardianConsent={false}
        onConsentSigned={onConsentSigned}
      />,
    );

    expect(screen.getByText('Falta el consentimiento de tu tutor, hablá con tu PF.')).toBeDefined();
    expect(screen.getByText(/Al ser menor de edad, el consentimiento legal/i)).toBeDefined();

    // No debe mostrar checkboxes ni botón de firma para el menor
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Firmar y Aceptar Consentimiento/i })).toBeNull();
    expect(onConsentSigned).not.toHaveBeenCalled();
  });

  it('muestra confirmación informativa si el tutor ya dio el consentimiento para el menor', () => {
    render(
      <AthleteConsentModal
        athleteName="Mateo Messi"
        isOpen={true}
        isMinor={true}
        hasGuardianConsent={true}
        onConsentSigned={vi.fn()}
      />,
    );

    expect(screen.getByText('Tu tutor ya dio el consentimiento.')).toBeDefined();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('evita la omisión al hacer clic en el overlay de fondo', () => {
    const onConsentSigned = vi.fn();

    render(
      <AthleteConsentModal
        athleteName="Julián Álvarez"
        isOpen={true}
        onConsentSigned={onConsentSigned}
      />,
    );

    const overlay = document.querySelector('.consent-modal-overlay')!;
    fireEvent.click(overlay);

    // Debe seguir presente sin cerrarse
    expect(screen.getByText('Consentimiento Médico y Deportivo Obligatorio')).toBeDefined();
    expect(onConsentSigned).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AthleteConsentModal } from '../AthleteConsentModal';

describe('AthleteConsentModal (KAN-326)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('se presenta bloqueante al atleta sin permitir omisión ni botones de cierre', () => {
    render(
      <AthleteConsentModal athleteName="Julián Álvarez" isOpen={true} onConsentSigned={vi.fn()} />,
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
  });

  it('habilita la firma al tildar la aceptación obligatoria y emite la firma legal', () => {
    const onConsentSigned = vi.fn();

    render(
      <AthleteConsentModal
        athleteName="Julián Álvarez"
        isOpen={true}
        onConsentSigned={onConsentSigned}
      />,
    );

    const requiredCheckbox = screen.getByRole('checkbox', {
      name: /\(Obligatorio\)/i,
    });
    expect((requiredCheckbox as HTMLInputElement).checked).toBe(false);

    // Tildar casilla obligatoria
    fireEvent.click(requiredCheckbox);
    expect((requiredCheckbox as HTMLInputElement).checked).toBe(true);

    const signBtn = screen.getByRole('button', {
      name: 'Firmar y Aceptar Consentimiento',
    });
    expect((signBtn as HTMLButtonElement).disabled).toBe(false);

    // Firmar
    fireEvent.click(signBtn);

    expect(onConsentSigned).toHaveBeenCalledTimes(1);
    expect(onConsentSigned).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsPhysicalTraining: true,
        allowsHabitsRecommendations: true,
      }),
    );
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

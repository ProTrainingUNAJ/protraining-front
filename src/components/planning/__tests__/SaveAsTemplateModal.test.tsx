import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SaveAsTemplateModal } from '../SaveAsTemplateModal';
import { trainingPlansService } from '../../../api/trainingPlans';

describe('SaveAsTemplateModal', () => {
  const planId = 'plan-test-123';
  const defaultName = 'Pretemporada Fuerza';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda con el nombre ingresado y notifica onSaved', async () => {
    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();
    const saveSpy = vi.spyOn(trainingPlansService, 'saveAsTemplate').mockResolvedValue({
      id: 'template-created-1',
    } as never);

    render(
      <SaveAsTemplateModal
        planId={planId}
        defaultName={defaultName}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    const input = screen.getByRole('textbox', {
      name: /nombre de la plantilla/i,
    }) as HTMLInputElement;
    expect(input.value).toBe('Pretemporada Fuerza (Plantilla)');

    fireEvent.change(input, { target: { value: 'Fuerza 2026 Personalizada' } });

    const submitBtn = screen.getByRole('button', { name: /guardar plantilla/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith('plan-test-123', 'Fuerza 2026 Personalizada');
      expect(onSavedMock).toHaveBeenCalledWith('Fuerza 2026 Personalizada');
    });
  });

  it('muestra el mensaje de error cuando el backend falla al guardar', async () => {
    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();
    vi.spyOn(trainingPlansService, 'saveAsTemplate').mockRejectedValue(
      new Error('No se pudo guardar la plantilla en el servidor.'),
    );

    render(
      <SaveAsTemplateModal
        planId={planId}
        defaultName={defaultName}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    const submitBtn = screen.getByRole('button', { name: /guardar plantilla/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('No se pudo guardar la plantilla en el servidor.')).toBeDefined();
    });

    expect(onSavedMock).not.toHaveBeenCalled();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('muestra error si el nombre ingresado queda vacío', async () => {
    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();
    const saveSpy = vi.spyOn(trainingPlansService, 'saveAsTemplate');

    render(
      <SaveAsTemplateModal
        planId={planId}
        defaultName={defaultName}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    const input = screen.getByRole('textbox', { name: /nombre de la plantilla/i });
    fireEvent.change(input, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /guardar plantilla/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Ingresá un nombre para la plantilla.')).toBeDefined();
    });

    expect(saveSpy).not.toHaveBeenCalled();
    expect(onSavedMock).not.toHaveBeenCalled();
  });

  it('cierra el modal al pulsar Cancelar o el botón de cierre', () => {
    const onSavedMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <SaveAsTemplateModal
        planId={planId}
        defaultName={defaultName}
        onClose={onCloseMock}
        onSaved={onSavedMock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });
});

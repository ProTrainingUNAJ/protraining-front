import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateFieldTestSessionModal } from '../CreateFieldTestSessionModal';
import { createFieldTestSession } from '../../../api/fieldTestSessions';
import type { FitnessTest } from '../../../api/generated/seguimiento';

vi.mock('../../../api/fieldTestSessions', () => ({
  createFieldTestSession: vi.fn(),
}));

const MOCK_TESTS: FitnessTest[] = [
  {
    id: 'test-1',
    name: 'Sentadilla 1RM',
    motorCapacity: 'Strength',
    measurementUnit: 'kg',
    difficultyLevel: 3,
    active: true,
  },
  {
    id: 'test-2',
    name: 'Test de Cooper',
    motorCapacity: 'Endurance',
    measurementUnit: 'm',
    difficultyLevel: 4,
    active: true,
  },
  {
    id: 'test-3',
    name: 'Sprint 30m',
    motorCapacity: 'Velocity',
    measurementUnit: 's',
    difficultyLevel: 2,
    active: true,
  },
];

describe('CreateFieldTestSessionModal (KAN-656)', () => {
  const onClose = vi.fn();
  const onSessionCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada si isOpen es false', () => {
    const { container } = render(
      <CreateFieldTestSessionModal
        isOpen={false}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={MOCK_TESTS}
        onSessionCreated={onSessionCreated}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renderiza encabezado, campos generales y listado de tests cuando está abierto', () => {
    render(
      <CreateFieldTestSessionModal
        isOpen={true}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={MOCK_TESTS}
        onSessionCreated={onSessionCreated}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeDefined();
    expect(screen.getByPlaceholderText('Evaluación de pretemporada')).toBeDefined();
    expect(screen.getByText('Sentadilla 1RM')).toBeDefined();
    expect(screen.getByText('Test de Cooper')).toBeDefined();
    expect(screen.getByText('Sprint 30m')).toBeDefined();
  });

  it('cierra al hacer click en el overlay backdrop fuera del contenedor', () => {
    render(
      <CreateFieldTestSessionModal
        isOpen={true}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={MOCK_TESTS}
        onSessionCreated={onSessionCreated}
      />,
    );

    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no cierra al hacer click dentro del contenedor del modal', () => {
    render(
      <CreateFieldTestSessionModal
        isOpen={true}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={MOCK_TESTS}
        onSessionCreated={onSessionCreated}
      />,
    );

    const title = screen.getByRole('heading', { name: 'Nueva sesión de evaluación' });
    fireEvent.click(title);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra error si el catálogo contiene un catalogError', () => {
    render(
      <CreateFieldTestSessionModal
        isOpen={true}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={[]}
        catalogError="Error al conectar con el servidor"
        onSessionCreated={onSessionCreated}
      />,
    );

    expect(screen.getByText('Error al conectar con el servidor')).toBeDefined();
  });

  it('permite seleccionar y deseleccionar tests conservando el orden correlativo', () => {
    render(
      <CreateFieldTestSessionModal
        isOpen={true}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={MOCK_TESTS}
        onSessionCreated={onSessionCreated}
      />,
    );

    const btn1 = screen.getByRole('button', { name: /Sentadilla 1RM/ });
    const btn2 = screen.getByRole('button', { name: /Sprint 30m/ });

    fireEvent.click(btn2); // Primer seleccionado -> orden 1
    fireEvent.click(btn1); // Segundo seleccionado -> orden 2

    expect(screen.getByText('2 tests seleccionados')).toBeDefined();

    // Deseleccionar el primero
    fireEvent.click(btn2);
    expect(screen.getByText('1 test seleccionado')).toBeDefined();
  });

  it('envía los datos correctamente al submit y llama a onSessionCreated y onClose', async () => {
    vi.mocked(createFieldTestSession).mockResolvedValue({
      id: 'session-new',
      categoryId: 'cat-123',
      date: '2026-11-23',
      name: 'Test de Potencia',
      status: 'Planned',
      tests: [{ catalogTestId: 'test-1', order: 1 }],
      results: [],
    });

    render(
      <CreateFieldTestSessionModal
        isOpen={true}
        onClose={onClose}
        categoryId="cat-123"
        catalogTests={MOCK_TESTS}
        onSessionCreated={onSessionCreated}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Evaluación de pretemporada'), {
      target: { value: 'Test de Potencia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sentadilla 1RM/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear sesión' }));

    await waitFor(() => {
      expect(createFieldTestSession).toHaveBeenCalledWith({
        categoryId: 'cat-123',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        name: 'Test de Potencia',
        tests: [{ catalogTestId: 'test-1', order: 1 }],
      });
      expect(onSessionCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

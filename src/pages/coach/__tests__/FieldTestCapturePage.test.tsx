import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FieldTestCapturePage } from '../FieldTestCapturePage';
import {
  createFieldTestResult,
  getFieldTestSession,
  listFitnessTests,
  updateFieldTestResult,
  updateFieldTestSessionStatus,
} from '../../../api/fieldTestSessions';
import { structureService } from '../../../api/structureService';
import type { FieldTestSession } from '../../../api/generated/seguimiento';
import type { Athlete } from '../../../types/structure';

vi.mock('../../../api/fieldTestSessions', () => ({
  getFieldTestSession: vi.fn(),
  listFitnessTests: vi.fn(),
  createFieldTestResult: vi.fn(),
  updateFieldTestResult: vi.fn(),
  updateFieldTestSessionStatus: vi.fn(),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getAthletes: vi.fn(),
  },
}));

const SESSION_ID = 's-1';

function makeSession(overrides: Partial<FieldTestSession> = {}): FieldTestSession {
  return {
    id: SESSION_ID,
    categoryId: 'cat-1',
    date: '2026-11-09',
    name: 'Evaluación de pretemporada',
    status: 'InProgress',
    tests: [{ catalogTestId: 't-1', order: 1 }],
    results: [],
    ...overrides,
  };
}

const ATHLETES: Athlete[] = [
  { id: 'a-1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@mail.com', phone: '111' },
  { id: 'a-2', firstName: 'Luis', lastName: 'Gómez', email: 'luis@mail.com', phone: '222' },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/pf/field-tests/${SESSION_ID}`]}>
      <Routes>
        <Route path="/pf/field-tests/:sessionId" element={<FieldTestCapturePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('FieldTestCapturePage · Toma táctil de marcas (KAN-427)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getFieldTestSession).mockResolvedValue(makeSession());
    vi.mocked(listFitnessTests).mockResolvedValue([]);
    vi.mocked(structureService.getAthletes).mockResolvedValue(ATHLETES);
  });

  // Criterio de aceptación: tipear 38.5 + Enter → createFieldTestResult con intento 1
  // y el cursor avanza al siguiente atleta.
  it('registra 38.5 con Enter (attempt 1) y avanza al siguiente atleta', async () => {
    vi.mocked(createFieldTestResult).mockResolvedValue({
      id: 'r-1',
      catalogTestId: 't-1',
      athleteId: 'a-1',
      value: 38.5,
      attempt: 1,
      recordedAt: '2026-11-09T15:00:00',
    });

    renderPage();

    // La pantalla empieza en el primer atleta.
    await screen.findAllByText('Ana Pérez');

    const input = screen.getByLabelText('Marca del atleta');
    fireEvent.change(input, { target: { value: '38.5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(createFieldTestResult).toHaveBeenCalledWith(SESSION_ID, {
        catalogTestId: 't-1',
        athleteId: 'a-1',
        value: 38.5,
        attempt: 1,
      });
    });

    // El cursor avanza: ahora el foco está en el segundo atleta (2 de 2).
    await waitFor(() => {
      expect(screen.getByText('2 de 2')).toBeDefined();
    });
    expect(screen.getAllByText('Luis Gómez').length).toBeGreaterThan(0);

    // La marca cargada queda visible en la lista del primer atleta.
    expect(screen.getByText('38.5')).toBeDefined();

    // El input vuelve a quedar limpio para la próxima marca.
    expect(screen.getByLabelText('Marca del atleta')).toHaveProperty('value', '');
  });

  // El teclado numérico en pantalla es la vía táctil: tocar las teclas arma el valor
  // y "Registrar ⏎" dispara la misma carga.
  it('arma 38,5 con el numpad y registra al tocar "Registrar ⏎"', async () => {
    vi.mocked(createFieldTestResult).mockResolvedValue({
      id: 'r-1',
      catalogTestId: 't-1',
      athleteId: 'a-1',
      value: 38.5,
      attempt: 1,
      recordedAt: '2026-11-09T15:00:00',
    });

    renderPage();
    await screen.findAllByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    fireEvent.click(screen.getByRole('button', { name: ',' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(screen.getByLabelText('Marca del atleta')).toHaveProperty('value', '38,5');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar ⏎' }));

    await waitFor(() => {
      expect(createFieldTestResult).toHaveBeenCalledWith(SESSION_ID, {
        catalogTestId: 't-1',
        athleteId: 'a-1',
        value: 38.5, // la coma se parsea a punto antes de enviar
        attempt: 1,
      });
    });
  });

  // Tocar un atleta de la lista reposiciona el cursor (para corregir una carga).
  it('permite volver a un atleta tocando su fila en la lista', async () => {
    renderPage();
    await screen.findAllByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: /Luis Gómez/ }));

    await waitFor(() => {
      expect(screen.getByText('2 de 2')).toBeDefined();
    });
    // Al volver atrás, el foco queda en el primero otra vez.
    fireEvent.click(screen.getByRole('button', { name: /Ana Pérez/ }));
    await waitFor(() => {
      expect(screen.getByText('1 de 2')).toBeDefined();
    });
  });

  // Sesión Planned: solo se puede iniciar la toma desde la pantalla.
  it('en estado Planned ofrece "Iniciar toma" y cambia el estado', async () => {
    vi.mocked(getFieldTestSession).mockResolvedValue(makeSession({ status: 'Planned' }));
    vi.mocked(updateFieldTestSessionStatus).mockResolvedValue({
      id: SESSION_ID,
      categoryId: 'cat-1',
      date: '2026-11-09',
      name: 'Evaluación de pretemporada',
      status: 'InProgress',
    });

    renderPage();
    await screen.findAllByText('Ana Pérez');

    fireEvent.click(screen.getByRole('button', { name: /Iniciar toma/ }));

    await waitFor(() => {
      expect(updateFieldTestSessionStatus).toHaveBeenCalledWith(SESSION_ID, 'InProgress');
    });

    // La etiqueta de estado se refresca con la respuesta del backend.
    await waitFor(() => {
      expect(screen.getByText('En curso')).toBeDefined();
    });
    expect(screen.queryByText('Planificada')).toBeNull();
  });

  // Sesión Closed: no se carga nada (input y teclado deshabilitados) y se avisa en pantalla.
  it('en estado Closed bloquea la carga y muestra el aviso', async () => {
    vi.mocked(getFieldTestSession).mockResolvedValue(makeSession({ status: 'Closed' }));

    renderPage();
    await screen.findAllByText('Ana Pérez');

    expect(
      screen.getByText('Sesión cerrada: no se pueden cargar ni corregir marcas.'),
    ).toBeDefined();

    const input = screen.getByLabelText('Marca del atleta');
    expect(input).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Registrar ⏎' })).toHaveProperty('disabled', true);

    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(createFieldTestResult).not.toHaveBeenCalled();
  });

  // KAN-568: si el atleta ya tiene una marca en este test, la corrección va por PUT
  // (el POST chocaría con el índice único de la base → 409).
  it('corrige una marca existente con PUT en lugar de POST', async () => {
    vi.mocked(getFieldTestSession).mockResolvedValue(
      makeSession({
        results: [
          {
            id: 'r-9',
            catalogTestId: 't-1',
            athleteId: 'a-1',
            value: 30,
            attempt: 1,
            recordedAt: '2026-11-09T15:00:00',
          },
        ],
      }),
    );
    vi.mocked(updateFieldTestResult).mockResolvedValue({
      id: 'r-9',
      catalogTestId: 't-1',
      athleteId: 'a-1',
      value: 38.5,
      attempt: 1,
      recordedAt: '2026-11-09T15:00:00',
    });

    renderPage();
    await screen.findAllByText('Ana Pérez');

    // La marca previa (30) está visible en la lista del primer atleta.
    expect(screen.getByText('30')).toBeDefined();

    const input = screen.getByLabelText('Marca del atleta');
    fireEvent.change(input, { target: { value: '38.5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(updateFieldTestResult).toHaveBeenCalledWith(SESSION_ID, 'r-9', {
        value: 38.5,
        attempt: 1,
      });
    });
    expect(createFieldTestResult).not.toHaveBeenCalled();

    // La lista refleja el valor corregido (reemplaza al anterior, sin duplicar).
    await waitFor(() => {
      expect(screen.getByText('38.5')).toBeDefined();
    });
    expect(screen.queryByText('30')).toBeNull();
  });

  // KAN-568: si falla la carga de atletas se muestra el error con "Reintentar"
  // en lugar de un vacío engañoso.
  it('muestra error con "Reintentar" si falla la carga de atletas', async () => {
    vi.mocked(structureService.getAthletes).mockRejectedValueOnce(
      new Error('No se pudieron cargar los atletas de la categoría.'),
    );

    renderPage();

    // Aparece el banner de error con el botón de reintento.
    const retryButton = await screen.findByRole('button', { name: /Reintentar/ });
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('No se pudieron cargar los atletas de la categoría.');
    expect(screen.getByText('Reintentar')).toBeDefined();

    // No se muestra el estado vacío (sería mentir: no sabemos si hay atletas).
    expect(screen.queryByText('Esta categoría no tiene atletas cargados.')).toBeNull();
    expect(screen.queryByText('Carga completa para este test')).toBeNull();

    // El reintento vuelve a pedir los atletas y la pantalla se recupera.
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(structureService.getAthletes).toHaveBeenCalledTimes(2);
    });
    await screen.findAllByText('Ana Pérez');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

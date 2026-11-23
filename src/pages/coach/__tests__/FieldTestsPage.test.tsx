import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FieldTestsPage } from '../FieldTestsPage';
import {
  createFieldTestSession,
  listFieldTestSessions,
  listFitnessTests,
  updateFieldTestSessionStatus,
} from '../../../api/fieldTestSessions';
import { structureService } from '../../../api/structureService';
import type { FieldTestSessionSummary, FitnessTest } from '../../../api/generated/seguimiento';
import type { Category } from '../../../types/structure';

vi.mock('../../../api/fieldTestSessions', () => ({
  listFieldTestSessions: vi.fn(),
  createFieldTestSession: vi.fn(),
  updateFieldTestSessionStatus: vi.fn(),
  listFitnessTests: vi.fn(),
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: vi.fn(),
    getCategories: vi.fn(),
  },
}));

const ORGS = [{ id: 'org-1', name: 'Club Atlético Pro', categoriesCount: 1 }];

const CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    organizationId: 'org-1',
    name: 'Primera División',
    description: null,
    athletesCount: 18,
  },
];

const CATALOG: FitnessTest[] = [
  {
    id: 't-1',
    name: 'Sentadilla 1RM',
    motorCapacity: 'Strength',
    measurementUnit: 'kg',
    difficultyLevel: 3,
    active: true,
  },
  {
    id: 't-2',
    name: '30-15 Test',
    motorCapacity: 'Endurance',
    measurementUnit: 's',
    difficultyLevel: 4,
    active: true,
  },
  // KAN-458: tests de carrera del catálogo, con su unidad.
  {
    id: 't-3',
    name: 'Carrera 30 m',
    motorCapacity: 'Velocity',
    measurementUnit: 's',
    difficultyLevel: 2,
    active: true,
  },
  {
    id: 't-4',
    name: 'Carrera 100 m',
    motorCapacity: 'Velocity',
    measurementUnit: 's',
    difficultyLevel: 3,
    active: true,
  },
];

function makeSummary(overrides: Partial<FieldTestSessionSummary> = {}): FieldTestSessionSummary {
  return {
    id: 's-1',
    categoryId: 'cat-1',
    date: '2026-11-09',
    name: 'Evaluación de pretemporada',
    status: 'Planned',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <FieldTestsPage />
    </MemoryRouter>,
  );
}

describe('FieldTestsPage · Sesiones de test de campo (KAN-427)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structureService.getOrganizations).mockResolvedValue(ORGS);
    vi.mocked(structureService.getCategories).mockResolvedValue(CATEGORIES);
    vi.mocked(listFitnessTests).mockResolvedValue(CATALOG);
    vi.mocked(listFieldTestSessions).mockResolvedValue([makeSummary()]);
  });

  it('carga las categorías del PF y lista las sesiones con su estado', async () => {
    renderPage();

    // La categoría queda seleccionada y las sesiones se piden para esa categoría.
    await waitFor(() => {
      expect(listFieldTestSessions).toHaveBeenCalledWith('cat-1');
    });

    expect(await screen.findByText('Evaluación de pretemporada')).toBeDefined();
    expect(screen.getByText('Planificada')).toBeDefined();

    // Sesión Planned: ofrece Iniciar y Abrir.
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeDefined();
    // Sin salto de Planned a Closed: no aparece "Cerrar".
    expect(screen.queryByRole('button', { name: /Cerrar/ })).toBeNull();
  });

  it('filtra el catálogo por velocidad y muestra los tests de 30 y 100 m (KAN-458)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));

    // Sin filtro se lista el catálogo completo.
    expect(screen.getByRole('button', { name: /Sentadilla 1RM/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /30-15 Test/ })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Velocidad' }));

    // CA: filtrando por velocidad aparecen los tests de 30 y 100 m con su unidad.
    expect(screen.getByRole('button', { name: /Carrera 30 m/ })).toBeDefined();
    const carrera100 = screen.getByRole('button', { name: /Carrera 100 m/ });
    expect(carrera100.querySelector('.ft-test-option__unit')?.textContent).toBe('s');
    expect(screen.queryByRole('button', { name: /Sentadilla 1RM/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /30-15 Test/ })).toBeNull();

    // "Todos" vuelve al catálogo completo.
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('button', { name: /Sentadilla 1RM/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /30-15 Test/ })).toBeDefined();
  });

  it('crea una sesión con las pruebas del catálogo en el orden elegido', async () => {
    vi.mocked(createFieldTestSession).mockResolvedValue({
      id: 's-2',
      categoryId: 'cat-1',
      date: '2026-11-09',
      name: 'Evaluación de pretemporada',
      status: 'Planned',
      tests: [
        { catalogTestId: 't-2', order: 1 },
        { catalogTestId: 't-1', order: 2 },
      ],
      results: [],
    });

    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    fireEvent.change(screen.getByPlaceholderText('Evaluación de pretemporada'), {
      target: { value: 'Test de arranque' },
    });

    // Selecciono en orden: primero 30-15, después Sentadilla.
    fireEvent.click(screen.getByRole('button', { name: /30-15 Test/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sentadilla 1RM/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear sesión' }));

    await waitFor(() => {
      expect(createFieldTestSession).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        name: 'Test de arranque',
        tests: [
          { catalogTestId: 't-2', order: 1 },
          { catalogTestId: 't-1', order: 2 },
        ],
      });
    });

    // Tras el alta se vuelve a pedir el listado de la categoría.
    await waitFor(() => {
      expect(vi.mocked(listFieldTestSessions).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('valida el formulario: sin nombre ni tests no llama al backend', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear sesión' }));

    expect(await screen.findByText('Poné un nombre para la sesión.')).toBeDefined();

    fireEvent.change(screen.getByPlaceholderText('Evaluación de pretemporada'), {
      target: { value: 'Test de arranque' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear sesión' }));

    expect(await screen.findByText('Elegí al menos un test del catálogo.')).toBeDefined();
    expect(createFieldTestSession).not.toHaveBeenCalled();
  });

  it('avanza Planned → InProgress con "Iniciar" y recarga el listado', async () => {
    vi.mocked(updateFieldTestSessionStatus).mockResolvedValue(
      makeSummary({ status: 'InProgress' }),
    );

    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Iniciar/ }));

    await waitFor(() => {
      expect(updateFieldTestSessionStatus).toHaveBeenCalledWith('s-1', 'InProgress');
    });
    await waitFor(() => {
      expect(vi.mocked(listFieldTestSessions).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('cierra una sesión InProgress con "Cerrar"', async () => {
    vi.mocked(listFieldTestSessions).mockResolvedValue([makeSummary({ status: 'InProgress' })]);
    vi.mocked(updateFieldTestSessionStatus).mockResolvedValue(makeSummary({ status: 'Closed' }));

    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Cerrar/ }));

    await waitFor(() => {
      expect(updateFieldTestSessionStatus).toHaveBeenCalledWith('s-1', 'Closed');
    });
  });

  it('muestra el mensaje del backend si el alta falla (400)', async () => {
    vi.mocked(createFieldTestSession).mockRejectedValue(
      new Error('Una o más pruebas del catálogo no existen.'),
    );

    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    fireEvent.change(screen.getByPlaceholderText('Evaluación de pretemporada'), {
      target: { value: 'Test de arranque' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sentadilla 1RM/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Crear sesión' }));

    expect(await screen.findByText('Una o más pruebas del catálogo no existen.')).toBeDefined();
  });

  it('cierra el modal al presionar Cancelar o el botón de cierre (KAN-656)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    expect(screen.getByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeDefined();

    // Cerrar con botón X
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeNull();

    // Reabrir y cerrar con botón Cancelar
    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    expect(screen.getByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeNull();
  });

  it('cierra el modal al presionar la tecla Escape (KAN-656)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    expect(screen.getByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeNull();
  });

  it('filtra pruebas en el modal usando el buscador de texto y actualiza el contador dinámico (KAN-656)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));

    // El listado de sesiones en la pantalla de fondo sigue presente
    expect(screen.getByText('Evaluación de pretemporada')).toBeDefined();

    // Contador inicial
    expect(screen.getByText('Sin pruebas seleccionadas')).toBeDefined();

    // Buscador por nombre
    const searchInput = screen.getByRole('textbox', { name: 'Buscar test por nombre' });
    fireEvent.change(searchInput, { target: { value: 'Sentadilla' } });

    expect(screen.getByRole('button', { name: /Sentadilla 1RM/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /30-15 Test/ })).toBeNull();

    // Seleccionar test filtrado
    fireEvent.click(screen.getByRole('button', { name: /Sentadilla 1RM/ }));
    expect(screen.getByText('1 test seleccionado')).toBeDefined();

    // Limpiar búsqueda con el botón de limpiar
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(screen.getByRole('button', { name: /30-15 Test/ })).toBeDefined();

    // Seleccionar segundo test
    fireEvent.click(screen.getByRole('button', { name: /30-15 Test/ }));
    expect(screen.getByText('2 tests seleccionados')).toBeDefined();
  });

  it('incluye el selector de categoría dentro del modal de nueva sesión (KAN-656)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));

    const categorySelect = screen.getByLabelText('Categoría') as HTMLSelectElement;
    expect(categorySelect).toBeDefined();
    expect(categorySelect.value).toBe('cat-1');
  });
});

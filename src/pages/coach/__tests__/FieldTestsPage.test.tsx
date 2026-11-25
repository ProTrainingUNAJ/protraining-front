import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
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

function getSelect(label: string): HTMLSelectElement {
  return screen.getByLabelText(label) as HTMLSelectElement;
}

// AC02-AC05: sin organización elegida no se puede crear una sesión, así que los
// tests de alta primero eligen la organización (la categoría se auto-seleccionala).
async function selectOrganization(organizationId = 'org-1'): Promise<void> {
  const organizationSelect = getSelect('Filtrar por organización');
  fireEvent.change(organizationSelect, { target: { value: organizationId } });
  await waitFor(() => {
    expect((screen.getByLabelText('Filtrar por categoría') as HTMLSelectElement).disabled).toBe(
      false,
    );
  });
}

async function openCreationForm(): Promise<void> {
  await selectOrganization();
  fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
}

function selectedTestsList(): HTMLElement {
  return screen.getByRole('list', { name: 'Tests seleccionados en orden' });
}

function selectedTestsNames(): string[] {
  // queryAllByRole (y no getAllBy) para poder afirmar también el caso vacío.
  return within(selectedTestsList())
    .queryAllByRole('listitem')
    .map((item) => item.textContent ?? '');
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

    // Sin organización elegida se piden las sesiones de todas las categorías.
    await waitFor(() => {
      expect(listFieldTestSessions).toHaveBeenCalledWith('cat-1');
    });

    expect(await screen.findByText('Evaluación de pretemporada')).toBeDefined();
    // Sesión Planned: muestra 'Planificada' en el badge de la sesión.
    // Nota: ahora también hay un chip de filtro con el mismo texto; usamos
    // getAllByText para verificar que al menos el badge de la sesión existe.
    const planificadaBadges = screen.getAllByText('Planificada');
    expect(planificadaBadges.length).toBeGreaterThan(0);
    // Localizamos el card de la sesión por el título h3 y buscamos el badge dentro.
    const sessionCard = screen.getByText('Evaluación de pretemporada').closest('.ft-session-card')!;
    const sessionBadge = sessionCard.querySelector('.ft-status ft-status--planned')!;
    expect(sessionBadge).toBeDefined();

    // Sesión Planned: ofrece Iniciar y Abrir.
    expect(screen.getByRole('button', { name: /Iniciar/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeDefined();
    // Sin salto de Planned a Closed: no aparece "Cerrar".
    expect(screen.queryByRole('button', { name: /Cerrar/ })).toBeNull();
  });

  it('AC03 · la categoría queda deshabilitada hasta elegir organización', async () => {
    renderPage();

    const organizationSelect = await screen.findByLabelText('Filtrar por organización');
    const categorySelect = screen.getByLabelText('Filtrar por categoría');

    // La organización se puede elegir siempre; la categoría, no (AC03).
    expect((organizationSelect as HTMLSelectElement).disabled).toBe(false);
    expect((organizationSelect as HTMLSelectElement).value).toBe('');
    expect((categorySelect as HTMLSelectElement).disabled).toBe(true);

    fireEvent.change(organizationSelect, { target: { value: 'org-1' } });

    await waitFor(() => {
      expect((categorySelect as HTMLSelectElement).disabled).toBe(false);
    });
    // AC05: al elegir organización se toma una categoría de esa organización.
    expect((categorySelect as HTMLSelectElement).value).toBe('cat-1');
    await waitFor(() => {
      expect(listFieldTestSessions).toHaveBeenCalledWith('cat-1');
    });
  });

  it('AC04-AC05 · al cambiar de organización sólo quedan sus categorías y se resetea la elegida', async () => {
    const TWO_ORGS = [
      { id: 'org-1', name: 'Club Atlético Pro', categoriesCount: 1 },
      { id: 'org-2', name: 'Club Riverside', categoriesCount: 1 },
    ];
    const TWO_CATEGORIES: Category[] = [
      {
        id: 'cat-1',
        organizationId: 'org-1',
        name: 'Primera División',
        description: null,
        athletesCount: 18,
      },
      {
        id: 'cat-2',
        organizationId: 'org-2',
        name: 'Reserva',
        description: null,
        athletesCount: 12,
      },
    ];
    vi.mocked(structureService.getOrganizations).mockResolvedValue(TWO_ORGS);
    vi.mocked(structureService.getCategories).mockImplementation(async (organizationId) =>
      TWO_CATEGORIES.filter((category) => category.organizationId === organizationId),
    );

    renderPage();

    const categorySelect = (await screen.findByLabelText(
      'Filtrar por categoría',
    )) as HTMLSelectElement;
    const organizationSelect = getSelect('Filtrar por organización');

    fireEvent.change(organizationSelect, { target: { value: 'org-1' } });
    await waitFor(() => expect(categorySelect.value).toBe('cat-1'));

    // AC04: sólo las categorías de la organización elegida.
    expect(Array.from(categorySelect.options).map((option) => option.value)).toEqual(['', 'cat-1']);

    fireEvent.change(organizationSelect, { target: { value: 'org-2' } });

    // AC05: la categoría que ya no corresponde se resetea por una de la nueva organización
    // y se refrescan las sesiones correspondientes.
    await waitFor(() => expect(categorySelect.value).toBe('cat-2'));
    expect(Array.from(categorySelect.options).map((option) => option.value)).toEqual(['', 'cat-2']);
    await waitFor(() => expect(listFieldTestSessions).toHaveBeenCalledWith('cat-2'));
  });

  it('AC07 · busca las sesiones cargadas por nombre', async () => {
    vi.mocked(listFieldTestSessions).mockResolvedValue([
      makeSummary(),
      makeSummary({ id: 's-2', name: 'Test de velocidad' }),
    ]);

    renderPage();
    await screen.findByText('Evaluación de pretemporada');
    expect(screen.getByText('Test de velocidad')).toBeDefined();

    const searchInput = screen.getByLabelText('Buscar sesión por nombre');
    fireEvent.change(searchInput, { target: { value: 'velocidad' } });

    await waitFor(() => expect(screen.queryByText('Evaluación de pretemporada')).toBeNull());
    expect(screen.getByText('Test de velocidad')).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'sin coincidencias' } });
    expect(await screen.findByText('No encontramos sesiones con esos filtros.')).toBeDefined();

    // "Limpiar filtros" vuelve al listado completo.
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(await screen.findByText('Evaluación de pretemporada')).toBeDefined();
  });

  it('AC08 · filtra las sesiones cargadas por estado', async () => {
    vi.mocked(listFieldTestSessions).mockResolvedValue([
      makeSummary(),
      makeSummary({ id: 's-2', name: 'Sesión en curso', status: 'InProgress' }),
      makeSummary({ id: 's-3', name: 'Sesión cerrada', status: 'Closed' }),
    ]);

    renderPage();
    await screen.findByText('Evaluación de pretemporada');
    expect(screen.getByText('Sesión en curso')).toBeDefined();
    expect(screen.getByText('Sesión cerrada')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'En curso' }));

    await waitFor(() => expect(screen.queryByText('Evaluación de pretemporada')).toBeNull());
    expect(screen.getByText('Sesión en curso')).toBeDefined();
    expect(screen.queryByText('Sesión cerrada')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrada' }));
    await waitFor(() => expect(screen.queryByText('Sesión en curso')).toBeNull());
    expect(screen.getByText('Sesión cerrada')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(await screen.findByText('Evaluación de pretemporada')).toBeDefined();
    expect(await screen.findByText('Sesión cerrada')).toBeDefined();
  });

  it('AC05 · al cambiar de organización con el formulario abierto lo cierra y lo limpia', async () => {
    const TWO_ORGS = [
      { id: 'org-1', name: 'Club Atlético Pro', categoriesCount: 1 },
      { id: 'org-2', name: 'Club Riverside', categoriesCount: 1 },
    ];
    const TWO_CATEGORIES: Category[] = [
      {
        id: 'cat-1',
        organizationId: 'org-1',
        name: 'Primera División',
        description: null,
        athletesCount: 18,
      },
      {
        id: 'cat-2',
        organizationId: 'org-2',
        name: 'Reserva',
        description: null,
        athletesCount: 12,
      },
    ];
    vi.mocked(structureService.getOrganizations).mockResolvedValue(TWO_ORGS);
    vi.mocked(structureService.getCategories).mockImplementation(async (organizationId) =>
      TWO_CATEGORIES.filter((category) => category.organizationId === organizationId),
    );
    // Sólo la categoría de org-1 tiene sesiones: evita duplicar la key de la tarjeta.
    vi.mocked(listFieldTestSessions).mockImplementation(async (categoryId) =>
      categoryId === 'cat-1' ? [makeSummary()] : [],
    );

    renderPage();
    await screen.findByText('Evaluación de pretemporada');
    await openCreationForm();

    // Dejo un borrador a medias: nombre escrito y un test seleccionado.
    fireEvent.change(screen.getByPlaceholderText('Evaluación de pretemporada'), {
      target: { value: 'Borrador que no debe persistir' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sentadilla 1RM/ }));
    expect(selectedTestsNames()).toHaveLength(1);

    // Cambio de organización con el formulario abierto.
    fireEvent.change(getSelect('Filtrar por organización'), { target: { value: 'org-2' } });

    // Se cierra el formulario y la categoría pasa a ser de la organización nueva.
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Nueva sesión de evaluación' })).toBeNull(),
    );
    await waitFor(() =>
      expect((screen.getByLabelText('Filtrar por categoría') as HTMLSelectElement).value).toBe(
        'cat-2',
      ),
    );

    // Al reabrir, el borrador quedó limpio.
    fireEvent.click(screen.getByRole('button', { name: /Nueva sesión/ }));
    expect(
      (screen.getByPlaceholderText('Evaluación de pretemporada') as HTMLInputElement).value,
    ).toBe('');
    expect(selectedTestsNames()).toHaveLength(0);
  });

  it('filtra el catálogo por velocidad y muestra los tests de 30 y 100 m (KAN-458)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    await openCreationForm();

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

  it('AC12 · combina la búsqueda de tests por nombre con el filtro por capacidad', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    await openCreationForm();

    const testSearch = screen.getByLabelText('Buscar test por nombre');
    fireEvent.change(testSearch, { target: { value: 'carrera' } });

    expect(screen.getByRole('button', { name: /Carrera 30 m/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Carrera 100 m/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Sentadilla 1RM/ })).toBeNull();

    // Búsqueda + capacidad (lógica AND): "carrera" con capacidad Fuerza no deja nada.
    fireEvent.click(screen.getByRole('button', { name: 'Fuerza' }));
    expect(screen.queryByRole('button', { name: /Carrera 30 m/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Carrera 100 m/ })).toBeNull();
    expect(
      screen.getByText('No se encontraron tests que coincidan con la búsqueda o filtro.'),
    ).toBeDefined();

    // Sin búsqueda, la capacidad Fuerza muestra sólo la sentadilla.
    fireEvent.change(testSearch, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /Sentadilla 1RM/ })).toBeDefined();
    expect(screen.queryByRole('button', { name: /Carrera 30 m/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('button', { name: /30-15 Test/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Carrera 100 m/ })).toBeDefined();
  });

  it('AC14 · muestra los tests seleccionados en un panel aparte y permite reordenarlos', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    await openCreationForm();

    fireEvent.click(screen.getByRole('button', { name: /Sentadilla 1RM/ }));
    fireEvent.click(screen.getByRole('button', { name: /30-15 Test/ }));
    fireEvent.click(screen.getByRole('button', { name: /Carrera 30 m/ }));

    // El panel está separado del catálogo y respeta el orden de selección.
    expect(selectedTestsNames()[0]).toContain('Sentadilla 1RM');
    expect(selectedTestsNames()[1]).toContain('30-15 Test');
    expect(selectedTestsNames()[2]).toContain('Carrera 30 m');

    // Cada fila queda en un solo renglón: badge, nombre con unidad y los 3 botones.
    const firstRow = within(selectedTestsList()).getAllByRole('listitem')[0];
    expect(firstRow.children).toHaveLength(3);
    expect(firstRow.querySelectorAll('button')).toHaveLength(3);
    expect(firstRow.querySelector('.ft-selected-test-unit')).not.toBeNull();

    // ↑ mueve el test una posición hacia arriba.
    fireEvent.click(
      within(selectedTestsList()).getByRole('button', { name: 'Mover Carrera 30 m arriba' }),
    );
    expect(selectedTestsNames()[0]).toContain('Sentadilla 1RM');
    expect(selectedTestsNames()[1]).toContain('Carrera 30 m');
    expect(selectedTestsNames()[2]).toContain('30-15 Test');

    // ↑ en el primero no hace nada y ↓ en el último tampoco.
    fireEvent.click(
      within(selectedTestsList()).getByRole('button', { name: 'Mover Sentadilla 1RM arriba' }),
    );
    expect(selectedTestsNames()[0]).toContain('Sentadilla 1RM');

    // ↓ mueve el test una posición hacia abajo.
    fireEvent.click(
      within(selectedTestsList()).getByRole('button', { name: 'Mover Sentadilla 1RM abajo' }),
    );
    expect(selectedTestsNames()[0]).toContain('Carrera 30 m');
    expect(selectedTestsNames()[1]).toContain('Sentadilla 1RM');

    // Quitar saca el test del panel y vuelve a estar disponible en el catálogo.
    fireEvent.click(within(selectedTestsList()).getByRole('button', { name: 'Quitar 30-15 Test' }));
    expect(selectedTestsNames()).toHaveLength(2);
    expect(selectedTestsNames().some((testName) => testName.includes('30-15 Test'))).toBe(false);
    expect(screen.getByRole('button', { name: /30-15 Test/ })).toBeDefined();
    expect(
      within(selectedTestsList()).queryByRole('button', { name: 'Quitar 30-15 Test' }),
    ).toBeNull();
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

    await openCreationForm();
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

    await openCreationForm();
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

    await openCreationForm();
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

  it('permite filtrar sesiones por categoría usando el selector tipo dropdown (KAN-656)', async () => {
    const twoCategories: Category[] = [
      {
        id: 'cat-1',
        organizationId: 'org-1',
        name: 'Primera División',
        description: null,
        athletesCount: 18,
      },
      {
        id: 'cat-2',
        organizationId: 'org-1',
        name: 'Reserva',
        description: null,
        athletesCount: 15,
      },
    ];

    vi.mocked(structureService.getCategories).mockResolvedValue(twoCategories);
    vi.mocked(listFieldTestSessions).mockImplementation(async (catId: string) => {
      if (catId === 'cat-1') {
        return [makeSummary({ id: 's-1', name: 'Sesión Primera', categoryId: 'cat-1' })];
      }
      if (catId === 'cat-2') {
        return [makeSummary({ id: 's-2', name: 'Sesión Reserva', categoryId: 'cat-2' })];
      }
      return [];
    });

    renderPage();

    // Inicialmente carga "Todas las categorías" y muestra ambas
    expect(await screen.findByText('Sesión Primera')).toBeDefined();
    expect(await screen.findByText('Sesión Reserva')).toBeDefined();

    const filterSelect = screen.getByLabelText('Filtrar por categoría') as HTMLSelectElement;
    expect(filterSelect).toBeDefined();
    expect(screen.getByRole('option', { name: 'Todas las categorías' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Primera División' })).toBeDefined();
    expect(screen.getByRole('option', { name: 'Reserva' })).toBeDefined();

    // Filtramos solo por Reserva
    fireEvent.change(filterSelect, { target: { value: 'cat-2' } });

    await waitFor(() => {
      expect(listFieldTestSessions).toHaveBeenCalledWith('cat-2');
    });
    expect(await screen.findByText('Sesión Reserva')).toBeDefined();
  });

  it('muestra el badge con el nombre de la categoría en cada tarjeta de sesión (KAN-656)', async () => {
    renderPage();
    await screen.findByText('Evaluación de pretemporada');

    // Muestra el badge con el nombre de la categoría mapeada
    const badge = screen.getByText('Primera División', {
      selector: '.ft-session-category-badge',
    });
    expect(badge).toBeDefined();
  });
});

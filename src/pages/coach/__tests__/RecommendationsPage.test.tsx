import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecommendationsPage } from '../RecommendationsPage';
import type { AthleteRecommendation } from '../../../api/recommendations';
import type { Athlete } from '../../../types/structure';

// El nombre también aparece en el selector de hábitos (KAN-634): se busca solo dentro de la lista.
const inList = () => within(screen.getByLabelText('Recomendaciones agrupadas por atleta'));

const {
  listRecommendationsMock,
  generateForCategoryMock,
  updateRecommendationMock,
  approveRecommendationMock,
  discardRecommendationMock,
  getCategoriesMock,
  getAthletesMock,
  getOrganizationsMock,
  withCategoriesMock,
} = vi.hoisted(() => ({
  listRecommendationsMock: vi.fn(),
  generateForCategoryMock: vi.fn(),
  updateRecommendationMock: vi.fn(),
  approveRecommendationMock: vi.fn(),
  discardRecommendationMock: vi.fn(),
  getCategoriesMock: vi.fn(),
  getAthletesMock: vi.fn(),
  getOrganizationsMock: vi.fn(),
  withCategoriesMock: vi.fn((athletes: Athlete[]) => Promise.resolve(athletes)),
}));

vi.mock('../../../api/recommendations', () => ({
  recommendationsService: {
    listRecommendations: listRecommendationsMock,
    generateForCategory: generateForCategoryMock,
    updateRecommendation: updateRecommendationMock,
    approveRecommendation: approveRecommendationMock,
    discardRecommendation: discardRecommendationMock,
  },
}));

vi.mock('../../../api/structureService', () => ({
  structureService: {
    getOrganizations: getOrganizationsMock,
    getCategories: getCategoriesMock,
    getAthletes: getAthletesMock,
    withCategories: withCategoriesMock,
    getAthletePhotoUrl: vi.fn(
      (id: string, v?: string | null) =>
        `/estructura/api/v1/athletes/${id}/photo${v ? `?v=${encodeURIComponent(v)}` : ''}`,
    ),
  },
}));

const pendingRec: AthleteRecommendation = {
  id: 'rec-1',
  athleteId: 'ath-1',
  categoryId: 'cat-1',
  categoryName: 'Primera División',
  type: 'Training',
  status: 'Pending',
  title: 'Ajuste de potencia de salto',
  reason: 'salto por debajo del promedio',
  recommendationText: 'Sumar dos bloques de saltos pliométricos controlados por semana.',
  provider: 'Reglas',
  metrics: [
    {
      dimension: 'Salto Vertical CMJ (cm)',
      athleteValue: 34,
      groupAverage: 42,
      unit: 'cm',
      percentageDifference: -19,
      trend: 'Por debajo del promedio (-19.0%)',
    },
  ],
  trends: {
    weeksEvaluated: 4,
    trendLabel: 'Tendencia estable',
  },
  createdAt: '2026-11-19T15:00:00Z',
  updatedAt: '2026-11-19T15:00:00Z',
  reviewedAtUtc: null,
};

function renderPage(initialPath = '/pf/recommendations') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RecommendationsPage />
    </MemoryRouter>,
  );
}

describe('RecommendationsPage (KAN-492)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOrganizationsMock.mockResolvedValue([{ id: 'org-1', name: 'Club Quilmes' }]);
    getCategoriesMock.mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera División', athletesCount: 10 },
      { id: 'cat-2', organizationId: 'org-1', name: 'Reserva', athletesCount: 8 },
    ]);
    getAthletesMock.mockResolvedValue([
      {
        id: 'ath-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        active: true,
        categories: [],
      },
    ]);
    listRecommendationsMock.mockResolvedValue([pendingRec]);
  });

  it('muestra recomendaciones pendientes con el nombre del atleta, motivo y datos de respaldo', async () => {
    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    // Incluso con 1 recomendación arranca comprimida con contador y chip capitalizado
    expect(screen.getByText('Salto por debajo del promedio')).toBeDefined();
    expect(screen.getByText('1 pendiente')).toBeDefined();
    expect(screen.queryByText('Ajuste de potencia de salto')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));

    expect(screen.getByText('Ajuste de potencia de salto')).toBeDefined();
    expect(
      screen.getByText('Sumar dos bloques de saltos pliométricos controlados por semana.'),
    ).toBeDefined();

    const discardBtn = screen.getByRole('button', { name: /Descartar/i });
    expect(discardBtn.className).toContain('recommendation-btn-discard');

    expect(screen.getByRole('tab', { name: /Pendientes/i }).className).toContain('status-pending');
    expect(screen.getByRole('tab', { name: /Aprobadas/i }).className).toContain('status-approved');
    expect(screen.getByRole('tab', { name: /Descartadas/i }).className).toContain(
      'status-discarded',
    );

    fireEvent.click(screen.getByRole('button', { name: /Ver datos de respaldo/i }));
    expect(screen.getByText('Salto Vertical CMJ (cm)')).toBeDefined();
    expect(screen.getByText('Tendencia estable')).toBeDefined();
  });

  it('muestra el avatar con foto del atleta cuando tiene foto cargada', async () => {
    getAthletesMock.mockResolvedValue([
      {
        id: 'ath-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        active: true,
        hasPhoto: true,
        photoUpdatedAt: '2026-11-24T02:59:13Z',
        categories: [],
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    const avatarImg = inList().getByRole('img', { name: /Foto de perfil de Lucas Gómez/i });
    expect(avatarImg).toBeDefined();
    expect(avatarImg.getAttribute('src')).toContain('/estructura/api/v1/athletes/ath-1/photo');
  });

  it('permite editar título y texto manteniendo el motivo inmutable', async () => {
    updateRecommendationMock.mockResolvedValue({
      ...pendingRec,
      title: 'Foco en saltos cortos',
      recommendationText: '3x5 saltos al cajón martes y jueves.',
    });

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));

    // El motivo sigue visible capitalizado pero no tiene input editable
    expect(screen.getAllByText('Salto por debajo del promedio').length).toBeGreaterThanOrEqual(1);

    const titleInput = screen.getByLabelText('Título');
    const textInput = screen.getByLabelText('Texto para el atleta');

    fireEvent.change(titleInput, { target: { value: 'Foco en saltos cortos' } });
    fireEvent.change(textInput, { target: { value: '3x5 saltos al cajón martes y jueves.' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/i }));

    await waitFor(() => {
      expect(updateRecommendationMock).toHaveBeenCalledWith('rec-1', {
        title: 'Foco en saltos cortos',
        recommendationText: '3x5 saltos al cajón martes y jueves.',
      });
    });

    expect(screen.getByText('Foco en saltos cortos')).toBeDefined();
  });

  it('aprueba una recomendación pendiente y la mueve a la pestaña Aprobadas', async () => {
    approveRecommendationMock.mockResolvedValue({
      ...pendingRec,
      status: 'Approved',
      reviewedAtUtc: '2026-11-19T17:10:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Aprobar y enviar recomendación a Lucas Gómez/i }),
    );

    await waitFor(() => {
      expect(approveRecommendationMock).toHaveBeenCalledWith('rec-1', undefined);
    });

    await waitFor(() => {
      expect(screen.getByText('No hay recomendaciones pendientes')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('tab', { name: /Aprobadas/i }));
    expect(inList().getByText('Lucas Gómez')).toBeDefined();
    expect(screen.getByText('1 aprobada')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    expect(screen.getByText('Ajuste de potencia de salto')).toBeDefined();
  });

  it('permite guardar y aprobar en un solo paso desde el modo edición', async () => {
    approveRecommendationMock.mockResolvedValue({
      ...pendingRec,
      title: 'Título ajustado',
      recommendationText: 'Texto ajustado para el atleta.',
      status: 'Approved',
      reviewedAtUtc: '2026-11-19T17:15:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Título ajustado' } });
    fireEvent.change(screen.getByLabelText('Texto para el atleta'), {
      target: { value: 'Texto ajustado para el atleta.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar y aprobar/i }));

    await waitFor(() => {
      expect(approveRecommendationMock).toHaveBeenCalledWith('rec-1', {
        title: 'Título ajustado',
        recommendationText: 'Texto ajustado para el atleta.',
      });
    });
  });

  it('descarta una recomendación tras confirmar y la mueve a Descartadas', async () => {
    discardRecommendationMock.mockResolvedValue({
      ...pendingRec,
      status: 'Discarded',
      reviewedAtUtc: '2026-11-19T17:12:00Z',
    });

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    fireEvent.click(screen.getByRole('button', { name: /Descartar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar descarte/i }));

    await waitFor(() => {
      expect(discardRecommendationMock).toHaveBeenCalledWith('rec-1');
    });

    fireEvent.click(screen.getByRole('tab', { name: /Descartadas/i }));
    expect(inList().getByText('Lucas Gómez')).toBeDefined();
  });

  it('deshabilita el botón sin categoría seleccionada y ejecuta el motor al elegir una (KAN-512)', async () => {
    generateForCategoryMock.mockResolvedValue({
      categoryId: 'cat-1',
      categoryName: 'Primera División',
      evaluatedAthletes: 10,
      generatedCount: 2,
      existingPendingCount: 0,
      recommendations: [pendingRec],
    });

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    // Sin categoría seleccionada ("Todas las categorías"), el botón está deshabilitado
    const defaultBtn = screen.getByRole('button', { name: /Analizar plantel/i });
    expect((defaultBtn as HTMLButtonElement).disabled).toBe(true);

    // Seleccionamos Primera División
    fireEvent.change(screen.getByLabelText(/Filtrar por categoría/i), {
      target: { value: 'cat-1' },
    });

    const analyzeBtn = screen.getByRole('button', { name: /Analizar: Primera División/i });
    expect((analyzeBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(generateForCategoryMock).toHaveBeenCalledWith('cat-1', 4);
    });

    await waitFor(() => {
      expect(screen.getByText(/Se generaron 2 nuevas recomendaciones pendientes/i)).toBeDefined();
    });
  });

  it('agrupa múltiples recomendaciones del mismo atleta en una sola tarjeta colapsable con contador', async () => {
    const secondRec: AthleteRecommendation = {
      ...pendingRec,
      id: 'rec-2',
      title: 'Ajuste de velocidad',
      reason: 'velocidad por debajo del promedio',
      recommendationText: 'Incluir sprints cortos con recuperación completa.',
      metrics: [],
      trends: null,
    };
    listRecommendationsMock.mockResolvedValue([pendingRec, secondRec]);

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    // El nombre del atleta aparece una sola vez aunque tenga 2 recomendaciones
    expect(inList().getAllByText('Lucas Gómez')).toHaveLength(1);
    expect(screen.getByText('2 pendientes')).toBeDefined();
    expect(screen.getByText('Salto por debajo del promedio')).toBeDefined();
    expect(screen.getByText('Velocidad por debajo del promedio')).toBeDefined();

    // Arranca colapsada cuando tiene 2 o más
    expect(screen.queryByText('Ajuste de potencia de salto')).toBeNull();
    expect(screen.queryByText('Ajuste de velocidad')).toBeNull();

    // Al expandir muestra ambas recomendaciones individuales
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendaciones \(2\)/i }));
    expect(screen.getByText('Ajuste de potencia de salto')).toBeDefined();
    expect(screen.getByText('Ajuste de velocidad')).toBeDefined();
  });

  it('permite alternar entre "Analizar plantel" y "Hábitos y alimentación" separando las secciones (KAN-654)', async () => {
    const habitsRec: AthleteRecommendation = {
      ...pendingRec,
      id: 'rec-habits-1',
      type: 'Habits',
      title: 'Ajuste de hidratación y proteína',
      reason: 'objetivo de masa muscular',
      recommendationText: 'Ingesta de 1.8g/kg de proteína y 2.5L de agua diarios.',
    };
    listRecommendationsMock.mockResolvedValue([pendingRec, habitsRec]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    // Pestaña inicial: "Analizar plantel"
    const analysisTab = screen.getByRole('tab', { name: /Analizar plantel/i });
    const habitsTab = screen.getByRole('tab', { name: /Hábitos y alimentación/i });
    expect(analysisTab).toBeDefined();
    expect(habitsTab).toBeDefined();
    expect(analysisTab.getAttribute('aria-selected')).toBe('true');
    expect(habitsTab.getAttribute('aria-selected')).toBe('false');

    // Cada vista muestra cuántas pendientes tiene, para que las de hábitos no pasen desapercibidas
    expect(screen.getByTestId('pending-count-analysis').textContent).toBe('1');
    expect(screen.getByTestId('pending-count-habits').textContent).toBe('1');

    // En "Analizar plantel": visible el motor y la recomendación física, oculto Hábitos
    expect(screen.getByText('Analizar plantel y generar propuestas')).toBeDefined();
    expect(screen.queryByLabelText('Generar recomendación de hábitos y alimentación')).toBeNull();

    // Cambiamos a "Hábitos y alimentación"
    fireEvent.click(habitsTab);
    expect(habitsTab.getAttribute('aria-selected')).toBe('true');
    expect(analysisTab.getAttribute('aria-selected')).toBe('false');

    // En "Hábitos y alimentación": visible el bloque de hábitos, oculto el motor físico
    expect(screen.getByLabelText('Generar recomendación de hábitos y alimentación')).toBeDefined();
    expect(screen.queryByText('Analizar plantel y generar propuestas')).toBeNull();
  });

  it('con ?view=habits abre directo en "Hábitos y alimentación"', async () => {
    renderPage('/pf/recommendations?view=habits');

    const habitsTab = await screen.findByRole('tab', { name: /Hábitos y alimentación/i });
    expect(habitsTab.getAttribute('aria-selected')).toBe('true');
  });

  it('permite marcar en qué categoría analizar directamente en la barra de análisis (KAN-663)', async () => {
    getCategoriesMock.mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera División', athletesCount: 10 },
      { id: 'cat-3', organizationId: 'org-2', name: 'Alumnos particulares', athletesCount: 5 },
    ]);
    generateForCategoryMock.mockResolvedValue({
      categoryId: 'cat-3',
      categoryName: 'Alumnos particulares',
      evaluatedAthletes: 5,
      generatedCount: 1,
      existingPendingCount: 0,
      recommendations: [pendingRec],
    });

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    const analysisCategorySelect = screen.getByLabelText(/Categoría para analizar/i);
    expect(analysisCategorySelect).toBeDefined();

    // Marcamos la categoría "Alumnos particulares" en el selector de la barra de análisis
    fireEvent.change(analysisCategorySelect, { target: { value: 'cat-3' } });

    // El botón debe reflejar dinámicamente "Analizar: Alumnos particulares"
    const analyzeBtn = screen.getByRole('button', { name: /Analizar: Alumnos particulares/i });
    expect(analyzeBtn).toBeDefined();
    expect((analyzeBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(generateForCategoryMock).toHaveBeenCalledWith('cat-3', 4);
    });
  });

  it('muestra la categoría del atleta en el selector de hábitos en lugar de "Sin categoría" (KAN-663)', async () => {
    withCategoriesMock.mockResolvedValue([
      {
        id: 'ath-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        email: 'lucas@example.com',
        phone: '123456789',
        active: true,
        categoryNames: ['Primera División'],
        categories: [{ id: 'cat-1', name: 'Primera División' }],
      },
      {
        id: 'ath-2',
        firstName: 'Agustina',
        lastName: 'Morales',
        fullName: 'Agustina Morales',
        email: 'agustina@example.com',
        phone: '987654321',
        active: true,
        categoryNames: ['Alumnos particulares'],
        categories: [{ id: 'cat-3', name: 'Alumnos particulares' }],
      },
    ]);

    renderPage('/pf/recommendations?view=habits');

    await waitFor(() => {
      expect(screen.getByText('Elegí un atleta…')).toBeDefined();
    });

    // Abrimos el dropdown interactivo de hábitos
    fireEvent.click(
      screen.getByRole('button', { name: /Desplegar lista de atletas para hábitos/i }),
    );

    const dropdownList = within(screen.getByRole('listbox'));
    // Verificamos que aparezca la categoría del atleta y no "Sin categoría"
    expect(dropdownList.getByText('Primera División')).toBeDefined();
    expect(dropdownList.getByText('Alumnos particulares')).toBeDefined();
    expect(dropdownList.queryByText('Sin categoría')).toBeNull();
  });

  it('elimina información redundante: la fecha no repite el estado y la categoría comparte fila de badges (KAN-665)', async () => {
    const approvedRec: AthleteRecommendation = {
      ...pendingRec,
      id: 'rec-approved-1',
      status: 'Approved',
      reviewedAtUtc: '2026-11-20T18:30:00Z',
    };
    listRecommendationsMock.mockResolvedValue([approvedRec]);

    renderPage();

    // Cambiamos a la pestaña de Aprobadas
    fireEvent.click(await screen.findByRole('tab', { name: /Aprobadas/i }));

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    // Expandimos la tarjeta del atleta
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));

    // Verificamos que la fecha formateada esté limpia y NO contenga el prefijo "Aprobada · "
    const timeElem = document.querySelector('time.recommendation-date');
    expect(timeElem).toBeDefined();
    expect(timeElem?.textContent).not.toContain('Aprobada ·');

    // Verificamos que el badge de categoría esté dentro de la fila de badges
    const badgesContainer = document.querySelector('.recommendation-card-badges');
    expect(badgesContainer?.querySelector('.recommendation-badge.category')?.textContent).toBe(
      'Primera División',
    );
  });

  it('oculta motivos genéricos del tipo "Objetivo no informado" y no duplica motivos al expandir (KAN-665)', async () => {
    const genericHabitsRec: AthleteRecommendation = {
      ...pendingRec,
      id: 'rec-habits-generic',
      type: 'Habits',
      reason: 'Objetivo: Objetivo no informado. Se sugiere consultar a un profesional de la salud.',
      title: 'Recomendación de hábitos con derivación profesional',
      recommendationText: 'Por seguridad, se recomienda consultar a un profesional de nutrición...',
    };
    listRecommendationsMock.mockResolvedValue([genericHabitsRec]);

    renderPage('/pf/recommendations?view=habits');

    await waitFor(() => {
      expect(screen.getByText('Lucas Gómez')).toBeDefined();
    });

    // En la vista contraída, no debe haber chip genérico de "Objetivo no informado"
    expect(screen.queryByText(/Objetivo: Objetivo no informado/i)).toBeNull();

    // Al expandir la recomendación
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));

    // No debe renderizar el cuadro de motivo detectado para "Objetivo no informado"
    expect(document.querySelector('.recommendation-reason-box')).toBeNull();
    // Pero sí muestra el título y el cuerpo de la recomendación normalmente
    expect(screen.getByText('Recomendación de hábitos con derivación profesional')).toBeDefined();
  });

  it('renderiza la burbuja en modelo minimalista con números de métricas y estado (KAN-665)', async () => {
    getCategoriesMock.mockResolvedValue([
      { id: 'cat-1', organizationId: 'org-1', name: 'Primera División' },
    ]);
    getAthletesMock.mockResolvedValue([
      {
        id: 'ath-1',
        firstName: 'Lucas',
        lastName: 'Gómez',
        fullName: 'Lucas Gómez',
        active: true,
        categories: [
          {
            id: 'cat-1',
            name: 'Primera División',
            organizationId: 'org-1',
            organizationName: 'Club Quilmes',
          },
        ],
      },
    ]);
    listRecommendationsMock.mockResolvedValue([pendingRec]);

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    // Subtítulo con formato minimalista: Club · Categoría
    expect(screen.getByText('Club Quilmes · Primera División')).toBeDefined();

    // Etiqueta de estado en la burbuja
    expect(screen.getByText('Pendiente')).toBeDefined();

    // Número de métrica destacado (-19%)
    expect(screen.getByText('-19%')).toBeDefined();
    expect(screen.getByText(/Salto Vertical CMJ/i)).toBeDefined();
  });

  it('abre la tarjeta en un único modal montado en document.body fuera de la tarjeta y permite cerrarlo (KAN-665)', async () => {
    listRecommendationsMock.mockResolvedValue([pendingRec]);

    renderPage();

    await waitFor(() => {
      expect(inList().getByText('Lucas Gómez')).toBeDefined();
    });

    // Antes de abrir la ventana, el diálogo modal no existe
    expect(screen.queryByRole('dialog')).toBeNull();

    // Clic en Ver recomendación para abrir la tarjeta en modo ventana
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));

    // Debe haber exactamente 1 diálogo modal y estar montado fuera de la tarjeta (vía portal en document.body)
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(1);
    const modal = dialogs[0];
    expect(modal.closest('.recommendation-athlete-group')).toBeNull();
    expect(modal.parentElement?.parentElement).toBe(document.body);
    expect(document.body.style.overflow).toBe('hidden');

    // Contenido completo y botones de acción dentro del modal
    expect(within(modal).getByText('Ajuste de potencia de salto')).toBeDefined();
    expect(
      within(modal).getByText('Sumar dos bloques de saltos pliométricos controlados por semana.'),
    ).toBeDefined();
    expect(within(modal).getByRole('button', { name: /Editar/i })).toBeDefined();
    expect(within(modal).getByRole('button', { name: /Aprobar y enviar/i })).toBeDefined();
    expect(within(modal).getByRole('button', { name: /Descartar/i })).toBeDefined();

    // Cierre mediante el botón "Cerrar ventana"
    const closeBtns = within(modal).getAllByRole('button', { name: /Cerrar ventana/i });
    expect(closeBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeBtns[0]);

    // El diálogo modal se cerró y se restauró el scroll del body
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');

    // Reabrir y verificar cierre con tecla Escape
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    // Reabrir y verificar cierre al hacer clic en el backdrop
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendación/i }));
    const overlay = document.querySelector('.recommendation-modal-overlay');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as Element);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

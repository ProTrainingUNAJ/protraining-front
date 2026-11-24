import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Play,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { formatIsoDate } from '../../utils/argentinaDate';
import { structureService } from '../../api/structureService';
import {
  createFieldTestSession,
  listFieldTestSessions,
  listFitnessTests,
  updateFieldTestSessionStatus,
} from '../../api/fieldTestSessions';
import type {
  FieldTestSessionSummary,
  FitnessTest,
  MotorCapacity,
} from '../../api/generated/seguimiento';
import type { Category, Organization } from '../../types/structure';

// Etiquetas de las capacidades motoras en el orden del enum del backend (KAN-458):
// se usan como chips de filtro del catálogo y solo se muestran las presentes en él.
const CAPACITY_LABEL: Record<MotorCapacity, string> = {
  Strength: 'Fuerza',
  Velocity: 'Velocidad',
  Endurance: 'Resistencia',
  Power: 'Potencia',
  Flexibility: 'Flexibilidad',
  Agility: 'Agilidad',
  Coordination: 'Coordinación',
};

// Estados de la sesión, en el mismo orden que el backend.
const STATUS_LABEL: Record<FieldTestSessionSummary['status'], string> = {
  Planned: 'Planificada',
  InProgress: 'En curso',
  Closed: 'Cerrada',
};

type SessionStatus = FieldTestSessionSummary['status'];
type SessionStatusFilter = SessionStatus | 'all';

// Filtro por estado de las sesiones cargadas (AC08).
const STATUS_FILTERS: Array<{ value: SessionStatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'Planned', label: 'Planificada' },
  { value: 'InProgress', label: 'En curso' },
  { value: 'Closed', label: 'Cerrada' },
];

const todayIso = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

// Pantalla de entrada al test de campo: filtrar por organización y categoría,
// ver (o crear) la sesión y lanzar la captura de marcas.
export const FieldTestsPage: React.FC = () => {
  const navigate = useNavigate();

  // Estructura del PF (organizaciones → categorías), mismo patrón que MonitoringPage.
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // '' representa "Todas"; un ID puntual filtra por ese plantel (AC02-AC05).
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<FieldTestSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Búsqueda por nombre y filtro por estado sobre las sesiones cargadas (AC07-AC08).
  const [sessionSearch, setSessionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>('all');

  // Formulario de alta de sesión.
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayIso);
  // Tests elegidos para la sesión nueva, en el orden en que se evalúan (AC14).
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [catalogTests, setCatalogTests] = useState<FitnessTest[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Búsqueda por nombre + filtro por capacidad del catálogo (AC12).
  const [testSearch, setTestSearch] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<MotorCapacity | ''>('');

  // --------------------------- Derivados ---------------------------

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Solo se ofrecen los filtros de capacidades que existen en el catálogo.
  const availableCapacities = useMemo(
    () =>
      (Object.keys(CAPACITY_LABEL) as MotorCapacity[]).filter((capacity) =>
        catalogTests.some((test) => test.motorCapacity === capacity),
      ),
    [catalogTests],
  );

  // Catálogo filtrado: búsqueda por nombre AND capacidad motora (AC12).
  const visibleCatalogTests = useMemo(() => {
    const query = testSearch.trim().toLowerCase();
    return catalogTests.filter(
      (test) =>
        (query === '' || test.name.toLowerCase().includes(query)) &&
        (capacityFilter === '' || test.motorCapacity === capacityFilter),
    );
  }, [catalogTests, testSearch, capacityFilter]);

  // Categorías de la organización elegida; sin organización no se ofrece ninguna (AC04).
  const visibleCategories = useMemo(
    () =>
      selectedOrganizationId
        ? categories.filter((category) => category.organizationId === selectedOrganizationId)
        : [],
    [categories, selectedOrganizationId],
  );

  // Categoría efectiva: la elegida sólo si sigue perteneciendo a la organización (AC05).
  const effectiveCategoryId = useMemo(() => {
    if (!selectedOrganizationId) return '';
    if (selectedCategoryId && visibleCategories.some((c) => c.id === selectedCategoryId)) {
      return selectedCategoryId;
    }
    return '';
  }, [selectedCategoryId, selectedOrganizationId, visibleCategories]);

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === effectiveCategoryId)?.name ?? '',
    [categories, effectiveCategoryId],
  );

  // Categorías a pedir al backend: la elegida o todas las visibles (vista "Todas").
  const sessionCategoryIds = useMemo(() => {
    if (effectiveCategoryId) return [effectiveCategoryId];
    return (selectedOrganizationId ? visibleCategories : categories).map((category) => category.id);
  }, [categories, effectiveCategoryId, selectedOrganizationId, visibleCategories]);

  // Sesiones filtradas por nombre y estado, sin volver a pedirlas al backend (AC07-AC08).
  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase();
    return sessions.filter(
      (session) =>
        (query === '' || session.name.toLowerCase().includes(query)) &&
        (statusFilter === 'all' || session.status === statusFilter),
    );
  }, [sessions, sessionSearch, statusFilter]);

  // --------------------------- Efectos ---------------------------

  // Organizaciones y sus categorías (AC02).
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const loadedOrganizations = await structureService.getOrganizations();
        const categoriesByOrganization = await Promise.all(
          loadedOrganizations.map((organization) =>
            structureService.getCategories(organization.id).catch(() => [] as Category[]),
          ),
        );
        if (!active) return;
        setOrganizations(loadedOrganizations);
        setCategories(categoriesByOrganization.flat());
      } catch (err) {
        if (!active) return;
        setCategoriesError(
          err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.',
        );
      } finally {
        if (active) setCategoriesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Catálogo de tests: se pide una sola vez, para el formulario de alta.
  useEffect(() => {
    if (catalogLoaded) return;
    let active = true;

    listFitnessTests()
      .then((tests) => {
        if (!active) return;
        setCatalogTests(tests);
        setCatalogLoaded(true);
        setCatalogError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCatalogError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.');
      });

    return () => {
      active = false;
    };
  }, [catalogLoaded]);

  const loadSessions = useCallback(async (categoryIds: string[]) => {
    setSessionsLoading(true);
    setSessionsError(null);
    setActionError(null);
    try {
      if (categoryIds.length === 0) {
        setSessions([]);
        return;
      }
      if (categoryIds.length === 1) {
        setSessions(await listFieldTestSessions(categoryIds[0]));
        return;
      }
      // Vista "Todas": se piden todas las categorías visibles. Una categoría puntual
      // que falle no debería ocultar el resto, salvo que fallen todas.
      const settled = await Promise.allSettled(
        categoryIds.map((categoryId) => listFieldTestSessions(categoryId)),
      );
      if (settled.every((result) => result.status === 'rejected')) {
        const first = settled[0];
        throw first.status === 'rejected'
          ? first.reason
          : new Error('No se pudieron cargar las sesiones.');
      }
      setSessions(settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])));
    } catch (err) {
      setSessions([]);
      setSessionsError(err instanceof Error ? err.message : 'No se pudieron cargar las sesiones.');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (categoriesLoading) return;
    // Mismo criterio que DailyLoadPage: la carga (que arranca con setState de
    // loading) se difiere un tick para no encadenar renders síncronos en el effect.
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void loadSessions(sessionCategoryIds);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [categoriesLoading, sessionCategoryIds, loadSessions]);

  // --------------------------- Acciones ---------------------------

  const changeStatus = async (
    sessionId: string,
    status: 'InProgress' | 'Closed',
  ): Promise<void> => {
    setActionError(null);
    try {
      await updateFieldTestSessionStatus(sessionId, status);
      await loadSessions(sessionCategoryIds);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar la sesión.');
    }
  };

  const toggleTest = (testId: string): void => {
    setSelectedTestIds((current) =>
      current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId],
    );
  };

  // Reordenamiento del panel de seleccionados (AC14).
  const moverArriba = (testId: string): void => {
    setSelectedTestIds((current) => {
      const index = current.indexOf(testId);
      if (index <= 0) return current;
      const next = [...current];
      [next[index], next[index - 1]] = [next[index - 1], next[index]];
      return next;
    });
  };

  const moverAbajo = (testId: string): void => {
    setSelectedTestIds((current) => {
      const index = current.indexOf(testId);
      if (index < 0 || index >= current.length - 1) return current;
      const next = [...current];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const quitarTest = (testId: string): void => {
    setSelectedTestIds((current) => current.filter((id) => id !== testId));
  };

  const openForm = (): void => {
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = (): void => {
    setFormError(null);
    setShowForm(false);
  };

  // Al cambiar de organización se cierra y limpia el formulario abierto (AC05):
  // el borrador no debe arrastrarse a otra organización ni a otra categoría.
  const resetForm = (): void => {
    setShowForm(false);
    setFormError(null);
    setName('');
    setDate(todayIso());
    setSelectedTestIds([]);
    setTestSearch('');
    setCapacityFilter('');
  };

  const submitNewSession = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    if (!effectiveCategoryId) {
      setFormError('Elegí una organización y una categoría para crear la sesión.');
      return;
    }
    if (!name.trim()) {
      setFormError('Poné un nombre para la sesión.');
      return;
    }
    if (selectedTestIds.length === 0) {
      setFormError('Elegí al menos un test del catálogo.');
      return;
    }

    setSaving(true);
    try {
      await createFieldTestSession({
        categoryId: effectiveCategoryId,
        date,
        name: name.trim(),
        tests: selectedTestIds.map((catalogTestId, index) => ({
          catalogTestId,
          order: index + 1,
        })),
      });
      setShowForm(false);
      setName('');
      setSelectedTestIds([]);
      setTestSearch('');
      setCapacityFilter('');
      await loadSessions(sessionCategoryIds);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la sesión.');
    } finally {
      setSaving(false);
    }
  };

  const requiresCategory = categoriesLoading || !effectiveCategoryId;
  const requiresCategoryHint = 'Elegí una organización y una categoría para crear una sesión.';

  // --------------------------- Vista ---------------------------

  return (
    <div className="app-page-container">
      <PageHeader
        title="Tests de campo"
        description="Creá la sesión de evaluación y tomá las marcas de los atletas en cancha."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={openForm}
            disabled={requiresCategory}
            title={requiresCategory ? requiresCategoryHint : undefined}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Nueva sesión</span>
          </button>
        }
      />

      <div className="app-page-body">
        {categoriesLoading && <p className="ft-muted">Cargando categorías…</p>}
        {categoriesError && <div className="alert-banner danger">{categoriesError}</div>}

        {!categoriesLoading && !categoriesError && categories.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="Todavía no tenés planteles"
            description="Para tomar tests de campo primero creá una organización y una categoría con atletas."
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/pf/organizations')}
              >
                Ir a Organizaciones
              </button>
            }
          />
        )}

        {!categoriesLoading && !categoriesError && categories.length > 0 && (
          <>
            {/* Barra de filtros: organización → categoría, búsqueda y estado (AC02-AC08) */}
            <div className="ft-filter-toolbar">
              <div className="ft-filter-group">
                <label htmlFor="ft-org-filter" className="ft-filter-label">
                  Organización:
                </label>
                <select
                  id="ft-org-filter"
                  aria-label="Filtrar por organización"
                  className="ft-filter-select"
                  value={selectedOrganizationId}
                  onChange={(event) => {
                    const organizationId = event.target.value;
                    if (organizationId === selectedOrganizationId) return;
                    // AC05: cambiar de organización cierra y limpia el formulario abierto.
                    resetForm();
                    setSelectedOrganizationId(organizationId);
                    // AC05: si la categoría elegida no pertenece a la organización nueva,
                    // se resetea por la primera categoría de esa organización.
                    setSelectedCategoryId((current) => {
                      if (!organizationId) return '';
                      const organizationCategories = categories.filter(
                        (category) => category.organizationId === organizationId,
                      );
                      if (current && organizationCategories.some((c) => c.id === current)) {
                        return current;
                      }
                      return organizationCategories[0]?.id ?? '';
                    });
                  }}
                  disabled={categoriesLoading || saving}
                >
                  <option value="">Todas las organizaciones</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ft-filter-group">
                <label htmlFor="ft-category-filter" className="ft-filter-label">
                  Categoría:
                </label>
                <select
                  id="ft-category-filter"
                  aria-label="Filtrar por categoría"
                  className="ft-filter-select"
                  value={effectiveCategoryId}
                  onChange={(event) => setSelectedCategoryId(event.target.value)}
                  disabled={!selectedOrganizationId || saving}
                >
                  <option value="">Todas las categorías</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ft-filter-group ft-filter-group--grow">
                <label htmlFor="ft-session-search" className="ft-filter-label">
                  Buscar sesión:
                </label>
                <div className="ft-search-input">
                  <Search size={15} aria-hidden="true" />
                  <input
                    id="ft-session-search"
                    type="search"
                    className="ft-search-input__field"
                    placeholder="Nombre de la sesión"
                    aria-label="Buscar sesión por nombre"
                    value={sessionSearch}
                    onChange={(event) => setSessionSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="ft-filter-group ft-filter-group--grow">
                <span className="ft-filter-label" id="ft-status-filter-label">
                  Estado:
                </span>
                <div
                  className="ft-status-chips"
                  role="group"
                  aria-labelledby="ft-status-filter-label"
                >
                  {STATUS_FILTERS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`ft-status-chip${statusFilter === option.value ? ' ft-status-chip--active' : ''}`}
                      aria-pressed={statusFilter === option.value}
                      onClick={() => setStatusFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Formulario de alta: catálogo con buscador + panel de seleccionados (AC12-AC14) */}
            {showForm && (
              <form className="card ft-form" onSubmit={submitNewSession}>
                <h3>Nueva sesión de test</h3>

                <div className="ft-form-row">
                  <label className="ft-field">
                    <span>Nombre</span>
                    <input
                      type="text"
                      maxLength={150}
                      value={name}
                      placeholder="Evaluación de pretemporada"
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>

                  <label className="ft-field">
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </label>

                  <div className="ft-field">
                    <span>Categoría</span>
                    <p className="ft-field-value">{selectedCategoryName}</p>
                  </div>
                </div>

                <div className="ft-form-grid">
                  <fieldset className="ft-field ft-catalog">
                    <legend>Tests (en el orden en que se evalúan)</legend>
                    {catalogError && <div className="alert-banner danger">{catalogError}</div>}

                    <div className="ft-search-input">
                      <Search size={15} aria-hidden="true" />
                      <input
                        type="search"
                        className="ft-search-input__field"
                        placeholder="Buscar test por nombre"
                        aria-label="Buscar test por nombre"
                        value={testSearch}
                        onChange={(event) => setTestSearch(event.target.value)}
                      />
                    </div>

                    {catalogTests.length > 0 && (
                      <div
                        className="ft-test-filters"
                        role="group"
                        aria-label="Filtrar por capacidad motora"
                      >
                        <button
                          type="button"
                          className={`ft-test-filter${capacityFilter === '' ? ' ft-test-filter--active' : ''}`}
                          aria-pressed={capacityFilter === ''}
                          onClick={() => setCapacityFilter('')}
                        >
                          Todos
                        </button>
                        {availableCapacities.map((capacity) => (
                          <button
                            key={capacity}
                            type="button"
                            className={`ft-test-filter${capacityFilter === capacity ? ' ft-test-filter--active' : ''}`}
                            aria-pressed={capacityFilter === capacity}
                            onClick={() => setCapacityFilter(capacity)}
                          >
                            {CAPACITY_LABEL[capacity]}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="ft-test-options">
                      {visibleCatalogTests.map((test) => {
                        const order = selectedTestIds.indexOf(test.id);
                        return (
                          <button
                            key={test.id}
                            type="button"
                            className={`ft-test-option${order >= 0 ? ' ft-test-option--selected' : ''}`}
                            onClick={() => toggleTest(test.id)}
                            aria-pressed={order >= 0}
                          >
                            <span className="ft-test-option__order">
                              {order >= 0 ? order + 1 : '·'}
                            </span>
                            <span className="ft-test-option__name">{test.name}</span>
                            <span className="ft-test-option__unit">{test.measurementUnit}</span>
                          </button>
                        );
                      })}
                    </div>

                    {visibleCatalogTests.length === 0 && (
                      <p className="ft-muted">No hay tests que coincidan con la búsqueda.</p>
                    )}
                  </fieldset>

                  {/* Panel de tests seleccionados, separado del catálogo (AC14) */}
                  <div className="ft-selected-tests-panel">
                    <span className="ft-selected-tests-title">
                      Tests seleccionados ({selectedTestIds.length})
                    </span>

                    {selectedTestIds.length === 0 && (
                      <p className="ft-muted">Tocá un test del catálogo para agregarlo acá.</p>
                    )}

                    <ul
                      className="ft-selected-tests-list"
                      aria-label="Tests seleccionados en orden"
                    >
                      {selectedTestIds.map((testId, index) => {
                        const test = catalogTests.find((item) => item.id === testId);
                        const testName = test?.name || testId;
                        return (
                          <li key={testId} className="ft-selected-test-item">
                            <span className="ft-selected-test-order" aria-hidden="true">
                              {index + 1}
                            </span>
                            <span className="ft-selected-test-name">
                              {testName}
                              {test?.measurementUnit && (
                                <span className="ft-selected-test-unit">
                                  {test.measurementUnit}
                                </span>
                              )}
                            </span>
                            <span className="ft-selected-test-actions">
                              <button
                                type="button"
                                className="ft-icon-btn"
                                aria-label={`Mover ${testName} arriba`}
                                disabled={index === 0}
                                onClick={() => moverArriba(testId)}
                              >
                                <ChevronUp size={16} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="ft-icon-btn"
                                aria-label={`Mover ${testName} abajo`}
                                disabled={index === selectedTestIds.length - 1}
                                onClick={() => moverAbajo(testId)}
                              >
                                <ChevronDown size={16} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="ft-icon-btn ft-icon-btn--danger"
                                aria-label={`Quitar ${testName}`}
                                onClick={() => quitarTest(testId)}
                              >
                                <X size={16} aria-hidden="true" />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {formError && <div className="alert-banner danger">{formError}</div>}

                <div className="ft-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Creando…' : 'Crear sesión'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {actionError && <div className="alert-banner danger">{actionError}</div>}
            {sessionsError && <div className="alert-banner danger">{sessionsError}</div>}
            {sessionsLoading && <p className="ft-muted">Cargando sesiones…</p>}

            {!sessionsLoading &&
              !sessionsError &&
              categories.length > 0 &&
              sessions.length === 0 && (
                <div className="card ft-empty">
                  <ClipboardList size={32} aria-hidden="true" />
                  <p>
                    {effectiveCategoryId
                      ? 'Todavía no hay sesiones en esta categoría.'
                      : 'Todavía no hay sesiones de tests de campo registradas.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={openForm}
                    disabled={requiresCategory}
                    title={requiresCategory ? requiresCategoryHint : undefined}
                  >
                    Crear la primera sesión
                  </button>
                </div>
              )}

            {!sessionsLoading &&
              !sessionsError &&
              sessions.length > 0 &&
              filteredSessions.length === 0 && (
                <div className="card ft-empty">
                  <ClipboardList size={32} aria-hidden="true" />
                  <p>No encontramos sesiones con esos filtros.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSessionSearch('');
                      setStatusFilter('all');
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}

            <div className="ft-session-list">
              {filteredSessions.map((session) => (
                <div key={session.id} className="card ft-session-card">
                  <div className="ft-session-info">
                    <div className="ft-session-badges">
                      <span className={`ft-status ft-status--${session.status.toLowerCase()}`}>
                        {STATUS_LABEL[session.status]}
                      </span>
                      {categoryMap.get(session.categoryId) && (
                        <span className="ft-session-category-badge">
                          {categoryMap.get(session.categoryId)}
                        </span>
                      )}
                    </div>
                    <h3>{session.name}</h3>
                    <p className="ft-muted">
                      <CalendarClock size={14} aria-hidden="true" />{' '}
                      {formatIsoDate(session.date.slice(0, 10))}
                    </p>
                  </div>

                  <div className="ft-session-actions">
                    {session.status === 'Planned' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void changeStatus(session.id, 'InProgress')}
                      >
                        <Play size={15} aria-hidden="true" />
                        <span>Iniciar</span>
                      </button>
                    )}
                    {session.status === 'InProgress' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void changeStatus(session.id, 'Closed')}
                      >
                        <CheckCircle2 size={15} aria-hidden="true" />
                        <span>Cerrar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(`/pf/field-tests/${session.id}`)}
                    >
                      Abrir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

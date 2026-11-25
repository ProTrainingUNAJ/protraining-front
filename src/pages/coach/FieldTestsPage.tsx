import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ClipboardList, Play, Plus, Search } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { formatIsoDate } from '../../utils/argentinaDate';
import { structureService } from '../../api/structureService';
import {
  listFieldTestSessions,
  listFitnessTests,
  updateFieldTestSessionStatus,
} from '../../api/fieldTestSessions';
import type { FieldTestSessionSummary, FitnessTest } from '../../api/generated/seguimiento';
import type { Category, Organization } from '../../types/structure';
import { CreateFieldTestSessionModal } from '../../components/fieldTests/CreateFieldTestSessionModal';

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

  // Alta de sesión: modal centrado (KAN-656) con el panel de seleccionados (AC14).
  const [showForm, setShowForm] = useState(false);

  const [catalogTests, setCatalogTests] = useState<FitnessTest[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // --------------------------- Derivados ---------------------------

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Categorías según el filtro: sin organización elegida se siguen ofreciendo
  // todas (para poder filtrar el listado), aunque el selector queda deshabilitado
  // hasta elegir organización (AC03-AC04).
  const visibleCategories = useMemo(
    () =>
      selectedOrganizationId
        ? categories.filter((category) => category.organizationId === selectedOrganizationId)
        : categories,
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
        // Se pide una categoría por organización: se deduplica por si el backend
        // devuelve la misma en dos pedidos (evita claves repetidas en el listado).
        const all = categoriesByOrganization.flat();
        const unique = all.filter(
          (category, index) => all.findIndex((other) => other.id === category.id) === index,
        );
        setOrganizations(loadedOrganizations);
        setCategories(unique);
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

  // Catálogo de tests: se pide una sola vez, para el modal de alta.
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

  const openForm = (): void => setShowForm(true);

  // Al cambiar de organización se cierra el modal de alta (AC05): como se monta
  // condicionalmente, se desmonta y el borrador queda limpio.
  const closeForm = (): void => setShowForm(false);

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
            disabled={categoriesLoading || categories.length === 0}
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
                    // AC05: cambiar de organización cierra y limpia el modal abierto.
                    closeForm();
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
                  disabled={categoriesLoading}
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
                  disabled={!selectedOrganizationId}
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

            {/* Modal amplio y centrado de creación de sesión (KAN-656), con el
                panel de tests seleccionados y su orden ↑/↓ (AC14). */}
            {showForm && (
              <CreateFieldTestSessionModal
                isOpen={showForm}
                onClose={closeForm}
                categories={categories}
                initialCategoryId={effectiveCategoryId || categories[0]?.id || ''}
                catalogTests={catalogTests}
                catalogError={catalogError}
                onSessionCreated={async (createdCategoryId) => {
                  if (effectiveCategoryId && effectiveCategoryId !== createdCategoryId) {
                    setSelectedCategoryId(createdCategoryId);
                  } else {
                    await loadSessions(sessionCategoryIds);
                  }
                }}
              />
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
                  <button type="button" className="btn btn-secondary" onClick={openForm}>
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

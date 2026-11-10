import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, Play, CheckCircle2, ClipboardList } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
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
import type { Category } from '../../types/structure';

// Estados de la sesión, en el mismo orden que el backend.
const STATUS_LABEL: Record<FieldTestSessionSummary['status'], string> = {
  Planned: 'Planificada',
  InProgress: 'En curso',
  Closed: 'Cerrada',
};

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

const todayIso = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

// Pantalla de entrada al test de campo: elegir la categoría, ver (o crear) la sesión
// y lanzar la captura de marcas.
export const FieldTestsPage: React.FC = () => {
  const navigate = useNavigate();

  // Categorías del PF (organizaciones → categorías), mismo patrón que MonitoringPage.
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<FieldTestSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Formulario de alta de sesión.
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayIso);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [catalogTests, setCatalogTests] = useState<FitnessTest[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Filtro por capacidad motora sobre el catálogo ya cargado (KAN-458).
  const [capacityFilter, setCapacityFilter] = useState<MotorCapacity | ''>('');

  useEffect(() => {
    let active = true;

    structureService
      .getOrganizations()
      .catch(() => [])
      .then(async (organizations) => {
        const byOrg = await Promise.all(
          organizations.map((organization) =>
            structureService.getCategories(organization.id).catch(() => [] as Category[]),
          ),
        );
        if (!active) return;

        const all = byOrg.flat();
        setCategories(all);
        setSelectedCategoryId((current) => current || all[0]?.id || '');
        setCategoriesLoading(false);
        if (all.length === 0) {
          setCategoriesError('No se encontraron categorías disponibles para tu cuenta.');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCategoriesError(
          err instanceof Error ? err.message : 'No se pudieron cargar las categorías.',
        );
        setCategoriesLoading(false);
      });

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

  const loadSessions = useCallback(async (categoryId: string) => {
    setSessionsLoading(true);
    setSessionsError(null);
    setActionError(null);
    try {
      setSessions(await listFieldTestSessions(categoryId));
    } catch (err) {
      setSessions([]);
      setSessionsError(err instanceof Error ? err.message : 'No se pudieron cargar las sesiones.');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;
    // Mismo criterio que DailyLoadPage: la carga (que arranca con setState de
    // loading) se difiere un tick para no encadenar renders síncronos en el effect.
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) void loadSessions(selectedCategoryId);
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCategoryId, loadSessions]);

  const changeStatus = async (
    sessionId: string,
    status: 'InProgress' | 'Closed',
  ): Promise<void> => {
    setActionError(null);
    try {
      await updateFieldTestSessionStatus(sessionId, status);
      await loadSessions(selectedCategoryId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo actualizar la sesión.');
    }
  };

  const submitNewSession = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setFormError(null);

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
        categoryId: selectedCategoryId,
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
      await loadSessions(selectedCategoryId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la sesión.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTest = (testId: string): void => {
    setSelectedTestIds((current) =>
      current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId],
    );
  };

  // Solo se ofrecen los filtros de capacidades que existen en el catálogo.
  const availableCapacities = (Object.keys(CAPACITY_LABEL) as MotorCapacity[]).filter((capacity) =>
    catalogTests.some((test) => test.motorCapacity === capacity),
  );

  const visibleTests = capacityFilter
    ? catalogTests.filter((test) => test.motorCapacity === capacityFilter)
    : catalogTests;

  return (
    <div className="app-page-container">
      <PageHeader
        title="Tests de campo"
        description="Creá la sesión de evaluación y tomá las marcas de los atletas en cancha."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm((open) => !open)}
            disabled={!selectedCategoryId}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Nueva sesión</span>
          </button>
        }
      />

      <div className="app-page-body">
        {categoriesLoading && <p className="ft-muted">Cargando categorías…</p>}
        {categoriesError && <div className="alert-banner danger">{categoriesError}</div>}

        {!categoriesLoading && !categoriesError && categories.length > 0 && (
          <div className="card ft-toolbar">
            <label className="ft-field">
              <span>Categoría</span>
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {showForm && (
          <form className="card ft-form" onSubmit={submitNewSession}>
            <h3>Nueva sesión de test</h3>

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
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>

            <fieldset className="ft-field">
              <legend>Tests (en el orden en que se evalúan)</legend>
              {catalogError && <div className="alert-banner danger">{catalogError}</div>}
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
                {visibleTests.map((test) => {
                  const order = selectedTestIds.indexOf(test.id);
                  return (
                    <button
                      key={test.id}
                      type="button"
                      className={`ft-test-option${order >= 0 ? ' ft-test-option--selected' : ''}`}
                      onClick={() => toggleTest(test.id)}
                      aria-pressed={order >= 0}
                    >
                      <span className="ft-test-option__order">{order >= 0 ? order + 1 : '·'}</span>
                      <span className="ft-test-option__name">{test.name}</span>
                      <span className="ft-test-option__unit">{test.measurementUnit}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {formError && <div className="alert-banner danger">{formError}</div>}

            <div className="ft-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creando…' : 'Crear sesión'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
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

        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <div className="card ft-empty">
            <ClipboardList size={32} aria-hidden="true" />
            <p>Todavía no hay sesiones en esta categoría.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(true)}>
              Crear la primera sesión
            </button>
          </div>
        )}

        <div className="ft-session-list">
          {sessions.map((session) => (
            <div key={session.id} className="card ft-session-card">
              <div className="ft-session-info">
                <span className={`ft-status ft-status--${session.status.toLowerCase()}`}>
                  {STATUS_LABEL[session.status]}
                </span>
                <h3>{session.name}</h3>
                <p className="ft-muted">
                  <CalendarClock size={14} aria-hidden="true" />{' '}
                  {new Date(`${session.date}T00:00:00`).toLocaleDateString('es-AR')}
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
      </div>
    </div>
  );
};

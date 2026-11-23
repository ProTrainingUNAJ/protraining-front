import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Plus, Play, CheckCircle2, ClipboardList } from 'lucide-react';
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
import type { Category } from '../../types/structure';
import { CreateFieldTestSessionModal } from '../../components/fieldTests/CreateFieldTestSessionModal';

// Estados de la sesión, en el mismo orden que el backend.
const STATUS_LABEL: Record<FieldTestSessionSummary['status'], string> = {
  Planned: 'Planificada',
  InProgress: 'En curso',
  Closed: 'Cerrada',
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

  // Modal de alta de sesión (KAN-656).
  const [showForm, setShowForm] = useState(false);

  const [catalogTests, setCatalogTests] = useState<FitnessTest[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

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

  return (
    <div className="app-page-container">
      <PageHeader
        title="Tests de campo"
        description="Creá la sesión de evaluación y tomá las marcas de los atletas en cancha."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
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

        {/* Modal amplio y centrado de creación de sesión (KAN-656) */}
        {showForm && (
          <CreateFieldTestSessionModal
            isOpen={showForm}
            onClose={() => setShowForm(false)}
            categoryId={selectedCategoryId}
            catalogTests={catalogTests}
            catalogError={catalogError}
            onSessionCreated={() => void loadSessions(selectedCategoryId)}
          />
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
      </div>
    </div>
  );
};

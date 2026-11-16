import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bookmark,
  Calendar,
  CalendarPlus,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ApplyPlanTemplateModal } from '../../components/planning/ApplyPlanTemplateModal';
import { AssignPlanModal } from '../../components/planning/AssignPlanModal';
import { PlanningCard } from '../../components/planning/PlanningCard';
import { trainingPlansService, PlanAssignmentSummary } from '../../api/trainingPlans';
import { PlanListItem, PlanTemplateItem } from '../../types/trainingPlans';
import { formatDayMonth } from '../../utils/argentinaDate';

export function PlanningPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab =
    searchParams.get('tab') === 'templates'
      ? 'templates'
      : searchParams.get('tab') === 'assignments'
        ? 'assignments'
        : 'plans';

  // Estados de planificaciones activas
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [planSearch, setPlanSearch] = useState('');
  const [selectedPlanForAssign, setSelectedPlanForAssign] = useState<PlanListItem | null>(null);

  // Estados del catálogo de plantillas (KAN-440)
  const [templates, setTemplates] = useState<PlanTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<PlanTemplateItem | null>(
    null,
  );

  // Estados de asignaciones (KAN-559)
  const [assignments, setAssignments] = useState<PlanAssignmentSummary[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(currentTab === 'assignments');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { message?: string } | null)?.message ?? null,
  );

  // Carga inicial de planificaciones
  useEffect(() => {
    let active = true;
    trainingPlansService
      .list()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setPlanError(
            err instanceof Error ? err.message : 'No se pudieron cargar las planificaciones.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Carga de catálogo de plantillas al abrir la pestaña
  useEffect(() => {
    if (currentTab !== 'templates') return;

    let active = true;

    trainingPlansService
      .listTemplates()
      .then((data) => {
        if (active) setTemplates(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setTemplateError(
            err instanceof Error ? err.message : 'No se pudieron cargar las plantillas.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingTemplates(false);
      });

    return () => {
      active = false;
    };
  }, [currentTab]);

  // Carga de asignaciones al abrir la pestaña (KAN-559)
  useEffect(() => {
    if (currentTab !== 'assignments') return;

    let active = true;

    trainingPlansService
      .listAssignments()
      .then((data) => {
        if (active) setAssignments(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setAssignmentError(
            err instanceof Error ? err.message : 'No se pudieron cargar las asignaciones.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingAssignments(false);
      });

    return () => {
      active = false;
    };
  }, [currentTab]);

  const handleTabChange = (tab: 'plans' | 'templates' | 'assignments') => {
    setSearchParams(tab === 'plans' ? {} : { tab });
    setSuccessMessage(null);
    if (tab === 'templates' && templates.length === 0) {
      setLoadingTemplates(true);
      setTemplateError(null);
    }
    if (tab === 'assignments' && assignments.length === 0) {
      setLoadingAssignments(true);
      setAssignmentError(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setPlanError('La planificación necesita un nombre.');
      return;
    }

    setCreating(true);
    setPlanError(null);
    try {
      const plan = await trainingPlansService.create(cleanName, objective.trim() || null);
      navigate(`/pf/planning/${plan.id}`);
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : 'No se pudo crear la planificación.');
      setCreating(false);
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    const query = templateSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      tpl.name.toLowerCase().includes(query) ||
      (tpl.objective && tpl.objective.toLowerCase().includes(query))
    );
  });

  const filteredPlans = plans.filter((p) => {
    const query = planSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      Boolean(p.objective && p.objective.toLowerCase().includes(query))
    );
  });

  return (
    <div className="app-page-container">
      <PageHeader
        title={
          currentTab === 'templates'
            ? 'Catálogo de Plantillas'
            : currentTab === 'assignments'
              ? 'Asignaciones'
              : 'Planificación'
        }
        description={
          currentTab === 'templates'
            ? 'Administrá tus plantillas guardadas y aplicalas rápidamente a cualquier categoría con desplazamiento de fechas.'
            : currentTab === 'assignments'
              ? 'Planes de entrenamiento asignados a categorías y atletas con sus fechas de vigencia y estado.'
              : 'Tus planificaciones de entrenamiento. Abrí una para editar sus semanas y sesiones.'
        }
        actions={
          currentTab === 'plans' ? (
            <>
              <Link to="/pf/assistant/new" className="btn btn-secondary">
                <Sparkles size={16} aria-hidden="true" />
                <span>Generar con IA</span>
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowForm((open) => !open);
                  setPlanError(null);
                }}
                disabled={creating}
              >
                <Plus size={16} aria-hidden="true" />
                <span>{showForm ? 'Cancelar' : 'Nueva planificación'}</span>
              </button>
            </>
          ) : currentTab === 'templates' ? (
            <Link to="/pf/assistant/new" className="btn btn-secondary">
              <Sparkles size={16} aria-hidden="true" />
              <span>Generar con IA</span>
            </Link>
          ) : null
        }
      />

      <div className="app-page-body">
        {/* Selector de pestañas */}
        <nav className="plan-tabs" aria-label="Secciones de planificación" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'plans'}
            className={`plan-tab-btn ${currentTab === 'plans' ? 'active' : ''}`}
            onClick={() => handleTabChange('plans')}
          >
            <ClipboardList size={16} aria-hidden="true" />
            <span>Mis Planificaciones</span>
            {!loadingPlans && plans.length > 0 && (
              <span className="plan-tab-badge">{plans.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'templates'}
            className={`plan-tab-btn ${currentTab === 'templates' ? 'active' : ''}`}
            onClick={() => handleTabChange('templates')}
          >
            <Bookmark size={16} aria-hidden="true" />
            <span>Plantillas guardadas</span>
            {!loadingTemplates && templates.length > 0 && (
              <span className="plan-tab-badge">{templates.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'assignments'}
            className={`plan-tab-btn ${currentTab === 'assignments' ? 'active' : ''}`}
            onClick={() => handleTabChange('assignments')}
          >
            <CalendarPlus size={16} aria-hidden="true" />
            <span>Asignaciones</span>
            {!loadingAssignments && assignments.length > 0 && (
              <span className="plan-tab-badge">{assignments.length}</span>
            )}
          </button>
        </nav>

        {/* Mensaje de éxito al aplicar */}
        {successMessage && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <Check size={18} aria-hidden="true" />
              {successMessage}
            </span>
            <button
              type="button"
              className="plan-icon-btn"
              onClick={() => setSuccessMessage(null)}
              aria-label="Cerrar aviso"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Mensajes de error */}
        {(planError || templateError) && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {planError || templateError}
            </span>
            <button
              type="button"
              className="plan-icon-btn"
              onClick={() => {
                setPlanError(null);
                setTemplateError(null);
              }}
              aria-label="Cerrar error"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Pestaña 1: Mis Planificaciones */}
        {currentTab === 'plans' && (
          <>
            {showForm && (
              <form className="card card-static plan-details" onSubmit={handleCreate}>
                <label className="plan-field">
                  <span>Nombre *</span>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={creating}
                    placeholder="Ej. Fuerza base, Primera división"
                    autoFocus
                  />
                </label>
                <label className="plan-field">
                  <span>Objetivo (opcional)</span>
                  <input
                    type="text"
                    maxLength={500}
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    disabled={creating}
                    placeholder="Ej. Pretemporada"
                  />
                </label>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
                  <span>{creating ? 'Creando…' : 'Crear y editar'}</span>
                </button>
              </form>
            )}

            {/* Barra de búsqueda de planificaciones */}
            {!loadingPlans && plans.length > 0 && (
              <div className="plan-control-bar">
                <div className="plan-search-wrapper">
                  <Search size={16} className="plan-search-icon" aria-hidden="true" />
                  <input
                    type="search"
                    className="plan-search-input"
                    placeholder="Buscar por nombre u objetivo..."
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                    aria-label="Buscar planificación"
                  />
                  {planSearch && (
                    <button
                      type="button"
                      className="plan-search-clear"
                      onClick={() => setPlanSearch('')}
                      aria-label="Borrar texto de búsqueda"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {loadingPlans ? (
              <p className="plan-empty plan-inline">
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                Cargando planificaciones…
              </p>
            ) : plans.length === 0 && !planError ? (
              <p className="plan-empty">
                Todavía no tenés planificaciones. Creá la primera con «Nueva planificación» o
                «Generar con IA».
              </p>
            ) : filteredPlans.length === 0 && planSearch ? (
              <div className="plan-empty-search">
                <p className="plan-empty">
                  No se encontraron planificaciones que coincidan con «<strong>{planSearch}</strong>
                  ».
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPlanSearch('')}
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className="plan-cards-grid" role="list" aria-label="Listado de planificaciones">
                {filteredPlans.map((plan) => (
                  <PlanningCard
                    key={plan.id}
                    plan={plan}
                    onAssign={(p) => setSelectedPlanForAssign(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pestaña 2: Catálogo de Plantillas */}
        {currentTab === 'templates' && (
          <section aria-labelledby="templates-section-title">
            <h2 id="templates-section-title" className="sr-only">
              Plantillas de entrenamiento
            </h2>

            {/* Buscador de plantillas */}
            <div className="card card-static plan-picker-search" style={{ marginBottom: '1rem' }}>
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Buscar plantilla por nombre u objetivo… (ej. Pretemporada Fuerza 2026)"
                aria-label="Buscar plantilla"
                style={{ width: '100%' }}
              />
            </div>

            {loadingTemplates ? (
              <p className="plan-empty plan-inline">
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                Cargando catálogo de plantillas…
              </p>
            ) : templates.length === 0 && !templateError ? (
              <p className="plan-empty">
                Todavía no tenés plantillas guardadas. Podés abrir cualquier planificación en el
                editor y tocar «Guardar como plantilla» para tenerla disponible acá.
              </p>
            ) : filteredTemplates.length === 0 ? (
              <p className="plan-empty">
                No se encontraron plantillas que coincidan con «{templateSearch}».
              </p>
            ) : (
              <ul className="plan-list">
                {filteredTemplates.map((template) => (
                  <li key={template.id} className="plan-template-item">
                    <div className="plan-list-info">
                      <span className="plan-inline">
                        <Bookmark size={18} color="var(--primary)" aria-hidden="true" />
                        <strong>{template.name}</strong>
                      </span>
                      {template.objective && <span>{template.objective}</span>}
                      <div className="plan-template-badges">
                        <span className="badge badge-primary">Plantilla</span>
                      </div>
                    </div>

                    <div className="plan-template-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setSelectedTemplateForApply(template)}
                        aria-label={`Aplicar plantilla ${template.name}`}
                      >
                        <CalendarPlus size={16} aria-hidden="true" />
                        <span>Aplicar a categoría</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Pestaña 3: Asignaciones (KAN-559) */}
        {currentTab === 'assignments' && (
          <section aria-labelledby="assignments-section-title">
            <h2 id="assignments-section-title" className="sr-only">
              Asignaciones de entrenamiento
            </h2>

            {loadingAssignments ? (
              <p className="plan-empty plan-inline">
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                Cargando asignaciones…
              </p>
            ) : assignments.length === 0 && !assignmentError ? (
              <p className="plan-empty">
                Todavía no tenés planificaciones asignadas. Podés asignar una desde «Mis
                Planificaciones» abriendo el editor y seleccionando «Asignar».
              </p>
            ) : (
              <ul className="plan-list">
                {assignments.map((assignment) => {
                  const isFinished = assignment.status === 'Finished';
                  const rangeText = `Del ${formatDayMonth(assignment.startDate)} al ${formatDayMonth(assignment.endDate)}`;
                  const finishText = isFinished
                    ? 'Terminada'
                    : `Termina el ${formatDayMonth(assignment.endDate)}`;

                  return (
                    <li key={assignment.assignmentId}>
                      <div className="card plan-list-item" style={{ cursor: 'default' }}>
                        <Calendar
                          size={20}
                          aria-hidden="true"
                          style={{ color: isFinished ? 'var(--text-muted)' : 'var(--primary)' }}
                        />
                        <div className="plan-list-info" style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <strong>{assignment.planName}</strong>
                            {isFinished ? (
                              <span
                                className="badge badge-secondary"
                                style={{ fontSize: '0.72rem' }}
                              >
                                Terminada
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                                Activa
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                            {rangeText} · {finishText}
                          </span>
                        </div>
                        <Link
                          to={`/pf/planning/${assignment.trainingPlanId}`}
                          className="btn btn-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                        >
                          Ver plan
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* Modal de aplicación con desplazamiento de fechas */}
      {selectedTemplateForApply && (
        <ApplyPlanTemplateModal
          template={selectedTemplateForApply}
          onClose={() => setSelectedTemplateForApply(null)}
          onApplied={(msg) => {
            setSelectedTemplateForApply(null);
            setSuccessMessage(msg);
          }}
        />
      )}

      {/* Modal de asignación directa desde la tarjeta (KAN-622) */}
      {selectedPlanForAssign && (
        <AssignPlanModal
          planId={selectedPlanForAssign.id}
          planName={selectedPlanForAssign.name}
          onClose={() => setSelectedPlanForAssign(null)}
          onAssigned={() => {
            setSelectedPlanForAssign(null);
            setSuccessMessage(`Planificación asignada con éxito.`);
          }}
        />
      )}
    </div>
  );
}

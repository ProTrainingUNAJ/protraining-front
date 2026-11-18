import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bookmark,
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
import {
  PlanAssignmentCard,
  PlanAssignmentGroup,
} from '../../components/planning/PlanAssignmentCard';
import { PlanAssigneeItem } from '../../components/planning/PlanAssigneesStack';
import { ManagePlanAssignmentsModal } from '../../components/planning/ManagePlanAssignmentsModal';
import { trainingPlansService, PlanAssignmentSummary } from '../../api/trainingPlans';
import { structureService } from '../../api/structureService';
import { PlanListItem, PlanTemplateItem } from '../../types/trainingPlans';

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

  // Estados de asignaciones (KAN-559, KAN-622, KAN-623)
  const [assignments, setAssignments] = useState<PlanAssignmentSummary[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(currentTab === 'assignments');
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [selectedGroupForManage, setSelectedGroupForManage] = useState<string | null>(null);

  // Mapeo de atletas y categorías para avatares y nombres reales
  const [athletesMap, setAthletesMap] = useState<
    Map<string, { name: string; photoUrl: string | null; secondaryInfo?: string }>
  >(new Map());
  const [categoriesMap, setCategoriesMap] = useState<
    Map<string, { name: string; photoUrl: string | null; secondaryInfo?: string }>
  >(new Map());

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

  // Carga de asignaciones y datos de estructura al abrir la pestaña (KAN-559, KAN-622)
  const reloadAssignments = () => {
    return trainingPlansService
      .listAssignments()
      .then((data) => {
        setAssignments(data);
      })
      .catch((err: unknown) => {
        setAssignmentError(
          err instanceof Error ? err.message : 'No se pudieron cargar las asignaciones.',
        );
      });
  };

  useEffect(() => {
    if (currentTab !== 'assignments') return;

    let active = true;

    reloadAssignments().finally(() => {
      if (active) setLoadingAssignments(false);
    });

    return () => {
      active = false;
    };
  }, [currentTab]);

  // Carga de metadatos de estructura (atletas y categorías) para fotos y nombres
  useEffect(() => {
    let active = true;
    async function loadStructureData() {
      try {
        const [orgs, athleteList] = await Promise.all([
          structureService.getOrganizations().catch(() => []),
          structureService.getAthletes().catch(() => []),
        ]);

        const categoriesByOrg = await Promise.all(
          orgs.map((org) => structureService.getCategories(org.id).catch(() => [])),
        );

        if (!active) return;

        const aMap = new Map<
          string,
          { name: string; photoUrl: string | null; secondaryInfo?: string }
        >();
        athleteList.forEach((ath) => {
          const fullName = ath.fullName || `${ath.firstName} ${ath.lastName}`.trim();
          const photoUrl = ath.hasPhoto
            ? structureService.getAthletePhotoUrl(ath.id, ath.photoUpdatedAt)
            : null;
          const secondaryInfo =
            ath.categoryNames && ath.categoryNames.length > 0
              ? ath.categoryNames.join(', ')
              : 'Sin categoría';
          aMap.set(ath.id, { name: fullName, photoUrl, secondaryInfo });
        });

        const cMap = new Map<
          string,
          { name: string; photoUrl: string | null; secondaryInfo?: string }
        >();
        categoriesByOrg.forEach((orgCats, idx) => {
          const org = orgs[idx];
          const orgPhotoUrl = org?.hasPhoto
            ? structureService.getOrganizationPhotoUrl(org.id, org.photoUpdatedAt)
            : null;
          orgCats.forEach((cat) => {
            cMap.set(cat.id, {
              name: cat.name,
              photoUrl: orgPhotoUrl,
              secondaryInfo: org?.name ?? 'Categoría',
            });
          });
        });

        setAthletesMap(aMap);
        setCategoriesMap(cMap);
      } catch {
        // En caso de fallo de red, se degradará con nombres por defecto
      }
    }

    loadStructureData();
    return () => {
      active = false;
    };
  }, []);

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

  const plansById = useMemo(() => {
    const map = new Map<string, PlanListItem>();
    plans.forEach((p) => map.set(p.id, p));
    return map;
  }, [plans]);

  // Consolidación de asignaciones por TrainingPlanId para agrupar en tarjetas únicas (KAN-622)
  const assignmentGroups = useMemo<PlanAssignmentGroup[]>(() => {
    const groupsMap = new Map<string, PlanAssignmentGroup>();

    assignments.forEach((assignment) => {
      const planId = assignment.trainingPlanId;
      const isAthlete = Boolean(assignment.athleteId);
      const targetId = assignment.athleteId ?? assignment.categoryId ?? '';

      let assigneeName = assignment.planName;
      let photoUrl: string | null = null;
      let secondaryInfo: string | undefined;

      if (isAthlete && assignment.athleteId) {
        const ath = athletesMap.get(assignment.athleteId);
        if (ath) {
          assigneeName = ath.name;
          photoUrl = ath.photoUrl;
          secondaryInfo = ath.secondaryInfo;
        } else {
          assigneeName = 'Atleta';
        }
      } else if (assignment.categoryId) {
        const cat = categoriesMap.get(assignment.categoryId);
        if (cat) {
          assigneeName = cat.name;
          photoUrl = cat.photoUrl;
          secondaryInfo = cat.secondaryInfo;
        } else {
          assigneeName = 'Categoría';
        }
      }

      const assigneeItem: PlanAssigneeItem = {
        assignmentId: assignment.assignmentId,
        type: isAthlete ? 'athlete' : 'category',
        targetId,
        name: assigneeName,
        secondaryInfo,
        photoUrl,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        status: assignment.status,
      };

      const existingGroup = groupsMap.get(planId);
      if (!existingGroup) {
        groupsMap.set(planId, {
          trainingPlanId: planId,
          planName: assignment.planName,
          startDate: assignment.startDate,
          endDate: assignment.endDate,
          status: assignment.status,
          assignees: [assigneeItem],
        });
      } else {
        existingGroup.assignees.push(assigneeItem);
        if (assignment.status === 'Active') {
          existingGroup.status = 'Active';
        }
        if (assignment.startDate < existingGroup.startDate) {
          existingGroup.startDate = assignment.startDate;
        }
        if (assignment.endDate > existingGroup.endDate) {
          existingGroup.endDate = assignment.endDate;
        }
      }
    });

    return Array.from(groupsMap.values());
  }, [assignments, athletesMap, categoriesMap]);

  // Filtrado reactivo de asignaciones por nombre de plan, objetivo, estado o nombre del atleta/categoría
  const filteredAssignmentGroups = useMemo(() => {
    const query = assignmentSearch.trim().toLowerCase();
    if (!query) return assignmentGroups;
    return assignmentGroups.filter((g) => {
      const plan = plansById.get(g.trainingPlanId);
      const statusText = g.status === 'Finished' ? 'terminada' : 'activa';
      const matchesPlan = g.planName.toLowerCase().includes(query);
      const matchesDesc = Boolean(plan?.objective && plan.objective.toLowerCase().includes(query));
      const matchesStatus = statusText.includes(query);
      const matchesAssignee = g.assignees.some(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          (a.secondaryInfo && a.secondaryInfo.toLowerCase().includes(query)),
      );
      return matchesPlan || matchesDesc || matchesStatus || matchesAssignee;
    });
  }, [assignmentGroups, assignmentSearch, plansById]);

  // Grupo actualmente activo en el modal de gestión de asignaciones
  const activeManageGroup = useMemo(() => {
    if (!selectedGroupForManage) return null;
    return assignmentGroups.find((g) => g.trainingPlanId === selectedGroupForManage) ?? null;
  }, [assignmentGroups, selectedGroupForManage]);

  // Handler para desasignar un atleta o categoría (KAN-622)
  const handleUnassign = async (assignmentId: string) => {
    await trainingPlansService.deleteAssignment(assignmentId);
    setAssignments((prev) => prev.filter((a) => a.assignmentId !== assignmentId));
  };

  return (
    <div className="app-page-container">
      {/* Header simétrico uniforme en todas las pestañas para eliminar saltos de alineación */}
      <PageHeader
        title="Planificación"
        description="Tus planificaciones de entrenamiento. Abrí una para editar sus semanas y sesiones."
        actions={
          <>
            <Link to="/pf/assistant/new" className="btn btn-secondary">
              <Sparkles size={16} aria-hidden="true" />
              <span>Generar con IA</span>
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (currentTab !== 'plans') {
                  handleTabChange('plans');
                }
                setShowForm((open) => !open);
                setPlanError(null);
              }}
              disabled={creating}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{showForm && currentTab === 'plans' ? 'Cancelar' : 'Nueva planificación'}</span>
            </button>
          </>
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

        {/* Mensaje de éxito al aplicar o asignar */}
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
        {(planError || templateError || assignmentError) && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {planError || templateError || assignmentError}
            </span>
            <button
              type="button"
              className="plan-icon-btn"
              onClick={() => {
                setPlanError(null);
                setTemplateError(null);
                setAssignmentError(null);
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

            {/* Buscador de plantillas con diseño homogéneo sin saltos */}
            <div className="plan-control-bar">
              <div className="plan-search-wrapper">
                <Search size={16} className="plan-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="plan-search-input"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Buscar plantilla por nombre u objetivo…"
                  aria-label="Buscar plantilla"
                />
                {templateSearch && (
                  <button
                    type="button"
                    className="plan-search-clear"
                    onClick={() => setTemplateSearch('')}
                    aria-label="Borrar texto de búsqueda"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
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

        {/* Pestaña 3: Asignaciones (KAN-559, KAN-622, KAN-623) */}
        {currentTab === 'assignments' && (
          <section aria-labelledby="assignments-section-title">
            <h2 id="assignments-section-title" className="sr-only">
              Asignaciones de entrenamiento
            </h2>

            {/* Barra de control y búsqueda de asignaciones */}
            <div className="plan-control-bar">
              <div className="plan-search-wrapper">
                <Search size={16} className="plan-search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="plan-search-input"
                  placeholder="Buscar asignación por plan, atleta o estado..."
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                  aria-label="Buscar asignación"
                />
                {assignmentSearch && (
                  <button
                    type="button"
                    className="plan-search-clear"
                    onClick={() => setAssignmentSearch('')}
                    aria-label="Borrar texto de búsqueda"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {loadingAssignments ? (
              <p className="plan-empty plan-inline">
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                Cargando asignaciones…
              </p>
            ) : assignmentGroups.length === 0 && !assignmentError ? (
              <p className="plan-empty">
                Todavía no tenés planificaciones asignadas. Podés asignar una desde «Mis
                Planificaciones» abriendo el editor y seleccionando «Asignar».
              </p>
            ) : filteredAssignmentGroups.length === 0 && assignmentSearch ? (
              <div className="plan-empty-search">
                <p className="plan-empty">
                  No se encontraron asignaciones que coincidan con «
                  <strong>{assignmentSearch}</strong>».
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAssignmentSearch('')}
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div
                className="plan-cards-grid"
                role="list"
                aria-label="Listado de asignaciones de entrenamiento"
              >
                {filteredAssignmentGroups.map((group) => (
                  <PlanAssignmentCard
                    key={group.trainingPlanId}
                    group={group}
                    plan={plansById.get(group.trainingPlanId)}
                    onOpenManage={(g) => setSelectedGroupForManage(g.trainingPlanId)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Modal de administración y visualización de asignados (KAN-622) */}
      {activeManageGroup && (
        <ManagePlanAssignmentsModal
          isOpen={Boolean(activeManageGroup)}
          planId={activeManageGroup.trainingPlanId}
          planName={activeManageGroup.planName}
          assignees={activeManageGroup.assignees}
          onClose={() => setSelectedGroupForManage(null)}
          onUnassign={async (assignmentId) => {
            await handleUnassign(assignmentId);
          }}
          onOpenAddAssignment={() => {
            const planToAssign = plans.find((p) => p.id === activeManageGroup.trainingPlanId) ?? {
              id: activeManageGroup.trainingPlanId,
              name: activeManageGroup.planName,
              objective: null,
            };
            setSelectedGroupForManage(null);
            setSelectedPlanForAssign(planToAssign);
          }}
        />
      )}

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
            reloadAssignments();
          }}
        />
      )}
    </div>
  );
}

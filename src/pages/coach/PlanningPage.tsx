import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Bookmark,
  CalendarPlus,
  Check,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ApplyPlanTemplateModal } from '../../components/planning/ApplyPlanTemplateModal';
import { trainingPlansService } from '../../api/trainingPlans';
import { PlanListItem, PlanTemplateItem } from '../../types/trainingPlans';

export function PlanningPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') === 'templates' ? 'templates' : 'plans';

  // Estados de planificaciones activas
  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');

  // Estados del catálogo de plantillas (KAN-440)
  const [templates, setTemplates] = useState<PlanTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<PlanTemplateItem | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleTabChange = (tab: 'plans' | 'templates') => {
    setSearchParams(tab === 'templates' ? { tab: 'templates' } : {});
    setSuccessMessage(null);
    if (tab === 'templates' && templates.length === 0) {
      setLoadingTemplates(true);
      setTemplateError(null);
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

  return (
    <div className="app-page-container">
      <PageHeader
        title={currentTab === 'templates' ? 'Catálogo de Plantillas' : 'Planificación'}
        description={
          currentTab === 'templates'
            ? 'Administrá tus plantillas guardadas y aplicalas rápidamente a cualquier categoría con desplazamiento de fechas.'
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
          ) : (
            <Link to="/pf/assistant/new" className="btn btn-secondary">
              <Sparkles size={16} aria-hidden="true" />
              <span>Generar con IA</span>
            </Link>
          )
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
            ) : (
              <ul className="plan-list">
                {plans.map((plan) => (
                  <li key={plan.id}>
                    <Link to={`/pf/planning/${plan.id}`} className="card plan-list-item">
                      <ClipboardList size={20} aria-hidden="true" />
                      <span className="plan-list-info">
                        <strong>{plan.name}</strong>
                        {plan.objective && <span>{plan.objective}</span>}
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
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
    </div>
  );
}

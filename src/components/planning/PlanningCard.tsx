import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ExternalLink, Sparkles, Trash2, UserPlus } from 'lucide-react';
import { PlanListItem } from '../../types/trainingPlans';
import { PlanMuscleMap } from './PlanMuscleMap';

export interface PlanningCardProps {
  plan: PlanListItem;
  onAssign?: (plan: PlanListItem) => void;
  onDelete?: (plan: PlanListItem) => void;
}

export const PlanningCard: React.FC<PlanningCardProps> = ({ plan, onAssign, onDelete }) => {
  const isAiGenerated =
    Boolean(plan.name && /\b(ia|asistente|gemini|generad)\b/i.test(plan.name)) ||
    Boolean(plan.objective && /\b(ia|asistente|gemini|generad)\b/i.test(plan.objective));

  return (
    <article className="card plan-card" aria-label={`Planificación: ${plan.name}`}>
      <div className="plan-card-main-content">
        <div className="plan-card-info-col">
          <header className="plan-card-header">
            <div className="plan-card-icon-wrap" aria-hidden="true">
              <ClipboardList size={20} className="plan-card-icon" />
            </div>

            <div className="plan-card-badges">
              {isAiGenerated ? (
                <span className="badge badge-ai plan-card-origin-badge">
                  <Sparkles size={12} aria-hidden="true" />
                  <span>Generado con IA</span>
                </span>
              ) : (
                <span className="badge badge-subtle plan-card-origin-badge">Manual</span>
              )}
            </div>
          </header>

          <div className="plan-card-body">
            <h3 className="plan-card-title" title={plan.name}>
              <Link to={`/pf/planning/${plan.id}`} className="plan-card-title-link">
                {plan.name}
              </Link>
            </h3>
            <p className="plan-card-desc">
              {plan.objective
                ? plan.objective
                : 'Planificación deportiva sin descripción adicional cargada.'}
            </p>
          </div>
        </div>

        {/* Anatomía corporal con músculos involucrados en celeste y secundarios en gris (KAN-623) */}
        <PlanMuscleMap
          primaryMuscles={plan.primaryMuscles}
          secondaryMuscles={plan.secondaryMuscles}
          targetMuscles={plan.targetMuscles}
          name={plan.name}
          objective={plan.objective}
        />
      </div>

      <footer className="plan-card-footer">
        <div className="plan-card-footer-actions-left">
          {onAssign && (
            <button
              type="button"
              className="btn btn-secondary plan-card-assign-btn"
              onClick={() => onAssign(plan)}
              aria-label={`Asignar ${plan.name}`}
            >
              <UserPlus size={15} aria-hidden="true" />
              <span>Asignar</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn btn-secondary plan-card-delete-btn"
              onClick={() => onDelete(plan)}
              aria-label={`Eliminar planificación ${plan.name}`}
              title="Eliminar planificación"
              data-testid={`btn-delete-plan-${plan.id}`}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
        <Link
          to={`/pf/planning/${plan.id}`}
          className="btn btn-primary plan-card-open-btn"
          aria-label={`Abrir editor para ${plan.name}`}
        >
          <span>Abrir editor</span>
          <ExternalLink size={15} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
};

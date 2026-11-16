import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ExternalLink, Sparkles, UserPlus } from 'lucide-react';
import { PlanListItem } from '../../types/trainingPlans';

export interface PlanningCardProps {
  plan: PlanListItem;
  onAssign?: (plan: PlanListItem) => void;
}

export const PlanningCard: React.FC<PlanningCardProps> = ({ plan, onAssign }) => {
  const isAiGenerated =
    Boolean(plan.name && /\b(ia|asistente|gemini|generad)\b/i.test(plan.name)) ||
    Boolean(plan.objective && /\b(ia|asistente|gemini|generad)\b/i.test(plan.objective));

  return (
    <article className="card plan-card" aria-label={`Planificación: ${plan.name}`}>
      <header className="plan-card-header">
        <div className="plan-card-icon-wrap" aria-hidden="true">
          <ClipboardList size={20} className="plan-card-icon" />
        </div>

        <div className="plan-card-badges">
          {plan.objective && (
            <span className="badge badge-accent plan-card-objective-badge" title={plan.objective}>
              {plan.objective}
            </span>
          )}
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

      <footer className="plan-card-footer">
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

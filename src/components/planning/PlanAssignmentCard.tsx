import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink } from 'lucide-react';
import { PlanAssignmentSummary } from '../../api/trainingPlans';
import { PlanListItem } from '../../types/trainingPlans';
import { formatDayMonth } from '../../utils/argentinaDate';
import { PlanMuscleMap } from './PlanMuscleMap';

export interface PlanAssignmentCardProps {
  assignment: PlanAssignmentSummary;
  plan?: PlanListItem;
}

export const PlanAssignmentCard: React.FC<PlanAssignmentCardProps> = ({ assignment, plan }) => {
  const isFinished = assignment.status === 'Finished';
  const rangeText = `Del ${formatDayMonth(assignment.startDate)} al ${formatDayMonth(assignment.endDate)}`;
  const finishText = isFinished ? 'Terminada' : `Termina el ${formatDayMonth(assignment.endDate)}`;

  return (
    <article className="card plan-card" aria-label={`Asignación: ${assignment.planName}`}>
      <div className="plan-card-main-content">
        <div className="plan-card-info-col">
          <header className="plan-card-header">
            <div className="plan-card-icon-wrap" aria-hidden="true">
              <Calendar size={20} className="plan-card-icon" />
            </div>

            <div className="plan-card-badges">
              {isFinished ? (
                <span className="badge badge-secondary">Terminada</span>
              ) : (
                <span className="badge badge-success">Activa</span>
              )}
            </div>
          </header>

          <div className="plan-card-body">
            <h3 className="plan-card-title" title={assignment.planName}>
              <Link
                to={`/pf/planning/${assignment.trainingPlanId}`}
                className="plan-card-title-link"
              >
                {assignment.planName}
              </Link>
            </h3>
            <p className="plan-card-desc">
              {rangeText} · {finishText}
            </p>
            {plan?.objective && (
              <p
                className="plan-card-desc"
                style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.2rem' }}
              >
                {plan.objective}
              </p>
            )}
          </div>
        </div>

        {/* Anatomía corporal con músculos involucrados en celeste y secundarios en gris (KAN-623) */}
        <PlanMuscleMap
          targetMuscles={plan?.targetMuscles}
          name={assignment.planName}
          objective={plan?.objective}
        />
      </div>

      <footer className="plan-card-footer">
        <Link
          to={`/pf/planning/${assignment.trainingPlanId}`}
          className="btn btn-primary plan-card-open-btn"
          aria-label={`Ver planificación ${assignment.planName}`}
        >
          <span>Ver plan</span>
          <ExternalLink size={15} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
};

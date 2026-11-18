import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink } from 'lucide-react';
import { PlanAssignmentSummary } from '../../api/trainingPlans';
import { PlanListItem } from '../../types/trainingPlans';
import { formatDayMonth } from '../../utils/argentinaDate';
import { PlanMuscleMap } from './PlanMuscleMap';
import { PlanAssigneesStack, PlanAssigneeItem } from './PlanAssigneesStack';

export interface PlanAssignmentGroup {
  trainingPlanId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Finished';
  assignees: PlanAssigneeItem[];
}

export interface PlanAssignmentCardProps {
  assignment?: PlanAssignmentSummary;
  group?: PlanAssignmentGroup;
  plan?: PlanListItem;
  onOpenManage?: (group: PlanAssignmentGroup) => void;
}

export const PlanAssignmentCard: React.FC<PlanAssignmentCardProps> = ({
  assignment,
  group,
  plan,
  onOpenManage,
}) => {
  const planId = group?.trainingPlanId ?? assignment?.trainingPlanId ?? '';
  const planName = group?.planName ?? assignment?.planName ?? '';
  const startDate = group?.startDate ?? assignment?.startDate ?? '';
  const endDate = group?.endDate ?? assignment?.endDate ?? '';
  const status = group?.status ?? assignment?.status ?? 'Active';
  const isFinished = status === 'Finished';

  const assignees: PlanAssigneeItem[] =
    group?.assignees ??
    (assignment
      ? [
          {
            assignmentId: assignment.assignmentId,
            type: assignment.athleteId ? 'athlete' : 'category',
            targetId: assignment.athleteId ?? assignment.categoryId ?? '',
            name: assignment.planName,
            startDate: assignment.startDate,
            endDate: assignment.endDate,
            status: assignment.status,
          },
        ]
      : []);

  const rangeText =
    startDate && endDate ? `Del ${formatDayMonth(startDate)} al ${formatDayMonth(endDate)}` : '';
  const finishText = isFinished
    ? 'Terminada'
    : endDate
      ? `Termina el ${formatDayMonth(endDate)}`
      : 'Activa';

  const currentGroup: PlanAssignmentGroup = group ?? {
    trainingPlanId: planId,
    planName,
    startDate,
    endDate,
    status,
    assignees,
  };

  return (
    <article className="card plan-card" aria-label={`Asignación: ${planName}`}>
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
            <h3 className="plan-card-title" title={planName}>
              <Link to={`/pf/planning/${planId}`} className="plan-card-title-link">
                {planName}
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
          primaryMuscles={plan?.primaryMuscles}
          secondaryMuscles={plan?.secondaryMuscles}
          targetMuscles={plan?.targetMuscles}
          name={planName}
          objective={plan?.objective}
        />
      </div>

      <footer className="plan-card-footer">
        {/* Stack interactivo de fotos de los asignados (KAN-622) */}
        <div className="plan-card-assignees-col">
          <PlanAssigneesStack
            assignees={assignees}
            planName={planName}
            onClick={() => onOpenManage?.(currentGroup)}
          />
        </div>

        <Link
          to={`/pf/planning/${planId}`}
          className="btn btn-primary plan-card-open-btn"
          aria-label={`Ver planificación ${planName}`}
        >
          <span>Ver plan</span>
          <ExternalLink size={15} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
};

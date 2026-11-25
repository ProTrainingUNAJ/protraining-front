import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface PlanAssigneeItem {
  assignmentId: string;
  type: 'athlete' | 'category';
  targetId: string;
  name: string;
  secondaryInfo?: string;
  photoUrl?: string | null;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Finished';
}

export interface PlanAssigneesStackProps {
  assignees: PlanAssigneeItem[];
  planName: string;
  onClick: () => void;
}

export const PlanAssigneesStack: React.FC<PlanAssigneesStackProps> = ({
  assignees,
  planName,
  onClick,
}) => {
  if (assignees.length === 0) {
    return (
      <button
        type="button"
        className="plan-assignees-empty-btn"
        onClick={onClick}
        title={`Asignar «${planName}» a atletas o categorías`}
        aria-label={`Asignar ${planName}`}
      >
        <UserPlus size={14} aria-hidden="true" />
        <span>Sin asignar</span>
      </button>
    );
  }

  const visibleAssignees = assignees.slice(0, 3);
  const remainingCount = assignees.length - 3;
  const tooltipText = `${assignees.map((a) => a.name).join(', ')} · Clic para administrar asignados`;

  return (
    <button
      type="button"
      className="plan-assignees-stack-trigger"
      onClick={onClick}
      title={tooltipText}
      aria-label={`Ver y administrar ${assignees.length} asignados a ${planName}`}
    >
      <span className="plan-assignees-stack-avatars">
        {visibleAssignees.map((assignee, idx) => (
          <span
            key={assignee.assignmentId || `${assignee.targetId}-${idx}`}
            className="plan-assignee-avatar-wrapper"
            style={{
              zIndex: 10 - idx,
              marginLeft: idx === 0 ? 0 : '-8px',
            }}
          >
            <ProfileAvatar
              src={assignee.photoUrl}
              name={assignee.name}
              size={24}
              shape="circle"
              className="plan-assignee-avatar-circle"
              alt={assignee.name}
            />
          </span>
        ))}

        {remainingCount > 0 && (
          <span
            className="plan-assignee-more-circle"
            style={{
              zIndex: 10 - visibleAssignees.length,
              marginLeft: '-8px',
            }}
            aria-label={`${remainingCount} personas más asignadas`}
          >
            <span>+{remainingCount}</span>
          </span>
        )}
      </span>

      <span className="plan-assignees-trigger-label">Gestionar</span>

      <span className="plan-assignees-count-label">
        <Users size={13} aria-hidden="true" />
        <span>{assignees.length}</span>
      </span>
    </button>
  );
};

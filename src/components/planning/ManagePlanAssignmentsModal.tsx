import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Calendar,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { PlanAssigneeItem } from './PlanAssigneesStack';
import { formatDayMonth } from '../../utils/argentinaDate';

export interface ManagePlanAssignmentsModalProps {
  isOpen: boolean;
  planId: string;
  planName: string;
  assignees: PlanAssigneeItem[];
  onClose: () => void;
  onUnassign: (assignmentId: string, assigneeName: string) => Promise<void>;
  onOpenAddAssignment: () => void;
}

export const ManagePlanAssignmentsModal: React.FC<ManagePlanAssignmentsModalProps> = ({
  isOpen,
  planName,
  assignees,
  onClose,
  onUnassign,
  onOpenAddAssignment,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deletingId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deletingId, onClose]);

  if (!isOpen) return null;

  const handleDelete = async (assignmentId: string, assigneeName: string) => {
    setDeletingId(assignmentId);
    setErrorMessage(null);
    try {
      await onUnassign(assignmentId, assigneeName);
      setConfirmDeleteId(null);
      setFeedbackMessage(`Se quitó a ${assigneeName} de la planificación.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'No se pudo quitar la asignación. Reintentá.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const modalContent = (
    <div
      className="manage-assignments-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-assignments-modal-title"
      onClick={deletingId ? undefined : onClose}
    >
      <div className="manage-assignments-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          disabled={Boolean(deletingId)}
          className="manage-assignments-close-btn"
          aria-label="Cerrar modal de asignaciones"
        >
          <X size={20} />
        </button>

        {/* Cabecera */}
        <header className="manage-assignments-header">
          <div className="manage-assignments-icon-box">
            <Users size={22} className="manage-assignments-icon" />
          </div>
          <div>
            <h3 id="manage-assignments-modal-title" className="manage-assignments-title">
              Asignaciones de la planificación
            </h3>
            <p className="manage-assignments-subtitle">
              «<strong>{planName}</strong>» · {assignees.length}{' '}
              {assignees.length === 1 ? 'destinatario asignado' : 'destinatarios asignados'}
            </p>
          </div>
        </header>

        {/* Mensaje de éxito o error */}
        {feedbackMessage && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <CheckCircle2 size={16} aria-hidden="true" />
              {feedbackMessage}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertTriangle size={16} aria-hidden="true" />
              {errorMessage}
            </span>
          </div>
        )}

        {/* Barra de acción para agregar */}
        <div className="manage-assignments-action-bar">
          <span className="manage-assignments-list-count">
            Plantel y atletas que tienen asignado este plan:
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAddAssignment}
            disabled={Boolean(deletingId)}
          >
            <UserPlus size={15} aria-hidden="true" />
            <span>+ Asignar a otro atleta o categoría</span>
          </button>
        </div>

        {/* Listado de Asignaciones */}
        <div className="manage-assignments-list-wrap">
          {assignees.length === 0 ? (
            <div className="manage-assignments-empty-state">
              <Users size={40} className="manage-assignments-empty-icon" />
              <p className="manage-assignments-empty-text">
                No hay atletas ni categorías asignadas actualmente a este plan.
              </p>
              <button type="button" className="btn btn-primary" onClick={onOpenAddAssignment}>
                <UserPlus size={16} />
                <span>Asignar ahora</span>
              </button>
            </div>
          ) : (
            <ul className="manage-assignments-list" role="list">
              {assignees.map((assignee) => {
                const isThisDeleting = deletingId === assignee.assignmentId;
                const isConfirming = confirmDeleteId === assignee.assignmentId;

                return (
                  <li key={assignee.assignmentId} className="manage-assignments-item">
                    <div className="manage-assignments-item-avatar">
                      <ProfileAvatar
                        src={assignee.photoUrl}
                        name={assignee.name}
                        size={44}
                        shape="circle"
                        alt={assignee.name}
                      />
                    </div>

                    <div className="manage-assignments-item-info">
                      <div className="manage-assignments-item-name-row">
                        <span className="manage-assignments-item-name">{assignee.name}</span>
                        <span
                          className={`badge ${
                            assignee.type === 'athlete' ? 'badge-primary' : 'badge-secondary'
                          }`}
                        >
                          {assignee.type === 'athlete' ? 'Atleta' : 'Categoría'}
                        </span>
                        <span
                          className={`badge ${
                            assignee.status === 'Active' ? 'badge-success' : 'badge-subtle'
                          }`}
                        >
                          {assignee.status === 'Active' ? 'Activa' : 'Terminada'}
                        </span>
                      </div>

                      {assignee.secondaryInfo && (
                        <p className="manage-assignments-item-secondary">
                          {assignee.secondaryInfo}
                        </p>
                      )}

                      <p className="manage-assignments-item-dates">
                        <Calendar size={13} aria-hidden="true" />
                        <span>
                          Del {formatDayMonth(assignee.startDate)} al{' '}
                          {formatDayMonth(assignee.endDate)}
                        </span>
                      </p>
                    </div>

                    {/* Botón para quitar asignación */}
                    <div className="manage-assignments-item-actions">
                      {isConfirming ? (
                        <div className="manage-assignments-confirm-box">
                          <span className="manage-assignments-confirm-text">
                            ¿Quitar asignación?
                          </span>
                          <div className="manage-assignments-confirm-btns">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(assignee.assignmentId, assignee.name)}
                              disabled={isThisDeleting}
                            >
                              {isThisDeleting ? (
                                <Loader2 size={13} className="plan-spin" />
                              ) : (
                                'Sí, quitar'
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isThisDeleting}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm manage-assignments-remove-btn"
                          onClick={() => setConfirmDeleteId(assignee.assignmentId)}
                          disabled={Boolean(deletingId)}
                          title={`Quitar a ${assignee.name} de este plan`}
                          aria-label={`Quitar a ${assignee.name}`}
                        >
                          <Trash2 size={14} className="manage-assignments-remove-icon" />
                          <span>Quitar</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pie del modal */}
        <footer className="manage-assignments-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={Boolean(deletingId)}
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

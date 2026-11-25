import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Trash2, Users, Building2, X } from 'lucide-react';
import { PlanListItem } from '../../types/trainingPlans';

export interface DeletePlanModalProps {
  isOpen: boolean;
  plan: PlanListItem | null;
  assignedAthletesCount?: number;
  assignedCategoriesCount?: number;
  assignedAthleteNames?: string[];
  assignedCategoryNames?: string[];
  isDeleting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeletePlanModal: React.FC<DeletePlanModalProps> = ({
  isOpen,
  plan,
  assignedAthletesCount = 0,
  assignedCategoriesCount = 0,
  assignedCategoryNames = [],
  isDeleting,
  errorMessage = null,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !plan) return null;

  const hasAssignments = assignedAthletesCount > 0 || assignedCategoriesCount > 0;

  const modalContent = (
    <div
      className="manage-assignments-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-plan-modal-title"
      onClick={isDeleting ? undefined : onClose}
    >
      <div
        className="manage-assignments-modal-card"
        style={{ maxWidth: '520px', padding: '1.75rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="manage-assignments-close-btn"
          aria-label="Cerrar modal de eliminación"
        >
          <X size={20} />
        </button>

        {/* Cabecera */}
        <header className="manage-assignments-header" style={{ marginBottom: '1.25rem' }}>
          <div
            className="manage-assignments-icon-box"
            style={{
              background: '#fee2e2',
              borderColor: '#fca5a5',
              color: '#dc2626',
            }}
          >
            <Trash2 size={22} />
          </div>
          <div>
            <h3 id="delete-plan-modal-title" className="manage-assignments-title">
              Eliminar planificación
            </h3>
            <p className="manage-assignments-subtitle" style={{ fontSize: '0.85rem' }}>
              Confirmación de baja definitiva
            </p>
          </div>
        </header>

        {/* Mensaje de error si falló */}
        {errorMessage && (
          <div
            className="alert-banner danger"
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.84rem',
            }}
          >
            <AlertTriangle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pregunta principal */}
        <p
          style={{
            margin: '0 0 1rem',
            fontSize: '0.92rem',
            color: 'var(--text-main)',
            lineHeight: 1.5,
          }}
        >
          ¿Estás seguro de que deseas eliminar la planificación <strong>«{plan.name}»</strong>?
        </p>

        {/* Aclaración en caso de tener atletas u organizaciones/categorías asignadas */}
        {hasAssignments ? (
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1rem 1.15rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem',
              lineHeight: 1.45,
            }}
            data-testid="delete-plan-assignments-warning"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 700,
                marginBottom: '0.65rem',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
              }}
            >
              <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>Esta planificación tiene asignaciones en curso:</span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
                marginTop: '0.5rem',
              }}
            >
              {assignedCategoriesCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Building2 size={13} style={{ color: 'var(--secondary)' }} />
                    {assignedCategoryNames.length}{' '}
                    {assignedCategoryNames.length === 1
                      ? 'organización / categoría:'
                      : 'organizaciones / categorías:'}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {assignedCategoryNames.map((name) => (
                      <span
                        key={name}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#ffffff',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '0.2rem 0.55rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {assignedAthletesCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.84rem',
                    color: 'var(--text-muted)',
                    marginTop: assignedCategoriesCount > 0 ? '0.2rem' : '0',
                  }}
                >
                  <Users size={14} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                  <span>
                    <strong style={{ color: 'var(--text-main)' }}>{assignedAthletesCount}</strong>{' '}
                    {assignedAthletesCount === 1 ? 'atleta individual' : 'atletas individuales'}{' '}
                    asignados
                  </span>
                </div>
              )}
            </div>

            <p
              style={{
                margin: '0.85rem 0 0',
                paddingTop: '0.65rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}
            >
              Al confirmar la eliminación, se cancelarán y removerán automáticamente todas sus
              asignaciones.
            </p>
          </div>
        ) : (
          <p
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '0.85rem',
              marginBottom: '1.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.82rem',
              lineHeight: 1.4,
            }}
          >
            Esta acción es irreversible. Se eliminarán todas las semanas, sesiones y ejercicios que
            integran este plan.
          </p>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
            style={{ padding: '0.5rem 1rem', fontSize: '0.88rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: '0.5rem 1.15rem',
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#ffffff',
              background: '#dc2626',
              border: '1px solid #b91c1c',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.75 : 1,
            }}
            data-testid="btn-confirm-delete-plan"
          >
            {isDeleting ? (
              <>
                <Loader2
                  size={16}
                  className="spinner"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <span>Eliminando...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Sí, eliminar planificación</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

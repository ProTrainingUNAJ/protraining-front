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
  Sparkles,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { PlanAssigneeItem } from './PlanAssigneesStack';
import { AthleteAdaptationDiffModal } from './AthleteAdaptationDiffModal';
import { structureService } from '../../api/structureService';
import { getActiveInjuriesSummary } from '../../api/seguimientoService';
import type { Athlete } from '../../types/structure';
import { formatDayMonth } from '../../utils/argentinaDate';

type AthleteInjuryCheckStatus = 'loading' | 'injured' | 'normal' | 'error';

interface AthleteInjuryCheckState {
  status: AthleteInjuryCheckStatus;
  activeCount: number;
}

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
  planId,
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
  const [categoryAthletes, setCategoryAthletes] = useState<Record<string, Athlete[]>>({});
  const [athleteInjuryStates, setAthleteInjuryStates] = useState<
    Record<string, AthleteInjuryCheckState>
  >({});
  const [adaptationTarget, setAdaptationTarget] = useState<{
    athleteId: string;
    athleteName: string;
  } | null>(null);

  // Cerrar con Escape (si no está abierto el modal de comparativa de adaptación)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deletingId && !adaptationTarget) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, deletingId, adaptationTarget, onClose]);

  // Cargar atletas de las categorías asignadas y consultar sus lesiones activas en Seguimiento (KAN-464)
  useEffect(() => {
    if (!isOpen) return;

    const categoryItems = assignees.filter((a) => a.type === 'category' && Boolean(a.targetId));
    const directAthleteIds = assignees
      .filter((a) => a.type === 'athlete' && Boolean(a.targetId))
      .map((a) => a.targetId);

    if (categoryItems.length === 0 && directAthleteIds.length === 0) return;

    let active = true;

    async function loadAthletesAndInjuries() {
      const nextMap: Record<string, Athlete[]> = {};

      await Promise.all(
        categoryItems.map(async (catAssignee) => {
          const catId = catAssignee.targetId;
          try {
            let list: Athlete[] = [];
            if (typeof structureService.getCategoryAthletes === 'function') {
              list = await structureService.getCategoryAthletes(catId).catch(() => []);
            }
            if (list.length === 0 && typeof structureService.getAthletes === 'function') {
              const all = await structureService
                .getAthletes({ categoriaId: catId })
                .catch(() => []);
              list = all.filter(
                (ath) =>
                  ath.categories?.some((c) => c.id === catId || c.name === catAssignee.name) ||
                  ath.categoryNames?.includes(catAssignee.name),
              );
            }
            nextMap[catId] = list;
          } catch {
            nextMap[catId] = [];
          }
        }),
      );

      if (!active) return;
      setCategoryAthletes(nextMap);

      const allAthleteIds = Array.from(
        new Set([
          ...directAthleteIds,
          ...Object.values(nextMap).flatMap((list) => list.map((ath) => ath.id)),
        ]),
      ).filter(Boolean);

      if (allAthleteIds.length === 0) return;

      const loadingStates: Record<string, AthleteInjuryCheckState> = {};
      for (const id of allAthleteIds) {
        loadingStates[id] = { status: 'loading', activeCount: 0 };
      }
      setAthleteInjuryStates(loadingStates);

      try {
        const summaries = await getActiveInjuriesSummary(allAthleteIds);
        if (!active) return;

        const countsByAthlete = new Map<string, number>(
          summaries.map((item) => [item.athleteId, item.activeCount]),
        );

        const nextStates: Record<string, AthleteInjuryCheckState> = {};
        for (const athleteId of allAthleteIds) {
          const activeCount = countsByAthlete.get(athleteId) ?? 0;
          nextStates[athleteId] = {
            status: activeCount > 0 ? 'injured' : 'normal',
            activeCount,
          };
        }
        setAthleteInjuryStates(nextStates);
      } catch {
        if (!active) return;
        const errorStates: Record<string, AthleteInjuryCheckState> = {};
        for (const athleteId of allAthleteIds) {
          errorStates[athleteId] = { status: 'error', activeCount: 0 };
        }
        setAthleteInjuryStates(errorStates);
      }
    }

    loadAthletesAndInjuries();

    return () => {
      active = false;
    };
  }, [isOpen, assignees]);

  if (!isOpen) return null;

  const renderAdaptationStatusControl = (
    athleteId: string,
    athleteName: string,
    disabled = false,
  ) => {
    const injuryState = athleteInjuryStates[athleteId];

    if (!injuryState || injuryState.status === 'loading') {
      return (
        <span className="manage-assignments-checking-status">
          <Loader2 size={13} className="plan-spin" aria-hidden="true" />
          <span>Verificando estado…</span>
        </span>
      );
    }

    if (injuryState.status === 'injured') {
      return (
        <button
          type="button"
          className="btn btn-secondary btn-sm manage-assignments-adapt-danger-btn"
          onClick={() =>
            setAdaptationTarget({
              athleteId,
              athleteName,
            })
          }
          disabled={disabled}
          title={`Comparar rutina base vs. adaptada de ${athleteName}`}
          aria-label={`Lesión activa - Revisar adaptación de ${athleteName}`}
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <span>Lesión activa - Revisar adaptación</span>
        </button>
      );
    }

    if (injuryState.status === 'error') {
      return (
        <button
          type="button"
          className="btn btn-secondary btn-sm manage-assignments-adapt-btn"
          onClick={() =>
            setAdaptationTarget({
              athleteId,
              athleteName,
            })
          }
          disabled={disabled}
          title="No se pudo verificar si tiene lesiones activas en Seguimiento"
          aria-label={`Revisar adaptación de ${athleteName}`}
        >
          <Sparkles size={13} aria-hidden="true" />
          <span>Revisar adaptación</span>
        </button>
      );
    }

    return (
      <span className="manage-assignments-normal-status">
        <CheckCircle2 size={14} aria-hidden="true" />
        <span>En condiciones normales</span>
      </span>
    );
  };

  const getStatusPriority = (athleteId: string): number => {
    const status = athleteInjuryStates[athleteId]?.status;
    if (status === 'injured') return 0;
    if (status === 'error') return 1;
    if (status === 'loading') return 2;
    return 3;
  };

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
                const athletesOfCat =
                  assignee.type === 'category'
                    ? [...(categoryAthletes[assignee.targetId] ?? [])].sort(
                        (a, b) => getStatusPriority(a.id) - getStatusPriority(b.id),
                      )
                    : [];

                return (
                  <li key={assignee.assignmentId} className="manage-assignments-item-group">
                    <div className="manage-assignments-item">
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

                      {/* Acciones: Estado de lesión / adaptación individual (KAN-464) y Quitar asignación */}
                      <div className="manage-assignments-item-actions">
                        {assignee.type === 'athlete' &&
                          assignee.targetId &&
                          !isConfirming &&
                          renderAdaptationStatusControl(
                            assignee.targetId,
                            assignee.name,
                            Boolean(deletingId),
                          )}

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
                    </div>

                    {/* Atletas dentro de la categoría asignada para revisar adaptación individual (KAN-464) */}
                    {assignee.type === 'category' && athletesOfCat.length > 0 && (
                      <div className="manage-assignments-category-athletes">
                        <span className="manage-assignments-category-athletes-title">
                          Atletas de {assignee.name} — Adaptación individual:
                        </span>
                        <ul className="manage-assignments-category-athletes-list" role="list">
                          {athletesOfCat.map((ath) => {
                            const fullName =
                              ath.fullName || `${ath.firstName} ${ath.lastName}`.trim();
                            return (
                              <li key={ath.id} className="manage-assignments-category-athlete-row">
                                <div className="manage-assignments-category-athlete-info">
                                  <span className="manage-assignments-category-athlete-name">
                                    {fullName}
                                  </span>
                                </div>
                                {renderAdaptationStatusControl(ath.id, fullName)}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
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

      {/* Modal de comparativa base vs. adaptada con motivo (KAN-464) */}
      {adaptationTarget && (
        <AthleteAdaptationDiffModal
          isOpen={Boolean(adaptationTarget)}
          planId={planId}
          planName={planName}
          athleteId={adaptationTarget.athleteId}
          athleteName={adaptationTarget.athleteName}
          onClose={() => setAdaptationTarget(null)}
          onAdaptationApproved={() => {
            setFeedbackMessage(
              `Variante adaptada aprobada con éxito para ${adaptationTarget.athleteName}.`,
            );
            setTimeout(() => setFeedbackMessage(null), 3500);
          }}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

import React from 'react';
import { MetricKey } from './recovery.types';

interface RecoveryValidationModalProps {
  open: boolean;
  onClose: () => void;
  pendingMetrics: { key: MetricKey; label: string }[];
  onSelectMetric: (key: MetricKey) => void;
}

export const RecoveryValidationModal: React.FC<RecoveryValidationModalProps> = ({
  open,
  onClose,
  pendingMetrics,
  onSelectMetric,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-modal-title"
      className="recovery-modal-backdrop"
      onClick={onClose}
    >
      <div className="recovery-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Ícono de alerta en círculo ámbar / naranja */}
        <div className="recovery-alert-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9V14M12 17.5V18M10.29 3.86L1.82 18A2 2 0 0 0 3.55 21H20.45A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
              stroke="var(--warning)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h3 id="pending-modal-title" className="recovery-modal-title">
          ¡Debés mover las opciones de su estado neutro!
        </h3>

        <p className="recovery-modal-desc">
          Para avanzar al siguiente paso, debés registrar las <strong>4 opciones</strong> de
          descanso y recuperación con los botones + o −. No pueden quedar en estado neutro sin
          pintar.
        </p>

        {/* Lista de métricas pendientes */}
        <div className="recovery-pending-list">
          {pendingMetrics.map((m) => (
            <button
              key={m.key}
              type="button"
              className="recovery-pending-item"
              onClick={() => {
                onSelectMetric(m.key);
                onClose();
              }}
            >
              <span className="recovery-pending-label">
                <span className="recovery-pending-dot" />
                {m.label}
              </span>
              <span className="recovery-pending-action">Completar →</span>
            </button>
          ))}
        </div>

        {/* Botón Principal para completar */}
        <button
          type="button"
          className="recovery-modal-submit-btn"
          onClick={() => {
            if (pendingMetrics.length > 0) {
              onSelectMetric(pendingMetrics[0].key);
            }
            onClose();
          }}
        >
          Entendido, completar ahora
        </button>
      </div>
    </div>
  );
};

interface RecoverySleepHoursConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (hours: number) => void;
}

export const RecoverySleepHoursConfirmModal: React.FC<RecoverySleepHoursConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sleep-confirm-modal-title"
      className="recovery-modal-backdrop"
      onClick={onClose}
    >
      <div className="recovery-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Ícono de descanso / luna */}
        <div className="recovery-sleep-icon-wrap">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M 19 10 A 8 8 0 1 1 10.5 2 A 6.5 6.5 0 0 0 19 10 Z"
              fill="var(--checkin-scale-violet)"
            />
          </svg>
        </div>

        <h3 id="sleep-confirm-modal-title" className="recovery-modal-title">
          ¿Fueron más de 12 horas?
        </h3>

        <p className="recovery-modal-desc">
          Seleccionaste 12 horas o más de descanso. Confirmá si tu tiempo de sueño superó
          efectivamente las 12 horas.
        </p>

        {/* Botones de confirmación Sí / No */}
        <div className="recovery-confirm-actions">
          <button
            type="button"
            className="recovery-confirm-btn-secondary"
            onClick={() => onConfirm(12)}
          >
            No
          </button>

          <button
            type="button"
            className="recovery-confirm-btn-primary"
            onClick={() => onConfirm(13)}
          >
            Sí
          </button>
        </div>
      </div>
    </div>
  );
};

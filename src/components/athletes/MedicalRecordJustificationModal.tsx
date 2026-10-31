import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, Loader2, X, FileText } from 'lucide-react';
import { medicalRecordService } from '../../api/medicalRecord';
import { MedicalRecord } from '../../types/medicalRecord';
import '../../styles/medicalRecord.css';

interface MedicalRecordJustificationModalProps {
  athleteId: string;
  athleteName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: MedicalRecord, justification: string) => void;
}

export const MedicalRecordJustificationModal: React.FC<MedicalRecordJustificationModalProps> = ({
  athleteId,
  athleteName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [justification, setJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = justification.trim();
    if (!trimmed) {
      setError('Por favor ingresa un motivo explícito para consultar la ficha médica.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Backend query recording immutable access audit log
      const record = await medicalRecordService.getMedicalRecord(athleteId, trimmed);
      onSuccess(record, trimmed);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al intentar acceder a la ficha médica del atleta.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="medical-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (!loading && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="medical-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="justification-modal-title"
      >
        <div className="medical-modal-header">
          <h2 id="justification-modal-title" className="medical-modal-title">
            <ShieldAlert size={20} style={{ color: 'var(--secondary)' }} aria-hidden="true" />
            <span>Justificación de Acceso Médico</span>
          </h2>
          <button
            type="button"
            className="medical-modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar diálogo"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="medical-modal-body">
            <div className="medical-notice-box">
              <FileText size={18} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <div>
                <strong>Acceso a información confidencial de {athleteName}:</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  Por exigencia legal y auditoría inmutable (KAN-324 / KAN-325), cada consulta a la
                  ficha médica queda registrada con tu usuario y marca de tiempo. Debes declarar el
                  motivo profesional para continuar.
                </div>
              </div>
            </div>

            {error && (
              <div className="medical-notice-box danger" role="alert">
                <AlertCircle
                  size={18}
                  style={{ flexShrink: 0, marginTop: '2px' }}
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            <div className="medical-form-field">
              <label htmlFor="justification-input" className="medical-form-label">
                Motivo de la consulta médica *
              </label>
              <textarea
                id="justification-input"
                className="medical-form-textarea"
                rows={3}
                placeholder="Ej. Control de aptitud física previa al inicio de competencia / Evaluación de antecedentes por molestia muscular..."
                value={justification}
                onChange={(e) => {
                  setJustification(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div className="medical-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !justification.trim()}
            >
              {loading && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
              <span>{loading ? 'Accediendo…' : 'Acceder a Ficha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

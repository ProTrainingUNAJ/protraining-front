import React from 'react';
import { HeartPulse, CheckCircle2, AlertTriangle, X, ShieldCheck } from 'lucide-react';
import { MedicalRecord } from '../../types/medicalRecord';
import '../../styles/medicalRecord.css';

interface MedicalRecordDetailModalProps {
  athleteName: string;
  record: MedicalRecord;
  justificationUsed: string;
  onClose: () => void;
}

export const MedicalRecordDetailModal: React.FC<MedicalRecordDetailModalProps> = ({
  athleteName,
  record,
  justificationUsed,
  onClose,
}) => {
  return (
    <div
      className="medical-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="medical-modal-card"
        style={{ maxWidth: '640px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="medical-detail-title"
      >
        <div className="medical-modal-header">
          <h2 id="medical-detail-title" className="medical-modal-title">
            <HeartPulse size={20} style={{ color: 'var(--danger)' }} aria-hidden="true" />
            <span>Ficha Médica · {athleteName}</span>
          </h2>
          <button
            type="button"
            className="medical-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ficha médica"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="medical-modal-body">
          {/* Registered audit log notice */}
          <div className="medical-notice-box" style={{ background: 'var(--bg-subtle)' }}>
            <ShieldCheck
              size={18}
              style={{ color: 'var(--success)', flexShrink: 0 }}
              aria-hidden="true"
            />
            <div style={{ fontSize: '0.82rem' }}>
              <strong>Acceso registrado en auditoría inmutable:</strong> Motivo:{' '}
              <em>"{justificationUsed}"</em>.
            </div>
          </div>

          {/* Physical Fitness Certificate status */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: `1px solid ${record.hasPhysicalFitnessCertificate ? 'var(--success-border)' : 'var(--warning)'}`,
              background: record.hasPhysicalFitnessCertificate
                ? 'var(--success-bg)'
                : 'var(--warning-bg-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {record.hasPhysicalFitnessCertificate ? (
                <CheckCircle2 size={24} style={{ color: 'var(--success)' }} aria-hidden="true" />
              ) : (
                <AlertTriangle
                  size={24}
                  style={{ color: 'var(--warning-text)' }}
                  aria-hidden="true"
                />
              )}
              <div>
                <strong
                  style={{
                    color: record.hasPhysicalFitnessCertificate
                      ? 'var(--success-text)'
                      : 'var(--warning-text)',
                    fontSize: '0.95rem',
                  }}
                >
                  {record.hasPhysicalFitnessCertificate
                    ? 'Apto Físico Acreditado'
                    : 'Sin Certificado de Apto Físico'}
                </strong>
                {record.physicalFitnessExpiresAt && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Vencimiento: {record.physicalFitnessExpiresAt}
                  </div>
                )}
              </div>
            </div>

            {record.physicalFitnessIssuedAt && (
              <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                Emisión: {record.physicalFitnessIssuedAt}
              </span>
            )}
          </div>

          {/* Medical data grid */}
          <div className="medical-record-grid">
            <div className="medical-record-section">
              <div className="medical-record-section-title">Antecedentes Médicos</div>
              <p className="medical-record-section-content">
                {record.medicalHistory || 'Sin antecedentes médicos registrados.'}
              </p>
            </div>

            <div className="medical-record-section">
              <div className="medical-record-section-title">Cirugías Previas</div>
              <p className="medical-record-section-content">
                {record.surgeries || 'Sin cirugías previas registradas.'}
              </p>
            </div>

            <div className="medical-record-section">
              <div className="medical-record-section-title">Patologías Conocidas</div>
              <p className="medical-record-section-content">
                {record.pathologies || 'Sin patologías conocidas registradas.'}
              </p>
            </div>

            <div className="medical-record-section">
              <div className="medical-record-section-title">Observaciones del Apto Físico</div>
              <p className="medical-record-section-content">
                {record.physicalFitnessNotes || 'Sin observaciones particulares.'}
              </p>
            </div>
          </div>
        </div>

        <div className="medical-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};

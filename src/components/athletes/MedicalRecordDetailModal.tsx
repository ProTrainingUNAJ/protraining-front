import React, { useState } from 'react';
import {
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  X,
  ShieldCheck,
  Pencil,
  Save,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { MedicalRecord, UpdateMedicalRecordRequest } from '../../types/medicalRecord';
import { medicalRecordService } from '../../api/medicalRecord';
import '../../styles/medicalRecord.css';

interface MedicalRecordDetailModalProps {
  athleteName: string;
  record: MedicalRecord;
  justificationUsed: string;
  onClose: () => void;
  onRecordUpdated?: (updated: MedicalRecord) => void;
}

export const MedicalRecordDetailModal: React.FC<MedicalRecordDetailModalProps> = ({
  athleteName,
  record,
  justificationUsed,
  onClose,
  onRecordUpdated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<MedicalRecord>(record);

  // Form states
  const [hasCertificate, setHasCertificate] = useState(record.hasPhysicalFitnessCertificate);
  const [issuedAt, setIssuedAt] = useState(record.physicalFitnessIssuedAt || '');
  const [expiresAt, setExpiresAt] = useState(record.physicalFitnessExpiresAt || '');
  const [medicalHistory, setMedicalHistory] = useState(record.medicalHistory || '');
  const [surgeries, setSurgeries] = useState(record.surgeries || '');
  const [pathologies, setPathologies] = useState(record.pathologies || '');
  const [notes, setNotes] = useState(record.physicalFitnessNotes || '');
  const [justification, setJustification] = useState(
    justificationUsed || 'Actualización de ficha médica por el PF',
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCancel = () => {
    setHasCertificate(currentRecord.hasPhysicalFitnessCertificate);
    setIssuedAt(currentRecord.physicalFitnessIssuedAt || '');
    setExpiresAt(currentRecord.physicalFitnessExpiresAt || '');
    setMedicalHistory(currentRecord.medicalHistory || '');
    setSurgeries(currentRecord.surgeries || '');
    setPathologies(currentRecord.pathologies || '');
    setNotes(currentRecord.physicalFitnessNotes || '');
    setJustification(justificationUsed || 'Actualización de ficha médica por el PF');
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanJustification = justification.trim();
    if (!cleanJustification) {
      setSaveError(
        'La justificación del cambio es obligatoria para el registro de auditoría legal.',
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload: UpdateMedicalRecordRequest = {
        justification: cleanJustification,
        hasPhysicalFitnessCertificate: hasCertificate,
        physicalFitnessIssuedAt: issuedAt || null,
        physicalFitnessExpiresAt: expiresAt || null,
        medicalHistory: medicalHistory.trim() || null,
        surgeries: surgeries.trim() || null,
        pathologies: pathologies.trim() || null,
        physicalFitnessNotes: notes.trim() || null,
      };

      const updated = await medicalRecordService.updateMedicalRecord(
        currentRecord.athleteId,
        payload,
      );
      setCurrentRecord(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      onRecordUpdated?.(updated);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo actualizar la ficha médica.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="medical-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
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
            <span>
              Ficha Médica · {athleteName} {isEditing ? '(Edición)' : ''}
            </span>
          </h2>
          <button
            type="button"
            className="medical-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar ficha médica"
            disabled={saving}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="medical-modal-body">
          {saveSuccess && (
            <div
              className="alert-banner success"
              role="alert"
              style={{
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success-text)',
              }}
            >
              <Check size={18} aria-hidden="true" />
              <span>Ficha médica actualizada y registrada en auditoría legal.</span>
            </div>
          )}

          {saveError && (
            <div
              className="alert-banner danger"
              role="alert"
              style={{
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
              }}
            >
              <AlertCircle size={18} aria-hidden="true" />
              <span>{saveError}</span>
            </div>
          )}

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

          {!isEditing ? (
            <>
              {/* Physical Fitness Certificate status */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: `1px solid ${currentRecord.hasPhysicalFitnessCertificate ? 'var(--success-border)' : 'var(--warning)'}`,
                  background: currentRecord.hasPhysicalFitnessCertificate
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
                  {currentRecord.hasPhysicalFitnessCertificate ? (
                    <CheckCircle2
                      size={24}
                      style={{ color: 'var(--success)' }}
                      aria-hidden="true"
                    />
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
                        color: currentRecord.hasPhysicalFitnessCertificate
                          ? 'var(--success-text)'
                          : 'var(--warning-text)',
                        fontSize: '0.95rem',
                      }}
                    >
                      {currentRecord.hasPhysicalFitnessCertificate
                        ? 'Apto Físico Acreditado'
                        : 'Sin Certificado de Apto Físico'}
                    </strong>
                    {currentRecord.physicalFitnessExpiresAt && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Vencimiento: {currentRecord.physicalFitnessExpiresAt}
                      </div>
                    )}
                  </div>
                </div>

                {currentRecord.physicalFitnessIssuedAt && (
                  <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                    Emisión: {currentRecord.physicalFitnessIssuedAt}
                  </span>
                )}
              </div>

              {/* Medical data grid */}
              <div className="medical-record-grid">
                <div className="medical-record-section">
                  <div className="medical-record-section-title">Antecedentes Médicos</div>
                  <p className="medical-record-section-content">
                    {currentRecord.medicalHistory || 'Sin antecedentes médicos registrados.'}
                  </p>
                </div>

                <div className="medical-record-section">
                  <div className="medical-record-section-title">Cirugías Previas</div>
                  <p className="medical-record-section-content">
                    {currentRecord.surgeries || 'Sin cirugías previas registradas.'}
                  </p>
                </div>

                <div className="medical-record-section">
                  <div className="medical-record-section-title">Patologías Conocidas</div>
                  <p className="medical-record-section-content">
                    {currentRecord.pathologies || 'Sin patologías conocidas registradas.'}
                  </p>
                </div>

                <div className="medical-record-section">
                  <div className="medical-record-section-title">Observaciones del Apto Físico</div>
                  <p className="medical-record-section-content">
                    {currentRecord.physicalFitnessNotes || 'Sin observaciones particulares.'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <form id="medical-record-form" onSubmit={handleSave}>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  marginBottom: '1rem',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hasCertificate}
                    onChange={(e) => setHasCertificate(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                    data-testid="med-has-certificate"
                  />
                  <span>Certificado de Apto Físico Acreditado y Vigente</span>
                </label>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    marginTop: '0.75rem',
                  }}
                >
                  <div>
                    <label
                      htmlFor="med-issued-at"
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Fecha de Emisión
                    </label>
                    <input
                      id="med-issued-at"
                      type="date"
                      value={issuedAt}
                      onChange={(e) => setIssuedAt(e.target.value)}
                      data-testid="med-issued-at"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="med-expires-at"
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Fecha de Vencimiento
                    </label>
                    <input
                      id="med-expires-at"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      data-testid="med-expires-at"
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label
                    htmlFor="med-history"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Antecedentes Médicos / Alergias
                  </label>
                  <textarea
                    id="med-history"
                    rows={2}
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    placeholder="Ej: Sin alergias conocidas. Sin antecedentes cardíacos."
                    data-testid="med-history"
                  />
                </div>

                <div>
                  <label
                    htmlFor="med-surgeries"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Cirugías Previas
                  </label>
                  <textarea
                    id="med-surgeries"
                    rows={2}
                    value={surgeries}
                    onChange={(e) => setSurgeries(e.target.value)}
                    placeholder="Ej: Meniscos rodilla izquierda (2022)."
                    data-testid="med-surgeries"
                  />
                </div>

                <div>
                  <label
                    htmlFor="med-pathologies"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Patologías Conocidas / Condiciones
                  </label>
                  <textarea
                    id="med-pathologies"
                    rows={2}
                    value={pathologies}
                    onChange={(e) => setPathologies(e.target.value)}
                    placeholder="Ej: Sin patologías. / Asma leve controlada."
                    data-testid="med-pathologies"
                  />
                </div>

                <div>
                  <label
                    htmlFor="med-notes"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem',
                    }}
                  >
                    Observaciones del Apto Físico
                  </label>
                  <textarea
                    id="med-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones adicionales del profesional médico."
                    data-testid="med-notes"
                  />
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <label
                    htmlFor="med-justification"
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      marginBottom: '0.25rem',
                      color: 'var(--primary)',
                    }}
                  >
                    * Justificación de la modificación (requerido por auditoría legal)
                  </label>
                  <input
                    id="med-justification"
                    type="text"
                    value={justification}
                    onChange={(e) => {
                      setJustification(e.target.value);
                      if (saveError) setSaveError(null);
                    }}
                    placeholder="Motivo del cambio en la ficha (ej: Actualización de apto médico anual)"
                    required
                    data-testid="med-justification"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        <div
          className="medical-modal-footer"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          {!isEditing ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
                data-testid="edit-medical-record-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Pencil size={15} aria-hidden="true" />
                <span>Editar Ficha Médica</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cerrar Ficha
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="medical-record-form"
                className="btn btn-primary"
                disabled={saving}
                data-testid="save-medical-record-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {saving ? (
                  <Loader2 size={16} className="spin" aria-hidden="true" />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                <span>{saving ? 'Guardando...' : 'Guardar Ficha Médica'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

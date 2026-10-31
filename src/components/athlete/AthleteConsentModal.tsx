import React, { useState } from 'react';
import { ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';
import '../../styles/medicalRecord.css';

interface AthleteConsentModalProps {
  athleteName: string;
  isOpen: boolean;
  onConsentSigned: (consentData: {
    signedAt: string;
    allowsPhysicalTraining: boolean;
    allowsHabitsRecommendations: boolean;
  }) => void;
}

export const AthleteConsentModal: React.FC<AthleteConsentModalProps> = ({
  athleteName,
  isOpen,
  onConsentSigned,
}) => {
  const [allowsPhysicalTraining, setAllowsPhysicalTraining] = useState(false);
  const [allowsHabits, setAllowsHabits] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowsPhysicalTraining) return;

    setIsSubmitting(true);
    const signedAt = new Date().toISOString();

    onConsentSigned({
      signedAt,
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: allowsHabits,
    });
    setIsSubmitting(false);
  };

  return (
    <div
      className="consent-modal-overlay"
      role="presentation"
      onClick={(e) => {
        // Blocking modal without dismissal: clicking backdrop is prevented
        e.stopPropagation();
      }}
    >
      <div
        className="consent-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="medical-modal-header">
          <h2 id="consent-modal-title" className="medical-modal-title">
            <ShieldCheck size={22} style={{ color: 'var(--secondary)' }} aria-hidden="true" />
            <span>Consentimiento Médico y Deportivo Obligatorio</span>
          </h2>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="medical-modal-body">
            <div className="medical-notice-box">
              <FileCheck size={20} style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
              <div>
                <strong>Bienvenido a ProTraining, {athleteName}.</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  Para comenzar a utilizar la aplicación deportiva y acceder a tu planificación de
                  entrenamiento, es requisito legal y obligatorio firmar el consentimiento de
                  aptitud física y confidencialidad médica.
                </div>
              </div>
            </div>

            <div
              className="consent-legal-scroll"
              tabIndex={0}
              aria-label="Términos legales del consentimiento"
            >
              <p style={{ marginTop: 0, fontWeight: 600 }}>
                TÉRMINOS Y CONDICIONES DEL CONSENTIMIENTO INFORMADO:
              </p>
              <ol style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                <li>
                  <strong>Aptitud Física:</strong> El atleta manifiesta estar en condiciones físicas
                  aptas para el desarrollo de entrenamientos deportivos y se compromete a presentar
                  el Certificado de Apto Físico correspondiente ante las autoridades de la
                  institución.
                </li>
                <li>
                  <strong>Confidencialidad Médica:</strong> Los antecedentes médicos, cirugías,
                  lesiones y datos de salud consignados serán tratados con estricta confidencialidad
                  bajo los estándares de seguridad de ProTraining, y cada acceso por parte del
                  preparador físico quedará debidamente registrado en una auditoría inmutable
                  (KAN-324 / KAN-325).
                </li>
                <li>
                  <strong>Notificación Oportuna:</strong> El atleta se compromete a reportar
                  cualquier molestia, síntoma o impedimento físico previo o durante la ejecución de
                  las rutinas.
                </li>
              </ol>
            </div>

            {/* Mandatory Checkbox */}
            <label className="consent-checkbox-row">
              <input
                type="checkbox"
                className="consent-checkbox-input"
                checked={allowsPhysicalTraining}
                onChange={(e) => setAllowsPhysicalTraining(e.target.checked)}
                required
                aria-required="true"
              />
              <span className="consent-checkbox-text">
                <strong>(Obligatorio)</strong> He leído, comprendo y acepto los términos del
                consentimiento informado para la preparación física y declaro que mi aptitud física
                es idónea.
              </span>
            </label>

            {/* Optional Habits Checkbox */}
            <label className="consent-checkbox-row">
              <input
                type="checkbox"
                className="consent-checkbox-input"
                checked={allowsHabits}
                onChange={(e) => setAllowsHabits(e.target.checked)}
              />
              <span className="consent-checkbox-text">
                Autorizo la recepción de recomendaciones personalizadas de hábitos saludables,
                hidratación y descanso.
              </span>
            </label>

            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
              }}
            >
              Firmante legal: <strong>{athleteName}</strong> · Registro digital inmutable en
              ProTraining PWA.
            </div>
          </div>

          <div className="medical-modal-footer">
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!allowsPhysicalTraining || isSubmitting}
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>Firmar y Aceptar Consentimiento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

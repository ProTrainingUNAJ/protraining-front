import React, { useState } from 'react';
import { ShieldCheck, FileCheck, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import '../../styles/medicalRecord.css';

export interface AthleteConsentModalProps {
  athleteName: string;
  isOpen: boolean;
  isMinor?: boolean;
  hasGuardianConsent?: boolean;
  onConsentSigned: (consentData: {
    allowsPhysicalTraining: boolean;
    allowsHabitsRecommendations: boolean;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
}

export const AthleteConsentModal: React.FC<AthleteConsentModalProps> = ({
  athleteName,
  isOpen,
  isMinor = false,
  hasGuardianConsent = false,
  onConsentSigned,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const [allowsPhysicalTraining, setAllowsPhysicalTraining] = useState(false);
  const [allowsHabits, setAllowsHabits] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowsPhysicalTraining || isSubmitting) return;

    await onConsentSigned({
      allowsPhysicalTraining: true,
      allowsHabitsRecommendations: allowsHabits,
    });
  };

  return (
    <div
      className="consent-modal-overlay"
      role="presentation"
      onClick={(e) => {
        // Modal bloqueante: no se cierra al hacer clic en el backdrop
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

        {isMinor ? (
          <div className="medical-modal-body">
            {hasGuardianConsent ? (
              <div className="medical-notice-box" style={{ borderColor: 'var(--secondary)' }}>
                <CheckCircle2
                  size={22}
                  style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: '2px' }}
                  aria-hidden="true"
                />
                <div>
                  <strong>Tu tutor ya dio el consentimiento.</strong>
                  <div style={{ marginTop: '0.35rem' }}>
                    Tu padre, madre o tutor legal ya autorizó tu participación en las actividades
                    deportivas y el registro de tu ficha médica ante tu preparador físico.
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="medical-notice-box consent-error-box">
                  <AlertTriangle
                    size={22}
                    className="consent-error-icon"
                    style={{ marginTop: '2px' }}
                    aria-hidden="true"
                  />
                  <div>
                    <strong>Falta el consentimiento de tu tutor, hablá con tu PF.</strong>
                    <div style={{ marginTop: '0.35rem' }}>
                      Al ser menor de edad, el consentimiento legal para el entrenamiento y el
                      acceso a tu ficha médica debe ser otorgado y registrado por tu padre, madre o
                      tutor legal cuando tu preparador físico te da de alta en la plataforma.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-subtle)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    lineHeight: 1.5,
                  }}
                >
                  Atleta: <strong>{athleteName}</strong>.
                  <br />
                  Hasta que tu tutor complete la autorización con el preparador físico, tu
                  planificación deportiva permanecerá resguardada.
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleConfirm}>
            <div className="medical-modal-body">
              {errorMessage && (
                <div className="medical-notice-box consent-error-box">
                  <AlertTriangle size={20} className="consent-error-icon" aria-hidden="true" />
                  <div>{errorMessage}</div>
                </div>
              )}

              <div className="medical-notice-box">
                <FileCheck
                  size={20}
                  style={{ flexShrink: 0, marginTop: '2px' }}
                  aria-hidden="true"
                />
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
                    <strong>Aptitud Física:</strong> El atleta manifiesta estar en condiciones
                    físicas aptas para el desarrollo de entrenamientos deportivos y se compromete a
                    presentar el Certificado de Apto Físico correspondiente ante las autoridades de
                    la institución.
                  </li>
                  <li>
                    <strong>Confidencialidad Médica:</strong> Los antecedentes médicos, cirugías,
                    lesiones y datos de salud consignados serán tratados con estricta
                    confidencialidad bajo los estándares de seguridad de ProTraining, y cada acceso
                    por parte del preparador físico quedará debidamente registrado en una auditoría
                    inmutable.
                  </li>
                  <li>
                    <strong>Notificación Oportuna:</strong> El atleta se compromete a reportar
                    cualquier molestia, síntoma o impedimento físico previo o durante la ejecución
                    de las rutinas.
                  </li>
                </ol>
              </div>

              {/* Casilla Obligatoria de Preparación Física */}
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
                  consentimiento informado para la preparación física y declaro que mi aptitud
                  física es idónea.
                </span>
              </label>

              {/* Casilla Opcional de Hábitos (arranca desmarcada) */}
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
                Firmante: <strong>{athleteName}</strong> · La firma queda registrada en ProTraining
                y no se puede modificar.
              </div>
            </div>

            <div className="medical-modal-footer">
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={!allowsPhysicalTraining || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Registrando firma...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span>Firmar y Aceptar Consentimiento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

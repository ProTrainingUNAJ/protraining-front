import React, { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react';
import { authService } from '../../api/authService';
import { Athlete } from '../../types/structure';

interface ResetAthletePasswordModalProps {
  athlete: Athlete;
  onClose: () => void;
}

export const ResetAthletePasswordModal: React.FC<ResetAthletePasswordModalProps> = ({
  athlete,
  onClose,
}) => {
  const [step, setStep] = useState<'confirm' | 'loading' | 'success'>('confirm');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const athleteName = athlete.fullName || `${athlete.firstName} ${athlete.lastName}`.trim();

  const handleConfirmReset = async () => {
    setError(null);
    setStep('loading');
    try {
      const response = await authService.resetAthletePassword(athlete.id);
      setTemporaryPassword(response.temporaryPassword);
      setStep('success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al restablecer la contraseña del atleta.';
      setError(message);
      setStep('confirm');
    }
  };

  const handleCopy = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback si clipboard API no estuviera disponible
      const textarea = document.createElement('textarea');
      textarea.value = temporaryPassword;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound size={22} color="var(--primary, #0284c7)" aria-hidden="true" />
            <h2 id="reset-modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
              {step === 'success' ? 'Contraseña temporal generada' : 'Resetear contraseña'}
            </h2>
          </div>
          <button
            type="button"
            className="coach-icon-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginBottom: '1rem',
              color: '#dc2626',
              fontSize: '0.9rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {step === 'confirm' && (
          <div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              ¿Estás seguro de que querés restablecer la contraseña de{' '}
              <strong>{athleteName}</strong>?
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                marginBottom: '1.5rem',
                color: '#b45309',
                fontSize: '0.875rem',
                lineHeight: 1.4,
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                Esta acción generará una <strong>contraseña temporal</strong> de un solo uso y
                cerrará inmediatamente todas las sesiones activas del atleta. El atleta deberá
                cambiarla de forma obligatoria al iniciar sesión.
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReset}
                data-testid="confirm-reset-btn"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#fff' }}
              >
                Confirmar reseteo
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <Loader2
              size={36}
              className="animate-spin"
              style={{ color: 'var(--primary, #0284c7)', animation: 'spin 1s linear infinite' }}
            />
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted, #64748b)' }}>
              Generando contraseña temporal segura y revocando sesiones...
            </p>
          </div>
        )}

        {step === 'success' && temporaryPassword && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '0.375rem',
                padding: '0.75rem',
                marginBottom: '1.25rem',
                color: '#b91c1c',
                fontSize: '0.875rem',
                lineHeight: 1.4,
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
              <div>
                <strong>Atención:</strong> Esta contraseña{' '}
                <strong>solo se mostrará esta única vez</strong>. Asegurate de copiarla y
                entregársela a <strong>{athleteName}</strong> antes de cerrar esta ventana.
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.35rem',
                  color: 'var(--text-muted, #64748b)',
                }}
              >
                Contraseña temporal
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--surface-variant, #f1f5f9)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--border, #cbd5e1)',
                }}
              >
                <code
                  data-testid="temporary-password-display"
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--text-primary, #0f172a)',
                    userSelect: 'all',
                  }}
                >
                  {temporaryPassword}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  data-testid="copy-password-btn"
                  title="Copiar contraseña al portapapeles"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.85rem',
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={16} color="#16a34a" aria-hidden="true" />
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>¡Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} aria-hidden="true" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--text-muted, #64748b)',
                margin: '0 0 1.5rem',
              }}
            >
              Al iniciar sesión con esta contraseña, la aplicación le exigirá al atleta definir una
              nueva clave para acceder.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                data-testid="close-reset-modal-btn"
              >
                Listo, cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Mail, LogIn } from 'lucide-react';
import { authService } from '../../api/authService';
import { extractErrorMessage } from '../../api/axiosClient';
import { ThemeToggle } from '../../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../../components/brand/ProTrainingLogo';

export const ConfirmEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const userId = searchParams.get('userId') || searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const hasParams = Boolean(token && userId);
  const [loading, setLoading] = useState(hasParams);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasParams ? null : 'El link venció o los parámetros de confirmación son inválidos.',
  );

  // Estados de reenvío en caso de link vencido o error
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token || !userId) {
      return;
    }

    const runConfirm = async () => {
      try {
        await authService.confirmEmail({ userId, token });
        setSuccess(true);
      } catch (err: unknown) {
        const msg = extractErrorMessage(err);
        const isExpiredOrInvalid =
          msg.toLowerCase().includes('inválido') ||
          msg.toLowerCase().includes('vencid') ||
          msg.toLowerCase().includes('expir') ||
          (typeof err === 'object' &&
            err !== null &&
            'status' in err &&
            (err as { status?: number }).status === 400) ||
          (typeof err === 'object' &&
            err !== null &&
            'response' in err &&
            (err as { response?: { status?: number } }).response?.status === 400);

        setErrorMessage(isExpiredOrInvalid ? 'El link venció' : msg || 'El link venció');
      } finally {
        setLoading(false);
      }
    };

    runConfirm();
  }, [userId, token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resendEmail.trim();
    if (!cleanEmail) {
      setResendError('Ingresá tu correo electrónico para reenviar la confirmación.');
      return;
    }

    setResending(true);
    setResendError(null);
    setResendSuccess(null);

    try {
      await authService.resendConfirmation(cleanEmail);
      setResendSuccess(
        `Si existe una cuenta pendiente con ${cleanEmail}, se reenvió un nuevo correo de activación.`,
      );
    } catch (err: unknown) {
      setResendError(extractErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-main)',
      }}
    >
      <div className="auth-card" style={{ maxWidth: '460px', width: '100%' }}>
        {/* Cabecera con Logo y Selector de Tema */}
        <div className="auth-brand-top">
          <div className="auth-brand-logo-wrap">
            <ProTrainingLogo height={48} />
          </div>
          <ThemeToggle />
        </div>

        {loading ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1rem',
            }}
          >
            <span
              className="spinner-pill"
              style={{ width: '28px', height: '28px' }}
              aria-hidden="true"
            />
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Confirmando tu correo electrónico…
            </p>
          </div>
        ) : success ? (
          /* Estado exitoso */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '1rem 0 0.5rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid var(--success-border)',
              }}
              aria-hidden="true"
            >
              <CheckCircle2 size={36} />
            </div>

            <h1
              className="auth-title"
              style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}
            >
              ¡Listo! Ya podés entrar
            </h1>

            <p
              style={{
                fontSize: '0.94rem',
                color: 'var(--text-muted)',
                marginBottom: '1.75rem',
                lineHeight: 1.45,
              }}
            >
              Tu correo fue verificado exitosamente. Iniciá sesión con tus credenciales para
              empezar.
            </p>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-pill-primary"
              id="btn-confirm-login"
            >
              <LogIn size={18} />
              <span>Iniciar sesión</span>
            </button>
          </div>
        ) : (
          /* Estado de error / link vencido */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              padding: '0.75rem 0 0.5rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                border: '1px solid var(--danger-border)',
              }}
              aria-hidden="true"
            >
              <AlertCircle size={34} />
            </div>

            <h1
              className="auth-title"
              style={{ fontSize: '1.45rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}
            >
              {errorMessage || 'El link venció'}
            </h1>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
                lineHeight: 1.4,
              }}
            >
              El enlace de activación ya fue utilizado o caducó. Podés solicitar que te enviemos uno
              nuevo.
            </p>

            {resendSuccess ? (
              <div
                className="alert-box alert-success"
                style={{ width: '100%', marginBottom: '1.25rem' }}
                role="status"
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{resendSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleResend} style={{ width: '100%', marginBottom: '1.25rem' }}>
                <div className="form-group-pill" style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor="resend-email" className="sr-only">
                    Correo electrónico
                  </label>
                  <div className={`input-pill-container ${resendError ? 'error' : ''}`}>
                    <span className="input-pill-icon" aria-hidden="true">
                      <Mail size={19} />
                    </span>
                    <input
                      id="resend-email"
                      type="email"
                      name="email"
                      value={resendEmail}
                      onChange={(e) => {
                        setResendEmail(e.target.value);
                        if (resendError) setResendError(null);
                      }}
                      placeholder="Tu correo electrónico"
                      className="input-pill"
                      required
                    />
                  </div>
                  {resendError && (
                    <span
                      className="form-field-error"
                      style={{ textAlign: 'left', display: 'block' }}
                    >
                      {resendError}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={resending}
                  className="btn-pill-primary"
                  id="btn-resend-expired-link"
                >
                  {resending ? 'Enviando…' : 'Reenviar mail'}
                </button>
              </form>
            )}

            <Link
              to="/login"
              style={{
                fontSize: '0.88rem',
                color: 'var(--secondary)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Volver a Iniciar sesión
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

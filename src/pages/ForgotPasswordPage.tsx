import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../api/authService';
import { extractErrorMessage } from '../api/axiosClient';
import { ThemeToggle } from '../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../components/brand/ProTrainingLogo';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldError, setFieldError] = useState('');

  const validate = (): boolean => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFieldError('El correo electrónico es obligatorio.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFieldError('Ingresá un formato de correo electrónico válido.');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const message = await authService.forgotPassword(email.trim());
      setFeedbackMessage(message);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
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
      <div className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        {/* Cabecera con Logo y Selector de Tema */}
        <div className="auth-brand-top">
          <div className="auth-brand-logo-wrap">
            <ProTrainingLogo height={48} />
          </div>
          <ThemeToggle />
        </div>

        <div className="auth-header-block">
          <h1 className="auth-title">Recuperar contraseña</h1>
          <p className="auth-subtitle">
            Ingresá tu correo electrónico registrado y te enviaremos un enlace para restablecer tu
            clave.
          </p>
        </div>

        {errorMessage && (
          <div className="alert-box alert-danger" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--success-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'var(--success-text)',
              }}
            >
              <CheckCircle2 size={28} aria-hidden="true" />
            </div>
            <div
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.5,
                color: 'var(--text-main)',
                marginBottom: '1.5rem',
              }}
              role="status"
            >
              {feedbackMessage}
            </div>
            <button
              type="button"
              className="btn-pill-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group-pill" style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="recovery-email" className="form-label-visible">
                Correo electrónico
              </label>
              <div className={`input-pill-container ${fieldError ? 'error' : ''}`}>
                <span className="input-pill-icon" aria-hidden="true">
                  <Mail size={18} />
                </span>
                <input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError('');
                  }}
                  disabled={loading}
                  placeholder="ejemplo@protraining.app"
                  required
                  autoFocus
                  className="input-pill"
                  data-testid="recovery-email-input"
                />
              </div>
              {fieldError && (
                <span
                  className="form-field-error"
                  style={{ display: 'block', marginTop: '0.25rem' }}
                >
                  {fieldError}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pill-primary"
              data-testid="btn-send-recovery"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner-pill" aria-hidden="true" />
                  <span>Enviando enlace…</span>
                </>
              ) : (
                <span>Enviar enlace de recuperación</span>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                to="/login"
                className="auth-secondary-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                }}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Volver a iniciar sesión</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

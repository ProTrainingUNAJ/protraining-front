import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../api/authService';
import { extractErrorMessage } from '../api/axiosClient';
import { ThemeToggle } from '../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../components/brand/ProTrainingLogo';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const emailParam = searchParams.get('email') || '';
  const tokenParam = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Validaciones según la política unificada del equipo (#KAN-539 / #KAN-540)
  const hasMinLength = newPassword.length >= 8;
  const hasDigit = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Si los parámetros obligatorios de la URL faltan
  if (!emailParam || !tokenParam) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backgroundColor: 'var(--bg-main, #0f172a)',
        }}
      >
        <div
          className="auth-card"
          style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}
        >
          <div className="auth-brand-top">
            <div className="auth-brand-logo-wrap">
              <ProTrainingLogo height={48} />
            </div>
            <ThemeToggle />
          </div>

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '1.5rem auto 1rem',
              color: 'var(--danger-text, #ef4444)',
            }}
          >
            <AlertCircle size={28} aria-hidden="true" />
          </div>

          <h1 className="auth-title">Enlace no válido</h1>
          <p className="auth-subtitle" style={{ marginBottom: '1.5rem' }}>
            El enlace de recuperación es incompleto o no contiene los parámetros necesarios.
          </p>

          <Link
            to="/forgot-password"
            className="btn-pill-primary"
            style={{ display: 'inline-block', textDecoration: 'none', width: '100%' }}
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!hasMinLength || !hasDigit) {
      setErrorMessage('La nueva contraseña debe tener al menos 8 caracteres y al menos un número.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        email: emailParam,
        token: tokenParam,
        newPassword,
      });
      setSuccess(true);
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
        backgroundColor: 'var(--bg-main, #0f172a)',
      }}
    >
      <div className="auth-card" style={{ maxWidth: '440px', width: '100%' }}>
        <div className="auth-brand-top">
          <div className="auth-brand-logo-wrap">
            <ProTrainingLogo height={48} />
          </div>
          <ThemeToggle />
        </div>

        <div className="auth-header-block">
          <h1 className="auth-title">Crear nueva contraseña</h1>
          <p className="auth-subtitle">
            Definí tu nueva clave de acceso para <strong>{emailParam}</strong>.
          </p>
        </div>

        {errorMessage && (
          <div
            className="auth-error-banner"
            role="alert"
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger-text, #ef4444)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: '#16a34a',
              }}
            >
              <CheckCircle2 size={28} aria-hidden="true" />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              ¡Contraseña restablecida!
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                lineHeight: 1.5,
                color: 'var(--text-muted)',
                marginBottom: '1.5rem',
              }}
              role="status"
            >
              Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con tu nueva
              clave.
            </p>
            <button
              type="button"
              className="btn-pill-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Campo Nueva Contraseña */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="new-password" className="form-label">
                Nueva contraseña
              </label>
              <div className="input-pill-wrapper">
                <span className="input-pill-leading-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres y al menos un número"
                  disabled={loading}
                  required
                  className="input-pill"
                  data-testid="reset-new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="input-pill-trailing-btn"
                  aria-label={showNew ? 'Ocultar contraseña' : 'Ver contraseña'}
                  disabled={loading}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Campo Confirmar Nueva Contraseña */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="confirm-password" className="form-label">
                Repetir nueva contraseña
              </label>
              <div className="input-pill-wrapper">
                <span className="input-pill-leading-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí la nueva contraseña"
                  disabled={loading}
                  required
                  className="input-pill"
                  data-testid="reset-confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="input-pill-trailing-btn"
                  aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                  disabled={loading}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Checklist de requisitos de seguridad (#KAN-539 / #KAN-540) */}
            <div
              style={{
                marginTop: '0.5rem',
                marginBottom: '1.25rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                background: 'var(--bg-subtle, rgba(2, 132, 199, 0.05))',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <span
                style={{
                  color:
                    hasMinLength && hasDigit ? 'var(--success-text, #16a34a)' : 'var(--text-muted)',
                  fontWeight: hasMinLength && hasDigit ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Check
                  size={12}
                  style={{ opacity: hasMinLength && hasDigit ? 1 : 0.3 }}
                  aria-hidden="true"
                />
                Mínimo 8 caracteres y al menos un número
              </span>
              <span
                style={{
                  color: passwordsMatch ? 'var(--success-text, #16a34a)' : 'var(--text-muted)',
                  fontWeight: passwordsMatch ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Check size={12} style={{ opacity: passwordsMatch ? 1 : 0.3 }} aria-hidden="true" />
                Las contraseñas coinciden
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="btn-pill-primary"
              data-testid="btn-reset-password-submit"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner-pill" aria-hidden="true" />
                  <span>Restableciendo contraseña…</span>
                </>
              ) : (
                <span>Restablecer contraseña</span>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <Link
                to="/forgot-password"
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
                <span>Solicitar otro enlace</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

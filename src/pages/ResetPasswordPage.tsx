import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authService } from '../api/authService';
import { extractErrorMessage } from '../api/axiosClient';
import { ThemeToggle } from '../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../components/brand/ProTrainingLogo';
import '../styles/passwordRecovery.css';

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
      <div className="password-recovery-page">
        <div className="auth-card password-recovery-card password-recovery-card--centered">
          <div className="auth-brand-top">
            <div className="auth-brand-logo-wrap">
              <ProTrainingLogo height={48} />
            </div>
            <ThemeToggle />
          </div>

          <div className="password-recovery-status-icon password-recovery-status-icon--danger">
            <AlertCircle size={28} aria-hidden="true" />
          </div>

          <h1 className="auth-title">Enlace no válido</h1>
          <p className="auth-subtitle password-recovery-subtitle-spaced">
            El enlace de recuperación es incompleto o no contiene los parámetros necesarios.
          </p>

          <Link to="/forgot-password" className="btn-pill-primary password-recovery-full-link-btn">
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
    <div className="password-recovery-page">
      <div className="auth-card password-recovery-card">
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
          <div className="alert-box alert-danger" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {success ? (
          <div className="password-recovery-status-panel">
            <div className="password-recovery-status-icon password-recovery-status-icon--success">
              <CheckCircle2 size={28} aria-hidden="true" />
            </div>
            <h2 className="password-recovery-status-title">¡Contraseña restablecida!</h2>
            <p className="password-recovery-status-copy" role="status">
              Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con tu nueva
              clave.
            </p>
            <button
              type="button"
              className="btn-pill-primary password-recovery-full-btn"
              onClick={() => navigate('/login')}
            >
              Iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Campo Nueva Contraseña */}
            <div className="form-group-pill password-recovery-field">
              <label htmlFor="new-password" className="form-label-visible">
                Nueva contraseña
              </label>
              <div className="input-pill-container">
                <span className="input-pill-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
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
            <div className="form-group-pill password-recovery-field">
              <label htmlFor="confirm-password" className="form-label-visible">
                Repetir nueva contraseña
              </label>
              <div className="input-pill-container">
                <span className="input-pill-icon" aria-hidden="true">
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
            <div className="password-recovery-checklist">
              <span
                className={`password-recovery-checklist-item ${
                  hasMinLength && hasDigit ? 'is-valid' : ''
                }`}
              >
                <Check size={12} className="password-recovery-checklist-icon" aria-hidden="true" />
                Mínimo 8 caracteres y al menos un número
              </span>
              <span
                className={`password-recovery-checklist-item ${passwordsMatch ? 'is-valid' : ''}`}
              >
                <Check size={12} className="password-recovery-checklist-icon" aria-hidden="true" />
                Las contraseñas coinciden
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="btn-pill-primary password-recovery-submit-btn"
              data-testid="btn-reset-password-submit"
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

            <div className="password-recovery-footer">
              <Link
                to="/forgot-password"
                className="auth-secondary-btn password-recovery-back-link"
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

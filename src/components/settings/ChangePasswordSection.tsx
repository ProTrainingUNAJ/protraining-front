import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Check, AlertCircle, KeyRound } from 'lucide-react';
import { authService } from '../../api/authService';
import { useAuth } from '../../context/AuthContext';

export const ChangePasswordSection: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validaciones de reglas mínimas para la nueva contraseña
  const hasMinLength = newPassword.length >= 8;
  const hasDigit = /\d/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setError('Debes ingresar tu contraseña actual.');
      return;
    }

    if (!newPassword) {
      setError('Debes ingresar una nueva contraseña.');
      return;
    }

    if (!hasMinLength || !hasDigit) {
      setError('La nueva contraseña debe tener al menos 8 caracteres y al menos un número.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('La nueva contraseña no puede ser igual a la anterior.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las nuevas contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword({
        currentPassword,
        newPassword,
      });

      // Limpiar campos inmediatamente tras el cambio exitoso
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setSuccessMessage(
        'Contraseña actualizada correctamente. Cerrando sesión para ingresar con tu nueva clave...',
      );

      // Cierre de sesión y redirección ordenada al login
      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        margin: 0,
        padding: '1.5rem',
        marginTop: '1.5rem',
        borderTop: '2px solid var(--border)',
      }}
      data-testid="change-password-section"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '0.35rem',
        }}
      >
        <KeyRound size={20} style={{ color: 'var(--secondary)' }} aria-hidden="true" />
        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            margin: 0,
          }}
        >
          Cambiar Contraseña
        </h2>
      </div>

      <p
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
          marginBottom: '1.5rem',
        }}
      >
        Actualiza tu contraseña para mantener tu cuenta segura. Al cambiarla, se cerrarán las demás
        sesiones activas.
      </p>

      {/* Banner de Éxito */}
      {successMessage && (
        <div
          className="alert-banner success"
          role="alert"
          style={{ marginBottom: '1.25rem' }}
          data-testid="change-password-success"
        >
          <Check size={18} aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Banner de Error */}
      {error && (
        <div
          className="alert-banner"
          role="alert"
          style={{
            marginBottom: '1.25rem',
            background: 'var(--danger-bg-strong)',
            color: 'var(--danger-text)',
            border: '1px solid var(--danger)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
          data-testid="change-password-error"
        >
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxWidth: '480px',
          }}
        >
          {/* Contraseña Actual */}
          <div>
            <label
              htmlFor="current-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
                color: 'var(--text-main)',
              }}
            >
              Contraseña Actual
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                required
                placeholder="Ingresa tu contraseña actual"
                style={{
                  width: '100%',
                  paddingRight: '2.5rem',
                  borderRadius: '8px',
                }}
                data-testid="current-password-input"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label
              htmlFor="new-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
                color: 'var(--text-main)',
              }}
            >
              Nueva Contraseña
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                required
                placeholder="Ingresa tu nueva contraseña"
                style={{
                  width: '100%',
                  paddingRight: '2.5rem',
                  borderRadius: '8px',
                }}
                data-testid="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Checklist de requisitos de seguridad */}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                background: 'var(--bg-subtle)',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <span
                style={{
                  color: hasMinLength && hasDigit ? 'var(--success-text)' : 'var(--text-muted)',
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
            </div>
          </div>

          {/* Repetir Nueva Contraseña */}
          <div>
            <label
              htmlFor="confirm-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
                color: 'var(--text-main)',
              }}
            >
              Repetir Nueva Contraseña
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                required
                placeholder="Repite la nueva contraseña"
                style={{
                  width: '100%',
                  paddingRight: '2.5rem',
                  borderRadius: '8px',
                }}
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={
                  showConfirm
                    ? 'Ocultar confirmación de contraseña'
                    : 'Mostrar confirmación de contraseña'
                }
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <span
                style={{
                  display: 'block',
                  color: 'var(--danger-text)',
                  fontSize: '0.78rem',
                  marginTop: '0.35rem',
                }}
                role="alert"
              >
                Las contraseñas no coinciden.
              </span>
            )}
          </div>

          {/* Botón de Enviar */}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              style={{
                borderRadius: '8px',
                padding: '0.6rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
              data-testid="change-password-submit-btn"
            >
              <Lock size={16} aria-hidden="true" />
              <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

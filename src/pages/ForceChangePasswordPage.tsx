import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Check, AlertCircle, KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../api/authService';

export const ForceChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isHydrating, logout, clearMustChangePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario no tiene pendiente un cambio obligatorio, lo enviamos a su área correspondiente
  if (!user.mustChangePassword) {
    return <Navigate to={user.role === 'PreparadorFisico' ? '/pf' : '/athlete'} replace />;
  }

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!currentPassword) {
      setError('Debés ingresar la contraseña temporal provista.');
      return;
    }

    if (!newPassword) {
      setError('Debés ingresar una nueva contraseña.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasSpecialChar) {
      setError(
        'La nueva contraseña debe tener al menos 8 caracteres, una letra mayúscula y un carácter especial.',
      );
      return;
    }

    if (newPassword === currentPassword) {
      setError('La nueva contraseña no puede ser igual a la contraseña temporal.');
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

      // Actualizar estado local de la sesión eliminando el bloqueo
      clearMustChangePassword?.();
      setSuccessMessage('¡Contraseña actualizada exitosamente! Ingresando a tu cuenta...');

      setTimeout(() => {
        navigate(user.role === 'PreparadorFisico' ? '/pf' : '/athlete', { replace: true });
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar la contraseña.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '2rem',
          borderRadius: '0.75rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <KeyRound size={26} color="var(--primary, #0284c7)" aria-hidden="true" />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
            Cambio de contraseña obligatorio
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted, #64748b)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Tu Preparador Físico restableció tu contraseña. Por seguridad, tenés que definir una
            nueva clave antes de continuar.
          </p>
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
              marginBottom: '1.25rem',
              color: '#dc2626',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(22, 163, 74, 0.1)',
              border: '1px solid rgba(22, 163, 74, 0.3)',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginBottom: '1.25rem',
              color: '#16a34a',
              fontSize: '0.875rem',
            }}
          >
            <Check size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Contraseña temporal */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="current-password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.35rem',
              }}
            >
              Contraseña temporal provista
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresá la contraseña que te dio tu PF"
                required
                disabled={loading}
                className="input-field"
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? 'Ocultar contraseña' : 'Ver contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, #64748b)',
                  display: 'flex',
                }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="new-password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.35rem',
              }}
            >
              Nueva contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Al menos 8 caracteres, 1 mayúscula y 1 símbolo"
                required
                disabled={loading}
                className="input-field"
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Ocultar contraseña' : 'Ver contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, #64748b)',
                  display: 'flex',
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar nueva contraseña */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="confirm-password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.35rem',
              }}
            >
              Repetir nueva contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí la nueva contraseña"
                required
                disabled={loading}
                className="input-field"
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, #64748b)',
                  display: 'flex',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Checklist de requerimientos */}
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'rgba(2, 132, 199, 0.05)',
              borderRadius: '0.375rem',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Requisitos de la contraseña:
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: hasMinLength ? '#16a34a' : 'var(--text-muted)',
              }}
            >
              <Check size={14} />
              <span>Mínimo 8 caracteres</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: hasUppercase ? '#16a34a' : 'var(--text-muted)',
              }}
            >
              <Check size={14} />
              <span>Al menos una letra mayúscula</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: hasSpecialChar ? '#16a34a' : 'var(--text-muted)',
              }}
            >
              <Check size={14} />
              <span>Al menos un carácter especial (!@#$%...)</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: passwordsMatch ? '#16a34a' : 'var(--text-muted)',
              }}
            >
              <Check size={14} />
              <span>Las contraseñas coinciden</span>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
            }}
          >
            <Lock size={18} aria-hidden="true" />
            <span>{loading ? 'Guardando...' : 'Establecer nueva contraseña'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'underline',
            }}
          >
            <LogOut size={14} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
};

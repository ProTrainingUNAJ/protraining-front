import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { extractErrorMessage } from '../../api/axiosClient';
import { ThemeToggle } from './ThemeToggle';
import { ProTrainingLogo } from '../brand/ProTrainingLogo';

const GoogleIcon: React.FC = () => (
  <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="var(--color-google-blue)"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="var(--color-google-green)"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="var(--color-google-yellow)"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="var(--color-google-red)"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  // Bandera para Google Login (KAN-551). Apagada por defecto; se activa con VITE_GOOGLE_LOGIN_ENABLED=true
  const isGoogleLoginEnabled = import.meta.env.VITE_GOOGLE_LOGIN_ENABLED === 'true';
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const searchParams = new URLSearchParams(location.search);
  const passedEmail =
    (location.state as { email?: string } | null)?.email || searchParams.get('email') || '';

  const [email, setEmail] = useState(passedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const redirectSuccessMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null;

  // Validaciones del lado del cliente
  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Ingresá un formato de correo electrónico válido.';
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    setResendLoading(true);
    setResendSuccess(null);
    try {
      await authService.resendConfirmation(unconfirmedEmail);
      setResendSuccess(`Te enviamos un nuevo mail a ${unconfirmedEmail}. Confirmalo para entrar.`);
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setUnconfirmedEmail(null);
    setResendSuccess(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const session = await login({ email: email.trim(), password });
      if (session.user.mustChangePassword) {
        navigate('/force-change-password', { replace: true });
        return;
      }
      navigate(session.user.role === 'PreparadorFisico' ? '/pf' : '/athlete');
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      const is403 =
        (typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          (err as { status?: number }).status === 403) ||
        (typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 403) ||
        msg.toLowerCase().includes('confirmá tu email') ||
        msg.toLowerCase().includes('confirma tu email');

      if (is403) {
        setUnconfirmedEmail(email.trim());
        setErrorMessage('Confirmá tu email para entrar');
      } else {
        setUnconfirmedEmail(null);
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isGoogleLoginEnabled || !googleClientId) return;

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, [isGoogleLoginEnabled, googleClientId]);

  const handleGoogleClick = async () => {
    setErrorMessage('');
    if (!isGoogleLoginEnabled) return;

    if (!googleClientId) {
      setErrorMessage('La integración con Google no cuenta con Client ID configurado.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as unknown as { google?: any }).google;
    if (!google?.accounts?.id) {
      setErrorMessage(
        'El servicio de autenticación de Google no está disponible en este momento. Intentá nuevamente.',
      );
      return;
    }

    setLoading(true);

    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential?: string }) => {
          if (!response?.credential) {
            setLoading(false);
            setErrorMessage('No se recibió la credencial de autenticación de Google.');
            return;
          }

          try {
            const session = await (loginWithGoogle
              ? loginWithGoogle(response.credential)
              : authService.loginWithGoogle(response.credential));
            if (session.user.mustChangePassword) {
              navigate('/force-change-password', { replace: true });
              return;
            }
            navigate(session.user.role === 'PreparadorFisico' ? '/pf' : '/athlete');
          } catch (err: unknown) {
            const msg = extractErrorMessage(err);
            setErrorMessage(msg);
          } finally {
            setLoading(false);
          }
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          setLoading(false);
        }
      });
    } catch (err: unknown) {
      setLoading(false);
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
    }
  };
  const handleForgotPasswordClick = () => {
    navigate('/forgot-password');
  };

  const handleRegisterClick = () => {
    navigate('/registro');
  };

  return (
    <div className="auth-card">
      {/* 1. Cabecera: Logo Oficial de ProTraining + Selector de Tema */}
      <div className="auth-brand-top">
        <div className="auth-brand-logo-wrap">
          <ProTrainingLogo height={56} />
        </div>
        <ThemeToggle />
      </div>

      {/* 2 & 3. Título de bienvenida unificado */}
      <div className="auth-header-block">
        <h1 className="auth-title">
          <span className="font-extrabold auth-title-greeting">Bienvenido a</span>
          <span className="font-black auth-title-brand">PROTRAINING</span>
        </h1>
        <p className="font-medium auth-subtitle">
          Planificá entrenamientos, gestioná tu progreso y alcanzá el máximo rendimiento deportivo.
        </p>
      </div>

      {/* Alerta de Error de Servidor / Credenciales */}
      {errorMessage && (
        <div className="alert-box alert-danger" role="alert" aria-live="assertive">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
            <div>{errorMessage}</div>
            {unconfirmedEmail && (
              <div style={{ marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                  className="auth-resend-inline-btn"
                  id="btn-resend-login-alert"
                >
                  <RefreshCw size={13} className={resendLoading ? 'animate-spin' : ''} />
                  <span>{resendLoading ? 'Enviando...' : 'Reenviar mail'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerta de Éxito al reenviar confirmación */}
      {resendSuccess && (
        <div className="alert-box alert-success" role="status">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{resendSuccess}</div>
        </div>
      )}

      {/* Alerta de Éxito redirigido (ej: contraseña cambiada) */}
      {redirectSuccessMessage && !errorMessage && !resendSuccess && (
        <div className="alert-box alert-success" role="status">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>{redirectSuccessMessage}</div>
        </div>
      )}

      {/* Formulario Principal de Autenticación */}
      <form onSubmit={handleSubmit} noValidate className="auth-form-body">
        {/* Campo de Correo Electrónico */}
        <div className="form-group-pill">
          <label htmlFor="login-email" className="sr-only">
            Correo electrónico
          </label>
          <div className={`input-pill-container ${fieldErrors.email ? 'error' : ''}`}>
            <span className="input-pill-icon" aria-hidden="true">
              <Mail size={19} />
            </span>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="Correo electrónico"
              className="input-pill"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
          </div>
          {fieldErrors.email && (
            <span id="email-error" className="form-field-error">
              {fieldErrors.email}
            </span>
          )}
        </div>

        {/* Campo de Contraseña */}
        <div className="form-group-pill">
          <label htmlFor="login-password" className="sr-only">
            Contraseña
          </label>
          <div className={`input-pill-container ${fieldErrors.password ? 'error' : ''}`}>
            <span className="input-pill-icon" aria-hidden="true">
              <Lock size={19} />
            </span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="Contraseña"
              className="input-pill has-trailing"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="input-pill-trailing-btn"
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && (
            <span id="password-error" className="form-field-error">
              {fieldErrors.password}
            </span>
          )}
        </div>

        {/* Botón Principal: Iniciar Sesión */}
        <button type="submit" disabled={loading} className="btn-pill-primary" id="btn-login-submit">
          {loading ? (
            <>
              <span className="spinner-pill" aria-hidden="true" />
              <span>Iniciando sesión…</span>
            </>
          ) : (
            <span>Iniciar sesión</span>
          )}
        </button>

        {/* Opción de Iniciar Sesión con Google (oculta por defecto mediante bandera KAN-551) */}
        {isGoogleLoginEnabled && (
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className="btn-pill-google"
            id="btn-login-google"
          >
            <GoogleIcon />
            <span>Iniciar sesión con Google</span>
          </button>
        )}

        {/* Accesos Secundarios: Recuperación de contraseña y Registro (KAN-602) */}
        <div className="auth-secondary-actions">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="auth-secondary-btn"
            id="btn-forgot-password"
          >
            Olvidé mi contraseña
          </button>

          <span className="auth-secondary-divider" aria-hidden="true">
            •
          </span>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.82rem',
              color: 'var(--color-text-muted)',
            }}
          >
            <span>¿No tenés cuenta?</span>
            <button
              type="button"
              onClick={handleRegisterClick}
              className="auth-secondary-btn"
              id="btn-register-link"
              style={{ fontWeight: 700, color: 'var(--color-primary)' }}
            >
              Registrate
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

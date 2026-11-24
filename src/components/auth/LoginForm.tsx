import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../api/authService';
import { extractErrorMessage } from '../../api/axiosClient';
import {
  getGoogleClientId,
  isGoogleAuthConfigured,
  loadGoogleIdentityApi,
} from '../../utils/googleIdentity';
import { ThemeToggle } from './ThemeToggle';
import { ProTrainingLogo } from '../brand/ProTrainingLogo';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  // Bandera para Google Login (KAN-551 / KAN-541): solo visible si está habilitado y tiene Client ID
  const isGoogleLoginEnabled = isGoogleAuthConfigured();
  const googleClientId = getGoogleClientId();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const loginWithGoogleRef = useRef(loginWithGoogle);
  useEffect(() => {
    loginWithGoogleRef.current = loginWithGoogle;
  }, [loginWithGoogle]);

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
    if (!isGoogleLoginEnabled || !googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    const container = googleButtonRef.current;

    loadGoogleIdentityApi()
      .then((googleId) => {
        if (cancelled || !container) return;
        container.innerHTML = '';

        googleId.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) {
              setLoading(false);
              setErrorMessage('No se recibió la credencial de autenticación de Google.');
              return;
            }

            setErrorMessage('');
            setUnconfirmedEmail(null);
            setResendSuccess(null);
            setLoading(true);

            try {
              const handler = loginWithGoogleRef.current;
              const session = await (handler
                ? handler(response.credential)
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

        const buttonWidth = container.clientWidth > 0 ? Math.min(400, container.clientWidth) : 378;

        googleId.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: buttonWidth,
          locale: 'es',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage(
            'El servicio de autenticación de Google no está disponible en este momento. Intentá nuevamente.',
          );
        }
      });

    return () => {
      cancelled = true;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [isGoogleLoginEnabled, googleClientId, navigate]);
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

        {/* Opción oficial de Iniciar Sesión con Google (oculta si falta bandera o Client ID - KAN-551 / KAN-541) */}
        {isGoogleLoginEnabled && (
          <div
            ref={googleButtonRef}
            data-testid="google-signin-button-container"
            aria-label="Continuar con Google"
            className="auth-google-btn-container"
          />
        )}

        {/* Accesos Secundarios: Recuperación de contraseña y Registro (KAN-660) */}
        <div className="auth-secondary-actions">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="auth-secondary-btn"
            id="btn-forgot-password"
          >
            Olvidé mi contraseña
          </button>

          <button
            type="button"
            onClick={handleRegisterClick}
            className="auth-secondary-btn"
            id="btn-register-link"
          >
            Registrate
          </button>
        </div>
      </form>
    </div>
  );
};

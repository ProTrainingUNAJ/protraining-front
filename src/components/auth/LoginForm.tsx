import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../api/axiosClient';
import { ThemeToggle } from './ThemeToggle';
import { ProTrainingLogo } from '../brand/ProTrainingLogo';

const GoogleIcon: React.FC = () => (
  <svg className="google-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Modal informativo para funcionalidades sin soporte de backend
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: '',
    content: '',
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const session = await login({ email: email.trim(), password });
      const isPF =
        session.user.role.toLowerCase().includes('pf') ||
        session.user.role.toLowerCase().includes('preparador');
      navigate(isPF ? '/pf' : '/athlete');
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    setInfoModal({
      isOpen: true,
      title: 'Iniciar sesión con Google',
      content:
        'La autenticación con Google Workspace no se encuentra disponible. Por favor, accedé con tu correo y contraseña registrados.',
    });
  };
  const handleForgotPasswordClick = () => {
    setInfoModal({
      isOpen: true,
      title: 'Recuperación de Contraseña',
      content:
        'El restablecimiento de contraseña no se encuentra habilitado actualmente. Para recuperar tu acceso de forma segura, comunicate con el soporte de ProTraining.',
    });
  };

  const handleRegisterClick = () => {
    setInfoModal({
      isOpen: true,
      title: 'Registro de Cuentas',
      content:
        'El registro público directo no está disponible. Las cuentas de Preparadores Físicos y Alumnos son gestionadas y dadas de alta institucionalmente por la dirección deportiva de tu club o entidad.',
    });
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
          <div>{errorMessage}</div>
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
              placeholder="Enter email"
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
              placeholder="Password"
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

        {/* Opción de Iniciar Sesión con Google abajo de Iniciar sesión */}
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

        {/* Accesos Secundarios: ¿Olvidaste tu contraseña? y Registrarse */}
        <div className="auth-secondary-actions">
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            disabled={loading}
            className="auth-secondary-btn"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <span className="auth-secondary-divider" aria-hidden="true">
            •
          </span>

          <button
            type="button"
            onClick={handleRegisterClick}
            disabled={loading}
            className="auth-secondary-btn"
          >
            Registrarse
          </button>
        </div>
      </form>

      {/* Modal Informativo para Funcionalidades Administrativas / Sin Endpoint */}
      {infoModal.isOpen && (
        <div
          className="auth-info-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-info-title"
        >
          <div className="auth-info-modal-card">
            <div className="auth-info-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Info size={20} color="var(--color-primary)" />
                <h2 id="modal-info-title" className="font-extrabold auth-info-modal-title">
                  {infoModal.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInfoModal({ isOpen: false, title: '', content: '' })}
                className="auth-info-modal-close"
                aria-label="Cerrar ventana informativa"
              >
                <X size={18} />
              </button>
            </div>
            <p className="font-medium auth-info-modal-body">{infoModal.content}</p>
            <div className="auth-info-modal-footer">
              <button
                type="button"
                onClick={() => setInfoModal({ isOpen: false, title: '', content: '' })}
                className="btn-pill-primary auth-info-modal-btn"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  MailCheck,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { authService } from '../../api/authService';
import { extractErrorMessage } from '../../api/axiosClient';
import { ThemeToggle } from '../../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../../components/brand/ProTrainingLogo';

export const RegisterPfPage: React.FC = () => {
  const navigate = useNavigate();

  // Campos de formulario
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Toggles de contraseña
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados de proceso
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<{ message: string; is409?: boolean } | null>(null);

  // Estado tras registro exitoso
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    const cleanName = fullName.trim();
    if (!cleanName) {
      errors.fullName = 'El nombre y apellido es obligatorio.';
    } else if (cleanName.length < 2) {
      errors.fullName = 'Ingresá un nombre y apellido válido.';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Ingresá un formato de correo electrónico válido.';
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres.';
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      errors.password = 'Debe incluir al menos una mayúscula, una minúscula y un número.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Debés repetir la contraseña.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      await authService.registerPf({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() ? phone.trim() : null,
      });

      setRegisteredEmail(email.trim());
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      const is409 =
        (typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          (err as { status?: number }).status === 409) ||
        (typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 409) ||
        msg.toLowerCase().includes('ya existe') ||
        msg.toLowerCase().includes('registrada');

      const is429 =
        (typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          (err as { status?: number }).status === 429) ||
        (typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response?: { status?: number } }).response?.status === 429);

      if (is409) {
        setServerError({
          message: 'El correo ya se encuentra registrado.',
          is409: true,
        });
      } else if (is429) {
        setServerError({
          message: 'Probá de nuevo en unos minutos.',
        });
      } else {
        setServerError({
          message: msg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setResendFeedback(null);
    try {
      await authService.resendConfirmation(registeredEmail);
      setResendFeedback('Te reenviamos el mail de confirmación. Revisá tu casilla.');
    } catch (err: unknown) {
      setResendFeedback(extractErrorMessage(err));
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
      <div className="auth-card" style={{ maxWidth: '480px', width: '100%' }}>
        {/* Cabecera con Logo y Selector de Tema */}
        <div className="auth-brand-top">
          <div className="auth-brand-logo-wrap">
            <ProTrainingLogo height={48} />
          </div>
          <ThemeToggle />
        </div>

        {registeredEmail ? (
          /* Pantalla de confirmación pendiente */
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
              <MailCheck size={32} />
            </div>

            <h1
              className="auth-title"
              style={{ fontSize: '1.45rem', marginBottom: '0.6rem', color: 'var(--text-main)' }}
            >
              Revisá tu correo
            </h1>

            <p
              style={{
                fontSize: '0.96rem',
                lineHeight: 1.5,
                color: 'var(--text-main)',
                marginBottom: '1.5rem',
              }}
            >
              Te mandamos un mail a <strong>{registeredEmail}</strong>. Confirmalo para entrar.
            </p>

            {resendFeedback && (
              <div
                className="alert-box alert-success"
                style={{ width: '100%', marginBottom: '1.25rem' }}
                role="status"
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{resendFeedback}</span>
              </div>
            )}

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}
            >
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="btn-pill-primary"
                id="btn-resend-confirmation"
              >
                {resending ? 'Enviando…' : 'Reenviar mail'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-pill-secondary"
                id="btn-go-login"
                style={{
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-main)',
                }}
              >
                Ir a iniciar sesión
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Registro */
          <>
            <div className="auth-header-block" style={{ marginBottom: '1.5rem' }}>
              <h1 className="auth-title" style={{ fontSize: '1.45rem', marginBottom: '0.35rem' }}>
                Registro de Preparador Físico
              </h1>
              <p className="auth-subtitle" style={{ fontSize: '0.88rem' }}>
                Creá tu cuenta para gestionar tus planteles y atletas.
              </p>
            </div>

            {/* Alerta de Error de Servidor */}
            {serverError && (
              <div className="alert-box alert-danger" role="alert" aria-live="assertive">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}
                >
                  <div>{serverError.message}</div>
                  {serverError.is409 && (
                    <div>
                      <Link
                        to="/login"
                        style={{
                          color: 'var(--danger-text)',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          fontSize: '0.84rem',
                        }}
                      >
                        Iniciar sesión
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="auth-form-body">
              {/* Nombre y Apellido */}
              <div className="form-group-pill">
                <label htmlFor="reg-fullname" className="sr-only">
                  Nombre y Apellido
                </label>
                <div className={`input-pill-container ${fieldErrors.fullName ? 'error' : ''}`}>
                  <span className="input-pill-icon" aria-hidden="true">
                    <User size={19} />
                  </span>
                  <input
                    id="reg-fullname"
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    required
                    disabled={loading}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName)
                        setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="Nombre y apellido"
                    className="input-pill"
                    aria-invalid={!!fieldErrors.fullName}
                    aria-describedby={fieldErrors.fullName ? 'fullname-error' : undefined}
                  />
                </div>
                {fieldErrors.fullName && (
                  <span id="fullname-error" className="form-field-error">
                    {fieldErrors.fullName}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="form-group-pill">
                <label htmlFor="reg-email" className="sr-only">
                  Correo electrónico
                </label>
                <div className={`input-pill-container ${fieldErrors.email ? 'error' : ''}`}>
                  <span className="input-pill-icon" aria-hidden="true">
                    <Mail size={19} />
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
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

              {/* Contraseña */}
              <div className="form-group-pill">
                <label htmlFor="reg-password" className="sr-only">
                  Contraseña
                </label>
                <div className={`input-pill-container ${fieldErrors.password ? 'error' : ''}`}>
                  <span className="input-pill-icon" aria-hidden="true">
                    <Lock size={19} />
                  </span>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="Contraseña (mínimo 8 caracteres)"
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

              {/* Repetir Contraseña */}
              <div className="form-group-pill">
                <label htmlFor="reg-confirm-password" className="sr-only">
                  Repetir contraseña
                </label>
                <div
                  className={`input-pill-container ${fieldErrors.confirmPassword ? 'error' : ''}`}
                >
                  <span className="input-pill-icon" aria-hidden="true">
                    <Lock size={19} />
                  </span>
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword)
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }}
                    placeholder="Repetir contraseña"
                    className="input-pill has-trailing"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={
                      fieldErrors.confirmPassword ? 'confirm-password-error' : undefined
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="input-pill-trailing-btn"
                    title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <span id="confirm-password-error" className="form-field-error">
                    {fieldErrors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Teléfono (opcional) */}
              <div className="form-group-pill">
                <label htmlFor="reg-phone" className="sr-only">
                  Teléfono (opcional)
                </label>
                <div className="input-pill-container">
                  <span className="input-pill-icon" aria-hidden="true">
                    <Phone size={19} />
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    disabled={loading}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Teléfono WhatsApp (opcional)"
                    className="input-pill"
                  />
                </div>
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-pill-primary"
                id="btn-register-pf-submit"
                style={{ marginTop: '0.5rem' }}
              >
                {loading ? (
                  <>
                    <span className="spinner-pill" aria-hidden="true" />
                    <span>Creando cuenta…</span>
                  </>
                ) : (
                  <span>Crear mi cuenta</span>
                )}
              </button>

              {/* Acceso secundario para volver */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.75rem',
                  fontSize: '0.86rem',
                }}
              >
                <Link
                  to="/registro"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <ArrowLeft size={15} />
                  <span>Volver</span>
                </Link>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>¿Ya tenés cuenta? </span>
                  <Link
                    to="/login"
                    style={{
                      color: 'var(--secondary)',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Iniciar sesión
                  </Link>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

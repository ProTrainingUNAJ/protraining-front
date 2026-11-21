import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Dumbbell,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  categoryInvitationsService,
  getHttpErrorStatus,
  PENDING_INVITATION_TOKEN_KEY,
} from '../../api/categoryInvitations';
import { structureService } from '../../api/structureService';
import { authService } from '../../api/authService';
import { CategoryInvitation } from '../../types/structure';
import { AuthSession } from '../../types/auth';
import { isMinorInArgentina } from '../../utils/argentinaDate';
import { extractErrorMessage } from '../../api/axiosClient';
import './InvitationLandingPage.css';

export type FormErrorType = 'conflict' | 'forbidden' | 'expired' | 'validation' | 'general';

export const InvitationLandingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { applySession, isAuthenticated, user } = useAuth();

  // Initial invitation token validation state
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [invitation, setInvitation] = useState<CategoryInvitation | null>(null);
  const [tokenError, setTokenError] = useState<{
    type: 'expired' | 'invalid' | 'general';
    message: string;
  } | null>(null);

  // Athlete personal fields
  const [firstName, setFirstName] = useState(() => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      return parts.length > 1 ? parts.slice(0, -1).join(' ') : user.fullName;
    }
    return '';
  });
  const [lastName, setLastName] = useState(() => {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : '';
    }
    return '';
  });
  const [email, setEmail] = useState(() => user?.email || '');
  const [prevUser, setPrevUser] = useState(user);

  if (user && user !== prevUser) {
    setPrevUser(user);
    if (!email && user.email) setEmail(user.email);
    if (!firstName && !lastName && user.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        setFirstName(parts.slice(0, -1).join(' '));
        setLastName(parts[parts.length - 1]);
      } else {
        setFirstName(user.fullName);
      }
    }
  }

  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Guardian fields (if minor)
  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [allowsPhysicalTraining, setAllowsPhysicalTraining] = useState(false);
  const [allowsHabitsRecommendations, setAllowsHabitsRecommendations] = useState(false);
  const [allowsProfilePhoto, setAllowsProfilePhoto] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<FormErrorType | null>(null);
  const [createdSession, setCreatedSession] = useState<AuthSession | null>(null);
  const [hasAthleteProfile, setHasAthleteProfile] = useState<boolean | null>(null);
  const profileCheckedRef = useRef(false);

  const isMinor = isMinorInArgentina(birthDate);
  const isAccountCreated = Boolean(
    createdSession || (isAuthenticated && user?.role === 'Atleta' && hasAthleteProfile === false),
  );

  // Validates invitation token on mount
  const validateToken = useCallback(async (tokenToValidate?: string) => {
    if (!tokenToValidate) {
      setTokenError({
        type: 'invalid',
        message: 'No se proporcionó un código de invitación.',
      });
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    setTokenError(null);

    try {
      const data = await categoryInvitationsService.validate(tokenToValidate);
      setInvitation(data);
    } catch (err: unknown) {
      const status = getHttpErrorStatus(err);
      if (status === 410) {
        setTokenError({
          type: 'expired',
          message: 'La invitación venció. Pedile a tu preparador físico que genere una nueva.',
        });
      } else if (status === 404) {
        setTokenError({
          type: 'invalid',
          message: 'La invitación no es válida. Verificá el enlace o pedile uno nuevo a tu PF.',
        });
      } else {
        setTokenError({
          type: 'general',
          message: extractErrorMessage(err) || 'Error al validar la invitación.',
        });
      }
    } finally {
      setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void validateToken(token);
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [token, validateToken]);

  useEffect(() => {
    if (token) {
      try {
        localStorage.setItem(PENDING_INVITATION_TOKEN_KEY, token);
      } catch {
        // ignore storage errors
      }
    }
  }, [token]);

  // Si ya está autenticado como atleta, verificar si ya tiene perfil en Estructura (KAN-573)
  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || user?.role !== 'Atleta' || createdSession || isSubmitting) {
      return;
    }

    if (profileCheckedRef.current) {
      return;
    }
    profileCheckedRef.current = true;

    structureService
      .getMyConsent()
      .then(() => {
        if (isMounted) {
          setHasAthleteProfile(true);
          try {
            localStorage.removeItem(PENDING_INVITATION_TOKEN_KEY);
          } catch {
            // ignore
          }
          navigate('/athlete', { replace: true });
        }
      })
      .catch(() => {
        if (isMounted) {
          // El atleta tiene cuenta pero no perfil de atleta en Estructura (KAN-573)
          setHasAthleteProfile(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, createdSession, isSubmitting, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setErrorType(null);

    if (!token) {
      setFormError('Código de invitación no válido.');
      setErrorType('validation');
      return;
    }

    // Basic personal data validation
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Por favor, ingresá tu nombre y apellido.');
      setErrorType('validation');
      return;
    }
    if (!email.trim()) {
      setFormError('El correo electrónico es obligatorio.');
      setErrorType('validation');
      return;
    }

    // Regla de contraseña unificada (KAN-539): al menos 8 caracteres y al menos un número (solo si la cuenta no fue creada aún)
    if (!isAccountCreated) {
      const hasNumber = /\d/.test(password);
      if (!password || password.length < 8 || !hasNumber) {
        setFormError(
          'La contraseña debe tener al menos 8 caracteres y contener al menos un número.',
        );
        setErrorType('validation');
        return;
      }
    }

    if (!phone.trim()) {
      setFormError('El número de teléfono es obligatorio.');
      setErrorType('validation');
      return;
    }
    if (!birthDate) {
      setFormError('La fecha de nacimiento es obligatoria.');
      setErrorType('validation');
      return;
    }

    // Guardian legal consent validation if athlete is a minor
    if (isMinor) {
      if (!guardianName.trim()) {
        setFormError('El nombre de tu madre, padre o tutor es obligatorio.');
        setErrorType('validation');
        return;
      }
      if (!guardianEmail.trim() && !guardianPhone.trim()) {
        setFormError('Cargá al menos un medio de contacto del tutor (correo o teléfono).');
        setErrorType('validation');
        return;
      }
      if (!allowsPhysicalTraining) {
        setFormError(
          'El tutor legal debe autorizar obligatoriamente la preparación física para continuar.',
        );
        setErrorType('validation');
        return;
      }
    }

    setIsSubmitting(true);
    let derivedErrorType: FormErrorType = 'general';

    try {
      let activeSession = createdSession;

      // 1. Account registration in Identidad service (solo si no se registró previamente ni la cuenta ya existía)
      if (!activeSession && !isAccountCreated) {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        try {
          activeSession = await authService.registerByInvitation({
            email: email.trim(),
            password,
            fullName,
            token,
          });
          setCreatedSession(activeSession);
        } catch (authErr: unknown) {
          const status = getHttpErrorStatus(authErr);
          if (status === 403) {
            derivedErrorType = 'forbidden';
            throw new Error('Este correo corresponde a un preparador físico.', { cause: authErr });
          }
          if (status === 409) {
            derivedErrorType = 'conflict';
            throw new Error('Ya tenés cuenta, iniciá sesión.', { cause: authErr });
          }
          if (status === 410) {
            derivedErrorType = 'expired';
            throw new Error('La invitación ha expirado.', { cause: authErr });
          }
          derivedErrorType = 'general';
          throw authErr;
        }
      }

      // 2. Invitation acceptance and athlete enrollment in Estructura (KAN-429 / KAN-573)
      const acceptPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        birthDate,
        ...(isMinor
          ? {
              guardianName: guardianName.trim(),
              guardianEmail: guardianEmail.trim() || undefined,
              guardianPhone: guardianPhone.trim() || undefined,
              allowsPhysicalTraining,
              allowsHabitsRecommendations,
              allowsProfilePhoto,
            }
          : {}),
      };

      await categoryInvitationsService.accept(token, acceptPayload);

      try {
        localStorage.removeItem(PENDING_INVITATION_TOKEN_KEY);
      } catch {
        // ignore
      }

      // 3. Activar sesión en AuthContext tras aceptar invitación exitosamente
      if (activeSession) {
        applySession(activeSession);
      }

      // 4. Navigate to athlete dashboard
      navigate('/athlete', { replace: true });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      setFormError(msg);
      setErrorType(derivedErrorType);
      setIsSubmitting(false);
    }
  };

  // Estado cargando
  if (isValidating) {
    return (
      <main className="invitation-page">
        <div className="invitation-container invitation-state-card" aria-busy="true">
          <div className="invitation-state-icon invitation-state-icon--loading">
            <Loader2 size={36} />
          </div>
          <h2 className="invitation-title">Verificando invitación...</h2>
          <p className="invitation-subtitle">Estamos preparando tu acceso a ProTraining</p>
        </div>
      </main>
    );
  }

  // Estado error de token (inválido / vencido)
  if (tokenError) {
    return (
      <main className="invitation-page">
        <div className="invitation-container invitation-state-card">
          <div className="invitation-state-icon invitation-state-icon--warning">
            <AlertTriangle size={36} />
          </div>
          <h2 className="invitation-title">
            {tokenError.type === 'expired'
              ? 'La invitación venció'
              : tokenError.type === 'invalid'
                ? 'Invitación no válida'
                : 'No pudimos validar la invitación'}
          </h2>
          <p className="invitation-subtitle">{tokenError.message}</p>

          <div className="invitation-state-actions">
            {tokenError.type === 'general' ? (
              <button
                type="button"
                className="invitation-submit-btn invitation-btn-auto"
                onClick={() => void validateToken(token)}
              >
                <RotateCcw size={16} /> Reintentar
              </button>
            ) : (
              <Link
                to="/login"
                className="invitation-submit-btn invitation-btn-auto invitation-btn-link"
              >
                Ir a iniciar sesión
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="invitation-page">
      <div className="invitation-container">
        {/* Encabezado */}
        <header className="invitation-header">
          <div className="invitation-logo" aria-hidden="true">
            <Dumbbell size={28} />
          </div>

          <div className="invitation-badge">
            <UserCheck size={14} />
            <span>Invitación para {invitation?.categoryName || 'tu categoría'}</span>
          </div>

          <h1 className="invitation-title">Completá tu registro</h1>
          <p className="invitation-subtitle">
            Ingresá tus datos para sumarte al equipo y comenzar tus entrenamientos con ProTraining.
          </p>
        </header>

        {/* Alerta de error si el envío falla */}
        {formError && (
          <div className="invitation-error-banner" role="alert">
            <AlertTriangle size={18} className="invitation-error-icon" />
            <div>
              <span>{formError}</span>
              {errorType === 'conflict' && (
                <div className="invitation-error-link-wrapper">
                  <Link to="/login" className="invitation-link invitation-link--strong">
                    Hacé clic acá para iniciar sesión
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="invitation-form" noValidate>
          <div className="invitation-row">
            <div className="invitation-field">
              <label htmlFor="invitation-firstName">Nombre</label>
              <input
                id="invitation-firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej. Mateo"
                className="invitation-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="invitation-field">
              <label htmlFor="invitation-lastName">Apellido</label>
              <input
                id="invitation-lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej. Fernández"
                className="invitation-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="invitation-field">
            <label htmlFor="invitation-email">Correo electrónico</label>
            <input
              id="invitation-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.email@ejemplo.com"
              className="invitation-input"
              disabled={isSubmitting || isAccountCreated}
              autoComplete="email"
            />
          </div>

          {!isAccountCreated && (
            <div className="invitation-field">
              <label htmlFor="invitation-password">Contraseña</label>
              <div className="invitation-input-wrap">
                <input
                  id="invitation-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="invitation-input"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="invitation-password-toggle"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="invitation-field-hint">Mínimo 8 caracteres y al menos un número</p>
            </div>
          )}

          <div className="invitation-row">
            <div className="invitation-field">
              <label htmlFor="invitation-phone">Teléfono celular</label>
              <input
                id="invitation-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+54 9 11 ..."
                className="invitation-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="invitation-field">
              <label htmlFor="invitation-birthDate">Fecha de nacimiento</label>
              <input
                id="invitation-birthDate"
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="invitation-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Bloque especial para menores de 18 años (KAN-401) */}
          {isMinor && (
            <section
              className="invitation-guardian-box"
              aria-label="Consentimiento de madre, padre o tutor"
            >
              <div className="invitation-guardian-header">
                <ShieldCheck size={20} className="invitation-guardian-icon" />
                <div>
                  <h2 className="invitation-guardian-title">Datos de tu madre, padre o tutor</h2>
                  <p className="invitation-guardian-desc">
                    Al ser menor de 18 años, un adulto responsable debe autorizar tu participación
                    deportiva y completar sus datos de contacto.
                  </p>
                </div>
              </div>

              <div className="invitation-field">
                <label htmlFor="invitation-guardianName">Nombre completo del tutor</label>
                <input
                  id="invitation-guardianName"
                  type="text"
                  required
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder="Ej. Roberto Fernández"
                  className="invitation-input"
                  disabled={isSubmitting}
                />
              </div>

              <div className="invitation-row">
                <div className="invitation-field">
                  <label htmlFor="invitation-guardianEmail">Correo del tutor</label>
                  <input
                    id="invitation-guardianEmail"
                    type="email"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    placeholder="tutor@ejemplo.com"
                    className="invitation-input"
                    disabled={isSubmitting}
                  />
                  <span className="invitation-field-hint">Al menos un contacto es obligatorio</span>
                </div>

                <div className="invitation-field">
                  <label htmlFor="invitation-guardianPhone">Teléfono del tutor</label>
                  <input
                    id="invitation-guardianPhone"
                    type="tel"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="invitation-input"
                    disabled={isSubmitting}
                  />
                  <span className="invitation-field-hint">Celular o WhatsApp</span>
                </div>
              </div>

              <div className="invitation-checkbox-group">
                <label className="invitation-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowsPhysicalTraining}
                    onChange={(e) => setAllowsPhysicalTraining(e.target.checked)}
                    disabled={isSubmitting}
                    required
                  />
                  <span>
                    Autorizo la realización de entrenamientos físicos y actividades deportivas bajo
                    la supervisión del preparador físico.
                    <span className="invitation-checkbox-required">*</span>
                  </span>
                </label>

                <label className="invitation-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowsHabitsRecommendations}
                    onChange={(e) => setAllowsHabitsRecommendations(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>
                    Autorizo a recibir recomendaciones sobre hábitos saludables, descanso y
                    nutrición (opcional).
                  </span>
                </label>

                <label className="invitation-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowsProfilePhoto}
                    onChange={(e) => setAllowsProfilePhoto(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span>
                    Autorizo la publicación de la foto de perfil del menor en la plataforma
                    (opcional).
                  </span>
                </label>
              </div>
            </section>
          )}

          <button type="submit" className="invitation-submit-btn" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Registrando y uniendo...</span>
              </>
            ) : (
              <>
                <span>Completar registro</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <footer className="invitation-footer">
          ¿Ya tenés una cuenta en ProTraining?{' '}
          <Link to="/login" className="invitation-link">
            Iniciá sesión acá
          </Link>
        </footer>
      </div>
    </main>
  );
};

export default InvitationLandingPage;

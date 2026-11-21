import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2, ShieldCheck } from 'lucide-react';
import { authService } from '../../api/authService';
import { extractErrorMessage } from '../../api/axiosClient';
import {
  getGoogleClientId,
  isGoogleAuthConfigured,
  loadGoogleIdentityApi,
} from '../../utils/googleIdentity';

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.98 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const GoogleAccountLinkSection: React.FC = () => {
  const [googleLinked, setGoogleLinked] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(
    () => typeof authService.getGoogleLinkStatus === 'function',
  );
  const [mode, setMode] = useState<'idle' | 'linking' | 'unlinking'>('idle');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordConfirmed, setPasswordConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const currentPasswordRef = useRef(currentPassword);
  useEffect(() => {
    currentPasswordRef.current = currentPassword;
  }, [currentPassword]);

  const isGoogleConfigured = isGoogleAuthConfigured();
  const googleClientId = getGoogleClientId();

  useEffect(() => {
    if (typeof authService.getGoogleLinkStatus !== 'function') {
      return;
    }

    let active = true;
    authService
      .getGoogleLinkStatus()
      .then((linked) => {
        if (active) setGoogleLinked(linked);
      })
      .catch(() => {
        if (active) setGoogleLinked(false);
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      mode !== 'linking' ||
      !passwordConfirmed ||
      !isGoogleConfigured ||
      !googleButtonRef.current
    ) {
      return;
    }

    let cancelled = false;
    const container = googleButtonRef.current;

    loadGoogleIdentityApi()
      .then((googleId) => {
        if (cancelled || !container) return;
        container.innerHTML = '';
        googleId.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response?.credential) {
              setErrorMessage('No se recibió la credencial de autenticación de Google.');
              return;
            }
            if (!currentPasswordRef.current) {
              setErrorMessage('Necesitás confirmar tu identidad para vincular Google.');
              return;
            }

            setSubmitting(true);
            setErrorMessage(null);
            setSuccessMessage(null);
            try {
              const linked = await authService.linkGoogleAccount(
                response.credential,
                currentPasswordRef.current,
              );
              setGoogleLinked(linked);
              setMode('idle');
              setCurrentPassword('');
              setPasswordConfirmed(false);
              setSuccessMessage('Cuenta de Google vinculada correctamente.');
            } catch (err: unknown) {
              setErrorMessage(extractErrorMessage(err));
            } finally {
              setSubmitting(false);
            }
          },
        });
        googleId.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 280,
          locale: 'es',
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el servicio de autenticación de Google.',
          );
        }
      });

    return () => {
      cancelled = true;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [mode, passwordConfirmed, isGoogleConfigured, googleClientId]);

  const handleConfirmPasswordForLink = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!currentPassword) {
      setErrorMessage('Necesitás confirmar tu identidad para vincular Google.');
      return;
    }
    if (!isGoogleConfigured) {
      setErrorMessage('La integración con Google no está habilitada en este entorno.');
      return;
    }
    setPasswordConfirmed(true);
  };

  const handleUnlink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!currentPassword) {
      setErrorMessage('Necesitás confirmar tu identidad con tu contraseña actual.');
      return;
    }

    setSubmitting(true);
    try {
      const linked = await authService.unlinkGoogleAccount(currentPassword);
      setGoogleLinked(linked);
      setMode('idle');
      setCurrentPassword('');
      setSuccessMessage('Cuenta de Google desvinculada correctamente.');
    } catch (err: unknown) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          flexWrap: 'wrap',
          marginBottom: mode === 'idle' ? 0 : '1rem',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
            }}
          >
            <ShieldCheck size={20} color="var(--primary)" aria-hidden="true" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              Cuenta de Google
            </h3>
          </div>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            Vinculá tu cuenta de Google con el mismo correo de ProTraining para iniciar sesión de
            forma rápida y segura.
          </p>
        </div>

        {/* Acción / Botón con logo alineado a la derecha */}
        {mode === 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {loadingStatus ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                <Loader2 size={15} className="animate-spin" />
                <span>Verificando…</span>
              </div>
            ) : googleLinked ? (
              <button
                type="button"
                className="btn btn-secondary"
                id="btn-open-unlink-google"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setCurrentPassword('');
                  setMode('unlinking');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid var(--traffic-green-border)',
                  background: 'var(--traffic-green-bg)',
                  color: 'var(--traffic-green-text)',
                }}
                title="Cuenta de Google vinculada. Clic para desvincular"
              >
                <Check size={16} aria-hidden="true" />
                <GoogleIcon />
                <span>Vinculado</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                id="btn-open-link-google"
                onClick={() => {
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setCurrentPassword('');
                  setPasswordConfirmed(false);
                  setMode('linking');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                <GoogleIcon />
                <span>Vincular cuenta de Google</span>
              </button>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="alert-banner danger" role="alert" style={{ margin: '0.85rem 0' }}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert-banner success" role="status" style={{ margin: '0.85rem 0' }}>
          <Check size={16} aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}
      {mode === 'linking' && (
        <form
          onSubmit={handleConfirmPasswordForLink}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px' }}
        >
          <div>
            <label
              htmlFor="google-link-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Confirmá tu contraseña actual
            </label>
            <input
              id="google-link-password"
              type="password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (passwordConfirmed) setPasswordConfirmed(false);
              }}
              placeholder="Tu contraseña actual"
              disabled={submitting}
              required
            />
          </div>

          {!passwordConfirmed ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                Continuar con Google
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setMode('idle');
                  setErrorMessage(null);
                }}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div ref={googleButtonRef} data-testid="google-link-button-container" />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting}
                onClick={() => {
                  setMode('idle');
                  setPasswordConfirmed(false);
                  setErrorMessage(null);
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </form>
      )}

      {mode === 'unlinking' && (
        <form
          onSubmit={handleUnlink}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '420px' }}
        >
          <div>
            <label
              htmlFor="google-unlink-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Confirmá tu contraseña actual para desvincular
            </label>
            <input
              id="google-unlink-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Tu contraseña actual"
              disabled={submitting}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? 'Desvinculando…' : 'Confirmar desvinculación'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={() => {
                setMode('idle');
                setErrorMessage(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

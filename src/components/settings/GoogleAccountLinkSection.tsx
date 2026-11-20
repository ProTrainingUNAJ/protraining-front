import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, KeyRound, Loader2, ShieldCheck, Unlink } from 'lucide-react';
import { authService } from '../../api/authService';
import { extractErrorMessage } from '../../api/axiosClient';
import {
  getGoogleClientId,
  isGoogleAuthConfigured,
  loadGoogleIdentityApi,
} from '../../utils/googleIdentity';

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
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="var(--primary)" aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Cuenta de Google</h3>
        </div>
        {!loadingStatus && (
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '9999px',
              background: googleLinked ? 'var(--traffic-green-bg)' : 'var(--bg-subtle)',
              color: googleLinked ? 'var(--traffic-green-text)' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {googleLinked ? 'Cuenta de Google vinculada' : 'Sin vincular'}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
        Vinculá tu cuenta de Google con el mismo correo de ProTraining para iniciar sesión de forma
        rápida y segura.
      </p>

      {errorMessage && (
        <div className="alert-banner danger" role="alert" style={{ marginBottom: '0.85rem' }}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="alert-banner success" role="status" style={{ marginBottom: '0.85rem' }}>
          <Check size={16} aria-hidden="true" />
          <span>{successMessage}</span>
        </div>
      )}

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
          <span>Verificando estado de vinculación…</span>
        </div>
      ) : mode === 'idle' ? (
        googleLinked ? (
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <Unlink size={16} aria-hidden="true" />
            <span>Desvincular Google</span>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
          >
            <KeyRound size={16} aria-hidden="true" />
            <span>Vincular cuenta de Google</span>
          </button>
        )
      ) : mode === 'linking' ? (
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
      ) : (
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

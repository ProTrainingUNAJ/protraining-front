import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Camera,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  Power,
  Settings,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { Athlete } from '../../types/structure';
import { structureService } from '../../api/structureService';
import { authService } from '../../api/authService';
import { PhotoUploadControl } from '../common/PhotoUploadControl';

interface AthleteSettingsModalProps {
  athlete: Athlete;
  onAthleteUpdated: (updated: Athlete) => void;
  onClose: () => void;
}

export const AthleteSettingsModal: React.FC<AthleteSettingsModalProps> = ({
  athlete,
  onAthleteUpdated,
  onClose,
}) => {
  const athleteName = athlete.fullName || `${athlete.firstName} ${athlete.lastName}`.trim();

  // --- Cambio de Email ---
  const [email, setEmail] = useState(athlete.email);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // --- Restablecer Contraseña ---
  const [resetStep, setResetStep] = useState<'initial' | 'loading' | 'success'>('initial');
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // --- Deshabilitar / Habilitar Usuario ---
  const [statusConfirming, setStatusConfirming] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Guardar Email
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Ingresá una dirección de correo electrónico válida.');
      return;
    }
    if (cleanEmail === athlete.email) {
      setEmailError('El correo ingresado es idéntico al actual.');
      return;
    }

    setEmailSaving(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const updated = await structureService.updateAthleteEmail(athlete.id, cleanEmail);
      const merged: Athlete = { ...athlete, email: updated.email || cleanEmail };
      onAthleteUpdated(merged);
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err: unknown) {
      setEmailError(
        err instanceof Error ? err.message : 'No se pudo actualizar el correo electrónico.',
      );
    } finally {
      setEmailSaving(false);
    }
  };

  // Resetear Contraseña
  const handleResetPassword = async () => {
    setResetStep('loading');
    setResetError(null);

    try {
      const res = await authService.resetAthletePassword(athlete.id);
      setTempPassword(res.temporaryPassword);
      setResetStep('success');
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
      setResetStep('initial');
    }
  };

  // Copiar contraseña provisoria
  const handleCopyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = tempPassword;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Cambiar Estado Activo / Inactivo
  const handleToggleStatus = async () => {
    const nextActive = !athlete.active;
    setStatusSaving(true);
    setStatusError(null);

    try {
      const updated = await structureService.updateAthleteStatus(athlete.id, nextActive);
      const merged: Athlete = { ...athlete, active: updated.active ?? nextActive };
      onAthleteUpdated(merged);
      setStatusConfirming(false);
    } catch (err: unknown) {
      setStatusError(
        err instanceof Error ? err.message : 'No se pudo actualizar el estado de la cuenta.',
      );
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-settings-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Cabecera */}
        <div className="plan-picker-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Settings size={22} color="var(--primary)" aria-hidden="true" />
            <div>
              <h2
                id="modal-settings-title"
                style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}
              >
                Configuración · {athleteName}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Gestión de foto de perfil, credenciales de acceso, correo y estado de cuenta.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="coach-icon-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* SECCIÓN 1: FOTO DE PERFIL */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              <Camera size={18} color="var(--primary)" aria-hidden="true" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Foto de Perfil</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Subí una fotografía del atleta. Se optimiza y almacena automáticamente en formato WebP
              para máximo rendimiento.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PhotoUploadControl
                currentPhotoUrl={
                  athlete.hasPhoto
                    ? structureService.getAthletePhotoUrl(athlete.id, athlete.photoUpdatedAt)
                    : null
                }
                name={athleteName}
                onUpload={async (file: File) => {
                  await structureService.uploadAthletePhoto(athlete.id, file);
                  onAthleteUpdated({
                    ...athlete,
                    hasPhoto: true,
                    photoUpdatedAt: new Date().toISOString(),
                  });
                }}
                onDelete={
                  athlete.hasPhoto
                    ? async () => {
                        await structureService.deleteAthletePhoto(athlete.id);
                        onAthleteUpdated({
                          ...athlete,
                          hasPhoto: false,
                          photoUpdatedAt: null,
                        });
                      }
                    : undefined
                }
              />
            </div>
          </div>

          {/* SECCIÓN 2: CORREO ELECTRÓNICO */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              <Mail size={18} color="var(--primary)" aria-hidden="true" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Correo Electrónico (Email)
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              El correo es el identificador principal con el cual el atleta inicia sesión en la
              aplicación.
            </p>

            {emailSuccess && (
              <div
                className="alert-banner success"
                role="alert"
                style={{ marginBottom: '0.75rem' }}
              >
                <Check size={16} aria-hidden="true" />
                <span>Correo electrónico actualizado exitosamente.</span>
              </div>
            )}
            {emailError && (
              <div className="alert-banner danger" role="alert" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{emailError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmail}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nuevo.correo@ejemplo.com"
                  required
                  disabled={emailSaving}
                  style={{ flex: 1, minWidth: '220px', margin: 0 }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={emailSaving || email.trim() === athlete.email}
                >
                  {emailSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Guardar Correo</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECCIÓN 3: RESTABLECER CONTRASEÑA */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              <KeyRound size={18} color="var(--primary)" aria-hidden="true" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Seguridad y Contraseña
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Si el deportista olvidó su contraseña, podés generar una credencial temporal
              provisoria de un solo uso.
            </p>

            {resetError && (
              <div className="alert-banner danger" role="alert" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{resetError}</span>
              </div>
            )}

            {resetStep === 'success' && tempPassword ? (
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1.5px solid var(--primary)',
                  borderRadius: '6px',
                  padding: '1rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Contraseña temporal generada con éxito:
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-card)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    fontFamily: 'monospace',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                  }}
                >
                  <span>{tempPassword}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                    onClick={handleCopyPassword}
                  >
                    {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
                <p
                  style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}
                >
                  Comunicale esta clave al atleta. Al iniciar sesión, el sistema le exigirá definir
                  una nueva contraseña personal.
                </p>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetPassword}
                disabled={resetStep === 'loading'}
              >
                {resetStep === 'loading' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
                <span>Generar Contraseña Temporal</span>
              </button>
            )}
          </div>

          {/* SECCIÓN 4: ESTADO DE LA CUENTA (HABILITAR / DESHABILITAR) */}
          <div
            style={{
              background: athlete.active ? 'var(--bg-card)' : 'rgba(239, 68, 68, 0.05)',
              border: athlete.active ? '1px solid var(--border)' : '1px solid var(--danger)',
              borderRadius: '8px',
              padding: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem',
              }}
            >
              {athlete.active ? (
                <UserCheck size={18} color="var(--success)" aria-hidden="true" />
              ) : (
                <UserX size={18} color="var(--danger)" aria-hidden="true" />
              )}
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Estado de la Cuenta: {athlete.active ? 'Activo' : 'Deshabilitado'}
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {athlete.active
                ? 'El atleta tiene acceso completo a la aplicación móvil y al registro de entrenamientos. Podés deshabilitar temporalmente su cuenta si deja de entrenar o causa baja.'
                : 'La cuenta se encuentra actualmente deshabilitada. El usuario no puede iniciar sesión ni acceder a la app hasta que sea reactivado.'}
            </p>

            {statusError && (
              <div className="alert-banner danger" role="alert" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{statusError}</span>
              </div>
            )}

            {!statusConfirming ? (
              <button
                type="button"
                className={`btn ${athlete.active ? 'btn-secondary' : 'btn-primary'}`}
                style={{
                  color: athlete.active ? 'var(--danger)' : undefined,
                  borderColor: athlete.active ? 'var(--danger)' : undefined,
                }}
                onClick={() => setStatusConfirming(true)}
              >
                <Power size={16} aria-hidden="true" />
                <span>{athlete.active ? 'Deshabilitar Atleta' : 'Reactivar Atleta'}</span>
              </button>
            ) : (
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  <AlertTriangle size={18} color="var(--warning)" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                    {athlete.active
                      ? '¿Confirmás deshabilitar este usuario?'
                      : '¿Confirmás reactivar la cuenta del atleta?'}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                  {athlete.active
                    ? 'Se revocarán inmediatamente sus sesiones abiertas en todos los dispositivos y no podrá ingresar a la app.'
                    : 'El usuario recuperará acceso inmediato y podrá volver a registrar sus check-ins y rutinas.'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStatusConfirming(false)}
                    disabled={statusSaving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={`btn ${athlete.active ? 'btn-danger' : 'btn-primary'}`}
                    onClick={handleToggleStatus}
                    disabled={statusSaving}
                  >
                    {statusSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Power size={16} />
                    )}
                    <span>{athlete.active ? 'Sí, deshabilitar' : 'Sí, reactivar'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

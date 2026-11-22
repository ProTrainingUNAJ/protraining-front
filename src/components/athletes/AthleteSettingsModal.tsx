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
  Phone,
  Power,
  Send,
  Settings,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { Athlete } from '../../types/structure';
import { structureService } from '../../api/structureService';
import { authService } from '../../api/authService';
import { PhotoUploadControl } from '../common/PhotoUploadControl';
import { validateTelegramUsername } from '../../utils/telegram';

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

  // --- Cambio de Teléfono ---
  const [phone, setPhone] = useState(athlete.phone || '');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // --- Cambio de Telegram ---
  const [telegramUsername, setTelegramUsername] = useState(athlete.telegramUsername || '');
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

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
      const updated = await structureService.updateAthleteEmail(
        athlete.id,
        cleanEmail,
        athlete.accountId,
      );
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

  // Guardar Teléfono
  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length > 50) {
      setPhoneError('Ingresá un número de teléfono válido (hasta 50 caracteres).');
      return;
    }
    if (cleanPhone === athlete.phone) {
      setPhoneError('El teléfono ingresado es idéntico al actual.');
      return;
    }

    setPhoneSaving(true);
    setPhoneError(null);
    setPhoneSuccess(false);

    try {
      const updated = await structureService.updateAthletePhone(
        athlete.id,
        cleanPhone,
        athlete.accountId,
      );
      const merged: Athlete = { ...athlete, phone: updated.phone || cleanPhone };
      onAthleteUpdated(merged);
      setPhoneSuccess(true);
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (err: unknown) {
      setPhoneError(
        err instanceof Error ? err.message : 'No se pudo actualizar el número de teléfono.',
      );
    } finally {
      setPhoneSaving(false);
    }
  };

  // Guardar Telegram
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateTelegramUsername(telegramUsername);
    if (validationError) {
      setTelegramError(validationError);
      return;
    }

    setTelegramSaving(true);
    setTelegramError(null);
    setTelegramSuccess(false);

    try {
      const updated = await structureService.updateAthlete(athlete.id, {
        phone: athlete.phone,
        emergencyContact: athlete.emergencyContact ?? null,
        telegramUsername: telegramUsername.trim() || '',
      });
      const merged: Athlete = {
        ...athlete,
        telegramUsername: updated.telegramUsername ?? null,
      };
      setTelegramUsername(merged.telegramUsername || '');
      onAthleteUpdated(merged);
      setTelegramSuccess(true);
      setTimeout(() => setTelegramSuccess(false), 3000);
    } catch (err: unknown) {
      setTelegramError(
        err instanceof Error ? err.message : 'No se pudo actualizar el usuario de Telegram.',
      );
    } finally {
      setTelegramSaving(false);
    }
  };

  // Resetear Contraseña
  const handleResetPassword = async () => {
    if (!athlete.accountId) {
      setResetError('El atleta aún no ha completado el registro de su cuenta en la aplicación.');
      return;
    }
    setResetStep('loading');
    setResetError(null);

    try {
      const res = await authService.resetAthletePassword(athlete.accountId);
      setTempPassword(res.temporaryPassword);
      setResetStep('success');
      if (!athlete.active) {
        onAthleteUpdated({ ...athlete, active: true });
      }
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
      const updated = await structureService.updateAthleteStatus(
        athlete.id,
        nextActive,
        athlete.accountId,
      );
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
              Subí una fotografía del atleta.
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

          {/* SECCIÓN 3: NÚMERO DE TELÉFONO */}
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
              <Phone size={18} color="var(--primary)" aria-hidden="true" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Número de Teléfono (Contacto)
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Número de teléfono y contacto directo del atleta utilizado para notificaciones y
              WhatsApp.
            </p>

            {phoneSuccess && (
              <div
                className="alert-banner success"
                role="alert"
                style={{ marginBottom: '0.75rem' }}
              >
                <Check size={16} aria-hidden="true" />
                <span>Número de teléfono actualizado exitosamente.</span>
              </div>
            )}
            {phoneError && (
              <div className="alert-banner danger" role="alert" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{phoneError}</span>
              </div>
            )}

            <form onSubmit={handleSavePhone}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +5491123456789"
                  required
                  disabled={phoneSaving}
                  style={{ flex: 1, minWidth: '220px', margin: 0 }}
                  aria-label="Número de teléfono del atleta"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={phoneSaving || phone.trim() === (athlete.phone || '')}
                >
                  {phoneSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Guardar Teléfono</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECCIÓN 3B: USUARIO DE TELEGRAM */}
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
              <Send size={18} color="var(--primary)" aria-hidden="true" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                Telegram del atleta
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Username opcional (ej. @lucas_fernandez) para abrir chat directo desde el semáforo.
            </p>

            {telegramError && (
              <div className="alert-banner danger" role="alert" style={{ marginBottom: '0.75rem' }}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{telegramError}</span>
              </div>
            )}

            {telegramSuccess && (
              <div
                className="alert-banner success"
                role="status"
                style={{ marginBottom: '0.75rem' }}
              >
                <Check size={16} aria-hidden="true" />
                <span>Usuario de Telegram actualizado correctamente.</span>
              </div>
            )}

            <form onSubmit={handleSaveTelegram}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => {
                    setTelegramUsername(e.target.value);
                    if (telegramError) setTelegramError(null);
                  }}
                  placeholder="Ej. @lucas_fernandez"
                  disabled={telegramSaving}
                  style={{ flex: 1, minWidth: '220px', margin: 0 }}
                  aria-label="Usuario de Telegram del atleta"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    telegramSaving ||
                    telegramUsername.trim().replace(/^@/, '') === (athlete.telegramUsername || '')
                  }
                >
                  {telegramSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Guardar Telegram</span>
                </button>
              </div>
            </form>
          </div>

          {/* SECCIÓN 4: RESTABLECER CONTRASEÑA */}
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

            {!athlete.accountId ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                }}
              >
                <AlertCircle size={18} color="var(--text-muted)" aria-hidden="true" />
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  El atleta aún no ha completado el registro de su cuenta en la aplicación (está
                  pendiente de registrarse mediante invitación). No posee credenciales para
                  restablecer.
                </p>
              </div>
            ) : resetStep === 'success' && tempPassword ? (
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

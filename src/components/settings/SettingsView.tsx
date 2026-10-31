import React, { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Palette,
  Shield,
  Check,
  Save,
  Camera,
  Laptop,
  Sun,
  Moon,
  BellRing,
  BellOff,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../shell/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../api/users';
import {
  subscribeUserToPush,
  unsubscribeUserFromPush,
  isPushSupported,
  isUserSubscribed,
  getNotificationPermission,
} from '../../api/pushNotifications';

interface SettingsViewProps {
  role: 'pf' | 'athlete';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ role }) => {
  const { user, themePreference, setThemePreference } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'appearance' | 'notifications' | 'roleOptions'
  >('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [name, setName] = useState(
    user?.fullName || (role === 'pf' ? 'Julián Pérez' : 'Lucía Martínez'),
  );
  const [email, setEmail] = useState(
    user?.email || (role === 'pf' ? 'coach@protraining.com' : 'atleta@protraining.com'),
  );
  const [phone, setPhone] = useState(
    user?.phoneNumber || (role === 'pf' ? '' : '+54 11 4567-8900'),
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('Dra. Laura Rossi (+54 11 9876-5432)');

  // Notification toggles
  const [notifySessions, setNotifySessions] = useState(true);
  const [notifyCheckIn, setNotifyCheckIn] = useState(true);
  const [notifyReports, setNotifyReports] = useState(role === 'pf');

  // Web Push device subscription state
  const [pushSupported] = useState<boolean>(() => isPushSupported());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission(),
  );
  const [pushLoading, setPushLoading] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isPushSupported()) {
      isUserSubscribed().then((subscribed) => {
        if (isMounted) {
          setPushSubscribed(subscribed);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      if (pushSubscribed) {
        const ok = await unsubscribeUserFromPush();
        if (ok) {
          setPushSubscribed(false);
          setPushFeedback({
            type: 'success',
            message: 'Notificaciones desactivadas para este navegador.',
          });
        } else {
          setPushFeedback({
            type: 'error',
            message: 'No se pudo desactivar la suscripción Web Push.',
          });
        }
      } else {
        const sub = await subscribeUserToPush();
        const currentPerm = getNotificationPermission();
        setPushPermission(currentPerm);
        if (sub) {
          setPushSubscribed(true);
          setPushFeedback({
            type: 'success',
            message: '¡Notificaciones push activadas! Recibirás avisos en tu dispositivo.',
          });
        } else if (currentPerm === 'denied') {
          setPushFeedback({
            type: 'error',
            message:
              'El permiso de notificaciones fue bloqueado en este navegador. Habilitalo en los permisos del sitio.',
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al configurar notificaciones';
      setPushFeedback({ type: 'error', message: msg });
    } finally {
      setPushLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    if (role === 'pf') {
      try {
        setPhoneSaving(true);
        const result = await usersService.updateWhatsAppPhone(phone);
        // Si sale bien, mostramos el número normalizado devuelto (ej: 5491123456789)
        setPhone(result.phoneNumber);
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
        }, 3000);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error al guardar el teléfono';
        setPhoneError(errorMsg);
      } finally {
        setPhoneSaving(false);
      }
    } else {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    }
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Configuración"
        description="Preferencias del sistema, notificaciones y ajustes de cuenta."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={phoneSaving}
            title="Guardar preferencias del sistema"
          >
            <Save size={16} aria-hidden="true" />
            <span>{phoneSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        }
      />

      <div className="app-page-body">
        {/* Aviso de Éxito al guardar */}
        {savedSuccess && (
          <div className="alert-banner success" role="alert">
            <Check size={18} aria-hidden="true" />
            <span>Los cambios de configuración se han guardado exitosamente.</span>
          </div>
        )}

        {/* Pestañas de Navegación de Configuración */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '0.5rem',
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
          }}
          role="tablist"
          aria-label="Pestañas de configuración"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <User size={16} />
            <span>Perfil</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'appearance'}
            onClick={() => setActiveTab('appearance')}
            className={`btn ${activeTab === 'appearance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Palette size={16} />
            <span>Apariencia</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'notifications'}
            onClick={() => setActiveTab('notifications')}
            className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Bell size={16} />
            <span>Notificaciones</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'roleOptions'}
            onClick={() => setActiveTab('roleOptions')}
            className={`btn ${activeTab === 'roleOptions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Shield size={16} />
            <span>{role === 'pf' ? 'Ajustes del Plantel' : 'Ficha Deportiva'}</span>
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <form onSubmit={handleSave}>
          {activeTab === 'profile' && (
            <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: '0.35rem',
                  color: 'var(--text-main)',
                }}
              >
                Información de la Cuenta
              </h2>
              <p
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}
              >
                Datos personales asociados a tu usuario en la plataforma.
              </p>

              {/* ── Círculo celeste para foto de perfil ── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1.15rem 1.25rem',
                  marginBottom: '1.5rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                {/* Contenedor del círculo celeste */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: 'var(--avatar-cyan-bg)',
                      border: '3px solid var(--avatar-cyan-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--avatar-cyan-text)',
                      fontWeight: 800,
                      fontSize: '1.65rem',
                      letterSpacing: '-0.02em',
                      boxShadow: 'var(--shadow)',
                      userSelect: 'none',
                    }}
                    title="Foto de perfil del usuario"
                    aria-label="Círculo de avatar de perfil"
                  >
                    {name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase() || 'PT'}
                  </div>

                  {/* Badge celeste de cámara para futura carga */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--secondary)',
                      color: 'var(--on-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-card)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    title="Espacio para cargar foto de perfil"
                    aria-label="Cámara"
                  >
                    <Camera size={14} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '220px' }}>
                  <strong
                    style={{
                      fontSize: '0.95rem',
                      color: 'var(--text-main)',
                      display: 'block',
                      marginBottom: '0.2rem',
                    }}
                  >
                    Foto de Perfil
                  </strong>
                  <p
                    style={{
                      margin: '0 0 0.5rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.4,
                    }}
                  >
                    Círculo de avatar configurado. Próximamente vas a poder subir y personalizar tu
                    foto de perfil directamente desde aquí.
                  </p>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--avatar-cyan-text)',
                      background: 'var(--avatar-cyan-bg)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                    }}
                  >
                    <Camera size={12} />
                    <span>Espacio preparado para imagen</span>
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                <div>
                  <label
                    htmlFor="set-name"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Nombre Completo
                  </label>
                  <input
                    id="set-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="set-email"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Correo Electrónico
                  </label>
                  <input
                    id="set-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="set-phone"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    {role === 'pf' ? 'WhatsApp' : 'Teléfono de Contacto'}
                  </label>
                  <input
                    id="set-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    placeholder={role === 'pf' ? '+54 9 11 2345-6789' : '+54 11 4567-8900'}
                  />
                  {role === 'pf' && phoneError && (
                    <span
                      style={{
                        display: 'block',
                        color: 'var(--danger-text)',
                        fontSize: '0.85rem',
                        marginTop: '0.35rem',
                      }}
                      role="alert"
                    >
                      {phoneError}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="set-role"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Rol Asignado
                  </label>
                  <input
                    id="set-role"
                    type="text"
                    value={
                      role === 'pf' ? 'Preparador Físico (Staff Técnico)' : 'Atleta Registrado'
                    }
                    disabled
                    style={{ opacity: 0.75, cursor: 'not-allowed' }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: '0.35rem',
                  color: 'var(--text-main)',
                }}
              >
                Apariencia e Interfaz
              </h2>
              <p
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}
              >
                Personaliza cómo visualizas la aplicación en tu dispositivo.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  maxWidth: '520px',
                }}
              >
                {/* Selector de tema predeterminado */}
                <div>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <strong
                      style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}
                    >
                      Tema del Sistema
                    </strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Elegí tu modo predeterminado o sincronizalo automáticamente con tu
                      dispositivo.
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '0.85rem',
                    }}
                  >
                    {/* Opción Sistema (Predeterminado) */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('system')}
                      style={{
                        padding: '0.9rem',
                        borderRadius: '10px',
                        border: `2px solid ${
                          themePreference === 'system' ? 'var(--secondary)' : 'var(--border)'
                        }`,
                        background:
                          themePreference === 'system'
                            ? 'var(--avatar-cyan-bg)'
                            : 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background:
                              themePreference === 'system' ? 'var(--secondary)' : 'var(--bg-card)',
                            color:
                              themePreference === 'system'
                                ? 'var(--on-primary)'
                                : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Laptop size={18} />
                        </div>
                        {themePreference === 'system' && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              color: 'var(--secondary)',
                              background: 'var(--bg-card)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Activo
                          </span>
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', display: 'block' }}>Sistema</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Predeterminado (Auto)
                        </span>
                      </div>
                    </button>

                    {/* Opción Claro */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('light')}
                      style={{
                        padding: '0.9rem',
                        borderRadius: '10px',
                        border: `2px solid ${
                          themePreference === 'light' ? 'var(--secondary)' : 'var(--border)'
                        }`,
                        background:
                          themePreference === 'light'
                            ? 'var(--avatar-cyan-bg)'
                            : 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background:
                              themePreference === 'light' ? 'var(--secondary)' : 'var(--bg-card)',
                            color:
                              themePreference === 'light'
                                ? 'var(--on-primary)'
                                : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Sun size={18} />
                        </div>
                        {themePreference === 'light' && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              color: 'var(--secondary)',
                              background: 'var(--bg-card)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Activo
                          </span>
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', display: 'block' }}>Claro</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Contraste diurno
                        </span>
                      </div>
                    </button>

                    {/* Opción Oscuro */}
                    <button
                      type="button"
                      onClick={() => setThemePreference('dark')}
                      style={{
                        padding: '0.9rem',
                        borderRadius: '10px',
                        border: `2px solid ${
                          themePreference === 'dark' ? 'var(--secondary)' : 'var(--border)'
                        }`,
                        background:
                          themePreference === 'dark' ? 'var(--avatar-cyan-bg)' : 'var(--bg-subtle)',
                        color: 'var(--text-main)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background:
                              themePreference === 'dark' ? 'var(--secondary)' : 'var(--bg-card)',
                            color:
                              themePreference === 'dark' ? 'var(--on-primary)' : 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Moon size={18} />
                        </div>
                        {themePreference === 'dark' && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              color: 'var(--secondary)',
                              background: 'var(--bg-card)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                            }}
                          >
                            Activo
                          </span>
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', display: 'block' }}>Oscuro</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Descanso visual
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <label
                    htmlFor="set-lang"
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                    }}
                  >
                    Idioma de la Interfaz
                  </label>
                  <select
                    id="set-lang"
                    defaultValue="es"
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                    }}
                  >
                    <option value="es">Español (Latinoamérica)</option>
                    <option value="en">English (US)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: '0.35rem',
                  color: 'var(--text-main)',
                }}
              >
                Ajustes de Notificaciones
              </h2>
              <p
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}
              >
                Selecciona qué avisos deseas recibir en tiempo real.
              </p>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '540px' }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={notifySessions}
                    onChange={(e) => setNotifySessions(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)' }}
                  />
                  <div>
                    <strong
                      style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}
                    >
                      Entrenamientos y Planificaciones
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Avisar cuando se publiquen o modifiquen sesiones de trabajo.
                    </span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={notifyCheckIn}
                    onChange={(e) => setNotifyCheckIn(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)' }}
                  />
                  <div>
                    <strong
                      style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}
                    >
                      Recordatorio de Check-in Diario
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Recordar el registro de fatiga y recuperación cada mañana.
                    </span>
                  </div>
                </label>

                {role === 'pf' && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={notifyReports}
                      onChange={(e) => setNotifyReports(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--secondary)' }}
                    />
                    <div>
                      <strong
                        style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}
                      >
                        Alertas de Carga y Sobreentrenamiento
                      </strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Notificar cuando un atleta supere el umbral seguro de esfuerzo.
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* ── Sección de Notificaciones Web Push del Dispositivo ── */}
              <div
                style={{
                  marginTop: '1.75rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--border)',
                  maxWidth: '540px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
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
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        Notificaciones Push en este Dispositivo
                      </strong>
                      {pushSubscribed ? (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--success-bg-strong)',
                            color: 'var(--success-text)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          Activadas
                        </span>
                      ) : pushPermission === 'denied' ? (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--danger-bg-strong)',
                            color: 'var(--danger-text)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          Bloqueadas
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          Inactivas
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {role === 'athlete'
                        ? 'Recibí recordatorios matutinos de tu check-in diario y avisos de nuevas rutinas aunque no tengas la app abierta.'
                        : 'Recibí alertas inmediatas de sobrecarga o dolor de tus atletas directamente en el sistema operativo.'}
                    </p>
                  </div>

                  {pushSupported ? (
                    <button
                      type="button"
                      onClick={handleTogglePush}
                      disabled={pushLoading || pushPermission === 'denied'}
                      className={`btn ${pushSubscribed ? 'btn-secondary' : 'btn-primary'}`}
                      style={{
                        padding: '0.55rem 1rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        whiteSpace: 'nowrap',
                      }}
                      title={
                        pushPermission === 'denied'
                          ? 'Permiso bloqueado en el navegador'
                          : pushSubscribed
                            ? 'Desactivar notificaciones en este dispositivo'
                            : 'Activar recordatorios y notificaciones push'
                      }
                    >
                      {pushLoading ? (
                        <>
                          <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Procesando...</span>
                        </>
                      ) : pushSubscribed ? (
                        <>
                          <BellOff size={15} />
                          <span>Desactivar Push</span>
                        </>
                      ) : (
                        <>
                          <BellRing size={15} />
                          <span>Activar Recordatorios</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      Web Push no compatible en este navegador.
                    </span>
                  )}
                </div>

                {pushFeedback && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      background:
                        pushFeedback.type === 'success'
                          ? 'var(--success-bg-strong)'
                          : 'var(--danger-bg-strong)',
                      color:
                        pushFeedback.type === 'success'
                          ? 'var(--success-text)'
                          : 'var(--danger-text)',
                      border: `1px solid ${
                        pushFeedback.type === 'success' ? 'var(--success)' : 'var(--danger)'
                      }`,
                    }}
                  >
                    {pushFeedback.type === 'success' ? (
                      <Check size={15} />
                    ) : (
                      <AlertTriangle size={15} />
                    )}
                    <span>{pushFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'roleOptions' && (
            <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: '0.35rem',
                  color: 'var(--text-main)',
                }}
              >
                {role === 'pf' ? 'Ajustes del Cuerpo Técnico' : 'Ficha y Contacto Médico'}
              </h2>
              <p
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}
              >
                {role === 'pf'
                  ? 'Configuración de permisos y organizaciones a tu cargo.'
                  : 'Datos de emergencia para el protocolo de seguridad médica deportiva.'}
              </p>

              {role === 'pf' ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    maxWidth: '520px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '0.35rem',
                      }}
                    >
                      Organización Predeterminada
                    </label>
                    <select
                      defaultValue="Club Social y Deportivo"
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontWeight: 600,
                      }}
                    >
                      <option value="Club Social y Deportivo">Club Atlético Quilmes</option>
                      <option value="Academia ProTraining">Academia ProTraining Central</option>
                    </select>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Puedes gestionar más clubes desde la sección <strong>Organizaciones</strong> en
                    la barra lateral.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    maxWidth: '520px',
                  }}
                >
                  <div>
                    <label
                      htmlFor="set-emerg"
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '0.35rem',
                      }}
                    >
                      Contacto de Emergencia
                    </label>
                    <input
                      id="set-emerg"
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                    />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Esta información es visible para el cuerpo técnico en caso de requerir
                    asistencia urgente.
                  </p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SettingsView;

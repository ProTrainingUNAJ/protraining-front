import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  User,
  Bell,
  Palette,
  Check,
  Save,
  Laptop,
  Sun,
  Moon,
  BellRing,
  BellOff,
  RefreshCw,
  AlertTriangle,
  Award,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../shell/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../api/users';
import { validateTelegramUsername } from '../../utils/telegram';
import { structureService } from '../../api/structureService';
import { ATHLETIC_GOAL_OPTIONS, ATHLETE_GENDER_OPTIONS, UpdatePhysicalProfileRequest } from '../../types/structure';
import { PhotoUploadControl } from '../common/PhotoUploadControl';
import { AthleteMarksSection } from './AthleteMarksSection';
import { ChangePasswordSection } from './ChangePasswordSection';
import { GoogleAccountLinkSection } from './GoogleAccountLinkSection';
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

type SettingsTab =
  'profile' | 'security' | 'appearance' | 'notifications' | 'roleOptions' | 'marks';

export const SettingsView: React.FC<SettingsViewProps> = ({ role }) => {
  const { user, themePreference, setThemePreference, updateCurrentUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep link del inicio del atleta: /athlete/settings?tab=marcas (KAN-417).
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tabParam = searchParams.get('tab');
    if (role === 'athlete' && (tabParam === 'marcas' || tabParam === 'marks')) {
      return 'marks';
    }
    if (tabParam === 'seguridad' || tabParam === 'security') {
      return 'security';
    }
    return 'profile';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'marks') {
      next.set('tab', 'marcas');
    } else if (tab === 'security') {
      next.set('tab', 'seguridad');
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  // Form states
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const email = user?.email ?? '';
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [telegramUsername, setTelegramUsername] = useState(user?.telegramUsername ?? '');
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Modal y estado de baja lógica / desactivación de cuenta (KAN-601 / KAN-602)
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const [prevUserId, setPrevUserId] = useState(user?.id);
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    if (user?.fullName) setFullName(user.fullName);
    if (user?.phoneNumber) setPhone(user.phoneNumber);
    setTelegramUsername(user?.telegramUsername ?? '');
  }

  const [athleteId, setAthleteId] = useState<string | null>(null);

  // Perfil físico y datos personales del atleta (KAN-479 / KAN-664 / KAN-660)
  const [athleteWeight, setAthleteWeight] = useState<string>('');
  const [athleteGoal, setAthleteGoal] = useState<string>('Objetivo no informado');
  const [athleteBirthDate, setAthleteBirthDate] = useState<string>('');
  const [athleteGender, setAthleteGender] = useState<string>('');
  const [physicalSaving, setPhysicalSaving] = useState(false);
  const [physicalSuccess, setPhysicalSuccess] = useState(false);
  const [physicalError, setPhysicalError] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'athlete') {
      structureService
        .getMe()
        .then((me) => {
          if (me?.athleteId) {
            setAthleteId(me.athleteId);
          }
          if (me?.weightKg !== undefined && me?.weightKg !== null) {
            setAthleteWeight(String(me.weightKg));
          }
          if (me?.athleticGoal) {
            setAthleteGoal(me.athleticGoal);
          }
          if (me?.birthDate) {
            setAthleteBirthDate(me.birthDate.split('T')[0]);
          }
          if (me?.gender) {
            setAthleteGender(me.gender);
          }
        })
        .catch(() => {});
    }
  }, [role]);

  const [habitsEnabled, setHabitsEnabled] = useState(true);
  const [habitsLoading, setHabitsLoading] = useState(role === 'pf');
  const [habitsError, setHabitsError] = useState<string | null>(null);

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

  const isPushActive = pushSubscribed;

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      if (isPushActive) {
        await unsubscribeUserFromPush();
        setPushSubscribed(false);
        setPushPermission(getNotificationPermission());
        setPushFeedback({
          type: 'success',
          message: 'Notificaciones desactivadas para este navegador.',
        });
      } else {
        const sub = await subscribeUserToPush();
        const currentPerm = getNotificationPermission();
        setPushPermission(currentPerm);
        if (sub || currentPerm === 'granted') {
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

  useEffect(() => {
    if (role !== 'pf') return;
    let isMounted = true;
    usersService
      .getPfHabitsRecommendations()
      .then((result) => {
        if (isMounted) setHabitsEnabled(result.enabled);
      })
      .catch((err: unknown) => {
        if (isMounted)
          setHabitsError(err instanceof Error ? err.message : 'Error al cargar la preferencia');
      })
      .finally(() => {
        if (isMounted) setHabitsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [role]);

  const handleToggleHabits = async () => {
    const next = !habitsEnabled;
    setHabitsEnabled(next);
    setHabitsError(null);
    try {
      const result = await usersService.updatePfHabitsRecommendations(next);
      setHabitsEnabled(result.enabled);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: unknown) {
      setHabitsEnabled(!next);
      setHabitsError(err instanceof Error ? err.message : 'Error al guardar la preferencia');
    }
  };

  const handleSavePhysicalProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanWeight = athleteWeight.trim() ? parseFloat(athleteWeight.trim()) : null;
    if (cleanWeight !== null && (isNaN(cleanWeight) || cleanWeight <= 0 || cleanWeight > 300)) {
      setPhysicalError('Ingresá un peso válido en kilogramos (entre 30 y 300 kg).');
      return;
    }

    setPhysicalSaving(true);
    setPhysicalError(null);
    setPhysicalSuccess(false);

    try {
      const payload: UpdatePhysicalProfileRequest = {
        weightKg: cleanWeight,
        athleticGoal: athleteGoal.trim() || null,
        ...(athleteBirthDate.trim() ? { birthDate: athleteBirthDate.trim() } : {}),
        ...(athleteGender.trim() ? { gender: athleteGender.trim() } : {}),
      };
      await structureService.updateMyPhysicalProfile(payload);
      setPhysicalSuccess(true);
      setTimeout(() => setPhysicalSuccess(false), 3000);
    } catch (err: unknown) {
      setPhysicalError(
        err instanceof Error ? err.message : 'No se pudo actualizar el perfil físico.',
      );
    } finally {
      setPhysicalSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    setTelegramError(null);
    setProfileError(null);

    if (role === 'pf') {
      const tgValidationError = validateTelegramUsername(telegramUsername);
      if (tgValidationError) {
        setTelegramError(tgValidationError);
        return;
      }

      try {
        setProfileSaving(true);
        const result = await usersService.updateProfile({
          fullName,
          phone: phone ? phone : null,
          telegramUsername: telegramUsername.trim() ? telegramUsername.trim() : '',
        });

        // Actualizamos estado local y sincronizamos con el contexto de auth
        setFullName(result.fullName);
        setPhone(result.phoneNumber ?? '');
        setTelegramUsername(result.telegramUsername ?? '');
        if (updateCurrentUser) {
          updateCurrentUser({
            fullName: result.fullName,
            phoneNumber: result.phoneNumber,
            telegramUsername: result.telegramUsername,
          });
        }

        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
        }, 3000);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Error al guardar los cambios de perfil';
        setProfileError(errorMsg);
      } finally {
        setProfileSaving(false);
      }
    } else {
      const tgValidationError = validateTelegramUsername(telegramUsername);
      if (tgValidationError) {
        setTelegramError(tgValidationError);
        return;
      }

      try {
        setProfileSaving(true);
        const result = await usersService.updateMyTelegram(
          telegramUsername.trim() ? telegramUsername.trim() : null,
        );
        setTelegramUsername(result.telegramUsername ?? '');
        if (updateCurrentUser) {
          updateCurrentUser({
            telegramUsername: result.telegramUsername ?? null,
          });
        }
        await handleSavePhysicalProfile();
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
        }, 3000);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Error al guardar el usuario de Telegram';
        setProfileError(errorMsg);
      } finally {
        setProfileSaving(false);
      }
    }
  };

  const handleConfirmDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivatePassword) {
      setDeactivateError('Ingresá tu contraseña para confirmar.');
      return;
    }

    setDeactivateLoading(true);
    setDeactivateError(null);

    try {
      await usersService.deactivateAccount(deactivatePassword);
      setDeactivateModalOpen(false);
      logout();
      window.location.href = '/login';
    } catch (err: unknown) {
      setDeactivateError(
        err instanceof Error
          ? err.message
          : 'Contraseña incorrecta o error al desactivar la cuenta.',
      );
    } finally {
      setDeactivateLoading(false);
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
            disabled={profileSaving}
            title="Guardar cambios de perfil"
          >
            <Save size={16} aria-hidden="true" />
            <span>{profileSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        }
      />

      <div className="app-page-body">
        {/* Pestañas de Navegación de Configuración */}
        <div
          className="card settings-tab-list"
          role="tablist"
          aria-label="Pestañas de configuración"
        >
          <button
            id="tab-profile"
            type="button"
            role="tab"
            aria-selected={activeTab === 'profile'}
            aria-controls="tabpanel-profile"
            onClick={() => selectTab('profile')}
            className={`btn settings-tab-btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <User size={16} />
            <span>Perfil</span>
          </button>

          <button
            id="tab-security"
            type="button"
            role="tab"
            aria-selected={activeTab === 'security'}
            aria-controls="tabpanel-security"
            onClick={() => selectTab('security')}
            className={`btn settings-tab-btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Shield size={16} />
            <span>Seguridad</span>
          </button>

          <button
            id="tab-appearance"
            type="button"
            role="tab"
            aria-selected={activeTab === 'appearance'}
            aria-controls="tabpanel-appearance"
            onClick={() => selectTab('appearance')}
            className={`btn settings-tab-btn ${activeTab === 'appearance' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Palette size={16} />
            <span>Apariencia</span>
          </button>

          <button
            id="tab-notifications"
            type="button"
            role="tab"
            aria-selected={activeTab === 'notifications'}
            aria-controls="tabpanel-notifications"
            onClick={() => selectTab('notifications')}
            className={`btn settings-tab-btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Bell size={16} />
            <span>Notificaciones</span>
          </button>

          {role === 'athlete' && (
            <button
              id="tab-marks"
              type="button"
              role="tab"
              aria-selected={activeTab === 'marks'}
              aria-controls="tabpanel-marks"
              onClick={() => selectTab('marks')}
              className={`btn settings-tab-btn ${activeTab === 'marks' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Award size={16} />
              <span>Mis marcas</span>
            </button>
          )}
        </div>

        {/* Contenedor con altura mínima común y transición suave (KAN-598) */}
        <div className="settings-tab-container">
          {/* Aviso de Éxito al guardar */}
          {savedSuccess && (
            <div className="alert-banner success" role="alert">
              <Check size={18} aria-hidden="true" />
              <span>Los cambios de configuración se han guardado exitosamente.</span>
            </div>
          )}

          <div
            key={activeTab}
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            className="settings-tab-panel"
          >
            {activeTab === 'marks' ? (
              <AthleteMarksSection />
            ) : (
              <>
                {activeTab === 'profile' && (
                  <>
                    <form onSubmit={handleSave}>
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
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem',
                          }}
                        >
                          Datos personales asociados a tu usuario en la plataforma.
                        </p>

                        {/* ── Foto de perfil (WebP, KAN-512) ── */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            padding: '1.25rem',
                            marginBottom: '1.5rem',
                            borderRadius: '12px',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <PhotoUploadControl
                            currentPhotoUrl={
                              role === 'athlete' && athleteId
                                ? structureService.getAthletePhotoUrl(athleteId)
                                : user?.id
                                  ? usersService.getMyPhotoUrl(user.id)
                                  : null
                            }
                            name={fullName || 'Usuario'}
                            size={84}
                            onUpload={async (file) => {
                              await usersService.uploadMyPhoto(file);
                              if (role === 'athlete') {
                                try {
                                  const me = await structureService.getMe();
                                  if (me?.athleteId) {
                                    await structureService.uploadAthletePhoto(me.athleteId, file);
                                  }
                                } catch {
                                  // Silencioso si falla la réplica a estructura
                                }
                              }
                            }}
                            onDelete={async () => {
                              await usersService.deleteMyPhoto();
                              if (role === 'athlete') {
                                try {
                                  const me = await structureService.getMe();
                                  if (me?.athleteId) {
                                    await structureService.deleteAthletePhoto(me.athleteId);
                                  }
                                } catch {
                                  // Silencioso si falla la réplica a estructura
                                }
                              }
                            }}
                          />

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
                              Subí una foto clara de tu rostro (JPG, PNG o WebP).
                            </p>
                          </div>
                        </div>

                        {profileError && (
                          <div
                            className="alert-box alert-danger"
                            style={{ marginBottom: '1.25rem' }}
                            role="alert"
                          >
                            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{profileError}</span>
                          </div>
                        )}

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
                              value={fullName}
                              onChange={(e) => {
                                setFullName(e.target.value);
                                if (profileError) setProfileError(null);
                              }}
                              readOnly={role !== 'pf'}
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
                            <input id="set-email" type="email" value={email} readOnly required />
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
                              placeholder={role === 'pf' ? '+54 9 11 2345-6789' : 'Sin cargar'}
                              readOnly={role !== 'pf'}
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
                              htmlFor="set-telegram"
                              style={{
                                display: 'block',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                marginBottom: '0.35rem',
                              }}
                            >
                              Usuario de Telegram (opcional)
                            </label>
                            <input
                              id="set-telegram"
                              type="text"
                              value={telegramUsername}
                              onChange={(e) => {
                                setTelegramUsername(e.target.value);
                                if (telegramError) setTelegramError(null);
                              }}
                              placeholder={role === 'pf' ? '@profe_juan' : '@lucas_atleta'}
                            />
                            {telegramError && (
                              <span
                                style={{
                                  display: 'block',
                                  color: 'var(--danger-text)',
                                  fontSize: '0.85rem',
                                  marginTop: '0.35rem',
                                }}
                                role="alert"
                              >
                                {telegramError}
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
                                role === 'pf'
                                  ? 'Preparador Físico (Staff Técnico)'
                                  : 'Atleta Registrado'
                              }
                              disabled
                              style={{ opacity: 0.75, cursor: 'not-allowed' }}
                            />
                          </div>
                        </div>
                      </div>

                      {role === 'pf' && (
                        <div className="card" style={{ margin: '1.25rem 0 0', padding: '1.5rem' }}>
                          <h2
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 700,
                              marginBottom: '0.35rem',
                              color: 'var(--text-main)',
                            }}
                          >
                            Recomendaciones de hábitos y alimentación
                          </h2>
                          <p
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.85rem',
                              marginBottom: '1.25rem',
                            }}
                          >
                            Activá o desactivá las recomendaciones de hábitos y alimentación para
                            tus atletas.
                          </p>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div>
                              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                Recomendaciones habilitadas
                              </strong>
                              <p
                                style={{
                                  margin: '0.25rem 0 0',
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {habitsLoading
                                  ? 'Cargando preferencia...'
                                  : habitsEnabled
                                    ? 'Sí'
                                    : 'No'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleToggleHabits}
                              disabled={habitsLoading}
                              className={`btn ${habitsEnabled ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ minWidth: '96px' }}
                            >
                              {habitsEnabled ? 'Sí' : 'No'}
                            </button>
                          </div>

                          {habitsError && (
                            <span
                              style={{
                                display: 'block',
                                color: 'var(--danger-text)',
                                fontSize: '0.85rem',
                                marginTop: '0.75rem',
                              }}
                              role="alert"
                            >
                              {habitsError}
                            </span>
                          )}
                        </div>
                      )}

                      {role === 'athlete' && (
                        <div className="card" style={{ margin: '1.25rem 0 0', padding: '1.5rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              marginBottom: '0.35rem',
                            }}
                          >
                            <Activity size={20} color="var(--primary)" aria-hidden="true" />
                            <h2
                              style={{
                                fontSize: '1.15rem',
                                fontWeight: 700,
                                margin: 0,
                                color: 'var(--text-main)',
                              }}
                            >
                              Perfil Físico y Nutrición
                            </h2>
                          </div>
                          <p
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.85rem',
                              marginBottom: '1.25rem',
                            }}
                          >
                            Tu peso corporal y objetivo deportivo son utilizados por tu preparador
                            físico y el Asistente en Hábitos y Alimentación para calcular el
                            requerimiento proteico diario e hidratación personalizada.
                          </p>

                          {physicalError && (
                            <div
                              className="alert-banner danger"
                              role="alert"
                              style={{ marginBottom: '1rem' }}
                            >
                              <AlertCircle size={16} aria-hidden="true" />
                              <span>{physicalError}</span>
                            </div>
                          )}

                          {physicalSuccess && (
                            <div
                              className="alert-banner success"
                              role="alert"
                              style={{ marginBottom: '1rem' }}
                            >
                              <Check size={16} aria-hidden="true" />
                              <span>Perfil físico actualizado correctamente.</span>
                            </div>
                          )}

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                              gap: '1.25rem',
                              marginBottom: '1.25rem',
                            }}
                          >
                            <div>
                              <label
                                htmlFor="athlete-weight"
                                style={{
                                  display: 'block',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: '0.35rem',
                                }}
                              >
                                Peso Corporal (kg)
                              </label>
                              <input
                                id="athlete-weight"
                                type="number"
                                step="0.1"
                                min="30"
                                max="300"
                                placeholder="Ej: 78.5"
                                value={athleteWeight}
                                onChange={(e) => {
                                  setAthleteWeight(e.target.value);
                                  if (physicalError) setPhysicalError(null);
                                }}
                                data-testid="athlete-weight-input"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="athlete-goal"
                                style={{
                                  display: 'block',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: '0.35rem',
                                }}
                              >
                                Objetivo Deportivo
                              </label>
                              <select
                                id="athlete-goal"
                                value={athleteGoal}
                                onChange={(e) => {
                                  setAthleteGoal(e.target.value);
                                  if (physicalError) setPhysicalError(null);
                                }}
                                data-testid="athlete-goal-select"
                              >
                                {ATHLETIC_GOAL_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="athlete-birth-date"
                                style={{
                                  display: 'block',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: '0.35rem',
                                }}
                              >
                                Fecha de Nacimiento
                              </label>
                              <input
                                id="athlete-birth-date"
                                type="date"
                                value={athleteBirthDate}
                                onChange={(e) => {
                                  setAthleteBirthDate(e.target.value);
                                  if (physicalError) setPhysicalError(null);
                                }}
                                data-testid="athlete-birthdate-input"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="athlete-gender"
                                style={{
                                  display: 'block',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: '0.35rem',
                                }}
                              >
                                Género
                              </label>
                              <select
                                id="athlete-gender"
                                value={athleteGender}
                                onChange={(e) => {
                                  setAthleteGender(e.target.value);
                                  if (physicalError) setPhysicalError(null);
                                }}
                                data-testid="athlete-gender-select"
                              >
                                <option value="">Seleccionar género...</option>
                                {ATHLETE_GENDER_OPTIONS.map((gender) => (
                                  <option key={gender} value={gender}>
                                    {gender}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSavePhysicalProfile}
                            disabled={physicalSaving}
                            data-testid="save-athlete-physical-btn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            {physicalSaving ? (
                              <Loader2 size={16} className="spin" aria-hidden="true" />
                            ) : (
                              <Save size={16} aria-hidden="true" />
                            )}
                            <span>{physicalSaving ? 'Guardando...' : 'Guardar perfil físico'}</span>
                          </button>
                        </div>
                      )}
                    </form>
                  </>
                )}

                {activeTab === 'security' && (
                  <>
                    <GoogleAccountLinkSection />
                    <ChangePasswordSection />

                    {/* Zona de peligro: Baja lógica / Desactivación de cuenta (KAN-601 / KAN-602) */}
                    {role === 'pf' && (
                      <div
                        className="card"
                        style={{
                          margin: 0,
                          padding: '1.5rem',
                          border: '1px solid var(--danger-border)',
                          background: 'var(--bg-card)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            marginBottom: '0.35rem',
                          }}
                        >
                          <AlertTriangle size={20} color="var(--danger-text)" aria-hidden="true" />
                          <h2
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 700,
                              margin: 0,
                              color: 'var(--danger-text)',
                            }}
                          >
                            Zona de Peligro
                          </h2>
                        </div>
                        <p
                          style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.85rem',
                            marginBottom: '1.25rem',
                            lineHeight: 1.45,
                          }}
                        >
                          Desactivar tu cuenta revocará inmediatamente todas tus sesiones activas y
                          tu acceso a la plataforma.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            setDeactivateError(null);
                            setDeactivatePassword('');
                            setDeactivateModalOpen(true);
                          }}
                          className="btn"
                          id="btn-open-deactivate-account"
                          style={{
                            background: 'var(--danger-bg)',
                            color: 'var(--danger-text)',
                            border: '1px solid var(--danger-border)',
                            padding: '0.55rem 1.15rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          Desactivar mi cuenta
                        </button>
                      </div>
                    )}

                    {/* Modal de confirmación de desactivación */}
                    {deactivateModalOpen && (
                      <div
                        className="auth-info-modal-backdrop"
                        style={{
                          position: 'fixed',
                          inset: 0,
                          background: 'var(--overlay)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1rem',
                          zIndex: 1000,
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deactivate-modal-title"
                      >
                        <div
                          className="card"
                          style={{
                            maxWidth: '440px',
                            width: '100%',
                            margin: 0,
                            padding: '1.75rem',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius)',
                            boxShadow: 'var(--shadow-lg)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '1rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <AlertTriangle
                                size={20}
                                color="var(--danger-text)"
                                aria-hidden="true"
                              />
                              <h3
                                id="deactivate-modal-title"
                                style={{
                                  margin: 0,
                                  fontSize: '1.15rem',
                                  fontWeight: 700,
                                  color: 'var(--text-main)',
                                }}
                              >
                                ¿Desactivar tu cuenta?
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDeactivateModalOpen(false)}
                              disabled={deactivateLoading}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-muted)',
                              }}
                              aria-label="Cerrar modal"
                            >
                              <X size={18} />
                            </button>
                          </div>

                          <p
                            style={{
                              fontSize: '0.88rem',
                              color: 'var(--text-muted)',
                              lineHeight: 1.45,
                              marginBottom: '1.25rem',
                            }}
                          >
                            Esta acción dará de baja tu cuenta y cerrará todas tus sesiones
                            abiertas. Para reactivarla deberás comunicarte con el equipo de soporte.
                          </p>

                          {deactivateError && (
                            <div
                              className="alert-box alert-danger"
                              style={{
                                marginBottom: '1rem',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.82rem',
                              }}
                              role="alert"
                            >
                              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{deactivateError}</span>
                            </div>
                          )}

                          <form onSubmit={handleConfirmDeactivate}>
                            <div style={{ marginBottom: '1.25rem' }}>
                              <label
                                htmlFor="deactivate-confirm-password"
                                style={{
                                  display: 'block',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  marginBottom: '0.35rem',
                                  color: 'var(--text-main)',
                                }}
                              >
                                Confirmá con tu contraseña actual
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  id="deactivate-confirm-password"
                                  type={showDeactivatePassword ? 'text' : 'password'}
                                  value={deactivatePassword}
                                  onChange={(e) => {
                                    setDeactivatePassword(e.target.value);
                                    if (deactivateError) setDeactivateError(null);
                                  }}
                                  disabled={deactivateLoading}
                                  required
                                  placeholder="Tu contraseña"
                                  style={{
                                    width: '100%',
                                    padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    boxSizing: 'border-box',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                                  style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                  }}
                                  title={
                                    showDeactivatePassword ? 'Ocultar contraseña' : 'Ver contraseña'
                                  }
                                  aria-label={
                                    showDeactivatePassword ? 'Ocultar contraseña' : 'Ver contraseña'
                                  }
                                >
                                  {showDeactivatePassword ? (
                                    <EyeOff size={16} />
                                  ) : (
                                    <Eye size={16} />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '0.75rem',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setDeactivateModalOpen(false)}
                                disabled={deactivateLoading}
                                className="btn btn-secondary"
                                style={{
                                  borderRadius: '8px',
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.85rem',
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                disabled={deactivateLoading}
                                className="btn"
                                id="btn-confirm-deactivate-submit"
                                style={{
                                  background: 'var(--danger-bg)',
                                  color: 'var(--danger-text)',
                                  border: '1px solid var(--danger-border)',
                                  borderRadius: '8px',
                                  padding: '0.5rem 1rem',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {deactivateLoading ? 'Desactivando…' : 'Confirmar Desactivación'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'appearance' && (
                  <form onSubmit={handleSave}>
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
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          marginBottom: '1.5rem',
                        }}
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
                              style={{
                                fontSize: '0.95rem',
                                color: 'var(--text-main)',
                                display: 'block',
                              }}
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
                                  themePreference === 'system'
                                    ? 'var(--secondary)'
                                    : 'var(--border)'
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
                                      themePreference === 'system'
                                        ? 'var(--secondary)'
                                        : 'var(--bg-card)',
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
                                <strong style={{ fontSize: '0.88rem', display: 'block' }}>
                                  Sistema
                                </strong>
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
                                      themePreference === 'light'
                                        ? 'var(--secondary)'
                                        : 'var(--bg-card)',
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
                                <strong style={{ fontSize: '0.88rem', display: 'block' }}>
                                  Claro
                                </strong>
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
                                  themePreference === 'dark'
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
                                      themePreference === 'dark'
                                        ? 'var(--secondary)'
                                        : 'var(--bg-card)',
                                    color:
                                      themePreference === 'dark'
                                        ? 'var(--on-primary)'
                                        : 'var(--text-main)',
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
                                <strong style={{ fontSize: '0.88rem', display: 'block' }}>
                                  Oscuro
                                </strong>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Descanso visual
                                </span>
                              </div>
                            </button>
                          </div>
                        </div>

                        <div
                          style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}
                        >
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
                            value="es"
                            disabled
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border)',
                              background: 'var(--bg-subtle)',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                              cursor: 'not-allowed',
                            }}
                            title="ProTraining está disponible únicamente en Español"
                          >
                            <option value="es">Español (Latinoamérica)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {activeTab === 'notifications' && (
                  <form onSubmit={handleSave}>
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
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.85rem',
                          marginBottom: '1.5rem',
                        }}
                      >
                        Activá los recordatorios en este dispositivo para recibir los avisos del
                        día.
                      </p>

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
                              {isPushActive ? (
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
                              className={`btn ${isPushActive ? 'btn-secondary' : 'btn-primary'}`}
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
                                  : isPushActive
                                    ? 'Desactivar notificaciones en este dispositivo'
                                    : 'Activar recordatorios y notificaciones push'
                              }
                            >
                              {pushLoading ? (
                                <>
                                  <RefreshCw
                                    size={15}
                                    style={{ animation: 'spin 1s linear infinite' }}
                                  />
                                  <span>Procesando...</span>
                                </>
                              ) : isPushActive ? (
                                <>
                                  <BellOff size={15} />
                                  <span>Desactivar Recordatorios</span>
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
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;

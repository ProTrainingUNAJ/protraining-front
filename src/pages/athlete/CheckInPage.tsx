import React, { useState, useEffect, useCallback } from 'react';
import {
  Moon,
  BatteryCharging,
  ShieldAlert,
  Smile,
  CheckCircle2,
  Send,
  Activity,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  Brain,
  Bandage,
  Bell,
  BellRing,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/shell/PageHeader';
import { BodyMuscleMap } from '../../components/athlete/BodyMuscleMap';
import { MuscleMapFront } from '../../components/athlete/MuscleMapFront';
import { MuscleMapBack } from '../../components/athlete/MuscleMapBack';
import { WellnessCard } from '../../components/athlete/WellnessCard';
import {
  PROTRAINING_MUSCLES,
  PAIN_LEVELS,
  getPainColor,
} from '../../components/athlete/bodyMuscleData';
import {
  submitCheckIn,
  syncPendingCheckIns,
  countPendingCheckIns,
  discardPendingCheckInsForDate,
  CheckInSubmitResponse,
} from '../../api/seguimientoService';
import { todayInArgentina } from '../../utils/argentinaDate';
import { structureService } from '../../api/structureService';
import {
  subscribeUserToPush,
  isPushSupported,
  isUserSubscribed,
} from '../../api/pushNotifications';

const getCachedAthleteId = (userId?: string): string | null => {
  if (!userId) return null;
  try {
    return localStorage.getItem(`protraining_athlete_me_${userId}`);
  } catch {
    return null;
  }
};

const setCachedAthleteId = (userId: string, id: string) => {
  try {
    localStorage.setItem(`protraining_athlete_me_${userId}`, id);
  } catch {
    // Ignored in storage-restricted environments
  }
};

export const CheckInPage: React.FC = () => {
  const { user } = useAuth();
  const [athleteId, setAthleteId] = useState<string>(() => {
    return (
      (user?.id ? getCachedAthleteId(user.id) : null) || '99eedc58-65dd-4417-a087-e3cc03f01043'
    );
  });
  const [athleteResolutionError, setAthleteResolutionError] = useState<string | null>(null);

  // Synchronize athlete id from Structure microservice GET /api/v1/me (KAN-329)
  useEffect(() => {
    if (!user?.id) return;

    const cachedId = getCachedAthleteId(user.id);

    if (typeof navigator === 'undefined' || navigator.onLine) {
      structureService
        .getMe()
        .then((me) => {
          if (me?.athleteId) {
            setAthleteId(me.athleteId);
            setCachedAthleteId(user.id, me.athleteId);
            setAthleteResolutionError(null);
          }
        })
        .catch((err: unknown) => {
          // If no cached ID and request fails, advise the user
          if (!cachedId) {
            const msg =
              err instanceof Error
                ? err.message
                : 'No se pudo obtener el identificador del atleta vinculado a la cuenta.';
            setAthleteResolutionError(msg);
          }
        });
    }
  }, [user?.id]);

  // Check-in metrics state
  const [sleepHours, setSleepHours] = useState<number>(8);
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [fatigueLevel, setFatigueLevel] = useState<number>(2);
  const [muscleSoreness, setMuscleSoreness] = useState<number>(1);
  const [moodRate, setMoodRate] = useState<number>(4);
  const [stressLevel, setStressLevel] = useState<number>(2);
  const [isSick, setIsSick] = useState<boolean>(false);
  const [hasActiveInjury, setHasActiveInjury] = useState<boolean>(false);
  const [musclePains, setMusclePains] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  // Submission & Offline State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<CheckInSubmitResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Web Push reminder subscription state
  const [pushSupported] = useState<boolean>(() => isPushSupported());
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

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

  const handleActivatePush = async () => {
    setPushLoading(true);
    setPushFeedback(null);
    try {
      const sub = await subscribeUserToPush();
      if (sub) {
        setPushSubscribed(true);
        setPushFeedback('¡Recordatorios diarios activados en este dispositivo!');
      } else {
        setPushFeedback('Permiso no concedido para notificaciones en el navegador.');
      }
    } catch {
      setPushFeedback('No se pudo completar el registro de notificaciones.');
    } finally {
      setPushLoading(false);
    }
  };

  // Synchronize pending records from IndexedDB
  const handleSyncPending = useCallback(async () => {
    if (isSyncing) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const count = await syncPendingCheckIns(athleteId);
      const remaining = await countPendingCheckIns(athleteId);
      setPendingOfflineCount(remaining);
      if (count > 0) {
        setSyncFeedback(`Se sincronizaron con éxito ${count} reporte(s) pendiente(s).`);
      }
    } catch {
      setSyncFeedback('No se pudo completar la sincronización. Se reintentará al reconectar.');
    } finally {
      setIsSyncing(false);
    }
  }, [athleteId, isSyncing]);

  // Listen for online/offline browser events
  useEffect(() => {
    let mounted = true;

    const handleOnline = () => {
      setIsOnline(true);
      void handleSyncPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    countPendingCheckIns(athleteId)
      .then((count) => {
        if (!mounted) return;
        setPendingOfflineCount(count);
      })
      .catch(() => {
        // Ignored
      });

    // Si la página se abre ya online con pendientes (p. ej. app cerrada offline y
    // reabierta al día siguiente), sincronizar de una vez (KAN-149).
    // Se difiere con setTimeout para no llamar a setState sincrónicamente dentro del efecto.
    let syncTimer: ReturnType<typeof setTimeout> | undefined;
    if (typeof navigator === 'undefined' || navigator.onLine) {
      syncTimer = setTimeout(() => {
        void handleSyncPending();
      }, 0);
    }

    return () => {
      mounted = false;
      if (syncTimer) clearTimeout(syncTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [athleteId, handleSyncPending]);

  const reportedPains = Object.entries(musclePains).filter(([, lvl]) => lvl > 0);
  const reportedCount = reportedPains.length;

  const handlePainChange = (muscleId: string, level: number) => {
    setMusclePains((prev) => {
      const next = { ...prev };
      if (level <= 0) {
        delete next[muscleId];
      } else {
        next[muscleId] = level;
      }
      return next;
    });
  };

  const handleClearPains = () => {
    setMusclePains({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    if (athleteResolutionError) {
      setErrorMessage(`No se puede registrar el check-in: ${athleteResolutionError}`);
      setIsSubmitting(false);
      return;
    }

    // Sin conexión y sin atleta resuelto: no se puede guardar con un id de placeholder,
    // porque la sincronización luego fallaría con 404 para siempre (KAN-149).
    const cachedAthleteId = user?.id ? getCachedAthleteId(user.id) : null;
    if ((typeof navigator === 'undefined' || !navigator.onLine) && !cachedAthleteId) {
      setErrorMessage(
        'No se pudo resolver tu atleta sin conexión. Conectate una vez y volvé a intentar.',
      );
      setIsSubmitting(false);
      return;
    }

    // Format pain zones: "Quadriceps:2,Hamstrings:1"
    const painZones =
      reportedPains.length > 0
        ? reportedPains.map(([mId, lvl]) => `${mId}:${lvl}`).join(',')
        : null;

    try {
      const response = await submitCheckIn(athleteId, {
        sleepHours,
        sleepQuality,
        muscleSoreness,
        fatigueLevel,
        moodRate,
        stressLevel,
        isSick,
        painZones,
        hasActiveInjury,
      });

      setSubmissionResult(response);
      // Si el check-in se hizo online, cualquier pendiente del mismo día queda obsoleto
      // y se descarta para que no pise el recién guardado (KAN-149).
      if (!response.isOffline) {
        await discardPendingCheckInsForDate(athleteId, todayInArgentina());
      }
      const remaining = await countPendingCheckIns(athleteId);
      setPendingOfflineCount(remaining);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el check-in';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Human-readable labels for badges
  const getSleepQualityLabel = (val: number) => {
    const map: Record<number, string> = {
      1: 'Pésima',
      2: 'Mala',
      3: 'Regular',
      4: 'Buena',
      5: 'Excelente',
    };
    return map[val] || `${val}`;
  };

  const getFatigueLabel = (val: number) => {
    const map: Record<number, string> = {
      1: 'Enérgico',
      2: 'Fresco',
      3: 'Moderada',
      4: 'Alta',
      5: 'Agotado',
    };
    return map[val] || `${val}`;
  };

  const getSorenessLabel = (val: number) => {
    const map: Record<number, string> = {
      1: 'Sin dolor',
      2: 'Leve',
      3: 'Molestia',
      4: 'Fuerte',
      5: 'Severo',
    };
    return map[val] || `${val}`;
  };

  const getMoodLabel = (val: number) => {
    const map: Record<number, string> = {
      1: 'Desanimado',
      2: 'Regular',
      3: 'Normal',
      4: 'Motivado',
      5: 'Excelente',
    };
    return map[val] || `${val}`;
  };

  const getStressLabel = (val: number) => {
    const map: Record<number, string> = {
      1: 'Muy bajo',
      2: 'Bajo',
      3: 'Moderado',
      4: 'Alto',
      5: 'Muy alto',
    };
    return map[val] || `${val}`;
  };

  const getTrafficLightBadge = (light?: 'Green' | 'Yellow' | 'Red') => {
    switch (light) {
      case 'Green':
        return {
          label: 'Semáforo Verde · Apto completo',
          bg: 'var(--success-bg-strong)',
          color: 'var(--success-text)',
          border: 'var(--success)',
        };
      case 'Yellow':
        return {
          label: 'Semáforo Amarillo · Atención / Carga moderada',
          bg: 'var(--warning-bg-strong)',
          color: 'var(--warning-text)',
          border: 'var(--warning)',
        };
      case 'Red':
        return {
          label: 'Semáforo Rojo · Cuidado / Alerta técnica',
          bg: 'var(--danger-bg-strong)',
          color: 'var(--danger-text)',
          border: 'var(--danger)',
        };
      default:
        return {
          label: 'Registrado con éxito',
          bg: 'var(--info-bg)',
          color: 'var(--info-text)',
          border: 'var(--border)',
        };
    }
  };

  return (
    <div className="app-page-container">
      {/* ── SECCIÓN A: ENCABEZADO COMPACTO ── */}
      <PageHeader
        title="Check-in Diario"
        description="Registrá cómo te sentís hoy y señalá tus molestias."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={handleSyncPending}
                disabled={!isOnline || isSyncing}
                className="badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  background: 'var(--info-bg)',
                  color: 'var(--info-text)',
                  border: '1px solid var(--secondary)',
                  cursor: isOnline ? 'pointer' : 'default',
                  fontSize: '0.75rem',
                }}
                title="Presiona para sincronizar con el servidor"
              >
                <RefreshCw
                  size={11}
                  style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}
                />
                <span>{pendingOfflineCount} en cola</span>
              </button>
            )}

            <span
              style={{
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                margin: 0,
              }}
            >
              {submissionResult ? 'Completado' : 'Pendiente de hoy'}
            </span>
          </div>
        }
      />

      <div
        className="app-page-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Sync feedback notification */}
        {syncFeedback && (
          <div
            style={{
              background: 'var(--success-bg-strong)',
              color: 'var(--success-text)',
              border: '1px solid var(--success-border)',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div
            style={{
              background: 'var(--danger-bg-strong)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Athlete resolution error (KAN-329) */}
        {athleteResolutionError && !errorMessage && (
          <div
            style={{
              background: 'var(--danger-bg-strong)',
              color: 'var(--danger-text)',
              border: '1px solid var(--danger)',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={16} />
            <span>{athleteResolutionError}</span>
          </div>
        )}

        {submissionResult ? (
          /* ── PANTALLA DE CONFIRMACIÓN ── */
          <div
            className="card"
            style={{ margin: 0, padding: '2.5rem 1.5rem', textAlign: 'center' }}
          >
            <CheckCircle2 size={54} style={{ color: 'var(--success)', margin: '0 auto 1.25rem' }} />
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                margin: '0 0 0.5rem',
                color: 'var(--text-main)',
              }}
            >
              ¡Check-in completado con éxito!
            </h2>

            {/* Traffic light badge from backend engine */}
            {(() => {
              const badge = getTrafficLightBadge(submissionResult.trafficLight);
              return (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 1.1rem',
                    borderRadius: '9999px',
                    background: badge.bg,
                    color: badge.color,
                    border: `1.5px solid ${badge.border}`,
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    margin: '0.5rem auto 1.25rem',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: badge.color,
                    }}
                  />
                  <span>{badge.label}</span>
                </div>
              );
            })()}

            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                maxWidth: '540px',
                margin: '0 auto 1.5rem',
                lineHeight: 1.5,
              }}
            >
              {submissionResult.isOffline
                ? 'Tu check-in se guardó en el almacenamiento local de tu dispositivo. Se transmitirá automáticamente al cuerpo técnico cuando recuperes conectividad.'
                : 'Tus respuestas y mapa de dolor ya están disponibles para el cuerpo técnico para calibrar las cargas del entrenamiento de hoy.'}
            </p>

            {/* Mapa corporal del dolor registrado (vistas frontal y posterior) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1.5rem',
                flexWrap: 'wrap',
                maxWidth: '640px',
                margin: '0 auto 1.75rem',
                padding: '1.25rem 1rem',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  flex: '1 1 240px',
                  maxWidth: '280px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <MuscleMapFront
                  selectedMuscles={[]}
                  musclePains={musclePains}
                  readOnly={true}
                  hideHeader={true}
                />
              </div>
              <div
                style={{
                  flex: '1 1 240px',
                  maxWidth: '280px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <MuscleMapBack
                  selectedMuscles={[]}
                  musclePains={musclePains}
                  readOnly={true}
                  hideHeader={true}
                />
              </div>
            </div>

            {submissionResult.trafficLightReason && (
              <div
                style={{
                  maxWidth: '540px',
                  margin: '0 auto 1.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  color: 'var(--text-main)',
                  textAlign: 'left',
                }}
              >
                <strong>Diagnóstico de carga: </strong>
                <span>{submissionResult.trafficLightReason}</span>
              </div>
            )}

            {/* Summary card */}
            <div
              style={{
                maxWidth: '640px',
                margin: '0 auto 1.75rem',
                textAlign: 'left',
                background: 'var(--bg-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Resumen de métricas enviadas:
                </strong>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Sueño</small>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {sleepHours}h ({sleepQuality}/5)
                    </strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Fatiga</small>
                    <strong style={{ color: 'var(--text-main)' }}>{fatigueLevel} / 5</strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Dolor</small>
                    <strong style={{ color: 'var(--text-main)' }}>{muscleSoreness} / 5</strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Ánimo</small>
                    <strong style={{ color: 'var(--text-main)' }}>{moodRate} / 5</strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Estrés</small>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {stressLevel} / 5 ({getStressLabel(stressLevel)})
                    </strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Salud</small>
                    <strong
                      style={{
                        color: isSick ? 'var(--danger-text)' : 'var(--success-text)',
                      }}
                    >
                      {isSick ? 'Con síntomas' : 'Sin síntomas'}
                    </strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Lesión</small>
                    <strong
                      style={{
                        color: hasActiveInjury ? 'var(--danger-text)' : 'var(--success-text)',
                      }}
                    >
                      {hasActiveInjury ? 'Con lesión activa' : 'Sin lesión'}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Molestias musculares reportadas ({reportedCount}):
                </strong>
                {reportedCount === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    No reportaste molestias musculares específicas.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {reportedPains.map(([mId, lvl]) => {
                      const m = PROTRAINING_MUSCLES.find((x) => x.id === mId);
                      const painInfo = PAIN_LEVELS.find((p) => p.level === lvl);
                      const color = getPainColor(lvl);

                      return (
                        <span
                          key={mId}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: 'var(--bg-card)',
                            border: `1.5px solid ${color}`,
                            color: 'var(--text-main)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: color,
                            }}
                          />
                          <strong>{m?.name || mId}:</strong>
                          <span style={{ color, fontWeight: 800 }}>
                            Nivel {lvl} ({painInfo?.name})
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {notes.trim() && (
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Observaciones adicionales:
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    "{notes}"
                  </p>
                </div>
              )}
            </div>

            {/* ── Promoción de recordatorios Web Push para el atleta ── */}
            {pushSupported && (
              <div
                style={{
                  maxWidth: '640px',
                  margin: '0 auto 1.75rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'var(--bg-card)',
                  border: pushSubscribed
                    ? '1.5px solid var(--success-border)'
                    : '1.5px solid var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  textAlign: 'left',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <BellRing
                      size={18}
                      style={{
                        color: pushSubscribed ? 'var(--success)' : 'var(--secondary)',
                      }}
                    />
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      {pushSubscribed
                        ? 'Recordatorios diarios activos'
                        : '¿Querés recibir recordatorios de tu Check-in?'}
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {pushSubscribed
                      ? 'Recibirás avisos matutinos en este dispositivo para registrar tu recuperación y alertar a tu PF.'
                      : 'Activá las notificaciones push para no olvidarte de registrar tu estado cada mañana antes de entrenar.'}
                  </p>
                  {pushFeedback && (
                    <span
                      style={{
                        display: 'block',
                        marginTop: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: pushSubscribed ? 'var(--success-text)' : 'var(--danger-text)',
                      }}
                    >
                      {pushFeedback}
                    </span>
                  )}
                </div>

                {!pushSubscribed && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleActivatePush}
                    disabled={pushLoading}
                    style={{
                      padding: '0.55rem 1.1rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pushLoading ? (
                      <>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Activando...</span>
                      </>
                    ) : (
                      <>
                        <Bell size={14} />
                        <span>Activar recordatorios</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSubmissionResult(null)}
            >
              Editar respuestas
            </button>
          </div>
        ) : (
          /* ── FORMULARIO PRINCIPAL REORGANIZADO ── */
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {/* ── SECCIÓN B: MAPA CORPORAL DE MOLESTIAS (PRIMERA SECCIÓN PRINCIPAL) ── */}
            <div
              className="card"
              style={{
                margin: 0,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* 1. Título compacto y descripción breve */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} style={{ color: 'var(--secondary)' }} />
                    <h2
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        margin: 0,
                      }}
                    >
                      Molestias musculares
                    </h2>
                  </div>
                  <p
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                      margin: '0.2rem 0 0',
                    }}
                  >
                    Seleccioná las zonas donde sentís molestias y asignales un nivel de dolor.
                  </p>
                </div>

                {reportedCount > 0 && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {reportedCount} zona(s) señalada(s)
                  </span>
                )}
              </div>

              {/* 2 al 6: Selector de vista, Filtros rápidos, Leyenda, Siluetas e Indicador de ayuda */}
              <BodyMuscleMap
                musclePains={musclePains}
                onPainChange={handlePainChange}
                onClearAll={handleClearPains}
              />
            </div>

            {/* ── SECCIÓN C: INDICADORES DE BIENESTAR (SEGUNDA SECCIÓN) ── */}
            <div>
              <div style={{ marginBottom: '0.65rem' }}>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    margin: '0 0 0.15rem 0',
                  }}
                >
                  Indicadores de bienestar
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Ajustá los valores según cómo te sentís hoy antes de entrenar.
                </p>
              </div>

              {/* Cuadrícula responsive de 8 tarjetas (4 arriba y 4 abajo) */}
              <div className="checkin-wellness-grid">
                {/* 1. Horas de sueño: control deslizante de 0 a 24 horas */}
                <WellnessCard
                  id="wellness-sleep-hours"
                  name="Horas de sueño"
                  icon={<Moon size={16} />}
                  valueDisplay={`${sleepHours} hs`}
                  type="slider"
                  sliderValue={sleepHours}
                  sliderMin={0}
                  sliderMax={24}
                  sliderStep={0.5}
                  onSliderChange={setSleepHours}
                  scaleDescription="0 hs mín · 24 hs máx"
                />

                {/* 2. Calidad del sueño: escala del 1 al 5 */}
                <WellnessCard
                  id="wellness-sleep-quality"
                  name="Calidad del sueño"
                  icon={<Moon size={16} />}
                  valueDisplay={getSleepQualityLabel(sleepQuality)}
                  type="scale"
                  scaleValue={sleepQuality}
                  onScaleChange={setSleepQuality}
                  badgeVariant={
                    sleepQuality >= 4 ? 'success' : sleepQuality <= 2 ? 'warning' : 'default'
                  }
                  scaleDescription="1: Pésima · 5: Excelente"
                />

                {/* 3. Nivel de fatiga: escala del 1 al 5 */}
                <WellnessCard
                  id="wellness-fatigue"
                  name="Nivel de fatiga"
                  icon={<BatteryCharging size={16} />}
                  valueDisplay={getFatigueLabel(fatigueLevel)}
                  type="scale"
                  scaleValue={fatigueLevel}
                  onScaleChange={setFatigueLevel}
                  badgeVariant={
                    fatigueLevel <= 2 ? 'success' : fatigueLevel >= 4 ? 'danger' : 'warning'
                  }
                  scaleDescription="1: Enérgico · 5: Agotado"
                />

                {/* 4. Estado muscular general: escala del 1 al 5 */}
                <WellnessCard
                  id="wellness-soreness"
                  name="Estado muscular general"
                  icon={<ShieldAlert size={16} />}
                  valueDisplay={getSorenessLabel(muscleSoreness)}
                  type="scale"
                  scaleValue={muscleSoreness}
                  onScaleChange={setMuscleSoreness}
                  badgeVariant={
                    muscleSoreness === 1 ? 'success' : muscleSoreness >= 4 ? 'danger' : 'warning'
                  }
                  scaleDescription="1: Sin dolor · 5: Dolor severo"
                />

                {/* 5. Estado de ánimo: escala del 1 al 5 */}
                <WellnessCard
                  id="wellness-mood"
                  name="Estado de ánimo"
                  icon={<Smile size={16} />}
                  valueDisplay={getMoodLabel(moodRate)}
                  type="scale"
                  scaleValue={moodRate}
                  onScaleChange={setMoodRate}
                  badgeVariant={moodRate >= 4 ? 'success' : moodRate <= 2 ? 'warning' : 'default'}
                  scaleDescription="1: Desanimado · 5: Muy positivo"
                />

                {/* 6. Nivel de estrés: escala del 1 al 5 */}
                <WellnessCard
                  id="wellness-stress"
                  name="Nivel de estrés"
                  icon={<Brain size={16} />}
                  valueDisplay={getStressLabel(stressLevel)}
                  type="scale"
                  scaleValue={stressLevel}
                  onScaleChange={setStressLevel}
                  badgeVariant={
                    stressLevel <= 2 ? 'success' : stressLevel === 3 ? 'warning' : 'danger'
                  }
                  scaleDescription="1: Muy bajo · 5: Muy alto"
                />

                {/* 7. Estado de salud: opciones «Sin síntomas» y «Con síntomas» */}
                <WellnessCard
                  id="wellness-health"
                  name="Estado de salud"
                  icon={<HeartPulse size={16} />}
                  valueDisplay={isSick ? 'Con síntomas' : 'Sin síntomas'}
                  type="toggle"
                  toggleValue={isSick}
                  onToggleChange={setIsSick}
                  toggleLabels={{ falseLabel: 'Sin síntomas', trueLabel: 'Con síntomas' }}
                  badgeVariant={isSick ? 'danger' : 'success'}
                  scaleDescription="Fiebre, resfrío o indisposición"
                />

                {/* 8. Lesión activa: interruptor explícito */}
                <WellnessCard
                  id="wellness-active-injury"
                  name="Lesión activa"
                  icon={<Bandage size={16} />}
                  valueDisplay={hasActiveInjury ? 'Con lesión activa' : 'Sin lesión'}
                  type="toggle"
                  toggleValue={hasActiveInjury}
                  onToggleChange={setHasActiveInjury}
                  toggleLabels={{ falseLabel: 'Sin lesión', trueLabel: 'Tengo lesión' }}
                  badgeVariant={hasActiveInjury ? 'danger' : 'success'}
                  scaleDescription="Marcalo si tenés una lesión diagnosticada"
                />
              </div>

              {/* Dynamic alert notice if athlete marks an active injury */}
              {hasActiveInjury && (
                <div
                  style={{
                    marginTop: '0.9rem',
                    background: 'var(--danger-bg-strong)',
                    border: '1.5px solid var(--danger)',
                    borderRadius: '10px',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    color: 'var(--danger-text)',
                    animation: 'fadeIn 0.25s ease-in-out',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <ShieldAlert
                    size={20}
                    style={{ flexShrink: 0, marginTop: '2px', color: 'var(--danger)' }}
                  />
                  <div style={{ fontSize: '0.84rem', lineHeight: 1.45 }}>
                    <strong
                      style={{
                        display: 'block',
                        marginBottom: '0.2rem',
                        color: 'var(--danger-text)',
                      }}
                    >
                      Aviso de Semáforo Rojo por lesión activa
                    </strong>
                    <span>
                      Al marcar que tenés una lesión activa, el sistema colocará tu semáforo de hoy
                      en <strong>Rojo</strong> para que el cuerpo técnico priorice tu cuidado y
                      adapte o suspenda la carga de entrenamiento.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECCIÓN D: ACCIÓN FINAL (OBSERVACIONES + BOTÓN GUARDAR Y ENVIAR) ── */}
            <div
              className="card"
              style={{
                margin: 0,
                padding: '1.25rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <label
                  htmlFor="checkin-notes"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    marginBottom: '0.45rem',
                    color: 'var(--text-main)',
                  }}
                >
                  <MessageSquare size={15} style={{ color: 'var(--secondary)' }} />
                  <span>Observaciones (opcional)</span>
                </label>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* 7. Campo opcional de observaciones */}
                  <textarea
                    id="checkin-notes"
                    rows={1}
                    placeholder="Ej. Siento una leve tirantez en el gemelo izquierdo al trotar..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '280px',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      fontSize: '0.88rem',
                      resize: 'none',
                      height: '48px',
                      minHeight: '48px',
                      margin: 0,
                    }}
                  />

                  {/* 8. Botón principal: Guardar y enviar check-in */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary"
                    style={{
                      gap: '0.5rem',
                      padding: '0 2.2rem',
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      background: 'var(--primary)',
                      color: 'var(--on-primary)',
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      height: '48px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      margin: 0,
                    }}
                  >
                    {isSubmitting ? (
                      <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Send size={17} />
                    )}
                    <span>{isSubmitting ? 'Enviando...' : 'Guardar y enviar check-in'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

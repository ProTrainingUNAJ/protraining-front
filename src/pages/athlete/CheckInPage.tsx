import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/shell/PageHeader';
import {
  submitCheckIn,
  syncPendingCheckIns,
  countPendingCheckIns,
  discardPendingCheckInsForDate,
  CheckInSubmitResponse,
  type CheckIn,
  listCheckInInjuries,
  getAthleteTodayCheckIn,
} from '../../api/seguimientoService';
import { todayInArgentina, yesterdayInArgentina } from '../../utils/argentinaDate';
import { DEFAULT_RECOVERY_VALUES } from '../../components/athlete/checkin/recovery/recovery.types';
import { structureService } from '../../api/structureService';
import {
  subscribeUserToPush,
  isPushSupported,
  isUserSubscribed,
} from '../../api/pushNotifications';

import { CheckInProgressBar } from '../../components/athlete/checkin/CheckInProgressBar';
import { CheckInMoodStressSlide } from '../../components/athlete/checkin/CheckInMoodStressSlide';
import { CheckInRecoverySlide } from '../../components/athlete/checkin/CheckInRecoverySlide';
import { CheckInPainSlide } from '../../components/athlete/checkin/CheckInPainSlide';
import { CheckInSummarySlide } from '../../components/athlete/checkin/CheckInSummarySlide';
import { CheckInWelcomeSlide } from '../../components/athlete/checkin/CheckInWelcomeSlide';
import { CheckInCompletedSlide } from '../../components/athlete/checkin/CheckInCompletedSlide';
import { ConfettiCelebration } from '../../components/athlete/checkin/ConfettiCelebration';
import {
  formatPainZones,
  getCheckInCompleted,
  saveCheckInCompleted,
  getCheckInDraft,
  saveCheckInDraft,
  clearCheckInDraft,
  purgeLegacyCheckInCompletedData,
  purgeStaleCheckInData,
  clearAllCheckInData,
  getTodayKey,
  hasRequiredInjuryMark,
  hasUnscoredActiveInjuries,
  getReportedZones,
  clearInjuryPains,
  parsePainZones,
} from '../../components/athlete/checkin/checkInHelper';

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

interface SubmittedCheckInState {
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigueLevel: number | null;
  muscleSoreness: number | null;
  moodRate: number;
  stressLevel: number;
  isSick: boolean;
  hasActiveInjury: boolean;
  healthQuestionsAnswered: boolean;
  musclePains: Record<string, number>;
  injuryScores: Record<string, number | null>;
}

// KAN-593: el borrador se borra al enviar. Al recargar o al editar un check-in
// completado, la respuesta guardada es la única fuente de las respuestas.
const getStateFromSubmittedCheckIn = (checkIn?: CheckIn): SubmittedCheckInState => {
  const injuryScores: Record<string, number | null> = {};
  (checkIn?.injuries ?? []).forEach((injury) => {
    const id = injury.injuryId;
    if (!id) return;
    injuryScores[id] = injury.level ?? null;
  });

  return {
    sleepHours: checkIn?.sleepHours ?? null,
    sleepQuality: checkIn?.sleepQuality ?? null,
    fatigueLevel: checkIn?.fatigueLevel ?? null,
    muscleSoreness: checkIn?.muscleSoreness ?? null,
    moodRate: checkIn?.moodRate ?? 3,
    stressLevel: checkIn?.stressLevel ?? 2,
    isSick: Boolean(checkIn?.isSick),
    hasActiveInjury: Boolean(checkIn?.hasActiveInjury),
    healthQuestionsAnswered: Boolean(checkIn),
    musclePains: parsePainZones(checkIn?.painZones),
    injuryScores,
  };
};

export const CheckInPage: React.FC = () => {
  const { user } = useAuth();
  const [athleteId, setAthleteId] = useState<string>(
    () => (user?.id ? getCachedAthleteId(user.id) : null) || '',
  );
  const [athleteResolutionError, setAthleteResolutionError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState(getTodayKey);
  const previousDay = useRef(todayKey);
  const isEditingSubmitted = useRef(false);
  // Evita que la consulta al backend sobrescriba la navegación del atleta si éste
  // interactúa antes de que llegue la respuesta.
  const userNavigatedRef = useRef(false);
  const recoveryTouchedRef = useRef(false);

  // Solo se conserva el indicador local; las respuestas se recuperan del backend.
  const initialCompleted = getCheckInCompleted(athleteId);
  const initialDraft = initialCompleted ? null : getCheckInDraft(athleteId);

  // Check-in metrics state (conserved across all slides)
  // Si no hay borrador activo ni registro del día anterior aún cargado, inicia con
  // los valores preajustados (8 horas de sueño y 5/5 en el resto).
  const [sleepHours, setSleepHours] = useState<number | null>(
    () => initialDraft?.sleepHours ?? DEFAULT_RECOVERY_VALUES.sleepHours,
  );
  const [sleepQuality, setSleepQuality] = useState<number | null>(
    () => initialDraft?.sleepQuality ?? DEFAULT_RECOVERY_VALUES.sleepQuality,
  );
  const [fatigueLevel, setFatigueLevel] = useState<number | null>(
    () => initialDraft?.fatigueLevel ?? DEFAULT_RECOVERY_VALUES.fatigueLevel,
  );
  const [muscleSoreness, setMuscleSoreness] = useState<number | null>(
    () => initialDraft?.muscleSoreness ?? DEFAULT_RECOVERY_VALUES.muscleSoreness,
  );
  const [moodRate, setMoodRate] = useState<number>(() => initialDraft?.moodRate ?? 3);
  const [stressLevel, setStressLevel] = useState<number>(() => initialDraft?.stressLevel ?? 2);
  const [isSick, setIsSick] = useState<boolean>(() => initialDraft?.isSick ?? false);
  const [hasActiveInjury, setHasActiveInjury] = useState<boolean>(
    () => initialDraft?.hasActiveInjury ?? false,
  );
  const [activeInjuries, setActiveInjuries] = useState<
    { id: string; zone: string; description: string }[]
  >([]);
  const [injuryScores, setInjuryScores] = useState<Record<string, number | null>>(
    () => initialDraft?.injuryScores ?? {},
  );
  const [injuriesLoadWarning, setInjuriesLoadWarning] = useState<string | null>(null);

  // la ficha clínica es autoridad. El flag del wizard nunca puede negar una lesión activa.
  const clinicalInjuryPresent = activeInjuries.length > 0;
  const effectiveHasActiveInjury = hasActiveInjury || clinicalInjuryPresent;
  const clinicalZones = activeInjuries.map((injury) => injury.zone);

  const [healthQuestionsAnswered, setHealthQuestionsAnswered] = useState<boolean>(
    () => initialDraft?.healthQuestionsAnswered ?? false,
  );
  const [musclePains, setMusclePains] = useState<Record<string, number>>(() => {
    if (!initialDraft) return {};
    const raw = initialDraft.musclePains || {};
    return initialDraft.hasActiveInjury ? raw : clearInjuryPains(raw);
  });
  const [notes, setNotes] = useState<string>(() => initialDraft?.notes || '');

  // Welcome screen / Start state: if already completed or started today, hasStarted is true
  const [hasStarted, setHasStarted] = useState<boolean>(() => {
    if (initialCompleted) return true;
    return initialDraft ? initialDraft.hasStarted : false;
  });

  // Slide Wizard Navigation State
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (initialCompleted) return 4;
    if (initialDraft && initialDraft.hasStarted) {
      return Math.min(Math.max(initialDraft.currentStep, 1), 4);
    }
    return 1;
  });
  const [maxReachedStep, setMaxReachedStep] = useState<number>(() => {
    if (initialCompleted) return 4;
    if (initialDraft && initialDraft.hasStarted) {
      return Math.min(Math.max(initialDraft.maxReachedStep, initialDraft.currentStep, 1), 4);
    }
    return 1;
  });

  // Submission & Offline State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<CheckInSubmitResponse | null>(null);
  const [completedCheckIn, setCompletedCheckIn] = useState<CheckIn | null>(null);
  const [isLoadingCompleted, setIsLoadingCompleted] = useState<boolean>(!!initialCompleted);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const applySubmittedState = useCallback((checkIn?: CheckIn) => {
    const next = getStateFromSubmittedCheckIn(checkIn);
    setSleepHours(next.sleepHours);
    setSleepQuality(next.sleepQuality);
    setFatigueLevel(next.fatigueLevel);
    setMuscleSoreness(next.muscleSoreness);
    setMoodRate(next.moodRate);
    setStressLevel(next.stressLevel);
    setIsSick(next.isSick);
    setHasActiveInjury(next.hasActiveInjury);
    setHealthQuestionsAnswered(next.healthQuestionsAnswered);
    setMusclePains(next.musclePains);
    setInjuryScores(next.injuryScores);
  }, []);

  // Helper to rehydrate state if athleteId resolves asynchronously from /me
  const applyAthleteData = useCallback(
    async (id: string) => {
      const completed = getCheckInCompleted(id);
      if (completed) {
        setHasStarted(true);
        setCurrentStep(4);
        setMaxReachedStep(4);
        setIsLoadingCompleted(true);
        try {
          const remote = await getAthleteTodayCheckIn(id);
          if (remote) {
            setCompletedCheckIn(remote);
            applySubmittedState(remote);
            setSubmissionResult({
              message: 'Check-in registrado',
              trafficLight: remote.trafficLight,
              trafficLightReason: remote.trafficLightReason ?? null,
              checkIn: remote,
              isOffline: false,
            });
          } else {
            setCompletedCheckIn(null);
            setSubmissionResult({
              message: 'Check-in completado',
              trafficLight: completed.trafficLight ?? 'Yellow',
              isOffline: completed.isOffline,
            });
          }
        } catch {
          setCompletedCheckIn(null);
          setSubmissionResult({
            message: 'Check-in completado',
            trafficLight: completed.trafficLight ?? 'Yellow',
            isOffline: completed.isOffline,
          });
        } finally {
          setIsLoadingCompleted(false);
        }
        return;
      }

      setIsLoadingCompleted(false);
      const draft = getCheckInDraft(id);
      if (draft && draft.hasStarted) {
        setHasStarted(true);
        setCurrentStep(Math.min(Math.max(draft.currentStep, 1), 4));
        setMaxReachedStep(Math.min(Math.max(draft.maxReachedStep, draft.currentStep, 1), 4));
        setSleepHours(draft.sleepHours);
        setSleepQuality(draft.sleepQuality);
        setFatigueLevel(draft.fatigueLevel);
        setMuscleSoreness(draft.muscleSoreness);
        setMoodRate(draft.moodRate);
        setStressLevel(draft.stressLevel);
        setIsSick(draft.isSick);
        setHasActiveInjury(draft.hasActiveInjury);
        setHealthQuestionsAnswered(draft.healthQuestionsAnswered);
        const dPains = draft.musclePains || {};
        setMusclePains(draft.hasActiveInjury ? dPains : clearInjuryPains(dPains));
        setInjuryScores(draft.injuryScores || {});
        setNotes(draft.notes || '');
      }

      // El widget del semáforo consulta el backend: si hoy ya hay check-in, hay que
      // mostrar la confirmación aunque no exista el indicador local (otro dispositivo,
      // localStorage limpio, etc.). Si no, se intenta precargar la plantilla de descanso
      // con el registro del día anterior (o se mantienen los valores preajustados 8h y 5/5).
      try {
        const remote = await getAthleteTodayCheckIn(id);
        if (remote && !userNavigatedRef.current) {
          setHasStarted(true);
          setCurrentStep(4);
          setMaxReachedStep(4);
          setCompletedCheckIn(remote);
          applySubmittedState(remote);
          setSubmissionResult({
            message: 'Check-in registrado',
            trafficLight: remote.trafficLight,
            trafficLightReason: remote.trafficLightReason ?? null,
            checkIn: remote,
            isOffline: false,
          });
          // Repara el indicador local sin persistir respuestas médicas.
          saveCheckInCompleted(id, {
            completedAt: new Date().toISOString(),
            trafficLight: remote.trafficLight,
            isOffline: false,
          });
          return;
        }

        if (!remote && !(draft && draft.hasStarted)) {
          const yesterdayDate = yesterdayInArgentina(getTodayKey());
          const yesterdayCheckIn = await getAthleteTodayCheckIn(id, yesterdayDate);
          if (yesterdayCheckIn && !recoveryTouchedRef.current) {
            setSleepHours(yesterdayCheckIn.sleepHours ?? DEFAULT_RECOVERY_VALUES.sleepHours);
            setSleepQuality(yesterdayCheckIn.sleepQuality ?? DEFAULT_RECOVERY_VALUES.sleepQuality);
            setFatigueLevel(yesterdayCheckIn.fatigueLevel ?? DEFAULT_RECOVERY_VALUES.fatigueLevel);
            setMuscleSoreness(
              yesterdayCheckIn.muscleSoreness ?? DEFAULT_RECOVERY_VALUES.muscleSoreness,
            );
          }
        }
      } catch {
        // Sin conexión se conserva el indicador local, el borrador o los valores preajustados (8h y 5/5).
      }
    },
    [applySubmittedState],
  );

  const handleEditResponses = useCallback(async () => {
    userNavigatedRef.current = true;
    if (!completedCheckIn) {
      let remote: CheckIn | null;
      try {
        remote = await getAthleteTodayCheckIn(athleteId);
      } catch {
        setErrorMessage('No se pudieron recuperar tus respuestas. Intentá nuevamente.');
        return;
      }
      // Sin respuesta del back no se abre el formulario: los valores por defecto
      // (ánimo 3, estrés 2) pisarían el check-in real si el atleta reenvía.
      if (!remote) {
        setErrorMessage('No hay respuestas guardadas para editar.');
        return;
      }
      setCompletedCheckIn(remote);
      applySubmittedState(remote);
      setSubmissionResult({
        message: 'Check-in registrado',
        trafficLight: remote.trafficLight,
        trafficLightReason: remote.trafficLightReason ?? null,
        checkIn: remote,
        isOffline: false,
      });
    } else {
      applySubmittedState(completedCheckIn);
    }
    isEditingSubmitted.current = true;
    setSubmissionResult(null);
    setHasStarted(true);
    setCurrentStep(4);
    setShowConfetti(false);
  }, [athleteId, completedCheckIn, applySubmittedState]);

  useEffect(() => {
    const refreshDay = () => setTodayKey(getTodayKey());
    const timer = window.setInterval(refreshDay, 60_000);
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);

  useEffect(() => {
    if (previousDay.current === todayKey) return;
    previousDay.current = todayKey;
    clearAllCheckInData();
    isEditingSubmitted.current = false;
    userNavigatedRef.current = false;
    recoveryTouchedRef.current = false;
    setHasStarted(false);
    setCurrentStep(1);
    setMaxReachedStep(1);
    setSubmissionResult(null);
    setCompletedCheckIn(null);
    setSleepHours(DEFAULT_RECOVERY_VALUES.sleepHours);
    setSleepQuality(DEFAULT_RECOVERY_VALUES.sleepQuality);
    setFatigueLevel(DEFAULT_RECOVERY_VALUES.fatigueLevel);
    setMuscleSoreness(DEFAULT_RECOVERY_VALUES.muscleSoreness);
    setMoodRate(3);
    setStressLevel(2);
    setIsSick(false);
    setHasActiveInjury(false);
    setHealthQuestionsAnswered(false);
    setMusclePains({});
    setInjuryScores({});
    setNotes('');
    setShowConfetti(false);
    setErrorMessage(null);
    setIsLoadingCompleted(false);
  }, [todayKey]);

  // Al montar (y al cambiar de día) se descartan los datos con fecha de otro día:
  // si la app se cerró a mitad del check-in, el borrador de ayer no debe quedar en el celular.
  useEffect(() => {
    purgeStaleCheckInData();
    purgeLegacyCheckInCompletedData(athleteId);
  }, [athleteId, todayKey]);

  useEffect(() => {
    if (!athleteId) return;
    const timer = setTimeout(() => {
      void applyAthleteData(athleteId);
    }, 0);
    return () => clearTimeout(timer);
  }, [athleteId, applyAthleteData, todayKey]);

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
          if (!cachedId) {
            const msg =
              err instanceof Error
                ? err.message
                : 'No se pudo obtener el identificador del atleta vinculado a la cuenta.';
            setAthleteResolutionError(msg);
          }
        });
    }
  }, [user?.id, applyAthleteData]);

  // Carga las lesiones activas del atleta para exigir su puntaje (0-10) en el check-in.
  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    listCheckInInjuries(athleteId)
      .then((injuries) => {
        if (cancelled) return;
        setActiveInjuries(
          injuries.map((i) => ({ id: i.id, zone: i.zone, description: i.description })),
        );
        setInjuryScores((prev) => {
          const next: Record<string, number | null> = {};
          for (const injury of injuries) {
            next[injury.id] = prev[injury.id] ?? null;
          }
          return next;
        });
        setInjuriesLoadWarning(null);
      })
      .catch(() => {
        if (!cancelled) {
          setActiveInjuries([]);
          setInjuriesLoadWarning(
            'No se pudieron cargar tus lesiones activas. Recargá la página para poder puntuarlas.',
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  // Persist draft to local storage on any state change if started and not yet submitted
  useEffect(() => {
    if (
      isLoadingCompleted ||
      !hasStarted ||
      submissionResult !== null ||
      isEditingSubmitted.current
    )
      return;

    saveCheckInDraft(athleteId, {
      hasStarted,
      currentStep,
      maxReachedStep,
      sleepHours,
      sleepQuality,
      fatigueLevel,
      muscleSoreness,
      moodRate,
      stressLevel,
      isSick,
      hasActiveInjury,
      healthQuestionsAnswered,
      musclePains,
      injuryScores,
      notes,
    });
  }, [
    athleteId,
    hasStarted,
    isLoadingCompleted,
    submissionResult,
    currentStep,
    maxReachedStep,
    sleepHours,
    sleepQuality,
    fatigueLevel,
    muscleSoreness,
    moodRate,
    stressLevel,
    isSick,
    hasActiveInjury,
    healthQuestionsAnswered,
    musclePains,
    injuryScores,
    notes,
  ]);

  // Un check-in ya enviado no debe dejar un borrador aunque se recargue mientras se consulta el backend.
  useEffect(() => {
    if (!athleteId || isLoadingCompleted || submissionResult === null) return;
    clearCheckInDraft(athleteId);
  }, [athleteId, isLoadingCompleted, submissionResult]);

  const handleStartCheckIn = () => {
    userNavigatedRef.current = true;
    setHasStarted(true);
    setCurrentStep(1);
    setMaxReachedStep(1);
    saveCheckInDraft(athleteId, {
      hasStarted: true,
      currentStep: 1,
      maxReachedStep: 1,
      sleepHours,
      sleepQuality,
      fatigueLevel,
      muscleSoreness,
      moodRate,
      stressLevel,
      isSick,
      hasActiveInjury,
      healthQuestionsAnswered,
      musclePains,
      injuryScores,
      notes,
    });
  };

  // Web Push reminder subscription state
  const [pushSupported] = useState<boolean>(() => isPushSupported());
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  // Swipe gesture touch coordinates
  const touchStartRef = useRef<{ x: number; y: number; isIgnored: boolean }>({
    x: 0,
    y: 0,
    isIgnored: false,
  });

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

  const handlePainChange = (muscleId: string, level: number) => {
    setErrorMessage(null);
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

  const handleInjuryChange = useCallback(
    (hasInjury: boolean) => {
      setErrorMessage(null);
      // No se puede responder "sin lesión" si el cuerpo técnico registró una lesión activa.
      if (!hasInjury && clinicalInjuryPresent) return;
      setHasActiveInjury(hasInjury);
      if (!hasInjury) {
        setMusclePains((prev) => clearInjuryPains(prev));
      }
    },
    [clinicalInjuryPresent],
  );

  // Slide Navigation Handlers
  const goToStep = (stepNum: number) => {
    userNavigatedRef.current = true;
    // Si intenta regresar a la pantalla 0 (Inicio / Bienvenida):
    if (stepNum <= 0) {
      setErrorMessage(null);
      isEditingSubmitted.current = false;
      setHasStarted(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (submissionResult !== null) return;
      saveCheckInDraft(athleteId, {
        hasStarted: false,
        currentStep: 1,
        maxReachedStep,
        sleepHours,
        sleepQuality,
        fatigueLevel,
        muscleSoreness,
        moodRate,
        stressLevel,
        isSick,
        hasActiveInjury,
        healthQuestionsAnswered,
        musclePains,
        injuryScores,
        notes,
      });
      return;
    }

    // Si intenta ir más allá del paso 2 (Descanso y Recuperación) y alguna opción está en estado neutro (null):
    if (
      stepNum > 2 &&
      (sleepHours === null ||
        sleepQuality === null ||
        fatigueLevel === null ||
        muscleSoreness === null)
    ) {
      setErrorMessage(
        'Debés mover y responder las 4 opciones de descanso y recuperación de su estado neutro para poder avanzar.',
      );
      return;
    }

    // Si intenta ir más allá del paso 3 y tiene lesión activa sin marcar con negro:
    if (
      stepNum > 3 &&
      !hasRequiredInjuryMark(effectiveHasActiveInjury, musclePains, clinicalZones)
    ) {
      setErrorMessage(
        'Debés marcar en la silueta la zona lesionada con color negro (Lesión) para poder avanzar.',
      );
      return;
    }

    // No avanzar si falta puntuar alguna lesión activa (KAN-487).
    if (stepNum > 3 && hasUnscoredActiveInjuries(activeInjuries, injuryScores)) {
      setErrorMessage('Debés puntuar el dolor (0 a 10) de cada lesión activa para poder avanzar.');
      return;
    }
    setErrorMessage(null);
    setCurrentStep(stepNum);
    setMaxReachedStep((prev) => Math.max(prev, stepNum));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (
      currentStep === 2 &&
      (sleepHours === null ||
        sleepQuality === null ||
        fatigueLevel === null ||
        muscleSoreness === null)
    ) {
      setErrorMessage(
        'Debés mover y responder las 4 opciones de descanso y recuperación de su estado neutro para poder avanzar.',
      );
      return;
    }
    if (
      currentStep === 3 &&
      !hasRequiredInjuryMark(effectiveHasActiveInjury, musclePains, clinicalZones)
    ) {
      setErrorMessage(
        'Debés marcar en la silueta la zona lesionada con color negro (Lesión) para poder avanzar.',
      );
      return;
    }
    if (currentStep < 4) {
      goToStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    } else {
      // Regresar a la pantalla 0 (Iniciar Check-in)
      goToStep(0);
    }
  };

  // Mobile Swipe Gesture Recognition
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Do not intercept gestures if interacting with anatomical map, sliders, or canvas/svg
    const isIgnored = Boolean(
      target.closest('.interactive-no-swipe') ||
      target.closest('input[type="range"]') ||
      target.closest('svg') ||
      target.closest('button') ||
      target.closest('textarea'),
    );

    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      isIgnored,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current.isIgnored) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Detect predominantly horizontal swipe of at least 50px
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe left -> Next
        handleNext();
      } else {
        // Swipe right -> Prev
        handlePrev();
      }
    }
  };

  // Submission Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

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

    // Format pain zones: "Quadriceps:2,Hamstrings:1". Las lesiones clínicas activas
    // también son zonas con dolor: se incluyen con el marcador 6 y prevalecen sobre
    // una marca manual de la misma zona. El back KAN-644 dedupe; con el back anterior
    // esta es la única forma de que el PF vea la lesión en el mapa anatómico.
    const reportedZones = getReportedZones(musclePains, activeInjuries, injuryScores);
    const painZones = formatPainZones(
      Object.fromEntries(reportedZones.map((zone) => [zone.zone, zone.level])),
    );

    const injuriesPayload = activeInjuries.map((injury) => ({
      injuryId: injury.id,
      level: injuryScores[injury.id] as number,
    }));

    // No se puede guardar sin puntuar cada lesión activa (KAN-487).
    if (hasUnscoredActiveInjuries(activeInjuries, injuryScores)) {
      setErrorMessage('Falta puntuar el dolor de cada lesión activa (de 0 a 10).');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await submitCheckIn(athleteId, {
        sleepHours: sleepHours ?? DEFAULT_RECOVERY_VALUES.sleepHours,
        sleepQuality: sleepQuality ?? DEFAULT_RECOVERY_VALUES.sleepQuality,
        muscleSoreness: muscleSoreness ?? DEFAULT_RECOVERY_VALUES.muscleSoreness,
        fatigueLevel: fatigueLevel ?? DEFAULT_RECOVERY_VALUES.fatigueLevel,
        moodRate,
        stressLevel,
        isSick,
        painZones,
        hasActiveInjury: effectiveHasActiveInjury,
        injuries: injuriesPayload,
      });

      isEditingSubmitted.current = false;
      setSubmissionResult(response);
      if (response.checkIn) {
        setCompletedCheckIn(response.checkIn as CheckIn);
        applySubmittedState(response.checkIn);
      }
      // Solo se guarda el indicador mínimo de check-in completado.
      saveCheckInCompleted(athleteId, {
        trafficLight: response.trafficLight,
        isOffline: response.isOffline,
        completedAt: new Date().toISOString(),
      });
      clearCheckInDraft(athleteId);
      setShowConfetti(true);

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

  return (
    <div className="app-page-container">
      {/* ── SECCIÓN A: ENCABEZADO OPTIMIZADO COMPACTO ── */}
      <PageHeader
        title="Check-in Diario"
        description="Completá tus sensaciones."
        className="checkin-page-header-compact"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
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
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                }}
                title="Tocá para sincronizar ahora"
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
                fontSize: '0.85rem',
                fontWeight: 700,
                color: submissionResult ? 'var(--success-text)' : 'var(--info-text)',
                background: submissionResult ? 'var(--success-bg)' : 'var(--stat-cyan-bg)',
                border: submissionResult
                  ? '1px solid var(--success-border)'
                  : '1px solid var(--info-border)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                margin: 0,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {submissionResult ? (
                <>
                  <CheckCircle2 size={14} aria-hidden="true" /> Completado
                </>
              ) : (
                <>
                  <Circle size={10} aria-hidden="true" /> Pendiente de hoy
                </>
              )}
            </span>
          </div>
        }
      />

      <div
        className="app-page-body checkin-body-compact"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
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

        {/* Aviso si no se pudieron cargar las lesiones activas */}
        {injuriesLoadWarning && (
          <div
            style={{
              background: 'var(--warning-bg-strong)',
              color: 'var(--warning-text)',
              border: '1px solid var(--warning)',
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
            <span>{injuriesLoadWarning}</span>
          </div>
        )}

        {/* Confeti festivo de felicidad al completar */}
        {showConfetti && <ConfettiCelebration durationMs={4500} particleCount={140} />}

        {/* ── BURBUJA CONTENEDORA PRINCIPAL (MISMO ANCHO QUE SESIÓN DE MI RUTINA) ── */}
        <div
          className={`checkin-main-bubble${submissionResult ? ' checkin-main-bubble--completed' : ''}`}
        >
          {isLoadingCompleted ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
          ) : submissionResult ? (
            /* ── PANTALLA DE CONFIRMACIÓN FINAL (ADAPTADA AL ESTILO DE LOS SLIDES ANTERIORES) ── */
            <div className="checkin-slide-container">
              {/* Barra de progreso completada con todos los pasos e icono de estrella */}
              <CheckInProgressBar
                currentStep={4}
                totalSteps={3}
                onSelectStep={goToStep}
                maxReachedStep={4}
                onPrev={handlePrev}
              />

              <CheckInCompletedSlide
                submissionResult={submissionResult}
                sleepHours={sleepHours}
                sleepQuality={sleepQuality}
                fatigueLevel={fatigueLevel}
                muscleSoreness={muscleSoreness}
                moodRate={moodRate}
                stressLevel={stressLevel}
                isSick={isSick}
                hasActiveInjury={effectiveHasActiveInjury}
                musclePains={musclePains}
                activeInjuries={activeInjuries}
                injuryScores={injuryScores}
                notes={notes}
                pushSupported={pushSupported}
                pushSubscribed={pushSubscribed}
                pushLoading={pushLoading}
                pushFeedback={pushFeedback}
                onActivatePush={handleActivatePush}
                onEditResponses={handleEditResponses}
              />
            </div>
          ) : !hasStarted ? (
            /* ── PANTALLA DE BIENVENIDA / INICIO ANTES DEL PASO 1 ── */
            <div className="checkin-slide-container">
              <CheckInWelcomeSlide onStart={handleStartCheckIn} />
            </div>
          ) : (
            /* ── FLUJO DE TARJETAS TIPO SLIDE (3 PASOS + RESUMEN FINAL) ── */
            <div
              className="checkin-slide-container"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Top Progress Bar with Interactive Steps and Back Navigation */}
              <CheckInProgressBar
                currentStep={currentStep}
                totalSteps={3}
                onSelectStep={goToStep}
                maxReachedStep={maxReachedStep}
                onPrev={handlePrev}
              />

              {/* Ventana 1: Estado de ánimo y estrés */}

              {currentStep === 1 && (
                <CheckInMoodStressSlide
                  moodRate={moodRate}
                  onMoodChange={setMoodRate}
                  stressLevel={stressLevel}
                  onStressChange={setStressLevel}
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              )}

              {/* Ventana 2: Descanso y Recuperación Muscular (Integrado: Sueño, Calidad, Fatiga y Dolor) */}
              {currentStep === 2 && (
                <CheckInRecoverySlide
                  sleepHours={sleepHours}
                  onSleepHoursChange={(val) => {
                    recoveryTouchedRef.current = true;
                    setSleepHours(val);
                  }}
                  sleepQuality={sleepQuality}
                  onSleepQualityChange={(val) => {
                    recoveryTouchedRef.current = true;
                    setSleepQuality(val);
                  }}
                  fatigueLevel={fatigueLevel}
                  onFatigueChange={(val) => {
                    recoveryTouchedRef.current = true;
                    setFatigueLevel(val);
                  }}
                  muscleSoreness={muscleSoreness}
                  onSorenessChange={(val) => {
                    recoveryTouchedRef.current = true;
                    setMuscleSoreness(val);
                  }}
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              )}

              {/* Ventana 3: Dolor y Zonas en silueta anatómica (incluye Salud y Lesiones Activas en Modal) */}
              {currentStep === 3 && (
                <CheckInPainSlide
                  musclePains={musclePains}
                  onPainChange={handlePainChange}
                  onClearAll={handleClearPains}
                  isSick={isSick}
                  onSickChange={setIsSick}
                  hasActiveInjury={effectiveHasActiveInjury}
                  onInjuryChange={handleInjuryChange}
                  healthQuestionsAnswered={healthQuestionsAnswered}
                  onHealthQuestionsAnswered={setHealthQuestionsAnswered}
                  activeInjuries={activeInjuries}
                  injuryScores={injuryScores}
                  onInjuryScoreChange={(injuryId, score) =>
                    setInjuryScores((prev) => ({ ...prev, [injuryId]: score }))
                  }
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              )}

              {/* Tarjeta Final: Resumen Completo y Envío */}
              {currentStep === 4 && (
                <CheckInSummarySlide
                  sleepHours={sleepHours}
                  sleepQuality={sleepQuality}
                  fatigueLevel={fatigueLevel}
                  muscleSoreness={muscleSoreness}
                  moodRate={moodRate}
                  stressLevel={stressLevel}
                  isSick={isSick}
                  hasActiveInjury={effectiveHasActiveInjury}
                  musclePains={musclePains}
                  activeInjuries={activeInjuries}
                  injuryScores={injuryScores}
                  notes={notes}
                  onNotesChange={setNotes}
                  onEditStep={goToStep}
                  onPrev={handlePrev}
                  onSubmit={handleSubmit}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/shell/PageHeader';
import {
  submitCheckIn,
  syncPendingCheckIns,
  countPendingCheckIns,
  CheckInSubmitResponse,
} from '../../api/seguimientoService';

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
  hasRequiredInjuryMark,
  clearInjuryPains,
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

export const CheckInPage: React.FC = () => {
  const { user } = useAuth();
  const [athleteId, setAthleteId] = useState<string>(() => {
    return (
      (user?.id ? getCachedAthleteId(user.id) : null) || '99eedc58-65dd-4417-a087-e3cc03f01043'
    );
  });
  const [athleteResolutionError, setAthleteResolutionError] = useState<string | null>(null);

  // Initial check from local storage for today
  const initialCompleted = getCheckInCompleted(athleteId);
  const initialDraft = initialCompleted ? null : getCheckInDraft(athleteId);

  // Check-in metrics state (conserved across all slides)
  const [sleepHours, setSleepHours] = useState<number | null>(() => {
    if (initialCompleted) return initialCompleted.draft.sleepHours;
    if (initialDraft) return initialDraft.sleepHours;
    return null;
  });
  const [sleepQuality, setSleepQuality] = useState<number | null>(() => {
    if (initialCompleted) return initialCompleted.draft.sleepQuality;
    if (initialDraft) return initialDraft.sleepQuality;
    return null;
  });
  const [fatigueLevel, setFatigueLevel] = useState<number | null>(() => {
    if (initialCompleted) return initialCompleted.draft.fatigueLevel;
    if (initialDraft) return initialDraft.fatigueLevel;
    return null;
  });
  const [muscleSoreness, setMuscleSoreness] = useState<number | null>(() => {
    if (initialCompleted) return initialCompleted.draft.muscleSoreness;
    if (initialDraft) return initialDraft.muscleSoreness;
    return null;
  });
  const [moodRate, setMoodRate] = useState<number>(() => {
    if (initialCompleted) return initialCompleted.draft.moodRate;
    if (initialDraft) return initialDraft.moodRate;
    return 3;
  });
  const [stressLevel, setStressLevel] = useState<number>(() => {
    if (initialCompleted) return initialCompleted.draft.stressLevel;
    if (initialDraft) return initialDraft.stressLevel;
    return 2;
  });
  const [isSick, setIsSick] = useState<boolean>(() => {
    if (initialCompleted) return initialCompleted.draft.isSick;
    if (initialDraft) return initialDraft.isSick;
    return false;
  });
  const [hasActiveInjury, setHasActiveInjury] = useState<boolean>(() => {
    if (initialCompleted) return initialCompleted.draft.hasActiveInjury;
    if (initialDraft) return initialDraft.hasActiveInjury;
    return false;
  });
  const [healthQuestionsAnswered, setHealthQuestionsAnswered] = useState<boolean>(() => {
    if (initialCompleted) return initialCompleted.draft.healthQuestionsAnswered;
    if (initialDraft) return initialDraft.healthQuestionsAnswered;
    return false;
  });
  const [musclePains, setMusclePains] = useState<Record<string, number>>(() => {
    const raw =
      (initialCompleted ? initialCompleted.draft.musclePains : initialDraft?.musclePains) || {};
    const injuryActive = initialCompleted
      ? initialCompleted.draft.hasActiveInjury
      : initialDraft?.hasActiveInjury;
    return injuryActive ? raw : clearInjuryPains(raw);
  });
  const [notes, setNotes] = useState<string>(() => {
    if (initialCompleted) return initialCompleted.draft.notes || '';
    if (initialDraft) return initialDraft.notes || '';
    return '';
  });

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
  const [submissionResult, setSubmissionResult] = useState<CheckInSubmitResponse | null>(() => {
    return (initialCompleted?.result as CheckInSubmitResponse) || null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const handleEditResponses = useCallback(() => {
    setSubmissionResult(null);
    setHasStarted(true);
    setCurrentStep(4);
    setShowConfetti(false);
  }, []);

  // Helper to rehydrate state if athleteId resolves asynchronously from /me
  const applyAthleteData = useCallback((id: string) => {
    const completed = getCheckInCompleted(id);
    if (completed) {
      setSubmissionResult(completed.result as CheckInSubmitResponse);
      setHasStarted(true);
      setCurrentStep(4);
      setMaxReachedStep(4);
      setSleepHours(completed.draft.sleepHours);
      setSleepQuality(completed.draft.sleepQuality);
      setFatigueLevel(completed.draft.fatigueLevel);
      setMuscleSoreness(completed.draft.muscleSoreness);
      setMoodRate(completed.draft.moodRate);
      setStressLevel(completed.draft.stressLevel);
      setIsSick(completed.draft.isSick);
      setHasActiveInjury(completed.draft.hasActiveInjury);
      setHealthQuestionsAnswered(completed.draft.healthQuestionsAnswered);
      const cPains = completed.draft.musclePains || {};
      setMusclePains(completed.draft.hasActiveInjury ? cPains : clearInjuryPains(cPains));
      setNotes(completed.draft.notes || '');
      return;
    }

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
      setNotes(draft.notes || '');
    }
  }, []);

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
            applyAthleteData(me.athleteId);
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

  // Persist draft to local storage on any state change if started and not yet submitted
  useEffect(() => {
    if (!hasStarted || submissionResult !== null) return;

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
      notes,
    });
  }, [
    athleteId,
    hasStarted,
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
    notes,
  ]);

  const handleStartCheckIn = () => {
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
    if (!isOnline || isSyncing) return;
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
  }, [athleteId, isOnline, isSyncing]);

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

    return () => {
      mounted = false;
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

  const handleInjuryChange = useCallback((hasInjury: boolean) => {
    setErrorMessage(null);
    setHasActiveInjury(hasInjury);
    if (!hasInjury) {
      setMusclePains((prev) => clearInjuryPains(prev));
    }
  }, []);

  // Slide Navigation Handlers
  const goToStep = (stepNum: number) => {
    // Si intenta regresar a la pantalla 0 (Inicio / Bienvenida):
    if (stepNum <= 0) {
      setErrorMessage(null);
      setHasStarted(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (stepNum > 3 && !hasRequiredInjuryMark(hasActiveInjury, musclePains)) {
      setErrorMessage(
        'Debés marcar en la silueta la zona lesionada con color negro (Lesión) para poder avanzar.',
      );
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
    if (currentStep === 3 && !hasRequiredInjuryMark(hasActiveInjury, musclePains)) {
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

    // Format pain zones: "Quadriceps:2,Hamstrings:1"
    const painZones = formatPainZones(musclePains);

    try {
      const response = await submitCheckIn(athleteId, {
        sleepHours: sleepHours ?? 8,
        sleepQuality: sleepQuality ?? 4,
        muscleSoreness: muscleSoreness ?? 1,
        fatigueLevel: fatigueLevel ?? 2,
        moodRate,
        stressLevel,
        isSick,
        painZones,
        hasActiveInjury,
      });

      setSubmissionResult(response);
      saveCheckInCompleted(athleteId, {
        result: response,
        draft: {
          hasStarted: true,
          currentStep: 4,
          maxReachedStep: 4,
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
          notes,
        },
        completedAt: new Date().toISOString(),
      });
      clearCheckInDraft(athleteId);
      setShowConfetti(true);
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
                fontSize: '0.85rem',
                fontWeight: 700,
                color: submissionResult ? '#00A859' : '#0284C7',
                background: submissionResult ? 'rgba(0, 168, 89, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                border: submissionResult
                  ? '1px solid rgba(0, 168, 89, 0.25)'
                  : '1px solid rgba(14, 165, 233, 0.25)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {submissionResult ? '✓ Completado' : '● Pendiente de hoy'}
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

        {/* Confeti festivo de felicidad al completar */}
        {showConfetti && <ConfettiCelebration durationMs={4500} particleCount={140} />}

        {/* ── BURBUJA CONTENEDORA PRINCIPAL (MISMO ANCHO QUE SESIÓN DE MI RUTINA) ── */}
        <div className="card card-static checkin-main-bubble">
          {submissionResult ? (
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
                hasActiveInjury={hasActiveInjury}
                musclePains={musclePains}
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
            <CheckInWelcomeSlide onStart={handleStartCheckIn} />
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
                  onSleepHoursChange={setSleepHours}
                  sleepQuality={sleepQuality}
                  onSleepQualityChange={setSleepQuality}
                  fatigueLevel={fatigueLevel}
                  onFatigueChange={setFatigueLevel}
                  muscleSoreness={muscleSoreness}
                  onSorenessChange={setMuscleSoreness}
                  onPrev={handlePrev}
                  onNext={handleNext}
                />
              )}

              {/* Ventana 3: Dolor y Zonas en silueta anatómica (incluye Salud y Lesiones agrupadas) */}
              {currentStep === 3 && (
                <CheckInPainSlide
                  musclePains={musclePains}
                  onPainChange={handlePainChange}
                  onClearAll={handleClearPains}
                  isSick={isSick}
                  onSickChange={setIsSick}
                  hasActiveInjury={hasActiveInjury}
                  onInjuryChange={handleInjuryChange}
                  healthQuestionsAnswered={healthQuestionsAnswered}
                  onHealthQuestionsAnswered={setHealthQuestionsAnswered}
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
                  hasActiveInjury={hasActiveInjury}
                  musclePains={musclePains}
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

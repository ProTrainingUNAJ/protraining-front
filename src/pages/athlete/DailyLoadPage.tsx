import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/shell/PageHeader';
import {
  submitDailyLoad,
  getDailyLoad,
  getAthleteWeek,
  DailyLoadSubmitRequest,
  DailyLoadSubmitResponse,
} from '../../api/seguimientoService';
import type { AthleteWeek } from '../../types/seguimiento';
import { structureService } from '../../api/structureService';
import { isDailyLoadWidgetPinned, pinDailyLoadWidget } from '../../utils/athleteDashboardLayout';
import { DailyLoadWeekSummary } from '../../components/athlete/dailyLoad/DailyLoadWeekSummary';
import { DailyLoadActivityList } from '../../components/athlete/dailyLoad/DailyLoadActivityList';
import { AddActivityModal } from '../../components/athlete/dailyLoad/AddActivityModal';
import {
  ActivityKey,
  ALL_ACTIVITY_KEYS,
  ACTIVITY_DEFINITIONS,
} from '../../components/athlete/dailyLoad/dailyLoadTypes';
import { ConfettiCelebration } from '../../components/athlete/checkin/ConfettiCelebration';
import './DailyLoadPage.css';

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

const activityFromLoad = (
  load: DailyLoadSubmitResponse | null,
  key: ActivityKey,
): { minutes: number; rpe: number | null } => {
  if (!load) return { minutes: 0, rpe: null };
  const data = load[key] as { minutes?: number; rpe?: number | null } | undefined;
  return { minutes: data?.minutes ?? 0, rpe: data?.rpe ?? null };
};

export const DailyLoadPage: React.FC = () => {
  const { user } = useAuth();
  const [athleteId, setAthleteId] = useState<string>(() => {
    return (user?.id ? getCachedAthleteId(user.id) : null) || '';
  });
  const [athleteResolutionError, setAthleteResolutionError] = useState<string | null>(null);

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
  }, [user?.id]);

  // Pinned home widget state (KAN-571 / KAN-573)
  const [isWidgetPinned, setIsWidgetPinned] = useState<boolean>(() => isDailyLoadWidgetPinned());
  const [pinWarning, setPinWarning] = useState<string | null>(null);

  useEffect(() => {
    const handleLayoutSync = () => {
      setIsWidgetPinned(isDailyLoadWidgetPinned());
    };
    window.addEventListener('protraining-dashboard-layout-changed', handleLayoutSync);
    return () => {
      window.removeEventListener('protraining-dashboard-layout-changed', handleLayoutSync);
    };
  }, []);

  const handlePinWidget = () => {
    setPinWarning(null);
    const pinned = pinDailyLoadWidget();
    if (pinned) {
      setIsWidgetPinned(true);
    } else {
      setPinWarning('No hay lugar libre en tu inicio: quitá una tarjeta primero');
    }
  };

  // State: Week summary
  const [week, setWeek] = useState<AthleteWeek | null>(null);
  const [isLoadingWeek, setIsLoadingWeek] = useState(Boolean(athleteId));

  // State: Today's activities and load
  const [todayLoad, setTodayLoad] = useState<DailyLoadSubmitResponse | null>(null);
  const [isLoadingToday, setIsLoadingToday] = useState(Boolean(athleteId));
  const [todayError, setTodayError] = useState<string | null>(null);

  // State: Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ActivityKey | null>(null);

  // Success Toast & Confetti
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Fetch initial data without synchronous setState inside the effect body
  useEffect(() => {
    if (!athleteId) return;

    let mounted = true;

    getAthleteWeek(athleteId)
      .then((data) => {
        if (!mounted) return;
        setWeek(data);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('No se pudo obtener la semana del atleta', err);
        setWeek(null);
      })
      .finally(() => {
        if (mounted) setIsLoadingWeek(false);
      });

    getDailyLoad(athleteId)
      .then((data) => {
        if (!mounted) return;
        setTodayLoad(data);
        setTodayError(null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setTodayLoad(null);
        } else {
          setTodayError(err instanceof Error ? err.message : 'Error al obtener la carga del día.');
          setTodayLoad(null);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingToday(false);
      });

    return () => {
      mounted = false;
    };
  }, [athleteId]);

  const refreshWeek = useCallback(async (id: string) => {
    try {
      const data = await getAthleteWeek(id);
      setWeek(data);
    } catch {
      // Ignored
    }
  }, []);

  // Open modal for new activity
  const handleOpenAddModal = () => {
    setEditingKey(null);
    setIsModalOpen(true);
  };

  // Open modal for editing existing activity
  const handleOpenEditModal = (key: ActivityKey) => {
    setEditingKey(key);
    setIsModalOpen(true);
  };

  // Save activity (upsert via API)
  const handleSaveActivity = async (
    activityKey: ActivityKey,
    minutes: number,
    rpe: number,
  ) => {
    if (!athleteId) {
      throw new Error('No se pudo identificar al atleta. Reintentá en unos segundos.');
    }

    // Preserve all other existing activities
    const payload: DailyLoadSubmitRequest = {};
    for (const key of ALL_ACTIVITY_KEYS) {
      payload[key] = activityFromLoad(todayLoad, key);
    }
    payload[activityKey] = { minutes, rpe };

    const response = await submitDailyLoad(athleteId, payload);
    setTodayLoad(response);
    void refreshWeek(athleteId);

    // Show celebration and feedback
    const def = ACTIVITY_DEFINITIONS[activityKey];
    const activityDisplayName = def.matchSubLabel ? `${def.name} (${def.matchSubLabel})` : def.name;
    setSuccessToast(`¡${activityDisplayName} registrado con éxito!`);
    setShowConfetti(true);

    setTimeout(() => {
      setShowConfetti(false);
    }, 3500);

    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  // Delete activity (set minutes=0, rpe=null via API)
  const handleDeleteActivity = async (activityKey: ActivityKey) => {
    if (!athleteId) return;

    try {
      const payload: DailyLoadSubmitRequest = {};
      for (const key of ALL_ACTIVITY_KEYS) {
        payload[key] = activityFromLoad(todayLoad, key);
      }
      payload[activityKey] = { minutes: 0, rpe: null };

      const response = await submitDailyLoad(athleteId, payload);
      setTodayLoad(response);
      void refreshWeek(athleteId);

      const def = ACTIVITY_DEFINITIONS[activityKey];
      const activityDisplayName = def.matchSubLabel ? `${def.name} (${def.matchSubLabel})` : def.name;
      setSuccessToast(`Se eliminó el registro de ${activityDisplayName}.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: unknown) {
      setTodayError(
        err instanceof Error ? err.message : 'Error al eliminar la actividad.',
      );
    }
  };

  // Existing activities map for modal
  const existingActivitiesMap = ALL_ACTIVITY_KEYS.reduce(
    (acc, key) => {
      acc[key] = activityFromLoad(todayLoad, key);
      return acc;
    },
    {} as Record<ActivityKey, { minutes: number; rpe: number | null }>,
  );

  const initialEditingState = editingKey ? existingActivitiesMap[editingKey] : null;

  return (
    <div className="app-page-container">
      <PageHeader title="Carga del día" description="Registrá minutos y RPE por actividad" />

      <div className="app-page-body dl-page-body">
        {athleteResolutionError && (
          <div className="dl-amber" role="alert">
            <AlertTriangle size={18} />
            <span>{athleteResolutionError}</span>
          </div>
        )}

        {todayError && (
          <div className="dl-error" role="alert">
            <AlertTriangle size={18} />
            <span>{todayError}</span>
          </div>
        )}

        {/* Confetti effect on save */}
        {showConfetti && <ConfettiCelebration durationMs={3500} particleCount={90} />}

        {/* 1. Resumen Semanal Simplificado (AC01) */}
        <DailyLoadWeekSummary week={week} isLoading={isLoadingWeek} />

        {/* 2. Listado Cronológico de Actividades del Día (AC02, AC03, AC04) */}
        <div className="dl-main-card">
          <DailyLoadActivityList
            todayLoad={todayLoad}
            isLoading={isLoadingToday}
            onAddActivity={handleOpenAddModal}
            onEditActivity={handleOpenEditModal}
            onDeleteActivity={handleDeleteActivity}
            isWidgetPinned={isWidgetPinned}
            onPinWidget={handlePinWidget}
            pinWarning={pinWarning}
          />
        </div>
      </div>

      {/* 3. Formulario Compacto en Modal / Drawer (AC04, AC05, AC06, AC07, AC08, AC09) */}
      {isModalOpen && (
        <AddActivityModal
          key={editingKey ?? 'new'}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveActivity}
          editingKey={editingKey}
          initialMinutes={initialEditingState?.minutes ?? 0}
          initialRpe={initialEditingState?.rpe ?? null}
          existingActivities={existingActivitiesMap}
        />
      )}

      {/* Feedback Toast Flotante sin Layout Shift */}
      {successToast && (
        <div className="dl-feedback-toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} className="dl-feedback-toast-icon" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
};

export default DailyLoadPage;

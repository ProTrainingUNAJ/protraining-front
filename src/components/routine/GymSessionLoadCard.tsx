import { useState, useEffect, useCallback } from 'react';
import { Send, CheckCircle2, Activity } from 'lucide-react';
import { getDailyLoad, type DailyLoadSubmitResponse } from '../../api/seguimientoService';
import { FinishRoutineModal } from './FinishRoutineModal';
import type { TodayRoutineExercise } from '../../api/generated/entrenamiento';
import './GymSessionLoadCard.css';

export interface GymSessionLoadCardProps {
  athleteId: string;
  timerSeconds?: number;
  exercises?: TodayRoutineExercise[];
  onOpenFinishModal?: () => void;
  onFinishSuccess?: (result: DailyLoadSubmitResponse) => void;
}

export function GymSessionLoadCard({
  athleteId,
  timerSeconds = 0,
  exercises = [],
  onOpenFinishModal,
  onFinishSuccess,
}: GymSessionLoadCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [todayLoad, setTodayLoad] = useState<DailyLoadSubmitResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cargar carga registrada hoy si existe
  const fetchTodayLoad = useCallback(async () => {
    if (!athleteId) return;
    setIsLoading(true);
    try {
      const data = await getDailyLoad(athleteId);
      if (data === null) {
        setTodayLoad(null);
        return;
      }
      setTodayLoad(data);
    } catch {
      setTodayLoad(null);
    } finally {
      setIsLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchTodayLoad();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchTodayLoad]);

  const handleOpen = () => {
    if (onOpenFinishModal) {
      onOpenFinishModal();
    } else {
      setIsModalOpen(true);
    }
  };

  const handleSuccess = (result: DailyLoadSubmitResponse) => {
    setTodayLoad(result);
    onFinishSuccess?.(result);
  };

  const hasGymRegistered = (todayLoad?.gym?.minutes ?? 0) > 0;

  return (
    <>
      <div className="card routine-session-load-card">
        <div className="routine-session-load-bar">
          <div className="routine-session-load-left">
            <div className="routine-session-load-icon">
              <Activity size={22} />
            </div>
            <div>
              <h3 className="routine-session-load-title">
                Finalizar sesión · Carga del entrenamiento
              </h3>
              {hasGymRegistered && (
                <div className="routine-session-load-registered">
                  <span className="badge badge-success routine-session-load-registered-badge">
                    <CheckCircle2 size={13} />
                    <span>
                      Registrado: {todayLoad?.gym?.minutes} min · RPE {todayLoad?.gym?.rpe ?? '—'}
                      {todayLoad?.totalLoad
                        ? ` · ${todayLoad.totalLoad} UA`
                        : todayLoad?.gym?.minutes && todayLoad?.gym?.rpe
                          ? ` · ${todayLoad.gym.minutes * todayLoad.gym.rpe} UA`
                          : ''}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="routine-session-load-right">
            {/* Los valores fijos del botón (display, gap, padding, font-weight,
                font-size y border-radius) ya los declaran .btn +
                .routine-finish-session-btn: idénticos a los que traía el
                style inline (KAN-582). */}
            <button
              type="button"
              className="btn btn-primary routine-finish-session-btn"
              onClick={handleOpen}
              disabled={isLoading}
            >
              <Send size={16} />
              <span>Finalizar entrenamiento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal integrado si no se gestionó externamente */}
      {!onOpenFinishModal && (
        <FinishRoutineModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          athleteId={athleteId}
          timerSeconds={timerSeconds}
          exercises={exercises}
          onFinishSuccess={handleSuccess}
        />
      )}
    </>
  );
}

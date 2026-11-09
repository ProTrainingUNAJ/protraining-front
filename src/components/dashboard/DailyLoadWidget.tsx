import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  ArrowRight,
  Plus,
  RotateCw,
  Dumbbell,
  Activity,
  Trophy,
  User,
  Sparkles,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { getDailyLoad, DailyLoadSubmitResponse } from '../../api/seguimientoService';
import { structureService } from '../../api/structureService';
import './DailyLoadWidget.css';

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

interface ActivityMeta {
  label: string;
  icon: React.ReactNode;
  themeClass: string;
}

const ACTIVITY_METAS: Record<string, ActivityMeta> = {
  gym: {
    label: 'Gimnasio',
    icon: <Dumbbell size={12} />,
    themeClass: 'dl-widget__chip--gym',
  },
  sportTraining: {
    label: 'Deporte',
    icon: <Activity size={12} />,
    themeClass: 'dl-widget__chip--sport',
  },
  match1: {
    label: 'Partido 1',
    icon: <Trophy size={12} />,
    themeClass: 'dl-widget__chip--match1',
  },
  match2: {
    label: 'Partido 2',
    icon: <Trophy size={12} />,
    themeClass: 'dl-widget__chip--match2',
  },
  individualWork: {
    label: 'Individual',
    icon: <User size={12} />,
    themeClass: 'dl-widget__chip--individual',
  },
};

export const DailyLoadWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [athleteId, setAthleteId] = useState<string>(() => {
    return (user?.id ? getCachedAthleteId(user.id) : null) || '';
  });
  const [loadData, setLoadData] = useState<DailyLoadSubmitResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve athlete ID if not present in cache
  useEffect(() => {
    if (!user?.id) return;
    const cachedId = getCachedAthleteId(user.id);
    if (!cachedId) {
      structureService
        .getMe()
        .then((me) => {
          if (me?.athleteId) {
            setAthleteId(me.athleteId);
            setCachedAthleteId(user.id, me.athleteId);
          }
        })
        .catch(() => {
          // Ignored, fallback state will display empty widget
        });
    }
  }, [user?.id]);

  const fetchLoad = useCallback(async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDailyLoad(id);
      if (data === null) {
        setLoadData(null);
      } else {
        setLoadData(data);
      }
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number } })?.response?.status ||
        (axios.isAxiosError(err) ? err.response?.status : undefined);
      if (status === 404) {
        setLoadData(null);
      } else {
        setError('No se pudo sincronizar la carga');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (athleteId) {
      const timer = setTimeout(() => {
        if (isMounted) void fetchLoad(athleteId);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } else {
      const timer = setTimeout(() => {
        if (isMounted) setIsLoading(false);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [athleteId, fetchLoad]);

  const hasRecordedLoad = Boolean(
    loadData && (loadData.totalMinutes > 0 || (loadData.totalLoad ?? 0) > 0),
  );

  // Retrieve activities recorded today along with metadata
  const registeredActivities = React.useMemo(() => {
    if (!loadData) return [];
    return Object.entries(ACTIVITY_METAS)
      .map(([key, meta]) => {
        const val = loadData[key as keyof DailyLoadSubmitResponse] as
          { minutes?: number; rpe?: number | null } | undefined;
        return {
          key,
          label: meta.label,
          icon: meta.icon,
          themeClass: meta.themeClass,
          minutes: val?.minutes ?? 0,
          rpe: val?.rpe ?? null,
        };
      })
      .filter((a) => a.minutes > 0);
  }, [loadData]);

  // Estimated percentage for the colorful mini progress bar (reference target: 600 UA)
  const loadPercentage = Math.min(100, Math.round(((loadData?.totalLoad ?? 0) / 600) * 100));

  return (
    <div className="dl-widget" aria-label="Widget de Carga del Día">
      {/* Upper widget header */}
      <div className="dl-widget__header">
        <span className="dl-widget__eyebrow">
          <span className="dl-widget__icon-wrap" aria-hidden="true">
            <Zap size={14} className="dl-widget__icon" />
          </span>
          <span>Carga del Día</span>
        </span>

        {hasRecordedLoad ? (
          <span
            className="dl-widget__badge dl-widget__badge--done"
            title="Carga registrada para hoy"
          >
            <span className="dl-widget__dot dl-widget__dot--pulse" />
            <span>Hoy · Registrada</span>
          </span>
        ) : (
          <span
            className="dl-widget__badge dl-widget__badge--pending"
            title="Aún no se registró carga hoy"
          >
            <span className="dl-widget__dot dl-widget__dot--amber" />
            <span>Pendiente hoy</span>
          </span>
        )}
      </div>

      {/* Body based on state */}
      <div className="dl-widget__body">
        {isLoading ? (
          <div className="dl-widget__skeleton" aria-label="Cargando métricas de carga…">
            <div className="dl-widget__skeleton-line" style={{ width: '60%' }} />
            <div className="dl-widget__skeleton-line" style={{ width: '100%', height: '42px' }} />
            <div className="dl-widget__skeleton-line" style={{ width: '80%' }} />
          </div>
        ) : error ? (
          <div className="dl-widget__empty">
            <p className="dl-widget__empty-desc">{error}</p>
            <button
              type="button"
              className="dl-widget__btn-action"
              onClick={() => athleteId && void fetchLoad(athleteId)}
              style={{ width: 'auto', marginTop: '0.25rem' }}
            >
              <RotateCw size={13} />
              <span>Reintentar</span>
            </button>
          </div>
        ) : hasRecordedLoad && loadData ? (
          <div className="dl-widget__content-wrap">
            {/* Colorful metrics box */}
            <div className="dl-widget__metrics-row">
              <div className="dl-widget__metric-item">
                <span className="dl-widget__metric-val">
                  {loadData.totalMinutes}
                  <span className="dl-widget__metric-unit">min</span>
                </span>
                <span className="dl-widget__metric-label">Tiempo Total</span>
              </div>

              <div className="dl-widget__metric-divider" aria-hidden="true" />

              <div className="dl-widget__metric-item dl-widget__metric-item--right">
                <span className="dl-widget__metric-val dl-widget__metric-val--primary">
                  {loadData.totalLoad}
                  <span className="dl-widget__metric-unit">UA</span>
                </span>
                <span className="dl-widget__metric-label">Carga Acumulada</span>
              </div>
            </div>

            {/* Animated multicolor mini progress bar */}
            <div
              className="dl-widget__progress-track"
              role="progressbar"
              aria-valuenow={loadData.totalLoad ?? 0}
              aria-valuemin={0}
              aria-valuemax={600}
              title={`Carga acumulada: ${loadData.totalLoad} UA`}
            >
              <div
                className="dl-widget__progress-fill"
                style={{ width: `${Math.max(8, loadPercentage)}%` }}
              />
            </div>

            {/* Activity chips with distinctive colors */}
            {registeredActivities.length > 0 && (
              <div className="dl-widget__activities-list" aria-label="Actividades registradas">
                {registeredActivities.map((act) => (
                  <span key={act.key} className={`dl-widget__activity-chip ${act.themeClass}`}>
                    <span className="dl-widget__chip-icon" aria-hidden="true">
                      {act.icon}
                    </span>
                    <span>{act.label}:</span>
                    <strong>{act.minutes}m</strong>
                    {act.rpe !== null && <span className="dl-widget__chip-rpe">RPE {act.rpe}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="dl-widget__empty">
            <div className="dl-widget__empty-icon-halo" aria-hidden="true">
              <Sparkles size={20} className="dl-widget__empty-sparkle" />
            </div>
            <p className="dl-widget__empty-title">Aún no registraste carga hoy</p>
            <p className="dl-widget__empty-desc">
              Sumá tus minutos de gimnasio o deporte para monitorear tu esfuerzo y fatiga.
            </p>
          </div>
        )}
      </div>

      {/* Footer with action button and hover micro-interaction */}
      <div className="dl-widget__footer">
        {hasRecordedLoad ? (
          <button
            type="button"
            className="dl-widget__btn-action dl-widget__btn-action--detail"
            onClick={() => navigate('/athlete/daily-load')}
          >
            <span>Ver detalle o actualizar</span>
            <ArrowRight size={14} className="dl-widget__btn-arrow" />
          </button>
        ) : (
          <button
            type="button"
            className="dl-widget__btn-action dl-widget__btn-action--primary"
            onClick={() => navigate('/athlete/daily-load')}
          >
            <Plus size={14} />
            <span>Registrar carga de hoy</span>
          </button>
        )}
      </div>
    </div>
  );
};

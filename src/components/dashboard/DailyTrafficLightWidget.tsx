import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Sparkles, Moon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getCheckInCompleted } from '../athlete/checkin/checkInHelper';
import { getAthleteTodayCheckIn, CheckIn } from '../../api/seguimientoService';
import { structureService } from '../../api/structureService';
import './DailyTrafficLightWidget.css';

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

export type TrafficLightColor = 'Green' | 'Yellow' | 'Red';

interface CheckInLocalResult {
  trafficLight?: TrafficLightColor;
  trafficLightReason?: string | null;
  isOffline?: boolean;
}

export const DailyTrafficLightWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [athleteId, setAthleteId] = useState<string>(() => {
    return (user?.id ? getCachedAthleteId(user.id) : null) || '';
  });

  const [trafficColor, setTrafficColor] = useState<TrafficLightColor | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Synchronize athlete id if missing from local storage cache
  useEffect(() => {
    if (!user?.id) return;
    const cached = getCachedAthleteId(user.id);
    if (!cached) {
      structureService
        .getMe()
        .then((me) => {
          if (me?.athleteId) {
            setAthleteId(me.athleteId);
            setCachedAthleteId(user.id, me.athleteId);
          }
        })
        .catch(() => {
          // Ignored
        });
    }
  }, [user?.id]);

  // Read local storage and remote backend for today's check-in
  const syncCheckInStatus = useCallback(async (id: string) => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    // 1. Try local completed state first for instantaneous display
    const localCompleted = getCheckInCompleted(id);
    if (localCompleted) {
      const result = localCompleted.result as CheckInLocalResult | undefined;
      const color = result?.trafficLight;
      if (color === 'Green' || color === 'Yellow' || color === 'Red') {
        setTrafficColor(color);
        setReason(result?.trafficLightReason || null);
        setSleepHours(localCompleted.draft?.sleepHours ?? null);
        setIsLoading(false);
        return;
      }
    }

    // 2. Query remote microservice if not found in local storage
    try {
      const remoteCheckIn: CheckIn | null = await getAthleteTodayCheckIn(id);
      if (
        remoteCheckIn &&
        (remoteCheckIn.trafficLight === 'Green' ||
          remoteCheckIn.trafficLight === 'Yellow' ||
          remoteCheckIn.trafficLight === 'Red')
      ) {
        setTrafficColor(remoteCheckIn.trafficLight);
        setReason(remoteCheckIn.trafficLightReason || null);
        setSleepHours(remoteCheckIn.sleepHours ?? null);
      } else {
        setTrafficColor(null);
        setReason(null);
        setSleepHours(null);
      }
    } catch {
      // Retain previous state or fallback to null (off)
      if (!localCompleted) {
        setTrafficColor(null);
        setReason(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (athleteId) {
      const timer = setTimeout(() => {
        if (isMounted) void syncCheckInStatus(athleteId);
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
  }, [athleteId, syncCheckInStatus]);

  // Re-sync on window focus or storage changes (e.g. after completing check-in)
  useEffect(() => {
    const handleRecheck = () => {
      if (athleteId) {
        void syncCheckInStatus(athleteId);
      }
    };

    window.addEventListener('focus', handleRecheck);
    window.addEventListener('storage', handleRecheck);
    return () => {
      window.removeEventListener('focus', handleRecheck);
      window.removeEventListener('storage', handleRecheck);
    };
  }, [athleteId, syncCheckInStatus]);

  const isRed = trafficColor === 'Red';
  const isYellow = trafficColor === 'Yellow';
  const isGreen = trafficColor === 'Green';
  const isOff = trafficColor === null;

  // Header badge text and styles
  const getBadgeContent = () => {
    if (isGreen) {
      return {
        label: 'Apto para entrenar',
        badgeClass: 'dtl-widget__badge--green',
        dotClass: 'dtl-widget__dot--pulsing',
      };
    }
    if (isYellow) {
      return {
        label: 'Atención',
        badgeClass: 'dtl-widget__badge--yellow',
        dotClass: 'dtl-widget__dot--pulsing',
      };
    }
    if (isRed) {
      return {
        label: 'Precaución',
        badgeClass: 'dtl-widget__badge--red',
        dotClass: 'dtl-widget__dot--pulsing',
      };
    }
    return {
      label: 'Sin completar hoy',
      badgeClass: 'dtl-widget__badge--off',
      dotClass: '',
    };
  };

  const badgeInfo = getBadgeContent();

  // Status title and description
  const getStatusDetails = () => {
    if (isGreen) {
      return {
        title: 'Semáforo Verde · Óptimo',
        titleClass: 'dtl-widget__status-title--green',
        desc: reason || 'Estado físico y descanso óptimos para la jornada de entrenamiento.',
      };
    }
    if (isYellow) {
      return {
        title: 'Semáforo Amarillo · Atención',
        titleClass: 'dtl-widget__status-title--yellow',
        desc: reason || 'Molestia o fatiga moderada detectada. Moderá la exigencia y avisá al PF.',
      };
    }
    if (isRed) {
      return {
        title: 'Semáforo Rojo · Cuidado',
        titleClass: 'dtl-widget__status-title--red',
        desc:
          reason || 'Alerta de dolor o molestia intensa reportada. Consultá con tu cuerpo técnico.',
      };
    }
    return {
      title: 'Semáforo apagado',
      titleClass: '',
      desc: 'Aún no registraste tu estado físico de hoy. Completá tu check-in para activar el semáforo.',
    };
  };

  const statusDetails = getStatusDetails();

  return (
    <div className="dtl-widget" data-testid="daily-traffic-light-widget">
      {/* Top Header */}
      <div className="dtl-widget__header">
        <span className="dtl-widget__eyebrow">
          <span className="dtl-widget__icon-wrap">
            <Activity size={13} className="dtl-widget__icon" />
          </span>
          Semáforo Diario
        </span>

        <span className={`dtl-widget__badge ${badgeInfo.badgeClass}`}>
          <span className={`dtl-widget__dot ${badgeInfo.dotClass}`} />
          {badgeInfo.label}
        </span>
      </div>

      {/* Main Body: Physical Traffic Light Pole + Information */}
      <div className="dtl-widget__body">
        {/* Physical 3D Traffic Light Pole */}
        <div
          className={`dtl-traffic-pole ${isOff ? 'dtl-traffic-pole--all-off' : ''}`}
          role="img"
          aria-label={`Semáforo diario: ${trafficColor ? `Luz ${trafficColor}` : 'Apagado'}`}
        >
          {/* Red Light */}
          <div
            className={`dtl-bulb ${isRed ? 'dtl-bulb--red-on' : 'dtl-bulb--red-off'}`}
            data-testid="traffic-bulb-red"
          >
            {isRed && <div className="dtl-bulb__reflection" />}
          </div>

          {/* Yellow Light */}
          <div
            className={`dtl-bulb ${isYellow ? 'dtl-bulb--yellow-on' : 'dtl-bulb--yellow-off'}`}
            data-testid="traffic-bulb-yellow"
          >
            {isYellow && <div className="dtl-bulb__reflection" />}
          </div>

          {/* Green Light */}
          <div
            className={`dtl-bulb ${isGreen ? 'dtl-bulb--green-on' : 'dtl-bulb--green-off'}`}
            data-testid="traffic-bulb-green"
          >
            {isGreen && <div className="dtl-bulb__reflection" />}
          </div>
        </div>

        {/* Text information and status */}
        <div className="dtl-widget__info">
          {isLoading ? (
            <div className="dtl-widget__skeleton">
              <div className="dtl-widget__skeleton-line" style={{ width: '75%' }} />
              <div className="dtl-widget__skeleton-line" style={{ width: '90%' }} />
              <div className="dtl-widget__skeleton-line" style={{ width: '60%' }} />
            </div>
          ) : (
            <>
              <h3 className={`dtl-widget__status-title ${statusDetails.titleClass}`}>
                {statusDetails.title}
              </h3>
              <p className="dtl-widget__status-desc">{statusDetails.desc}</p>

              {/* Informative micro-chips if completed */}
              {!isOff && (
                <div className="dtl-widget__chips">
                  {sleepHours !== null && (
                    <span className="dtl-widget__chip">
                      <Moon size={11} /> {sleepHours}h descanso
                    </span>
                  )}
                  {isGreen && (
                    <span className="dtl-widget__chip">
                      <ShieldCheck size={11} /> 100% disponible
                    </span>
                  )}
                  {(isYellow || isRed) && (
                    <span className="dtl-widget__chip">
                      <AlertTriangle size={11} /> Con observaciones
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer Navigation CTA */}
      <div className="dtl-widget__footer">
        {isOff ? (
          <button
            type="button"
            className="dtl-widget__btn-action dtl-widget__btn-action--primary"
            onClick={() => navigate('/athlete/checkin')}
            aria-label="Completar Check-in de hoy"
          >
            <Sparkles size={14} />
            Completar Check-in de hoy
            <ArrowRight size={14} className="dtl-widget__arrow" />
          </button>
        ) : (
          <button
            type="button"
            className="dtl-widget__btn-action dtl-widget__btn-action--secondary"
            onClick={() => navigate('/athlete/checkin')}
            aria-label="Ver o actualizar mi Check-in de hoy"
          >
            Ver o actualizar mi Check-in
            <ArrowRight size={14} className="dtl-widget__arrow" />
          </button>
        )}
      </div>
    </div>
  );
};

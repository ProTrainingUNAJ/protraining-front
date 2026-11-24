import React, { useState, useMemo } from 'react';
import { X, Activity, Trophy, Loader2, CheckCircle2, Info, ChevronDown } from 'lucide-react';
import { RpeSliderBar } from '../common/RpeSliderBar';
import {
  submitDailyLoad,
  type DailyLoadRequest,
  type DailyLoadActivity,
} from '../../api/seguimientoService';

export interface AttendanceLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName: string;
  initialActivities?: Array<{
    type: string;
    name: string;
    minutes: number;
    rpe?: number | null;
  }>;
  onSuccess: () => void;
}

type ActivityKey = 'gym' | 'sportTraining' | 'match1' | 'match2' | 'individualWork';
type MainCategory = 'gym' | 'sportTraining' | 'match' | 'individualWork';

const RPE_DESCRIPTIONS: Record<number, { label: string; color: string }> = {
  0: { label: 'Reposo', color: 'var(--text-muted)' },
  1: { label: 'Muy suave', color: 'var(--traffic-green)' },
  2: { label: 'Suave', color: 'var(--traffic-green)' },
  3: { label: 'Moderado', color: 'var(--traffic-green)' },
  4: { label: 'Algo duro', color: 'var(--primary)' },
  5: { label: 'Duro', color: 'var(--primary)' },
  6: { label: 'Duro +', color: 'var(--traffic-yellow)' },
  7: { label: 'Muy duro', color: 'var(--traffic-yellow)' },
  8: { label: 'Extremadamente duro', color: 'var(--traffic-red)' },
  9: { label: 'Extenuante', color: 'var(--traffic-red)' },
  10: { label: 'Máximo esfuerzo', color: 'var(--traffic-red)' },
};

function buildInitialActivitiesState(
  initialActivities?: AttendanceLoadModalProps['initialActivities'],
): {
  activitiesState: Record<ActivityKey, { minutes: number; rpe: number }>;
  firstSelected: ActivityKey;
} {
  const initialMap: Record<ActivityKey, { minutes: number; rpe: number }> = {
    gym: { minutes: 0, rpe: 7 },
    sportTraining: { minutes: 0, rpe: 7 },
    match1: { minutes: 0, rpe: 8 },
    match2: { minutes: 0, rpe: 8 },
    individualWork: { minutes: 0, rpe: 6 },
  };

  let firstWithData: ActivityKey | null = null;

  if (initialActivities && initialActivities.length > 0) {
    initialActivities.forEach((act) => {
      let key: ActivityKey | null = null;
      if (act.type === 'Gym') key = 'gym';
      else if (act.type === 'SportTraining') key = 'sportTraining';
      else if (act.type === 'Match1') key = 'match1';
      else if (act.type === 'Match2') key = 'match2';
      else if (act.type === 'IndividualWork') key = 'individualWork';

      if (key) {
        initialMap[key] = {
          minutes: act.minutes,
          rpe: act.rpe ?? (key.startsWith('match') ? 8 : 7),
        };
        if (!firstWithData && act.minutes > 0) {
          firstWithData = key;
        }
      }
    });
  }

  return {
    activitiesState: initialMap,
    firstSelected: firstWithData || 'gym',
  };
}

export const AttendanceLoadModal: React.FC<AttendanceLoadModalProps> = ({
  isOpen,
  onClose,
  athleteId,
  athleteName,
  initialActivities,
  onSuccess,
}) => {
  const initialSetup = useMemo(
    () => buildInitialActivitiesState(initialActivities),
    [initialActivities],
  );

  const initialMainCategory: MainCategory = initialSetup.firstSelected.startsWith('match')
    ? 'match'
    : (initialSetup.firstSelected as MainCategory);

  const initialMatchInstance: 'match1' | 'match2' =
    initialSetup.firstSelected === 'match2' ? 'match2' : 'match1';

  const [mainCategory, setMainCategory] = useState<MainCategory>(initialMainCategory);
  const [matchInstance, setMatchInstance] = useState<'match1' | 'match2'>(initialMatchInstance);

  const selectedActivity: ActivityKey =
    mainCategory === 'match' ? matchInstance : (mainCategory as ActivityKey);

  const [activitiesState, setActivitiesState] = useState<
    Record<ActivityKey, { minutes: number; rpe: number }>
  >(initialSetup.activitiesState);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentConfig = activitiesState[selectedActivity];
  const currentMinutes = currentConfig?.minutes ?? 0;
  const currentRpe = currentConfig?.rpe ?? 7;
  const currentActivityUa = currentMinutes * currentRpe;

  // Totales acumulados sumando todas las actividades configuradas
  const totals = useMemo(() => {
    let minutes = 0;
    let ua = 0;
    (Object.keys(activitiesState) as ActivityKey[]).forEach((key) => {
      const act = activitiesState[key];
      if (act.minutes > 0) {
        minutes += act.minutes;
        ua += act.minutes * act.rpe;
      }
    });
    return { minutes, ua };
  }, [activitiesState]);

  if (!isOpen) return null;

  const handleMinutesChange = (newMinutes: number) => {
    const safeMinutes = Math.max(0, Math.min(600, isNaN(newMinutes) ? 0 : newMinutes));
    setActivitiesState((prev) => ({
      ...prev,
      [selectedActivity]: {
        ...prev[selectedActivity],
        minutes: safeMinutes,
      },
    }));
  };

  const handleRpeChange = (newRpe: number) => {
    const safeRpe = Math.max(0, Math.min(10, isNaN(newRpe) ? 0 : newRpe));
    setActivitiesState((prev) => ({
      ...prev,
      [selectedActivity]: {
        ...prev[selectedActivity],
        rpe: safeRpe,
      },
    }));
  };

  const handleQuickMinutesAdd = (amount: number) => {
    handleMinutesChange(currentMinutes + amount);
  };

  const handleQuickMinutesSet = (amount: number) => {
    handleMinutesChange(amount);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que al menos una actividad tenga minutos mayores a 0
    if (totals.minutes === 0) {
      setError('Debés ingresar al menos una actividad con minutos mayores a 0.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: DailyLoadRequest = {};

      (Object.keys(activitiesState) as ActivityKey[]).forEach((key) => {
        const item = activitiesState[key];
        const activityPayload: DailyLoadActivity = {
          minutes: item.minutes,
          rpe: item.minutes > 0 ? item.rpe : null,
        };
        payload[key] = activityPayload;
      });

      await submitDailyLoad(athleteId, payload);
      setSuccessMessage('¡Carga del día registrada exitosamente!');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 700);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar la carga de entrenamiento.',
      );
      setSubmitting(false);
    }
  };

  const rpeMeta = RPE_DESCRIPTIONS[currentRpe] || {
    label: 'Desconocido',
    color: 'var(--text-muted)',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-load-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 48, 80, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={20} />
            </div>
            <div>
              <h2
                id="attendance-load-modal-title"
                style={{
                  margin: 0,
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: 1.2,
                }}
              >
                Carga de Entrenamiento
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Atleta: <strong>{athleteName}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
            }}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSave}
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Mensajes de Feedback */}
          {error && (
            <div
              role="alert"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger-text)',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'var(--traffic-green-bg)',
                border: '1px solid var(--traffic-green-border)',
                color: 'var(--traffic-green-text)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Selector de Actividad en Menú Desplegable (KAN-646) */}
          <div>
            <label
              htmlFor="attendance-activity-select"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '0.45rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Tipo de Actividad
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="attendance-activity-select"
                aria-label="Tipo de Actividad"
                value={mainCategory}
                onChange={(e) => setMainCategory(e.target.value as MainCategory)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.95rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="gym">
                  Gimnasio
                  {activitiesState.gym.minutes > 0 ? ` (${activitiesState.gym.minutes} min)` : ''}
                </option>
                <option value="sportTraining">
                  Campo
                  {activitiesState.sportTraining.minutes > 0
                    ? ` (${activitiesState.sportTraining.minutes} min)`
                    : ''}
                </option>
                <option value="match">
                  Partido
                  {activitiesState.match1.minutes > 0 || activitiesState.match2.minutes > 0
                    ? ` (${activitiesState.match1.minutes + activitiesState.match2.minutes} min)`
                    : ''}
                </option>
                <option value="individualWork">
                  Individual
                  {activitiesState.individualWork.minutes > 0
                    ? ` (${activitiesState.individualWork.minutes} min)`
                    : ''}
                </option>
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ChevronDown size={18} />
              </div>
            </div>

            {/* Sub-selector condicional de Instancia de Partido (KAN-646) */}
            {mainCategory === 'match' && (
              <div
                style={{
                  marginTop: '0.65rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '10px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  Instancia:
                </span>
                <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setMatchInstance('match1')}
                    aria-pressed={matchInstance === 'match1'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border:
                        matchInstance === 'match1'
                          ? '1px solid var(--primary)'
                          : '1px solid var(--border)',
                      background: matchInstance === 'match1' ? 'var(--primary)' : 'var(--bg-card)',
                      color: matchInstance === 'match1' ? 'var(--on-primary)' : 'var(--text-main)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Trophy size={13} aria-hidden="true" />
                    <span>1° Partido</span>
                    {activitiesState.match1.minutes > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.08rem 0.35rem',
                          borderRadius: '9999px',
                          background:
                            matchInstance === 'match1'
                              ? 'rgba(255, 255, 255, 0.25)'
                              : 'var(--traffic-green-bg)',
                          color:
                            matchInstance === 'match1'
                              ? 'var(--white)'
                              : 'var(--traffic-green-text)',
                        }}
                      >
                        {activitiesState.match1.minutes}m
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchInstance('match2')}
                    aria-pressed={matchInstance === 'match2'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border:
                        matchInstance === 'match2'
                          ? '1px solid var(--primary)'
                          : '1px solid var(--border)',
                      background: matchInstance === 'match2' ? 'var(--primary)' : 'var(--bg-card)',
                      color: matchInstance === 'match2' ? 'var(--on-primary)' : 'var(--text-main)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Trophy size={13} aria-hidden="true" />
                    <span>2° Partido</span>
                    {activitiesState.match2.minutes > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.08rem 0.35rem',
                          borderRadius: '9999px',
                          background:
                            matchInstance === 'match2'
                              ? 'rgba(255, 255, 255, 0.25)'
                              : 'var(--traffic-green-bg)',
                          color:
                            matchInstance === 'match2'
                              ? 'var(--white)'
                              : 'var(--traffic-green-text)',
                        }}
                      >
                        {activitiesState.match2.minutes}m
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Configuración de la Actividad Seleccionada */}
          <div
            style={{
              padding: '1.1rem',
              borderRadius: '14px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Input de Minutos y Chips */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.4rem',
                }}
              >
                <label
                  htmlFor="attendance-minutes-input"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  Duración de la sesión (minutos)
                </label>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {currentMinutes} min
                </span>
              </div>

              <input
                id="attendance-minutes-input"
                type="number"
                min="0"
                max="600"
                step="5"
                value={currentMinutes === 0 ? '' : currentMinutes}
                onChange={(e) => handleMinutesChange(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />

              {/* Botones de incremento rápido */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.35rem',
                  marginTop: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                {[15, 30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleQuickMinutesSet(m)}
                    style={{
                      padding: '0.25rem 0.55rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: currentMinutes === m ? 'var(--primary)' : 'var(--bg-card)',
                      color: currentMinutes === m ? 'var(--on-primary)' : 'var(--text-main)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {m} min
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleQuickMinutesAdd(15)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  +15 min
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickMinutesSet(0)}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>

            {/* Slider de RPE (Escala Borg CR-10) */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.3rem',
                }}
              >
                <label
                  htmlFor="attendance-rpe-slider"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  Esfuerzo Percibido (RPE)
                </label>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 900,
                      color: rpeMeta.color,
                      lineHeight: 1,
                    }}
                  >
                    {currentRpe}
                  </span>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: rpeMeta.color,
                    }}
                  >
                    ({rpeMeta.label})
                  </span>
                </div>
              </div>

              <RpeSliderBar
                id="attendance-rpe-slider"
                value={currentRpe}
                onChange={handleRpeChange}
                ariaLabel="Esfuerzo Percibido (RPE)"
              />
            </div>

            {/* Preview de UA de esta actividad */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Cálculo de esta actividad:
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {currentMinutes} min × {currentRpe} RPE ={' '}
                <strong style={{ color: 'var(--primary)', fontSize: '0.98rem' }}>
                  {currentActivityUa} UA
                </strong>
              </span>
            </div>
          </div>

          {/* Resumen Total y Fórmula de Foster con Barra de Carga (Imagen 2 - KAN-646) */}
          <div
            style={{
              padding: '0.85rem 1.1rem',
              borderRadius: '12px',
              background: 'color-mix(in srgb, var(--primary) 8%, var(--bg-card))',
              border: '1px solid color-mix(in srgb, var(--primary) 25%, var(--border))',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Total Acumulado del Día:
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--primary)' }}>
                {totals.minutes} min · {totals.ua} UA
              </span>
            </div>

            {/* Barra de progreso de carga diaria con color neutro y escala dinámica (KAN-646, KAN-512) */}
            <div
              className="attendance-daily-load-bar"
              style={{
                width: '100%',
                height: '11px',
                borderRadius: '9999px',
                background: 'var(--border)',
                overflow: 'hidden',
                position: 'relative',
              }}
              role="progressbar"
              aria-valuenow={totals.ua}
              aria-valuemin={0}
              aria-valuemax={Math.max(1200, Math.ceil((totals.ua * 1.25) / 200) * 200)}
              aria-label="Carga acumulada en el día"
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(totals.ua > 0 ? 5 : 0, (totals.ua / Math.max(1200, Math.ceil((totals.ua * 1.25) / 200) * 200)) * 100))}%`,
                  borderRadius: '9999px',
                  background: 'var(--load-bar-fill, var(--primary))',
                  boxShadow:
                    totals.ua > 0
                      ? '0 0 8px color-mix(in srgb, var(--load-bar-fill, var(--primary)) 35%, transparent)'
                      : 'none',
                  transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.74rem',
                color: 'var(--text-muted)',
                lineHeight: 1.35,
              }}
            >
              <Info size={14} style={{ flexShrink: 0, color: 'var(--primary)' }} />
              <span>
                <strong>Método Foster:</strong> UA (Unidades Arbitrarias) = Minutos de sesión × RPE
                (esfuerzo percibido Borg CR-10).
              </span>
            </div>
          </div>

          {/* Acciones */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-secondary"
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || totals.minutes === 0}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.35rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              <span>{submitting ? 'Guardando…' : 'Guardar Carga'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

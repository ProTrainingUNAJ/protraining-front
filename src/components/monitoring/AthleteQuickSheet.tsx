import React, { useEffect } from 'react';
import {
  X,
  AlertCircle,
  AlertTriangle,
  Moon,
  Activity,
  MessageSquare,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Siren,
  Thermometer,
  Clock,
  Zap,
  Dumbbell,
  Trophy,
  Users,
} from 'lucide-react';
import { AthleteTrafficLightItem } from './trafficLight.types';
import { AthleteBodyPainMap } from './AthleteBodyPainMap';
import { AthleteAvatar } from './AthleteAvatar';
import { AthleteContactActions } from './AthleteContactActions';

export interface QuickSheetActivityDetail {
  type: string;
  name: string;
  minutes: number;
  rpe?: number | null;
}

/**
 * Ficha rápida del atleta (KAN-365/KAN-366/KAN-621): se abre desde las tarjetas de
 * MonitoringPage (tanto en Semáforo del Día como en Asistencia & RPE).
 *
 * En Semáforo: muestra métricas del check-in, mapa anatómico de dolor/lesión y acción de asignar plan diferenciado.
 * En Asistencia & RPE: muestra exclusivamente el bloque de Actividades y Carga del Día (minutos, RPE y UA).
 * En ambos: cabecera con avatar, indicadores rápidos y diagnóstico de estado, junto al botón de cerrar ficha.
 */
interface AthleteQuickSheetProps {
  athlete: AthleteTrafficLightItem | null;
  mode?: 'semaforo' | 'asistencia';
  attendanceData?: {
    totalMinutes?: number;
    totalLoad?: number;
    activities?: QuickSheetActivityDetail[];
  };
  onClose: () => void;
  onAssignDifferentiated?: (athleteId: string) => void;
  onOpenAdjustment?: (athlete: AthleteTrafficLightItem) => void;
}

export const AthleteQuickSheet: React.FC<AthleteQuickSheetProps> = ({
  athlete,
  mode = 'semaforo',
  attendanceData,
  onClose,
  onAssignDifferentiated,
  onOpenAdjustment,
}) => {
  // Close with Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!athlete) return null;

  const isRed = athlete.status === 'red';
  const isYellow = athlete.status === 'yellow';
  const isGreen = athlete.status === 'green';

  const rawMaxPain =
    athlete.pains && athlete.pains.length > 0 ? Math.max(...athlete.pains.map((p) => p.level)) : 0;
  // La escala EVA máxima es 5/5. La lesión activa es una condición clínica, no un nivel 6 (KAN-621).
  const maxPainLevel = Math.min(5, rawMaxPain);

  const effectiveRpe =
    athlete.rpe !== undefined && athlete.rpe !== null && athlete.rpe > 0
      ? athlete.rpe
      : athlete.activities && athlete.activities.length > 0 && athlete.activities[0].rpe
        ? athlete.activities[0].rpe
        : undefined;

  const statusBorderColor = isRed
    ? 'var(--traffic-red-border)'
    : isYellow
      ? 'var(--traffic-yellow-border)'
      : isGreen
        ? 'var(--traffic-green-border)'
        : 'var(--traffic-gray-border)';

  const statusBgColor = isRed
    ? 'var(--traffic-red-bg)'
    : isYellow
      ? 'var(--traffic-yellow-bg)'
      : isGreen
        ? 'var(--traffic-green-bg)'
        : 'var(--traffic-gray-bg)';

  const statusTextColor = isRed
    ? 'var(--traffic-red-text)'
    : isYellow
      ? 'var(--traffic-yellow-text)'
      : isGreen
        ? 'var(--traffic-green-text)'
        : 'var(--traffic-gray-text)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--routine-modal-overlay)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-end', // Bottom sheet on mobile
        justifyContent: 'center',
        padding: 0,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-sheet-title"
    >
      <div
        className="card athlete-quick-sheet-card"
        style={{
          margin: 0,
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Sheet */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.85rem',
            gap: '0.75rem',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}
          >
            {/* Avatar con anillo y soporte para foto de perfil */}
            <AthleteAvatar
              name={athlete.name}
              avatarUrl={athlete.avatarUrl}
              status={athlete.status}
              ringColor={statusBorderColor}
              size={48}
              showRing={true}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <h3
                  id="quick-sheet-title"
                  style={{
                    margin: 0,
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                  }}
                >
                  {athlete.name}
                </h3>

                {/* Indicadores rápidos de check-in (Imagen 3) */}
                {athlete.status !== 'gray' && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                    }}
                    aria-label="Indicadores rápidos del check-in"
                  >
                    {athlete.hasActiveInjury && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: 'var(--traffic-red-text)',
                        }}
                        title="Lesión activa reportada en el check-in"
                        aria-label="Lesión activa"
                      >
                        <Siren size={16} />
                      </span>
                    )}

                    {athlete.isSick && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: 'var(--warning-text)',
                        }}
                        title="Reportó enfermedad en el check-in"
                        aria-label="Enfermo"
                      >
                        <Thermometer size={16} />
                      </span>
                    )}

                    {maxPainLevel > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: maxPainLevel >= 4 ? 'var(--danger-text)' : 'var(--warning-text)',
                        }}
                        title={`Dolor máximo nivel ${maxPainLevel}/5`}
                      >
                        <AlertCircle size={16} /> {maxPainLevel}/5
                      </span>
                    )}

                    {athlete.sleepHours !== undefined && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: 'var(--text-muted)',
                        }}
                        title={`${athlete.sleepHours} hs de sueño`}
                      >
                        <Moon size={16} /> {athlete.sleepHours}h
                      </span>
                    )}

                    {athlete.rpe !== undefined && athlete.rpe > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.2rem',
                          color: athlete.rpe >= 8 ? 'var(--danger-text)' : 'var(--info-text)',
                        }}
                        title={`RPE de la última sesión: ${athlete.rpe}`}
                      >
                        <Activity size={16} /> {athlete.rpe}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {athlete.position} · {athlete.category}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
              flexShrink: 0,
            }}
            aria-label="Cerrar ficha"
          >
            <X size={20} />
          </button>
        </div>

        {/* Diagnóstico del Semáforo */}
        <div
          style={{
            background: statusBgColor,
            border: `1px solid ${statusBorderColor}`,
            borderRadius: '14px',
            padding: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.4rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: statusTextColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {isRed && <ShieldAlert size={16} />}
              {isYellow && <AlertTriangle size={16} />}
              {isGreen && <CheckCircle2 size={16} />}
              Estado: {athlete.statusLabel}
            </span>

            {athlete.submittedAt && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Enviado {athlete.submittedAt}
              </span>
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              lineHeight: 1.35,
            }}
          >
            {athlete.recommendation}
          </p>
        </div>

        {/* Modo Semáforo: Desglose de Parámetros de Check-in y Mapa Anatómico */}
        {mode === 'semaforo' &&
          (athlete.status !== 'gray' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Tarjetas de parámetros del Check-in (estilo de tarjetas métricas, sin duplicación de sueño) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                }}
              >
                {/* 1. Sueño y Descanso */}
                <div
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '0.2rem',
                    }}
                  >
                    <Moon size={14} style={{ color: 'var(--secondary)' }} /> Sueño y Descanso
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {athlete.sleepHours !== undefined && athlete.sleepHours !== null
                      ? `${athlete.sleepHours} hrs`
                      : '—'}
                  </strong>
                  <small
                    style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                  >
                    Calidad: {athlete.sleepQuality || 'Normal'}
                  </small>
                </div>

                {/* 2. RPE / Fatiga */}
                <div
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-subtle)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      marginBottom: '0.2rem',
                    }}
                  >
                    <Activity size={14} style={{ color: 'var(--stat-cyan)' }} /> RPE / Fatiga
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                    {effectiveRpe !== undefined ? `${effectiveRpe} / 10` : '—'}
                  </strong>
                  <small
                    style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                  >
                    {effectiveRpe && effectiveRpe >= 8
                      ? 'Sobrecarga alta'
                      : effectiveRpe
                        ? 'Carga moderada'
                        : 'Sin registro'}
                  </small>
                </div>

                {/* 3. Dolor EVA Máximo (si reportó dolor) */}
                {maxPainLevel > 0 && (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-subtle)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        marginBottom: '0.2rem',
                      }}
                    >
                      <AlertCircle
                        size={14}
                        style={{
                          color: maxPainLevel >= 4 ? 'var(--traffic-red)' : 'var(--traffic-yellow)',
                        }}
                      />{' '}
                      Dolor EVA
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      {maxPainLevel}/5
                    </strong>
                    <small
                      style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                    >
                      {athlete.hasActiveInjury
                        ? 'Lesión activa reportada'
                        : maxPainLevel >= 4
                          ? 'Dolor agudo / máximo'
                          : 'Molestia moderada'}
                    </small>
                  </div>
                )}

                {/* 4. Estado Clínico / Salud (si reportó enfermedad o lesión) */}
                {(athlete.hasActiveInjury || athlete.isSick) && (
                  <div
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-subtle)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        marginBottom: '0.2rem',
                      }}
                    >
                      {athlete.isSick ? (
                        <Thermometer size={14} style={{ color: 'var(--warning-text)' }} />
                      ) : (
                        <Siren size={14} style={{ color: 'var(--traffic-red-text)' }} />
                      )}{' '}
                      Estado de Salud
                    </div>
                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      {athlete.isSick && athlete.hasActiveInjury
                        ? 'Lesión y Enfermedad'
                        : athlete.isSick
                          ? 'Enfermedad'
                          : 'Lesión Activa'}
                    </strong>
                    <small
                      style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                    >
                      {athlete.isSick ? 'Reportó síntomas hoy' : 'Zona afectada'}
                    </small>
                  </div>
                )}
              </div>

              {/* Visual Anatomical Human Body Map (inherited from athlete check-in) */}
              <AthleteBodyPainMap pains={athlete.pains} athleteName={athlete.name} />

              {/* Observaciones del Atleta */}
              {athlete.notes && (
                <div
                  style={{
                    padding: '0.75rem 0.85rem',
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      marginBottom: '0.3rem',
                    }}
                  >
                    <MessageSquare size={13} /> Observación del Atleta:
                  </span>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      fontStyle: 'italic',
                      lineHeight: 1.35,
                    }}
                  >
                    "{athlete.notes}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '1.5rem',
                textAlign: 'center',
                background: 'var(--bg-subtle)',
                borderRadius: '14px',
                border: '1px dashed var(--border)',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Este atleta aún no ha completado el formulario de check-in del día.
              </p>
            </div>
          ))}

        {/* Modo Asistencia & RPE: Actividades y Carga del Día */}
        {mode === 'asistencia' &&
          (() => {
            const activities = attendanceData?.activities ?? athlete.activities ?? [];
            const totalMinutes =
              attendanceData?.totalMinutes ??
              athlete.totalMinutes ??
              activities.reduce((acc, a) => acc + a.minutes, 0);
            const totalLoad =
              attendanceData?.totalLoad ??
              athlete.totalLoad ??
              activities.reduce((acc, a) => acc + a.minutes * (a.rpe ?? 0), 0);

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Desglose de Carga del Día: Caja de métricas Tiempo Total y Carga Acumulada */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-around',
                      textAlign: 'center',
                      padding: '0.85rem 1.25rem',
                      background: 'var(--bg-card)',
                      borderRadius: '18px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.25rem',
                          lineHeight: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.9rem',
                            fontWeight: 900,
                            color: 'var(--text-main)',
                          }}
                        >
                          {totalMinutes}
                        </span>
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                          }}
                        >
                          min
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          marginTop: '0.4rem',
                        }}
                      >
                        Tiempo Total
                      </span>
                    </div>

                    <div
                      style={{
                        width: '1px',
                        height: '42px',
                        background: 'var(--border)',
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '0.25rem',
                          lineHeight: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.9rem',
                            fontWeight: 900,
                            color: 'var(--text-main)',
                          }}
                        >
                          {totalLoad}
                        </span>
                        <span
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            color: 'var(--text-muted)',
                          }}
                        >
                          UA
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: 'var(--text-muted)',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          marginTop: '0.4rem',
                        }}
                      >
                        Carga Acumulada
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de carga horizontal (verde a azul/dorado) */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--border)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width:
                          totalLoad > 0
                            ? `${Math.min(100, Math.max(6, Math.round((totalLoad / Math.max(1000, Math.ceil((totalLoad * 1.25) / 100) * 100)) * 100)))}%`
                            : '0%',
                        height: '100%',
                        background: 'var(--load-bar-fill, var(--primary))',
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '0.25rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Zap size={16} color="var(--primary, #0284c7)" />
                    ACTIVIDADES Y CARGA DEL DÍA
                  </span>

                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                    }}
                  >
                    {totalMinutes} min totales · {totalLoad} UA
                  </span>
                </div>

                {activities.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {activities.map((act, index) => {
                      const ua = act.minutes * (act.rpe ?? 0);
                      const getActivityDetails = (type: string, name: string) => {
                        if (type === 'Gym') return { icon: Dumbbell, label: 'Gimnasio' };
                        if (type === 'SportTraining')
                          return { icon: Activity, label: 'Entrenamiento de Campo' };
                        if (type === 'Match1' || type === 'Match2' || type === 'Match')
                          return { icon: Trophy, label: 'Partido Oficial' };
                        if (type === 'IndividualWork')
                          return { icon: Users, label: 'Trabajo Individual' };
                        return { icon: Activity, label: name || 'Actividad' };
                      };
                      const { icon: ActIcon, label: subLabel } = getActivityDetails(
                        act.type,
                        act.name,
                      );

                      return (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.85rem 1rem',
                            background: 'var(--bg-subtle)',
                            borderRadius: '14px',
                            border: '1px solid var(--border)',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'var(--primary-light, #f0f9ff)',
                                border: '1px solid var(--primary-light-border, #bae6fd)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <ActIcon size={18} color="var(--primary, #0284c7)" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <strong
                                style={{
                                  fontSize: '0.92rem',
                                  fontWeight: 800,
                                  color: 'var(--text-main)',
                                }}
                              >
                                {act.name}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Lugar / Tipo: {subLabel}
                              </span>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                color: 'var(--text-main)',
                              }}
                            >
                              <Clock size={14} style={{ color: 'var(--text-muted)' }} />{' '}
                              {act.minutes} min
                            </span>

                            {act.rpe !== null && act.rpe !== undefined && (
                              <span
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: '#fef3c7',
                                  border: '1px solid #fde68a',
                                  color: '#b45309',
                                }}
                              >
                                RPE {act.rpe}
                              </span>
                            )}

                            <strong
                              style={{
                                fontSize: '0.95rem',
                                fontWeight: 900,
                                color: 'var(--text-main)',
                                minWidth: '58px',
                                textAlign: 'right',
                              }}
                            >
                              {ua} UA
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: 'var(--bg-subtle)',
                      borderRadius: '14px',
                      border: '1px dashed var(--border)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No hay actividades de carga registradas en el día de hoy.
                  </div>
                )}
              </div>
            );
          })()}

        {/* Acciones del Preparador Físico */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          <AthleteContactActions athlete={athlete} />

          <div
            style={{
              display: 'flex',
              gap: '0.65rem',
              flexWrap: 'wrap',
            }}
          >
            {mode === 'semaforo' && athlete.hasDayConflict && (
              <button
                type="button"
                className="btn btn-warning"
                data-testid="quick-sheet-btn-day-adjustment"
                onClick={() => {
                  onOpenAdjustment?.(athlete);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Sparkles size={15} />
                <span>Ver ajuste sugerido</span>
              </button>
            )}

            {mode === 'semaforo' && (isRed || isYellow) ? (
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => {
                  onAssignDifferentiated?.(athlete.id);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '0.6rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                Asignar Plan Diferenciado
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

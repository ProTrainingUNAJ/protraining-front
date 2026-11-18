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
  Dumbbell,
  Trophy,
} from 'lucide-react';
import { AthleteTrafficLightItem } from './trafficLight.types';
import { AthleteBodyPainMap } from './AthleteBodyPainMap';
import { AthleteAvatar } from './AthleteAvatar';

/**
 * Ficha rápida del atleta (KAN-365/KAN-366): se abre desde las tarjetas de
 * MonitoringPage con el item real del semáforo del día (sin mocks) y muestra
 * los indicadores del check-in, el mapa de dolor y la acción de asignación
 * diferenciada. Bordes y estados con tokens `--traffic-*` de `tokens.css`
 * (soporte claro/oscuro); cero literales rgba/hex (KAN-366).
 */
interface AthleteQuickSheetProps {
  athlete: AthleteTrafficLightItem | null;
  onClose: () => void;
  onAssignDifferentiated?: (athleteId: string) => void;
  onOpenAdjustment?: (athlete: AthleteTrafficLightItem) => void;
}

export const AthleteQuickSheet: React.FC<AthleteQuickSheetProps> = ({
  athlete,
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

        {/* Desglose de Parámetros de Check-in */}
        {athlete.status !== 'gray' ? (
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
        )}

        {/* Detalle de Carga y Actividades del Día (KAN-621) */}
        {athlete.activities && athlete.activities.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              padding: '0.85rem',
              background: 'var(--bg-subtle)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                <Dumbbell size={15} style={{ color: 'var(--primary)' }} />
                Actividades y Carga del Día
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                }}
              >
                {athlete.totalMinutes ?? athlete.activities.reduce((acc, a) => acc + a.minutes, 0)}{' '}
                min totales
                {athlete.totalLoad ? ` · ${athlete.totalLoad} UA` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {athlete.activities.map((act, idx) => {
                const rpeVal = act.rpe ?? 0;
                const rpeBadgeColor =
                  rpeVal >= 8
                    ? {
                        bg: 'var(--danger-bg)',
                        text: 'var(--danger-text)',
                        border: 'var(--danger-border)',
                      }
                    : rpeVal >= 5
                      ? {
                          bg: 'var(--warning-bg)',
                          text: 'var(--warning-text)',
                          border: 'var(--warning-border)',
                        }
                      : {
                          bg: 'var(--success-bg)',
                          text: 'var(--success-text)',
                          border: 'var(--success-border)',
                        };

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border)',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'var(--primary-light, #f0f9ff)',
                          color: 'var(--primary, #0284c7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {act.type === 'Gym' ? (
                          <Dumbbell size={16} />
                        ) : act.type === 'Match' ? (
                          <Trophy size={16} />
                        ) : (
                          <Activity size={16} />
                        )}
                      </div>
                      <div>
                        <strong
                          style={{
                            display: 'block',
                            fontSize: '0.85rem',
                            color: 'var(--text-main)',
                          }}
                        >
                          {act.name}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Lugar / Tipo: {act.name}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                        }}
                      >
                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                        {act.minutes} min
                      </span>

                      {act.rpe !== undefined && act.rpe !== null && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: rpeBadgeColor.bg,
                            color: rpeBadgeColor.text,
                            border: `1px solid ${rpeBadgeColor.border}`,
                          }}
                        >
                          RPE {act.rpe}
                        </span>
                      )}

                      {act.minutes && act.rpe ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: 'var(--primary)',
                          }}
                        >
                          {act.minutes * act.rpe} UA
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones del Preparador Físico */}
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}
        >
          {athlete.hasDayConflict && (
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

          {isRed || isYellow ? (
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
  );
};

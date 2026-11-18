import React, { useMemo } from 'react';
import {
  Check,
  AlertCircle,
  Moon,
  Activity,
  Siren,
  Thermometer,
  Sparkles,
} from 'lucide-react';
import { AthleteTrafficLightItem, TrafficLightStatus } from './trafficLight.types';
import { AthleteAvatar } from './AthleteAvatar';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { resolveMuscleId } from '../../utils/painMuscleResolver';

/**
 * Tarjeta del atleta en MonitoringPage (KAN-365/KAN-366/KAN-621): adaptada al DTO real
 * del endpoint traffic-light-today vía `mapTrafficLightSummaryToItem`.
 * Estandarizada visualmente con la tarjeta de Asistencia & RPE:
 * - Cabecera con Avatar, Nombre, Categoría y botón interactivo con tilde para tomar presente.
 * - Burbuja inferior estandarizada con barra vertical de estado, título y mensaje descriptivo.
 */
export interface AthleteTrafficLightCardProps {
  athlete: AthleteTrafficLightItem;
  onClick: () => void;
  onOpenAdjustment?: (athlete: AthleteTrafficLightItem) => void;
  isPresent?: boolean;
  onToggleAttendance?: (athleteId: string, isPresent: boolean) => void;
  className?: string;
}

const STATUS_COLORS: Record<
  TrafficLightStatus,
  { ring: string; bg: string; text: string; border: string }
> = {
  red: {
    ring: 'var(--traffic-red)',
    bg: 'var(--traffic-red-bg)',
    text: 'var(--traffic-red-text)',
    border: 'var(--traffic-red-border)',
  },
  yellow: {
    ring: 'var(--traffic-yellow)',
    bg: 'var(--traffic-yellow-bg)',
    text: 'var(--traffic-yellow-text)',
    border: 'var(--traffic-yellow-border)',
  },
  green: {
    ring: 'var(--traffic-green)',
    bg: 'var(--traffic-green-bg)',
    text: 'var(--traffic-green-text)',
    border: 'var(--traffic-green-border)',
  },
  gray: {
    ring: 'var(--traffic-gray)',
    bg: 'var(--traffic-gray-bg)',
    text: 'var(--traffic-gray-text)',
    border: 'var(--traffic-gray-border)',
  },
};

export const AthleteTrafficLightCard: React.FC<AthleteTrafficLightCardProps> = ({
  athlete,
  onClick,
  onOpenAdjustment,
  isPresent = false,
  onToggleAttendance,
  className = '',
}) => {
  const colors = STATUS_COLORS[athlete.status];

  const rawMaxPain =
    athlete.pains && athlete.pains.length > 0 ? Math.max(...athlete.pains.map((p) => p.level)) : 0;
  // La escala EVA máxima es 5/5. La lesión activa es una condición clínica aparte (KAN-621).
  const maxPainLevel = Math.min(5, rawMaxPain);

  // Mapa de dolores/lesiones resuelto a los IDs oficiales del SVG (KAN-621)
  const musclePains = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    if (athlete.pains && athlete.pains.length > 0) {
      athlete.pains.forEach((p) => {
        const id = resolveMuscleId(p.zone, p.muscleId);
        if (id) {
          map[id] = p.level;
        }
      });
    }
    return map;
  }, [athlete.pains]);

  // Badge label: keeps default for green/gray; shows affected muscle or area for red/yellow
  const badgeLabel =
    athlete.status === 'green'
      ? 'Óptimos'
      : athlete.status === 'gray'
        ? 'Sin Check-in'
        : athlete.affectedMuscle || athlete.statusLabel;

  // Sin posición disponible (el semáforo del día no la trae), se muestra solo el plantel.
  const subtitle = [athlete.position, athlete.category].filter(Boolean).join(' · ') || 'Plantel';

  return (
    <div
      onClick={onClick}
      className={`card athlete-traffic-light-card ${className}`}
      style={{
        margin: 0,
        padding: '1.15rem',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '1rem',
        minHeight: '200px',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        background: 'var(--bg-card)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
        position: 'relative',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Ver ficha rápida de ${athlete.name}, estado ${badgeLabel}`}
    >
      {/* 1. Sección superior: Avatar, Nombre + Categoría y Botón con tilde para tomar presente */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* Componente preparado para foto de perfil con iluminación concéntrica del semáforo */}
          <AthleteAvatar
            name={athlete.name}
            avatarUrl={athlete.avatarUrl}
            status={athlete.status}
            ringColor={colors.ring}
            size={42}
            showRing={true}
          />

          {/* Datos principales: Nombre y Subtítulo con formato guía idéntico a asistencia */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              flex: 1,
            }}
          >
            <h4
              style={{
                margin: 0,
                fontSize: '0.92rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                lineHeight: 1.25,
                wordBreak: 'normal',
                overflowWrap: 'anywhere',
                whiteSpace: 'normal',
              }}
              title={athlete.name}
            >
              {athlete.name}
            </h4>

            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                lineHeight: 1.25,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={subtitle}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Botón con tilde para tomar presente (estilo estandarizado con Asistencia & RPE) */}
        <button
          type="button"
          data-testid={`btn-attendance-check-${athlete.id}`}
          aria-label={
            isPresent
              ? `Presente registrado para ${athlete.name}. Clic para quitar.`
              : `Marcar presente a ${athlete.name}`
          }
          title={isPresent ? 'Presente (clic para quitar)' : 'Marcar presente'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleAttendance?.(athlete.id, !isPresent);
          }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            border: isPresent ? '1px solid #a7f3d0' : '1px solid var(--border)',
            background: isPresent ? '#ecfdf5' : 'var(--bg-subtle)',
            color: isPresent ? '#047857' : 'var(--text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
            padding: 0,
          }}
        >
          <Check size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* 2. Sección intermedia: Badge (músculo/estado) y Métricas (Dolor, Sueño, RPE) con altura fija */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          height: '32px',
          minHeight: '32px',
          boxSizing: 'border-box',
        }}
      >
        <span
          className="badge"
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '9999px',
            padding: '0.2rem 0.6rem',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          {badgeLabel}
        </span>

        {/* Indicadores rápidos de métricas */}
        {athlete.status !== 'gray' ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              marginLeft: 'auto',
            }}
          >
            {athlete.hasActiveInjury && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: 'var(--traffic-red-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Lesión activa reportada en el check-in de hoy"
                aria-label="Lesión activa"
              >
                <Siren size={14} />
              </span>
            )}

            {athlete.isSick && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: 'var(--warning-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title="Reportó enfermedad en el check-in de hoy"
                aria-label="Enfermo"
              >
                <Thermometer size={14} />
              </span>
            )}

            {maxPainLevel > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: maxPainLevel >= 4 ? 'var(--danger-text)' : 'var(--warning-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`Dolor máximo nivel ${maxPainLevel}/5`}
              >
                <AlertCircle size={14} /> {maxPainLevel}/5
              </span>
            )}

            {athlete.sleepHours !== undefined && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`${athlete.sleepHours} hs de sueño`}
              >
                <Moon size={14} /> {athlete.sleepHours}h
              </span>
            )}

            {athlete.rpe !== undefined && athlete.rpe > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 700,
                  color: athlete.rpe >= 8 ? 'var(--danger-text)' : 'var(--info-text)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                title={`RPE de la última sesión: ${athlete.rpe}`}
              >
                <Activity size={14} /> {athlete.rpe}
              </span>
            )}
          </div>
        ) : (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              fontWeight: 600,
            }}
          >
            Pendiente
          </span>
        )}
      </div>

      {/* 2.5 Sección central: Siluetas anatómicas (frente y dorso) del reporte del día (KAN-621) */}
      <div
        className="athlete-card-muscle-map"
        aria-label={`Mapa anatómico de ${athlete.name}`}
        role="img"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem',
          height: '115px',
          width: '100%',
          overflow: 'hidden',
          opacity: athlete.status === 'gray' ? 0.7 : 1,
        }}
      >
        <div className="athlete-card-muscle-silhouette" style={{ width: '58px', height: '115px' }}>
          <MuscleMapFront
            readOnly={true}
            hideHeader={true}
            hideFooter={true}
            musclePains={musclePains}
          />
        </div>
        <div className="athlete-card-muscle-silhouette" style={{ width: '58px', height: '115px' }}>
          <MuscleMapBack
            readOnly={true}
            hideHeader={true}
            hideFooter={true}
            musclePains={musclePains}
          />
        </div>
      </div>

      {/* 3. Sección inferior: Estado/Recomendación con estilo estandarizado idéntico a Asistencia & RPE */}
      <div
        style={{
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderRadius: '8px',
          padding: '0.5rem 0.65rem',
          height: '54px',
          boxSizing: 'border-box',
        }}
      >
        {/* Barra vertical de separación en color con altura fija de 32px */}
        <div
          style={{
            width: '4px',
            height: '32px',
            borderRadius: '4px',
            backgroundColor: colors.ring,
            flexShrink: 0,
          }}
        />

        {/* Bloque de dos líneas: Título de estado/recomendación + Subtítulo estandarizado */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            flex: 1,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '0.78rem',
              fontWeight: 700,
              color: athlete.status === 'gray' ? 'var(--text-muted)' : 'var(--text-main)',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={
              athlete.recommendation ||
              (athlete.status === 'gray'
                ? 'Sin check-in completado el día de hoy.'
                : 'Apto para completar el 100% de la carga planificada.')
            }
          >
            {athlete.recommendation ||
              (athlete.status === 'gray'
                ? 'Sin check-in completado el día de hoy.'
                : 'Apto para completar el 100% de la carga planificada.')}
          </p>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Tocar tarjeta para ver detalle y actividades
          </span>
        </div>
      </div>

      {/* Botón Ver ajuste sugerido si tiene conflicto de dolor con la rutina (KAN-452).
          Va en su propia fila: al lado del texto lo dejaba ilegible */}
      {athlete.hasDayConflict && (
        <button
          type="button"
          className="btn btn-warning"
          data-testid={`btn-day-adjustment-${athlete.id}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenAdjustment) {
              onOpenAdjustment(athlete);
            } else {
              onClick();
            }
          }}
          style={{
            width: '100%',
            marginTop: '0.5rem',
            padding: '0.45rem 0.6rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            borderRadius: '8px',
          }}
          title="Ver ajuste sugerido ante conflicto de dolor"
        >
          <Sparkles size={14} aria-hidden="true" />
          <span>Ver ajuste sugerido</span>
        </button>
      )}
    </div>
  );
};

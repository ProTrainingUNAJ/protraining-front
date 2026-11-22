import React, { useMemo } from 'react';
import { AlertCircle, Moon, Activity, Siren, Thermometer, Sparkles } from 'lucide-react';
import { AthleteTrafficLightItem, TrafficLightStatus } from './trafficLight.types';
import { AthleteAvatar } from './AthleteAvatar';
import { AthleteContactActions } from './AthleteContactActions';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { resolveMuscleId } from '../../utils/painMuscleResolver';
import './AthleteTrafficLightCard.css';

/**
 * Tarjeta del atleta en MonitoringPage (KAN-365/KAN-366/KAN-621): adaptada al DTO real
 * del endpoint traffic-light-today vía `mapTrafficLightSummaryToItem`.
 * Estandarizada visualmente con:
 * - Cabecera con Avatar, Nombre y Categoría (sin botón de presente, que pertenece a Asistencia & RPE).
 * - Burbuja inferior estandarizada con cápsula completa, barra vertical de estado, título y mensaje descriptivo.
 */
export interface AthleteTrafficLightCardProps {
  athlete: AthleteTrafficLightItem;
  onClick: () => void;
  onOpenAdjustment?: (athlete: AthleteTrafficLightItem) => void;
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
      className={`card athlete-traffic-light-card monitoring-tl-card ${className}`}
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
      {/* 1. Sección superior: Avatar, Nombre + Categoría (limpio, sin botón de asistencia - Imagen 1) */}
      <div className="tl-card-head">
        {/* Componente preparado para foto de perfil con iluminación concéntrica del semáforo */}
        <AthleteAvatar
          name={athlete.name}
          avatarUrl={athlete.avatarUrl}
          status={athlete.status}
          ringColor={colors.ring}
          size={42}
          showRing={true}
        />

        {/* Datos principales: Nombre y Subtítulo */}
        <div className="tl-card-names">
          <h4 className="tl-card-name" title={athlete.name}>
            {athlete.name}
          </h4>

          <p className="tl-card-subtitle" title={subtitle}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* 2. Sección intermedia: Badge (músculo/estado) y Métricas (Dolor, Sueño, RPE) con altura fija */}
      <div className="tl-card-metrics">
        <span
          className="badge tl-card-badge"
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {badgeLabel}
        </span>

        {/* Indicadores rápidos de métricas */}
        {athlete.status !== 'gray' ? (
          <div className="tl-card-indicators">
            {athlete.hasActiveInjury && (
              <span
                className="tl-card-indicator tl-card-indicator--injury"
                title="Lesión activa reportada en el check-in de hoy"
                aria-label="Lesión activa"
              >
                <Siren size={14} />
              </span>
            )}

            {athlete.isSick && (
              <span
                className="tl-card-indicator tl-card-indicator--sick"
                title="Reportó enfermedad en el check-in de hoy"
                aria-label="Enfermo"
              >
                <Thermometer size={14} />
              </span>
            )}

            {maxPainLevel > 0 && (
              <span
                className="tl-card-indicator"
                style={{
                  color: maxPainLevel >= 4 ? 'var(--danger-text)' : 'var(--warning-text)',
                }}
                title={`Dolor máximo nivel ${maxPainLevel}/5`}
              >
                <AlertCircle size={14} /> {maxPainLevel}/5
              </span>
            )}

            {athlete.sleepHours !== undefined && (
              <span
                className="tl-card-indicator tl-card-indicator--sleep"
                title={`${athlete.sleepHours} hs de sueño`}
              >
                <Moon size={14} /> {athlete.sleepHours}h
              </span>
            )}

            {athlete.rpe !== undefined && athlete.rpe > 0 && (
              <span
                className="tl-card-indicator"
                style={{
                  color: athlete.rpe >= 8 ? 'var(--danger-text)' : 'var(--info-text)',
                }}
                title={`RPE de la última sesión: ${athlete.rpe}`}
              >
                <Activity size={14} /> {athlete.rpe}
              </span>
            )}
          </div>
        ) : (
          <span className="tl-card-pending">Pendiente</span>
        )}
      </div>

      {/* 2.5 Sección central: Siluetas anatómicas (frente y dorso) del reporte del día (KAN-621) */}
      <div
        className="athlete-card-muscle-map monitoring-tl-muscle-map"
        aria-label={`Mapa anatómico de ${athlete.name}`}
        role="img"
        style={{ opacity: athlete.status === 'gray' ? 0.7 : 1 }}
      >
        <div className="athlete-card-muscle-silhouette">
          <MuscleMapFront
            readOnly={true}
            hideHeader={true}
            hideFooter={true}
            musclePains={musclePains}
          />
        </div>
        <div className="athlete-card-muscle-silhouette">
          <MuscleMapBack
            readOnly={true}
            hideHeader={true}
            hideFooter={true}
            musclePains={musclePains}
          />
        </div>
      </div>

      {/* 3. Sección inferior: Estado/Recomendación con burbuja completa estandarizada (Imagen 1) */}
      <div className="tl-card-status-bubble">
        {/* Barra vertical de separación en color con altura fija de 32px.
            El color depende del estado del semáforo y queda inline con tokens. */}
        <div className="tl-card-status-bar" style={{ backgroundColor: colors.ring }} />

        {/* Bloque de dos líneas: Título de estado/recomendación + Subtítulo estandarizado */}
        <div className="tl-card-status-text">
          <p
            className="tl-card-status-title"
            style={{
              color: athlete.status === 'gray' ? 'var(--text-muted)' : 'var(--text-main)',
            }}
            title={
              athlete.status === 'gray'
                ? 'Sin Check in completado hoy'
                : athlete.recommendation || 'Apto para completar el 100% de la carga planificada.'
            }
          >
            {athlete.status === 'gray'
              ? 'Sin Check in completado hoy'
              : athlete.recommendation || 'Apto para completar el 100% de la carga planificada.'}
          </p>
          <span className="tl-card-status-hint">Tocar tarjeta para ver detalle y actividades</span>
        </div>
      </div>

      {/* 4. Pie de tarjeta anclado simétricamente con marginTop auto (KAN-639) */}
      <div className="tl-card-footer">
        {/* KAN-582 y KAN-574 migraron este mismo botón a clases con propiedades
            idénticas: se conservan ambas para respetar las dos migraciones. */}
        {athlete.hasDayConflict && (
          <button
            type="button"
            className="btn btn-warning tl-card-adjust-btn day-adjustment-trigger-card"
            data-testid={`btn-day-adjustment-${athlete.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenAdjustment) {
                onOpenAdjustment(athlete);
              } else {
                onClick();
              }
            }}
            title="Ver ajuste sugerido ante conflicto de dolor"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>Ver ajuste sugerido</span>
          </button>
        )}

        <div className="tl-card-contact">
          <AthleteContactActions athlete={athlete} compact />
        </div>
      </div>
    </div>
  );
};

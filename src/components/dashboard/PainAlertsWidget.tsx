import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Wrench } from 'lucide-react';
import type { AthleteTrafficLightItem } from '../monitoring/trafficLight.types';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { resolveMuscleId } from '../../utils/painMuscleResolver';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';
import './PainBodyMapWidget.css';

/**
 * Alertas de dolor del Inicio del PF como mapa del cuerpo del plantel (KAN-594).
 *
 * "Requieren atención hoy" ya dice quién necesita algo y qué hacer; esta tarjeta dice DÓNDE
 * duele el plantel: las zonas pintadas en el cuerpo (rojo si hay molestia crítica, ámbar si es
 * precaución) y, debajo, una línea por zona con quiénes la marcaron. Así no se repite la
 * misma lista de atletas en dos tarjetas.
 */
interface PainAlertsWidgetProps {
  athletes?: AthleteTrafficLightItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Abre el ajuste del día del atleta (solo si su rutina de hoy carga la zona con dolor). */
  onAdjustRoutine?: (athlete: AthleteTrafficLightItem) => void;
  className?: string;
}

// Mismo criterio que antes: nivel 4 o más, o lesión activa (6), es molestia crítica.
const CRITICAL_LEVEL = 4;
const INJURY_LEVEL = 6;
const NO_ZONE = 'Sin zona marcada';

interface ZoneAthlete {
  athlete: AthleteTrafficLightItem;
  level: number;
}

interface PainZoneGroup {
  zone: string;
  regionIds: string[];
  maxLevel: number;
  athletes: ZoneAthlete[];
}

// Una zona sin lado ("Cuádriceps", "Hombros") se pinta en los dos lados del cuerpo.
const SIDE_IN_NAME = /(derech|izquierd)/i;
const SIDED_REGION = /_(derech|izquierd)[oa]$/;

function regionsForZone(zone: string, muscleId?: string): string[] {
  const id = resolveMuscleId(zone, muscleId);
  if (!id) return [];
  if (SIDE_IN_NAME.test(zone) || !SIDED_REGION.test(id)) return [id];
  const other = id.replace(SIDED_REGION, (_match, side: string) =>
    side === 'derech' ? `_izquierd${id.slice(-1)}` : `_derech${id.slice(-1)}`,
  );
  return [id, other];
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function levelLabel(level: number): string {
  return level >= INJURY_LEVEL ? 'lesión activa' : `nivel ${level}`;
}

/** "Diego, Valentina (nivel 3)" o "Lucas (lesión activa); Mateo (nivel 2)". */
function describeZoneAthletes(athletes: ZoneAthlete[]): string {
  const byLevel = new Map<number, string[]>();
  for (const { athlete, level } of athletes) {
    byLevel.set(level, [...(byLevel.get(level) ?? []), firstName(athlete.name)]);
  }
  return [...byLevel.entries()]
    .sort(([a], [b]) => b - a)
    .map(([level, names]) => `${names.join(', ')} (${levelLabel(level)})`)
    .join('; ');
}

function groupPainByZone(athletes: AthleteTrafficLightItem[]): PainZoneGroup[] {
  const groups = new Map<string, PainZoneGroup>();
  const add = (
    zone: string,
    regionIds: string[],
    athlete: AthleteTrafficLightItem,
    level: number,
  ) => {
    const key = zone.trim().toLocaleLowerCase('es');
    const group = groups.get(key) ?? {
      zone: zone.trim(),
      regionIds: [],
      maxLevel: 0,
      athletes: [],
    };
    group.regionIds = [...new Set([...group.regionIds, ...regionIds])];
    group.maxLevel = Math.max(group.maxLevel, level);
    const existing = group.athletes.find((entry) => entry.athlete.id === athlete.id);
    if (existing) existing.level = Math.max(existing.level, level);
    else group.athletes.push({ athlete, level });
    groups.set(key, group);
  };

  for (const athlete of athletes) {
    const pains = athlete.pains ?? [];
    for (const pain of pains)
      add(pain.zone, regionsForZone(pain.zone, pain.muscleId), athlete, pain.level);
    // Lesión activa sin zona en el check-in: igual cuenta, aunque no se pueda pintar
    if (pains.length === 0 && athlete.hasActiveInjury) add(NO_ZONE, [], athlete, INJURY_LEVEL);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      athletes: [...group.athletes].sort(
        (a, b) => b.level - a.level || a.athlete.name.localeCompare(b.athlete.name, 'es'),
      ),
    }))
    .sort(
      (a, b) =>
        b.maxLevel - a.maxLevel ||
        b.athletes.length - a.athletes.length ||
        a.zone.localeCompare(b.zone, 'es'),
    );
}

export const PainAlertsWidget: React.FC<PainAlertsWidgetProps> = ({
  athletes = [],
  loading = false,
  error = null,
  onRetry,
  onAdjustRoutine,
  className = '',
}) => {
  const navigate = useNavigate();
  const showSkeleton = useDelayedLoading(loading);

  const zones = useMemo(() => groupPainByZone(athletes), [athletes]);
  const affectedCount = useMemo(
    () => athletes.filter((a) => (a.pains?.length ?? 0) > 0 || a.hasActiveInjury).length,
    [athletes],
  );

  // Color de cada región: la zona más grave manda si dos zonas comparten región
  const muscleColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const levels: Record<string, number> = {};
    for (const zone of zones) {
      for (const id of zone.regionIds) {
        if ((levels[id] ?? 0) >= zone.maxLevel) continue;
        levels[id] = zone.maxLevel;
        colors[id] =
          zone.maxLevel >= CRITICAL_LEVEL ? 'var(--traffic-red)' : 'var(--traffic-yellow)';
      }
    }
    return colors;
  }, [zones]);

  const mapSummary = `Mapa del cuerpo del plantel: ${zones
    .map((zone) => `${zone.zone}, ${describeZoneAthletes(zone.athletes)}`)
    .join('; ')}`;

  return (
    <section className={`dash-w pain-map ${className}`} aria-labelledby="pain-widget-title">
      <header className="dash-w__header">
        <h3 id="pain-widget-title" className="dash-w__eyebrow">
          <AlertTriangle size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Alertas de dolor
        </h3>
        {!loading && !error && affectedCount > 0 && (
          <span className="dash-w__count">{affectedCount}</span>
        )}
      </header>

      {error ? (
        <WidgetErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        showSkeleton ? (
          <div role="status" aria-label="Cargando alertas de dolor">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : zones.length === 0 ? (
        <p className="dash-w__empty">Sin dolores reportados hoy.</p>
      ) : (
        <>
          {/* Una sola imagen con su resumen: los mapas de adentro no se anuncian por separado */}
          <div className="pain-map__bodies" role="img" aria-label={mapSummary}>
            <div className="pain-map__body">
              <MuscleMapFront muscleColors={muscleColors} readOnly hideHeader />
              <span className="pain-map__view" aria-hidden="true">
                Frente
              </span>
            </div>
            <div className="pain-map__body">
              <MuscleMapBack muscleColors={muscleColors} readOnly hideHeader />
              <span className="pain-map__view" aria-hidden="true">
                Espalda
              </span>
            </div>
          </div>

          <ul className="pain-map__zones">
            {zones.map((zone) => {
              const tone = zone.maxLevel >= CRITICAL_LEVEL ? 'red' : 'yellow';
              const conflicted = zone.athletes.filter(
                ({ athlete }) => athlete.hasDayConflict && onAdjustRoutine,
              );
              return (
                <li key={zone.zone} className={`pain-map__zone pain-map__zone--${tone}`}>
                  <span className="pain-map__dot" aria-hidden="true" />
                  <div className="pain-map__zone-main">
                    <p className="pain-map__zone-text">
                      <strong>{zone.zone}</strong> · {describeZoneAthletes(zone.athletes)}
                    </p>
                    {conflicted.length > 0 && (
                      <div className="pain-map__actions">
                        {conflicted.map(({ athlete }) => (
                          <button
                            key={athlete.id}
                            type="button"
                            className="dash-w__btn dash-w__btn--primary"
                            onClick={() => onAdjustRoutine?.(athlete)}
                            aria-label={`Ajustar rutina de hoy de ${athlete.name}`}
                          >
                            <Wrench size={14} aria-hidden="true" />
                            Ajustar rutina · {firstName(athlete.name)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            className="dash-w__link pain-map__more"
            onClick={() => navigate('/pf/monitoring')}
          >
            Ver en Seguimiento
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

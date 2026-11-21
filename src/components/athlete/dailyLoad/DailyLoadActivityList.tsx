import React from 'react';
import {
  Dumbbell,
  Activity as ActivityIcon,
  Trophy,
  User,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Zap,
  LayoutGrid,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import type { DailyLoadSubmitResponse } from '../../../api/seguimientoService';
import { ALL_ACTIVITY_KEYS, ACTIVITY_DEFINITIONS, ActivityKey, RPE_LEVELS } from './dailyLoadTypes';

interface DailyLoadActivityListProps {
  todayLoad: DailyLoadSubmitResponse | null;
  isLoading: boolean;
  onAddActivity: () => void;
  onEditActivity: (key: ActivityKey) => void;
  onDeleteActivity: (key: ActivityKey) => void;
  isWidgetPinned: boolean;
  onPinWidget: () => void;
  pinWarning: string | null;
}

const getActivityIcon = (key: ActivityKey) => {
  switch (key) {
    case 'gym':
      return <Dumbbell size={20} />;
    case 'sportTraining':
      return <ActivityIcon size={20} />;
    case 'match1':
    case 'match2':
      return <Trophy size={20} />;
    case 'individualWork':
      return <User size={20} />;
    default:
      return <ActivityIcon size={20} />;
  }
};

export const DailyLoadActivityList: React.FC<DailyLoadActivityListProps> = ({
  todayLoad,
  isLoading,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  isWidgetPinned,
  onPinWidget,
  pinWarning,
}) => {
  if (isLoading) {
    return (
      <div className="dl-loading-card" aria-busy="true">
        <p>Cargando actividades del día…</p>
      </div>
    );
  }

  // Filter activities that have registered minutes > 0
  const activeActivities = ALL_ACTIVITY_KEYS.filter((key) => {
    const data = todayLoad?.[key] as { minutes?: number; rpe?: number | null } | undefined;
    return (data?.minutes ?? 0) > 0;
  });

  return (
    <section className="dl-activity-section" aria-label="Actividades de hoy">
      {/* Resumen ejecutivo de la jornada */}
      <div className="dl-today-summary-banner">
        <div className="dl-today-summary-top">
          <div className="dl-today-summary-left">
            <div className="dl-today-metric">
              <span className="dl-today-metric-val">{todayLoad?.totalMinutes ?? 0} min</span>
              <span className="dl-today-metric-lbl">Total minutos de hoy</span>
            </div>
            <div className="dl-today-divider" aria-hidden="true" />
            <div className="dl-today-metric">
              <span className="dl-today-metric-val dl-today-metric-val--primary">
                {todayLoad?.totalLoad ?? 0} UA
              </span>
              <span className="dl-today-metric-lbl">Carga diaria acumulada</span>
            </div>
          </div>

          <div className="dl-today-summary-actions">
            <button
              type="button"
              onClick={onPinWidget}
              className={`dl-home-pin-btn ${isWidgetPinned ? 'dl-home-pin-btn--pinned' : ''}`}
              title={
                isWidgetPinned
                  ? 'El widget está activo en tu Inicio'
                  : 'Fijar el widget de Carga del Día en tu pantalla de Inicio'
              }
              aria-label={isWidgetPinned ? 'En tu Inicio' : 'Fijar en mi inicio'}
            >
              {isWidgetPinned ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>En tu Inicio</span>
                </>
              ) : (
                <>
                  <LayoutGrid size={15} />
                  <span>Fijar en mi inicio</span>
                </>
              )}
            </button>
            {pinWarning && (
              <p className="dl-pin-warning-msg" role="alert">
                {pinWarning}
              </p>
            )}

            <button
              type="button"
              className="dl-btn-add-main"
              onClick={onAddActivity}
              aria-label="Agregar actividad"
            >
              <Plus size={18} />
              <span>+ Agregar actividad</span>
            </button>
          </div>
        </div>

        {/* Barra multicolor de progreso de carga diaria acumulada (Imagen 2 e Imagen 3) */}
        <div
          className="dl-progress-bar-track"
          role="progressbar"
          aria-valuenow={todayLoad?.totalLoad ?? 0}
          aria-valuemin={0}
          aria-valuemax={600}
          title={`Carga diaria acumulada: ${todayLoad?.totalLoad ?? 0} UA`}
        >
          <div
            className="dl-progress-bar-fill"
            style={{
              width: `${
                todayLoad && todayLoad.totalLoad > 0
                  ? Math.max(6, Math.min(100, Math.round((todayLoad.totalLoad / 600) * 100)))
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Lista de actividades o Empty State */}
      {activeActivities.length === 0 ? (
        <div className="dl-empty-state-card" role="region" aria-label="Sin actividades">
          <div className="dl-empty-icon-wrap" aria-hidden="true">
            <ClipboardList size={36} />
          </div>
          <h3 className="dl-empty-title">Todavía no registraste actividades hoy</h3>
          <p className="dl-empty-desc">
            Registrá los minutos y el nivel de esfuerzo de tus entrenamientos o partidos del día
            para llevar el control de tu carga física.
          </p>
          <button
            type="button"
            className="dl-btn dl-btn-primary dl-empty-cta-btn"
            onClick={onAddActivity}
          >
            <Plus size={18} />
            <span>+ Agregar actividad</span>
          </button>
        </div>
      ) : (
        <div className="dl-activity-list" role="list" aria-label="Lista de actividades de hoy">
          {activeActivities.map((key) => {
            const def = ACTIVITY_DEFINITIONS[key];
            const data = todayLoad?.[key] as { minutes: number; rpe: number | null };
            const minutes = data.minutes;
            const rpe = data.rpe ?? 0;
            const ua = minutes * rpe;
            const rpeMeta = RPE_LEVELS.find((l) => l.val === rpe);

            return (
              <div key={key} role="listitem" className="dl-activity-card">
                <div className="dl-activity-left">
                  <div className="dl-activity-icon-container" aria-hidden="true">
                    {getActivityIcon(key)}
                  </div>
                  <div className="dl-activity-details">
                    <div className="dl-activity-title-row">
                      <span className="dl-activity-name">{def.name}</span>
                      {def.matchSubLabel && (
                        <span className="dl-match-badge" title="Identificador de partido">
                          {def.matchSubLabel}
                        </span>
                      )}
                    </div>
                    <div className="dl-activity-metrics-row">
                      <span className="dl-metric-chip" title="Duración">
                        <Clock size={13} />
                        <span>{minutes} min</span>
                      </span>
                      <span className="dl-metric-chip" title="Nivel de esfuerzo (RPE)">
                        <span>
                          RPE {rpe}
                          {rpeMeta ? ` · ${rpeMeta.title}` : ''}
                        </span>
                      </span>
                      <span
                        className="dl-metric-chip dl-metric-chip--ua"
                        title="Carga de la sesión"
                      >
                        <Zap size={13} />
                        <span>{ua} UA</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="dl-activity-actions">
                  <button
                    type="button"
                    className="dl-action-btn dl-action-btn--edit"
                    onClick={() => onEditActivity(key)}
                    title={`Editar ${def.name}`}
                    aria-label={`Editar ${def.name} ${def.matchSubLabel ?? ''}`}
                  >
                    <Pencil size={15} />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    className="dl-action-btn dl-action-btn--delete"
                    onClick={() => onDeleteActivity(key)}
                    title={`Eliminar ${def.name}`}
                    aria-label={`Eliminar ${def.name} ${def.matchSubLabel ?? ''}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

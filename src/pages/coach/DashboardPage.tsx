import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Plus,
} from 'lucide-react';
import runnerImg from '../../assets/protraining-3d-runner.jpg';
import { PageHeader } from '../../components/shell/PageHeader';
import { EvolutionChartWidget } from '../../components/athlete/EvolutionChartWidget';
import { LiveClockWidget } from '../../components/dashboard/LiveClockWidget';
import { LiveWeatherWidget } from '../../components/dashboard/LiveWeatherWidget';
import { TrainingSessionWidget } from '../../components/dashboard/TrainingSessionWidget';
import { TrafficLightSummaryWidget } from '../../components/dashboard/TrafficLightSummaryWidget';
import { CheckInProgressWidget } from '../../components/dashboard/CheckInProgressWidget';
import { PainAlertsWidget } from '../../components/dashboard/PainAlertsWidget';
import { WeeklyLoadSparklineWidget } from '../../components/dashboard/WeeklyLoadSparklineWidget';

export type DashboardCardType =
  | 'empty'
  | 'suite'
  | 'live-clock'
  | 'live-weather'
  | 'training-session'
  | 'traffic-light-summary'
  | 'checkin-progress'
  | 'pain-alerts'
  | 'weekly-load'
  | 'progress-chart';

export interface WireframeCardItem {
  id: string;
  name: string;
  colSpan: number;
  type: DashboardCardType;
  chartMetric?: 'cmj' | 'squat' | 'sprint' | 'rpe' | 'yoyo';
}

export interface DashboardRow {
  id: string;
  name: string;
  className: string;
  cards: WireframeCardItem[];
}

const DEFAULT_COACH_ROWS: DashboardRow[] = [
  {
    id: 'row-1',
    name: 'Fila 1 · Indicadores en Vivo',
    className: 'wireframe-row-1',
    cards: [
      { id: 'w-clock', name: 'Hora y Turno', colSpan: 1, type: 'live-clock' },
      { id: 'w-weather', name: 'Clima en Cancha', colSpan: 1, type: 'live-weather' },
      { id: 'w-session', name: 'Predio y Horario', colSpan: 1, type: 'training-session' },
    ],
  },
  {
    id: 'row-2',
    name: 'Fila 2 · Semáforo y Estado',
    className: 'wireframe-row-2',
    cards: [
      { id: 'w-traffic', name: 'Semáforo del Día', colSpan: 1, type: 'traffic-light-summary' },
      { id: 'w-checkin', name: 'Progreso de Check-in', colSpan: 1, type: 'checkin-progress' },
      { id: 'w-suite', name: 'ProTraining Suite', colSpan: 1, type: 'suite' },
    ],
  },
  {
    id: 'row-3',
    name: 'Fila 3 · Alertas y Carga',
    className: 'wireframe-row-3',
    cards: [
      { id: 'w-pain', name: 'Alertas de Dolor', colSpan: 1, type: 'pain-alerts' },
      { id: 'w-load', name: 'Carga Semanal RPE', colSpan: 1, type: 'weekly-load' },
    ],
  },
  {
    id: 'row-4',
    name: 'Fila 4 · Módulos Disponibles',
    className: 'wireframe-row-4',
    cards: [
      { id: 'w-r4-1', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
      { id: 'w-r4-2', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
      { id: 'w-r4-3', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
    ],
  },
];

const DEFAULT_ATHLETE_ROWS: DashboardRow[] = [
  {
    id: 'row-1',
    name: 'Fila 1 · Indicadores en Vivo',
    className: 'wireframe-row-1',
    cards: [
      { id: 'a-clock', name: 'Hora y Turno', colSpan: 1, type: 'live-clock' },
      { id: 'a-weather', name: 'Clima en Cancha', colSpan: 1, type: 'live-weather' },
      { id: 'a-session', name: 'Predio y Horario', colSpan: 1, type: 'training-session' },
    ],
  },
  {
    id: 'row-2',
    name: 'Fila 2 · Mi Estado y Rutina',
    className: 'wireframe-row-2',
    cards: [
      { id: 'a-r2-1', name: 'Módulo 2-A', colSpan: 1, type: 'empty' },
      { id: 'a-r2-2', name: 'Módulo 2-B', colSpan: 1, type: 'empty' },
      { id: 'a-r2-3', name: 'Módulo 2-C', colSpan: 1, type: 'empty' },
    ],
  },
  {
    id: 'row-3',
    name: 'Fila 3 · Suite y Carga',
    className: 'wireframe-row-3',
    cards: [
      { id: 'a-suite', name: 'ProTraining Atleta', colSpan: 1, type: 'suite' },
      {
        id: 'a-chart-cmj',
        name: 'Evolución Salto CMJ',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'cmj',
      },
    ],
  },
  {
    id: 'row-4',
    name: 'Fila 4 · Rendimiento y Métricas',
    className: 'wireframe-row-4',
    cards: [
      {
        id: 'a-chart-squat',
        name: 'Sentadilla 1RM',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'squat',
      },
      {
        id: 'a-chart-sprint',
        name: 'Sprint 30m',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'sprint',
      },
      {
        id: 'a-chart-yoyo',
        name: 'Test Yo-Yo',
        colSpan: 1,
        type: 'progress-chart',
        chartMetric: 'yoyo',
      },
    ],
  },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAthlete = location.pathname.startsWith('/athlete');
  const storageKey = isAthlete
    ? 'protraining_bento_rows_athlete_v8'
    : 'protraining_bento_rows_coach_v8';

  const defaultRows = isAthlete ? DEFAULT_ATHLETE_ROWS : DEFAULT_COACH_ROWS;

  const [rows, setRows] = useState<DashboardRow[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          if (!isAthlete) {
            const row4 = parsed.find((r: DashboardRow) => r.id === 'row-4');
            if (row4 && row4.cards.some((c: WireframeCardItem) => c.type === 'progress-chart')) {
              row4.cards = [
                { id: 'w-r4-1', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
                { id: 'w-r4-2', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
                { id: 'w-r4-3', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
              ];
            }
          }
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return defaultRows;
  });

  // Persist rows and widgets layout to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      // Ignore quota errors
    }
  }, [rows, storageKey]);

  // Inter-row drag and drop state
  const [dragSource, setDragSource] = useState<{
    rowId: string;
    cardIndex: number;
    cardId: string;
  } | null>(null);

  const [dragOverTarget, setDragOverTarget] = useState<{
    rowId: string;
    cardIndex: number;
  } | null>(null);

  const [recentlySwappedId, setRecentlySwappedId] = useState<string | null>(null);

  // Free widget swapping between any row or inside the same row
  const swapCards = (
    srcRowId: string,
    srcIndex: number,
    targetRowId: string,
    targetIndex: number,
  ) => {
    if (srcRowId === targetRowId && srcIndex === targetIndex) return;

    setRows((prevRows) => {
      const updated = prevRows.map((row) => ({
        ...row,
        cards: [...row.cards],
      }));

      const sourceRow = updated.find((r) => r.id === srcRowId);
      const targetRow = updated.find((r) => r.id === targetRowId);

      if (!sourceRow || !targetRow) return prevRows;

      const sourceCard = sourceRow.cards[srcIndex];
      const targetCard = targetRow.cards[targetIndex];

      if (!sourceCard || !targetCard) return prevRows;

      // Swap positions
      sourceRow.cards[srcIndex] = targetCard;
      targetRow.cards[targetIndex] = sourceCard;

      setRecentlySwappedId(sourceCard.id);
      return updated;
    });

    setTimeout(() => {
      setRecentlySwappedId(null);
    }, 900);
  };

  // Move widget horizontally within its row
  const moveCardHorizontal = (rowId: string, currentIndex: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    swapCards(rowId, currentIndex, rowId, targetIndex);
  };



  // Reset to default layout
  const resetLayout = () => {
    setRows(defaultRows);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  // Drag & drop handlers
  const handleDragStart = (
    rowId: string,
    cardIndex: number,
    cardId: string,
    e: React.DragEvent,
  ) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ rowId, cardIndex, cardId }));
    e.dataTransfer.effectAllowed = 'move';
    setDragSource({ rowId, cardIndex, cardId });
  };

  const handleDragOver = (rowId: string, cardIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (
      !dragOverTarget ||
      dragOverTarget.rowId !== rowId ||
      dragOverTarget.cardIndex !== cardIndex
    ) {
      setDragOverTarget({ rowId, cardIndex });
    }
  };

  const handleDrop = (targetRowId: string, targetCardIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    if (!dragSource) return;

    swapCards(dragSource.rowId, dragSource.cardIndex, targetRowId, targetCardIndex);
    setDragSource(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOverTarget(null);
  };

  // Renderizador del contenido interno de cada tarjeta
  const renderCardContent = (card: WireframeCardItem) => {
    switch (card.type) {
      case 'live-clock':
        return <LiveClockWidget />;
      case 'live-weather':
        return <LiveWeatherWidget />;
      case 'training-session':
        return <TrainingSessionWidget />;
      case 'traffic-light-summary':
        return <TrafficLightSummaryWidget />;
      case 'checkin-progress':
        return <CheckInProgressWidget />;
      case 'pain-alerts':
        return <PainAlertsWidget />;
      case 'weekly-load':
        return <WeeklyLoadSparklineWidget />;
      case 'progress-chart':
        return (
          <EvolutionChartWidget
            metricKey={card.chartMetric || 'cmj'}
            onRemove={() => {}}
            variant="compact"
          />
        );
      case 'suite':
        return (
          <div
            style={{
              position: 'relative',
              height: '100%',
              minHeight: '200px',
              overflow: 'hidden',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
          >
            <img
              src={runnerImg}
              alt="Corredor 3D ProTraining"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.32,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'relative',
                padding: '1.5rem',
                zIndex: 2,
                background: 'var(--grad-suite-card)',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  background: 'var(--suite-badge-bg)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.45rem',
                }}
              >
                {isAthlete ? 'PROTRAINING ATLETA' : 'PROTRAINING SUITE'}
              </span>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  margin: '0 0 0.35rem',
                  color: 'var(--white)',
                  lineHeight: 1.2,
                }}
              >
                {isAthlete ? 'Mi Planificación y Rendimiento' : 'Gestión Integral de Atletas'}
              </h3>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--suite-text-muted)',
                  margin: '0 0 0.85rem',
                  lineHeight: 1.35,
                }}
              >
                {isAthlete
                  ? 'Accedé a tus rutinas asignadas y seguimiento físico.'
                  : 'Monitoreá el semáforo de tu plantel y planificá cargas con precisión.'}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'var(--secondary)',
                  borderRadius: '9999px',
                  padding: '0.45rem 1rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: 'var(--suite-button-shadow)',
                }}
                onClick={() => navigate(isAthlete ? '/athlete/routine' : '/pf/monitoring')}
              >
                <span>{isAthlete ? 'Ver Rutina' : 'Ver Semáforo'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        );
      case 'empty':
      default:
        return (
          <div
            style={{
              height: '100%',
              minHeight: '160px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              padding: '1.5rem',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1.5px dashed var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                opacity: 0.6,
              }}
            >
              <Plus size={16} />
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.65 }}>
              Espacio disponible
            </span>
          </div>
        );
    }
  };

  return (
    <div className="app-page-container">
      {/* Page Header with reset button */}
      <PageHeader
        title="Inicio"
        description={
          isAthlete
            ? 'Panel principal y seguimiento de entrenamiento.'
            : 'Panel general de control y gestión deportiva.'
        }
        actions={
          <button
            type="button"
            onClick={resetLayout}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: 0.85,
            }}
            title="Restablecer orden predeterminado de los módulos"
          >
            <RotateCcw size={13} />
            <span>Restablecer orden</span>
          </button>
        }
      />

      <div
        className="app-page-body wireframe-dashboard-container"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        {rows.map((row) => (
          <div key={row.id} className={`wireframe-row ${row.className}`}>
            {row.cards.map((card, cardIndex) => {
              const isDragging = dragSource?.cardId === card.id;
              const isDragOver =
                dragOverTarget?.rowId === row.id && dragOverTarget?.cardIndex === cardIndex;
              const isRecentlyMoved = recentlySwappedId === card.id;

              return (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => handleDragStart(row.id, cardIndex, card.id, e)}
                  onDragOver={(e) => handleDragOver(row.id, cardIndex, e)}
                  onDrop={(e) => handleDrop(row.id, cardIndex, e)}
                  onDragEnd={handleDragEnd}
                  className={`wireframe-card ${isDragging ? 'is-dragging' : ''} ${
                    isDragOver ? 'is-drag-over' : ''
                  } ${isRecentlyMoved ? 'is-recently-moved' : ''}`}
                  title="Arrastrá para mover a cualquier posición o fila"
                >
                  {/* Toolbar for intra-row card movement */}
                  <div className="wireframe-card-toolbar">
                    {cardIndex > 0 && (
                      <button
                        type="button"
                        className="wireframe-control-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCardHorizontal(row.id, cardIndex, 'left');
                        }}
                        title="Mover a la izquierda"
                        aria-label="Mover a la izquierda"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    )}

                    {cardIndex < row.cards.length - 1 && (
                      <button
                        type="button"
                        className="wireframe-control-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveCardHorizontal(row.id, cardIndex, 'right');
                        }}
                        title="Mover a la derecha"
                        aria-label="Mover a la derecha"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}

                    <span
                      className="wireframe-drag-handle"
                      title="Arrastrar a cualquier fila o posición"
                    >
                      <GripVertical size={18} />
                    </span>
                  </div>

                  {/* Rendered widget content */}
                  {renderCardContent(card)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

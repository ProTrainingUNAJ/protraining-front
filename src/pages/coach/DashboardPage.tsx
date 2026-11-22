import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Plus,
  Sparkles,
} from 'lucide-react';
import runnerImg from '../../assets/protraining-3d-runner.webp';
import { PageHeader } from '../../components/shell/PageHeader';
import { EvolutionChartWidget } from '../../components/athlete/EvolutionChartWidget';
import { DailyLoadWidget } from '../../components/dashboard/DailyLoadWidget';
import { DailyTrafficLightWidget } from '../../components/dashboard/DailyTrafficLightWidget';
import { TrafficLightSummaryWidget } from '../../components/dashboard/TrafficLightSummaryWidget';
import { CheckInProgressWidget } from '../../components/dashboard/CheckInProgressWidget';
import { PainAlertsWidget } from '../../components/dashboard/PainAlertsWidget';
import { EpleyProposalsWidget } from '../../components/dashboard/EpleyProposalsWidget';
import { AttentionTodayWidget } from '../../components/dashboard/AttentionTodayWidget';
import { TopUaAthletesWidget } from '../../components/dashboard/TopUaAthletesWidget';
import { NextTrainingWidget } from '../../components/dashboard/NextTrainingWidget';
import { AthleteRecordsModal } from '../../components/athletes/AthleteRecordsModal';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import { DayAdjustmentModal } from '../../components/monitoring/DayAdjustmentModal';
import { AthleteTrafficLightItem } from '../../components/monitoring/trafficLight.types';
import { summarizeTrafficLightCounts } from '../../api/seguimientoService';
import { fetchCoachTodayOverview } from '../../api/coachToday';
import { recommendationsService } from '../../api/recommendations';
import { structureService } from '../../api/structureService';
import { AthleteRecommendationsSection } from '../../components/athlete/AthleteRecommendationsSection';
import { DEFAULT_ATHLETE_ROWS } from '../../utils/athleteDashboardLayout';
import { todayInArgentina } from '../../utils/argentinaDate';
import { buildEvolutionMetrics, MetricKey } from '../../utils/evolutionMetrics';
import { useAthleteEvolution } from '../../hooks/useAthleteEvolution';
import { getStoredSession } from '../../api/axiosClient';
import { PfWelcomeModal } from '../../components/coach/PfWelcomeModal';
import './DashboardPage.css';

export type DashboardCardType =
  | 'empty'
  | 'suite'
  | 'next-training'
  | 'traffic-light-summary'
  | 'checkin-progress'
  | 'pain-alerts'
  | 'progress-chart'
  | 'epley-proposals'
  | 'daily-load'
  | 'daily-traffic-light'
  | 'top-ua-athletes'
  | 'attention-today';

export interface WireframeCardItem {
  id: string;
  name: string;
  colSpan: number;
  type: DashboardCardType;
  chartMetric?: string;
}

// Tipo del widget "Predio y Horario", retirado del Inicio (KAN-583) y reemplazado en el PF
// por "Próximo entrenamiento". Puede seguir en layouts guardados.
const RETIRED_SESSION_WIDGET_TYPE = 'training-session';

interface RetirableCard {
  id: string;
  name: string;
  colSpan: number;
  type: string;
}

export interface DashboardRow {
  id: string;
  name: string;
  className: string;
  cards: WireframeCardItem[];
}

/**
 * Orden del Inicio del PF (KAN-594): primero lo que hay que resolver antes de entrenar
 * (quién necesita atención, el semáforo y el dolor), después el día (próximo entrenamiento,
 * check-in y carga) y abajo lo que puede esperar (récords Epley). Salen del layout por defecto
 * "ProTraining Suite" (repetía el botón del semáforo) y las tarjetas vacías de más; el PF las
 * puede volver a tener arrastrando o con "Restablecer orden".
 */
const DEFAULT_COACH_ROWS: DashboardRow[] = [
  {
    id: 'row-1',
    name: 'Fila 1 · Antes de entrenar',
    className: 'wireframe-row-1',
    cards: [
      { id: 'w-attention', name: 'Requieren atención hoy', colSpan: 1, type: 'attention-today' },
      { id: 'w-traffic', name: 'Semáforo del día', colSpan: 1, type: 'traffic-light-summary' },
      { id: 'w-pain', name: 'Alertas de dolor', colSpan: 1, type: 'pain-alerts' },
    ],
  },
  {
    id: 'row-2',
    name: 'Fila 2 · El día',
    className: 'wireframe-row-2',
    cards: [
      { id: 'w-next-training', name: 'Próximo entrenamiento', colSpan: 1, type: 'next-training' },
      { id: 'w-checkin', name: 'Check-in', colSpan: 1, type: 'checkin-progress' },
      { id: 'w-top-ua', name: 'Mayor carga (UA)', colSpan: 1, type: 'top-ua-athletes' },
    ],
  },
  {
    id: 'row-3',
    name: 'Fila 3 · Para revisar',
    className: 'wireframe-row-3',
    cards: [
      { id: 'w-epley', name: 'Propuestas de récord Epley', colSpan: 1, type: 'epley-proposals' },
      { id: 'w-r3-2', name: 'Módulo Disponible', colSpan: 1, type: 'empty' },
    ],
  },
];

// Layout del PF guardado en el navegador. Con el orden nuevo (KAN-594) cambia la versión: los
// layouts guardados con la anterior pasan al orden nuevo una sola vez.
const COACH_LAYOUT_STORAGE_KEY = 'protraining_bento_rows_coach_v9';
const LEGACY_COACH_LAYOUT_STORAGE_KEY = 'protraining_bento_rows_coach_v8';

function loadCoachRows(): DashboardRow[] {
  try {
    const saved = localStorage.getItem(COACH_LAYOUT_STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as DashboardRow[];
    }
    localStorage.removeItem(LEGACY_COACH_LAYOUT_STORAGE_KEY);
  } catch {
    // Sin acceso al almacenamiento: se usa el orden por defecto
  }
  return DEFAULT_COACH_ROWS;
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Argentina/Buenos_Aires',
});

function describeCoachDay(attentionCount: number | null, nobodyReported = false): string {
  const [year, month, day] = todayInArgentina().split('-').map(Number);
  // Mediodía UTC: el día no cambia al formatear en la zona de Argentina
  const today = WEEKDAY_FORMATTER.format(new Date(Date.UTC(year, month - 1, day, 12)));
  const prefix = `Hoy, ${today}.`;
  if (attentionCount === null) return prefix;
  // Sin ningún check-in no se sabe cómo llegan: no se puede decir que nadie necesita atención
  if (nobodyReported) return `${prefix} Todavía nadie hizo el check-in.`;
  if (attentionCount === 0) return `${prefix} Nadie necesita atención antes de entrenar.`;
  return attentionCount === 1
    ? `${prefix} 1 atleta necesita que lo mires antes de entrenar.`
    : `${prefix} ${attentionCount} atletas necesitan que los mires antes de entrenar.`;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAthlete = location.pathname.startsWith('/athlete');
  const user = getStoredSession()?.user;

  const [loadingOrganizations, setLoadingOrganizations] = useState(!isAthlete);
  const [hasNoOrganizations, setHasNoOrganizations] = useState(false);
  const [dismissedWelcome, setDismissedWelcome] = useState(false);

  const isWelcomeModalOpen =
    !isAthlete &&
    Boolean(user?.id) &&
    !loadingOrganizations &&
    hasNoOrganizations &&
    !dismissedWelcome &&
    localStorage.getItem(`protraining_pf_welcomed_${user?.id}`) !== 'true';

  const handleCloseWelcomeModal = () => {
    if (user?.id) {
      localStorage.setItem(`protraining_pf_welcomed_${user.id}`, 'true');
    }
    setDismissedWelcome(true);
  };
  // Layout del bento guardado en localStorage. KAN-366 simplificó el dashboard:
  // se retiraron los widgets ficticios de clima (Open-Meteo), reloj y carga
  // semanal de prueba; los layouts guardados con esos tipos degradan al slot
  // "Módulo Disponible" (case default del switch de render), sin migración.
  const storageKey = isAthlete ? 'protraining_bento_rows_athlete_v8' : COACH_LAYOUT_STORAGE_KEY;

  const defaultRows = isAthlete ? (DEFAULT_ATHLETE_ROWS as DashboardRow[]) : DEFAULT_COACH_ROWS;

  // Gráficos de Progreso fijados por el atleta: usan su evolución real (últimos 3 meses)
  const { evolution, loading: evolutionLoading } = useAthleteEvolution('3m', isAthlete);
  const evolutionMetrics = React.useMemo(() => buildEvolutionMetrics(evolution), [evolution]);

  const [rows, setRows] = useState<DashboardRow[]>(() => {
    if (!isAthlete) return loadCoachRows();
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) {
          // "Predio y Horario" mostraba un predio y un horario de ejemplo, sin datos reales
          // (KAN-583). En los layouts guardados del atleta pasa a ser un módulo libre.
          const replacement = { name: 'Módulo Disponible', type: 'empty' };
          for (const row of parsed as { cards: RetirableCard[] }[]) {
            row.cards = row.cards.map((card) =>
              card.type === RETIRED_SESSION_WIDGET_TYPE
                ? { id: card.id, colSpan: card.colSpan, ...replacement }
                : card,
            );
          }
          // Semáforo diario en la fila 1, al lado del entrenamiento (KAN-547)
          const row1 = parsed.find((r: DashboardRow) => r.id === 'row-1');
          const row2 = parsed.find((r: DashboardRow) => r.id === 'row-2');

          // Si quedó en la fila 2, se saca de ahí
          if (row2 && Array.isArray(row2.cards)) {
            const tlIdxInRow2 = row2.cards.findIndex(
              (c: WireframeCardItem) => c.type === 'daily-traffic-light',
            );
            if (tlIdxInRow2 !== -1) {
              row2.cards[tlIdxInRow2] = {
                id: 'a-r2-2',
                name: 'Módulo 2-B',
                colSpan: 1,
                type: 'empty',
              };
            }
          }

          if (row1 && Array.isArray(row1.cards)) {
            const tlIdxInRow1 = row1.cards.findIndex(
              (c: WireframeCardItem) => c.type === 'daily-traffic-light',
            );
            if (tlIdxInRow1 === -1) {
              const targetIdx = row1.cards.length > 1 ? 1 : 0;
              row1.cards[targetIdx] = {
                id: 'a-daily-traffic-light',
                name: 'Semáforo Diario',
                colSpan: 1,
                type: 'daily-traffic-light',
              };
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

  // Semáforo de hoy de todas las categorías del PF (KAN-365/366, KAN-594): alimenta "Requieren
  // atención hoy", las donas, las alertas de dolor y el check-in. Un error se muestra como error
  // con "Reintentar", nunca como ceros que parecen datos reales.
  const [fetchedItems, setFetchedItems] = useState<AthleteTrafficLightItem[]>([]);
  const [athleteIdsByCategory, setAthleteIdsByCategory] = useState<Record<string, string[]>>({});
  const [trafficLightLoading, setTrafficLightLoading] = useState(!isAthlete);
  const [trafficLightError, setTrafficLightError] = useState<string | null>(null);
  const [overviewRefreshKey, setOverviewRefreshKey] = useState(0);
  // Ajustes del día aprobados desde el Inicio: el atleta deja de tener conflicto con su rutina
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<string>>(() => new Set());

  const trafficLightItems = React.useMemo(
    () =>
      fetchedItems.map((item) =>
        resolvedConflicts.has(item.id) ? { ...item, hasDayConflict: false } : item,
      ),
    [fetchedItems, resolvedConflicts],
  );

  const retryOverview = React.useCallback(() => {
    setTrafficLightLoading(true);
    setTrafficLightError(null);
    setOverviewRefreshKey((k) => k + 1);
  }, []);

  const [quickSheetAthlete, setQuickSheetAthlete] = useState<AthleteTrafficLightItem | null>(null);
  const [adjustmentAthlete, setAdjustmentAthlete] = useState<AthleteTrafficLightItem | null>(null);

  useEffect(() => {
    if (isAthlete) return;
    let active = true;

    fetchCoachTodayOverview()
      .then((overview) => {
        if (!active) return;
        setFetchedItems(overview.athletes);
        setAthleteIdsByCategory(overview.athleteIdsByCategory ?? {});
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFetchedItems([]);
        setAthleteIdsByCategory({});
        setTrafficLightError(
          err instanceof Error && err.message
            ? `${err.message} Probá de nuevo en unos segundos.`
            : 'No se pudo consultar el semáforo del día.',
        );
      })
      .finally(() => {
        if (active) setTrafficLightLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAthlete, overviewRefreshKey]);

  useEffect(() => {
    // El semáforo de todo el plantel es solo del PF: el atleta no tiene permiso para listar organizaciones
    if (isAthlete) return;
    let active = true;

    // Consulta si el PF tiene organizaciones creadas para mostrar banner de bienvenida/onboarding
    structureService
      .getOrganizations()
      .then((orgs) => {
        if (active) {
          setHasNoOrganizations(!orgs || orgs.length === 0);
        }
      })
      .catch(() => {
        // En caso de fallo transitorio no interrumpir el flujo
      })
      .finally(() => {
        if (active) {
          setLoadingOrganizations(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAthlete]);

  const trafficLightCounts = React.useMemo(
    () => summarizeTrafficLightCounts(trafficLightItems),
    [trafficLightItems],
  );

  // Progreso real del check-in del día: `gray` ⇔ hasReportedToday === false
  // (ver resolveStatus en seguimientoService), por lo tanto los reportados son
  // el total menos los pendientes. Sin datos → 0/0 (widget en vacío).
  const checkInProgress = React.useMemo(() => {
    const total = trafficLightCounts.all;
    const completed = total - trafficLightCounts.gray;
    const missingNames = trafficLightItems.filter((a) => a.status === 'gray').map((a) => a.name);
    return { completed, total, missingNames };
  }, [trafficLightCounts, trafficLightItems]);

  const attentionCount =
    trafficLightLoading || trafficLightError
      ? null
      : trafficLightCounts.red + trafficLightCounts.yellow;

  // Las propuestas de récord Epley se ven solo en su widget: el banner de arriba de todo, que
  // repetía las mismas tarjetas, salió del Inicio (KAN-594).
  const [pendingRecommendationsCount, setPendingRecommendationsCount] = useState(0);
  const [recordsAthlete, setRecordsAthlete] = useState<{ id: string; name: string } | null>(null);
  const [proposalsRefreshKey, setProposalsRefreshKey] = useState(0);

  const refreshProposals = React.useCallback(() => {
    setProposalsRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (isAthlete) return;
    let active = true;

    recommendationsService
      .listRecommendations({ status: 'Pending' })
      .then((data) => {
        if (active) setPendingRecommendationsCount(data.length);
      })
      .catch(() => {
        if (active) setPendingRecommendationsCount(0);
      });

    return () => {
      active = false;
    };
  }, [isAthlete, proposalsRefreshKey]);

  // Persist rows and widgets layout to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      // Ignore quota errors
    }
  }, [rows, storageKey]);

  // Sync layout when a widget is pinned or unpinned externally (KAN-571)
  useEffect(() => {
    const handleLayoutChanged = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRows(parsed);
          }
        }
      } catch {
        // Ignorar
      }
    };

    window.addEventListener('protraining-dashboard-layout-changed', handleLayoutChanged);
    return () => {
      window.removeEventListener('protraining-dashboard-layout-changed', handleLayoutChanged);
    };
  }, [storageKey]);

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

  // Card inner content renderer
  const renderCardContent = (card: WireframeCardItem) => {
    switch (card.type) {
      case 'top-ua-athletes':
        return <TopUaAthletesWidget />;
      case 'next-training':
        return (
          <NextTrainingWidget
            athletes={trafficLightItems}
            athleteIdsByCategory={athleteIdsByCategory}
          />
        );
      case 'daily-load':
        return <DailyLoadWidget />;
      case 'daily-traffic-light':
        return <DailyTrafficLightWidget />;
      case 'attention-today':
        return (
          <AttentionTodayWidget
            athletes={trafficLightItems}
            loading={trafficLightLoading}
            error={trafficLightError}
            onRetry={retryOverview}
            onViewProfile={setQuickSheetAthlete}
            onAdjustRoutine={setAdjustmentAthlete}
          />
        );
      case 'traffic-light-summary':
        return (
          <TrafficLightSummaryWidget
            counts={trafficLightCounts}
            athletes={trafficLightItems}
            loading={trafficLightLoading}
            error={trafficLightError}
            onRetry={retryOverview}
          />
        );
      case 'checkin-progress':
        return (
          <CheckInProgressWidget
            completed={checkInProgress.completed}
            total={checkInProgress.total}
            missingNames={checkInProgress.missingNames}
            loading={trafficLightLoading}
            error={trafficLightError}
            onRetry={retryOverview}
          />
        );
      case 'pain-alerts':
        return (
          <PainAlertsWidget
            athletes={trafficLightItems}
            loading={trafficLightLoading}
            error={trafficLightError}
            onRetry={retryOverview}
            onAdjustRoutine={setAdjustmentAthlete}
          />
        );
      case 'epley-proposals':
        return (
          <EpleyProposalsWidget
            onOpenRecords={(athleteId, athleteName) =>
              setRecordsAthlete({ id: athleteId, name: athleteName })
            }
          />
        );
      case 'progress-chart':
        return (
          <EvolutionChartWidget
            metricKey={card.chartMetric || 'cmj'}
            metric={evolutionMetrics[(card.chartMetric || 'cmj') as MetricKey]}
            loading={evolutionLoading}
            variant="compact"
          />
        );
      case 'suite':
        return (
          <div className="dashboard-suite-card">
            <img
              src={runnerImg}
              alt="Corredor 3D ProTraining"
              className="dashboard-suite-card-img"
            />
            <div className="dashboard-suite-card-body">
              <span className="dashboard-suite-badge">
                {isAthlete ? 'PROTRAINING ATLETA' : 'PROTRAINING SUITE'}
              </span>
              <h3 className="dashboard-suite-title">
                {isAthlete ? 'Mi Planificación y Rendimiento' : 'Gestión Integral de Atletas'}
              </h3>
              <p className="dashboard-suite-desc">
                {isAthlete
                  ? 'Accedé a tus rutinas asignadas y seguimiento físico.'
                  : 'Monitoreá el semáforo de tu plantel y planificá cargas con precisión.'}
              </p>
              <div className="dashboard-suite-actions">
                <button
                  type="button"
                  className="btn btn-primary dashboard-suite-btn"
                  onClick={() => navigate(isAthlete ? '/athlete/routine' : '/pf/monitoring')}
                >
                  <span>{isAthlete ? 'Ver Rutina' : 'Ver Semáforo'}</span>
                  <ArrowRight size={14} />
                </button>

                {isAthlete && (
                  <button
                    type="button"
                    className="btn btn-secondary dashboard-suite-btn-secondary"
                    onClick={() => navigate('/athlete/settings?tab=marcas')}
                  >
                    <span>Mis marcas</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case 'empty':
      default:
        return (
          <div className="dashboard-empty-card">
            <div className="dashboard-empty-icon">
              <Plus size={16} />
            </div>
            <span className="dashboard-empty-label">Espacio disponible</span>
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
            : describeCoachDay(
                attentionCount,
                trafficLightCounts.all > 0 && trafficLightCounts.gray === trafficLightCounts.all,
              )
        }
        actions={
          <button
            type="button"
            onClick={resetLayout}
            className="btn btn-secondary dashboard-header-reset-btn"
            title="Restablecer orden predeterminado de los módulos"
          >
            <RotateCcw size={13} />
            <span>Restablecer orden</span>
          </button>
        }
      />

      <div
        className={`app-page-body wireframe-dashboard-container ${
          isAthlete ? '' : 'wireframe-dashboard-container--coach'
        }`}
      >
        {!isAthlete && hasNoOrganizations && (
          <section className="dashboard-welcome-banner" aria-label="Bienvenida a ProTraining">
            <div className="dashboard-welcome-banner-info">
              <h3 className="dashboard-welcome-banner-title">
                <span>¡Te damos la bienvenida a ProTraining!</span>
              </h3>
              <p className="dashboard-welcome-banner-text">
                Muchas gracias por elegirnos para gestionar tus planteles. Para comenzar a
                planificar entrenamientos, registrar atletas y visualizar métricas de rendimiento,
                te invitamos a dar de alta tu primera organización deportiva.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/pf/organizations')}
              className="btn-pill-primary dashboard-welcome-banner-btn"
            >
              <span>+ Crear Organización</span>
              <ArrowRight size={16} />
            </button>
          </section>
        )}

        {isAthlete && <AthleteRecommendationsSection />}

        {!isAthlete && pendingRecommendationsCount > 0 && (
          <section
            className="recommendations-coach-banner"
            aria-label="Recomendaciones pendientes de revisión"
          >
            <div className="recommendations-coach-banner-info">
              <span className="recommendations-engine-icon" aria-hidden="true">
                <Sparkles size={18} />
              </span>
              <div>
                <h3>
                  {pendingRecommendationsCount === 1
                    ? 'Tenés 1 recomendación pendiente de revisión'
                    : `Tenés ${pendingRecommendationsCount} recomendaciones pendientes de revisión`}
                </h3>
                <p>
                  Revisalas, editalas si hace falta y aprobalas para que les lleguen a tus atletas.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/pf/recommendations')}
            >
              <span>Revisar recomendaciones</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </section>
        )}

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
      {!isAthlete && (
        <PfWelcomeModal
          isOpen={isWelcomeModalOpen}
          coachName={user?.fullName}
          onClose={handleCloseWelcomeModal}
        />
      )}
      {recordsAthlete && (
        <AthleteRecordsModal
          athleteId={recordsAthlete.id}
          athleteName={recordsAthlete.name}
          onClose={() => {
            setRecordsAthlete(null);
            refreshProposals();
          }}
        />
      )}
      {!isAthlete && (
        <AthleteQuickSheet
          athlete={quickSheetAthlete}
          onClose={() => setQuickSheetAthlete(null)}
          onOpenAdjustment={(athlete) => {
            setQuickSheetAthlete(null);
            setAdjustmentAthlete(athlete);
          }}
        />
      )}
      {adjustmentAthlete && (
        <DayAdjustmentModal
          athleteId={adjustmentAthlete.id}
          athleteName={adjustmentAthlete.name}
          isOpen
          onClose={() => setAdjustmentAthlete(null)}
          onAdjustmentApplied={(adjustment) => {
            // Con el ajuste aprobado la rutina de hoy ya no carga la zona: el botón desaparece
            if (adjustment.status === 'Approved') {
              setResolvedConflicts((prev) => new Set(prev).add(adjustment.athleteId));
            }
          }}
        />
      )}
    </div>
  );
};

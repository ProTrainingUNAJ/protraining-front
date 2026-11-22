import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TrendingUp,
  Pin,
  ArrowRight,
  Sparkles,
  X,
  LayoutGrid,
  BarChart3,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { EvolutionChartWidget } from '../../components/athlete/EvolutionChartWidget';
import { EmptyState } from '../../components/EmptyState';
import {
  buildEvolutionMetrics,
  METRIC_KEYS,
  METRIC_PRESENTATION,
  MetricKey,
} from '../../utils/evolutionMetrics';
import { useAthleteEvolution } from '../../hooks/useAthleteEvolution';
import {
  DEFAULT_ATHLETE_ROWS,
  getEmptyDashboardSlots,
  getPinnedProgressCharts,
  pinProgressChart,
} from '../../utils/athleteDashboardLayout';
import { AthleteGroupBenchmarkSection } from '../../components/athlete/AthleteGroupBenchmarkSection';
import { ResolvedInjuriesHistory } from '../../components/athlete/ResolvedInjuriesHistory';
import { OneRepMaxProgressionChart } from '../../components/athletes/OneRepMaxProgressionChart';
import { JumpVsLoadProgressionChart } from '../../components/athletes/JumpVsLoadProgressionChart';
import { EvolutionRangeSelector } from '../../components/athletes/EvolutionRangeSelector';
import { EvolutionRange } from '../../utils/evolutionRange';
import { AthleteWeeklyTrendsChart } from '../../components/athlete/AthleteWeeklyTrendsChart';
import { useAthleteTrends } from '../../hooks/useAthleteTrends';
import './ProgressPage.css';

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'progress' | 'evolution'>(() =>
    searchParams.get('tab') === 'evolution' ? 'evolution' : 'progress',
  );
  const [selectedMetric, setSelectedMetric] = useState<MetricKey | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [evolutionRange, setEvolutionRange] = useState<EvolutionRange>('3m');
  const {
    athleteId: resolvedAthleteId,
    evolution,
    loading: evolutionLoading,
    error: evolutionError,
  } = useAthleteEvolution(evolutionRange);
  const {
    trends: weeklyTrends,
    loading: trendsLoading,
    error: trendsError,
    reload: reloadTrends,
  } = useAthleteTrends(4);

  // Métricas de Progreso armadas con la evolución real; solo aparecen las que tienen mediciones
  const metrics = React.useMemo(() => buildEvolutionMetrics(evolution), [evolution]);
  const availableMetrics = METRIC_KEYS.filter((key) => metrics[key]);
  const activeMetric: MetricKey | null =
    selectedMetric && metrics[selectedMetric] ? selectedMetric : (availableMetrics[0] ?? null);

  const handleTabChange = (tab: 'progress' | 'evolution') => {
    setActiveTab(tab);
    if (tab === 'evolution') {
      setSearchParams({ tab: 'evolution' }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleEvolutionRangeChange = (nextRange: EvolutionRange) => {
    setEvolutionRange(nextRange);
  };

  // Track which metrics are already exported to Home/Dashboard (initialized from localStorage)
  const [exportedMetrics, setExportedMetrics] = useState<Record<string, string>>(() =>
    getPinnedProgressCharts(DEFAULT_ATHLETE_ROWS),
  );

  // Update state after exporting
  const refreshExportedState = () => {
    setExportedMetrics(getPinnedProgressCharts(DEFAULT_ATHLETE_ROWS));
  };

  // Fija el gráfico activo en el Inicio del atleta (en el lugar elegido o en el primero libre)
  const handleExportToDashboard = (targetCardId?: string) => {
    if (!activeMetric) return;
    const shortName = METRIC_PRESENTATION[activeMetric].shortName;
    const slotName = pinProgressChart(
      DEFAULT_ATHLETE_ROWS,
      activeMetric,
      `Evolución: ${shortName}`,
      targetCardId,
    );

    refreshExportedState();
    setExportModalOpen(false);

    if (slotName) {
      setToastMessage(`Gráfico de ${shortName} agregado a Inicio (${slotName}).`);
      setTimeout(() => setToastMessage(null), 6000);
    } else {
      setToastMessage(
        'No hay lugares libres en Inicio. Liberá uno desde Inicio y volvé a intentar.',
      );
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const availableSlots = getEmptyDashboardSlots(DEFAULT_ATHLETE_ROWS);

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Mi Progreso"
        description="Historial de cargas, tests físicos y evolución de rendimiento."
      />

      <div className="app-page-body">
        {/* Selector de pestañas: Mi progreso / Mi evolución (KAN-436) */}
        <nav
          className="plan-tabs"
          role="tablist"
          aria-label="Secciones de evolución y progreso del atleta"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'progress'}
            className={`plan-tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => handleTabChange('progress')}
          >
            <BarChart3 size={16} aria-hidden="true" />
            <span>Mi progreso</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'evolution'}
            className={`plan-tab-btn ${activeTab === 'evolution' ? 'active' : ''}`}
            onClick={() => handleTabChange('evolution')}
            data-testid="tab-mi-evolucion"
          >
            <TrendingUp size={16} aria-hidden="true" />
            <span>Mi evolución</span>
          </button>
        </nav>

        {activeTab === 'evolution' ? (
          <div className="card progress-evolution-card">
            <div className="progress-evolution-header">
              <h2 className="progress-evolution-title">
                Progresión de 1RM
              </h2>
              <p className="progress-evolution-subtitle">
                Evolución histórica de tus récords máximos por ejercicio.
              </p>
            </div>

            <EvolutionRangeSelector
              value={evolutionRange}
              onChange={handleEvolutionRangeChange}
              disabled={evolutionLoading}
            />

            {evolutionError && (
              <div
                className="alert-banner danger evolution-alert-banner"
                role="alert"
                data-testid="evolution-error-banner"
              >
                <span className="plan-inline">
                  <AlertCircle size={18} aria-hidden="true" />
                  {evolutionError}
                </span>
              </div>
            )}
            {evolution?.strengthUnavailable && (
              <div
                className="alert-banner warning evolution-alert-banner"
                role="status"
                data-testid="strength-unavailable-banner"
              >
                <span className="plan-inline">
                  <AlertCircle size={18} aria-hidden="true" />
                  No pudimos cargar los récords de fuerza en este momento.
                </span>
              </div>
            )}
            {resolvedAthleteId ? (
              <div className="evolution-charts-grid">
                <JumpVsLoadProgressionChart
                  fitnessTests={evolution?.fitnessTests ?? []}
                  isCoach={false}
                  loading={evolutionLoading}
                />
                <OneRepMaxProgressionChart
                  athleteId={resolvedAthleteId}
                  strengthUnavailable={evolution?.strengthUnavailable}
                  strengthSeries={evolution?.strength}
                  loading={evolutionLoading}
                  suppressBanner={true}
                />
              </div>
            ) : (
              <div className="rm-chart-empty" role="status">
                <Loader2 size={24} className="plan-spin" aria-hidden="true" />
                <p className="rm-chart-empty-text">Cargando perfil…</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Toast Notificador Flotante */}
            {toastMessage && (
              <div className="progress-toast-banner">
                <div className="progress-toast-content">
                  <Sparkles size={18} className="progress-toast-icon" />
                  <span className="progress-toast-text">{toastMessage}</span>
                </div>
                <div className="progress-toast-actions">
                  <button
                    type="button"
                    className="btn btn-primary progress-toast-btn"
                    onClick={() => navigate('/athlete')}
                  >
                    <span>Ver en Inicio</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToastMessage(null)}
                    className="progress-toast-close-btn"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Tendencia semanal de bienestar y carga (KAN-490) */}
            <AthleteWeeklyTrendsChart
              trends={weeklyTrends}
              loading={trendsLoading}
              error={trendsError}
              onRetry={reloadTrends}
            />

            <EvolutionRangeSelector
              value={evolutionRange}
              onChange={handleEvolutionRangeChange}
              disabled={evolutionLoading}
            />

            {evolutionError && (
              <div className="alert-banner danger evolution-alert-banner" role="alert">
                <span>{evolutionError}</span>
              </div>
            )}

            {!evolutionLoading && !evolutionError && availableMetrics.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Todavía no hay mediciones en este período"
                description="Cuando tu preparador físico cargue tests de campo o récords, o completes tus check-ins, vas a ver acá tu evolución."
              />
            ) : (
              <>
                {/* Indicadores principales: última medición de cada métrica con datos */}
                <div className="progress-kpi-grid">
                  {availableMetrics.slice(0, 4).map((key) => {
                    const metric = metrics[key]!;
                    return (
                      <div key={key} className="card card-static progress-kpi-card">
                        <span className="progress-kpi-label">{metric.shortName}</span>
                        <div className="progress-kpi-value">
                          <strong>{metric.currentValue.toLocaleString('es-AR')}</strong>
                          <span>{metric.unit}</span>
                        </div>
                        {metric.data.length < 2 ? (
                          <span className="progress-kpi-delta">
                            Una sola medición en el período
                          </span>
                        ) : (
                          <span
                            className={`progress-kpi-delta ${metric.isPositiveImprovement ? 'is-better' : 'is-worse'}`}
                          >
                            {metric.deltaAbsolute} en el período
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Gráfico de la métrica elegida, con opción de fijarlo en Inicio */}
                <div className="card card-static progress-chart-card">
                  <div className="progress-chart-header">
                    <div>
                      <h2 className="progress-chart-title">Gráficos de evolución</h2>
                      <p className="progress-chart-desc">
                        Elegí una métrica para ver su evolución. Podés fijar el gráfico en tu
                        pantalla de Inicio.
                      </p>
                    </div>
                    <div className="progress-metric-chips" role="group" aria-label="Métrica">
                      {availableMetrics.map((key) => {
                        const isSelected = activeMetric === key;
                        const isPinned = !!exportedMetrics[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isSelected}
                            className={`progress-metric-chip${isSelected ? ' is-selected' : ''}`}
                            onClick={() => setSelectedMetric(key)}
                          >
                            <span>{METRIC_PRESENTATION[key].shortName}</span>
                            {isPinned && <Pin size={12} aria-label="Fijado en Inicio" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeMetric && (
                    <EvolutionChartWidget
                      metricKey={activeMetric}
                      metric={metrics[activeMetric]}
                      loading={evolutionLoading}
                      variant="full"
                      isExported={!!exportedMetrics[activeMetric]}
                      onExportClick={() => setExportModalOpen(true)}
                    />
                  )}
                </div>
              </>
            )}

            {/* Mis Números vs. Promedio del Grupo (KAN-449) */}
            {resolvedAthleteId && <AthleteGroupBenchmarkSection athleteId={resolvedAthleteId} />}
            {/* Historial de molestias resueltas */}
            {resolvedAthleteId && (
              <div className="card progress-resolved-injuries-card">
                <h2 className="progress-resolved-injuries-title">
                  Historial de molestias resueltas
                </h2>
                <p className="progress-resolved-injuries-desc">
                  Molestias dadas de alta con su pico de dolor registrado.
                </p>
                <ResolvedInjuriesHistory athleteId={resolvedAthleteId} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal Selector para Exportar Gráfico a una Burbuja de Inicio ── */}
      {exportModalOpen && (
        <div className="routine-modal-backdrop" onClick={() => setExportModalOpen(false)}>
          <div
            className="routine-modal-card progress-export-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="routine-modal-header">
              <div className="progress-export-header-content">
                <div className="progress-export-pin-icon-wrap">
                  <Pin size={18} className="progress-export-pin-icon" />
                </div>
                <div>
                  <h3 className="routine-modal-title">Exportar a Inicio</h3>
                  <span className="progress-export-modal-subtitle">
                    Fijar gráfico de{' '}
                    {activeMetric ? METRIC_PRESENTATION[activeMetric].shortName : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="routine-modal-close-btn"
                onClick={() => setExportModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="routine-modal-body progress-export-body">
              <p className="progress-export-desc">
                El gráfico se adaptará automáticamente a la burbuja que elijas en el Bento Grid de
                tu pantalla principal (Fila 1, 2 o 3).
              </p>

              {/* Botón de asignación rápida */}
              <button
                type="button"
                className="btn btn-primary progress-export-quick-btn"
                onClick={() => handleExportToDashboard()}
              >
                <Sparkles size={16} />
                <span>Fijar en la primera burbuja libre disponible</span>
              </button>

              <div className="progress-export-divider">
                <span className="progress-export-divider-text">
                  o elegí una burbuja específica:
                </span>
              </div>

              {/* Lista de burbujas vacías */}
              <div className="progress-export-slots-list">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleExportToDashboard(slot.id)}
                      className="progress-export-slot-btn"
                    >
                      <div className="progress-export-slot-left">
                        <LayoutGrid size={15} className="progress-export-slot-icon" />
                        <span className="progress-export-slot-name">{slot.name}</span>
                      </div>
                      <span className="progress-export-slot-meta">
                        {slot.colSpan === 2 ? '2 columnas' : '1 columna'} · Disponible
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="progress-export-empty-slots">
                    Todas las burbujas están ocupadas actualmente.
                  </p>
                )}
              </div>
            </div>

            <div className="routine-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExportModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

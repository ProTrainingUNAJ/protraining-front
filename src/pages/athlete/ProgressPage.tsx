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
import { OneRepMaxProgressionChart } from '../../components/athletes/OneRepMaxProgressionChart';
import { JumpVsLoadProgressionChart } from '../../components/athletes/JumpVsLoadProgressionChart';
import { EvolutionRangeSelector } from '../../components/athletes/EvolutionRangeSelector';
import { EvolutionRange } from '../../utils/evolutionRange';

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
          <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h2
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-main)',
                }}
              >
                Progresión de 1RM
              </h2>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.84rem',
                  color: 'var(--text-muted)',
                }}
              >
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  background: 'var(--brand-navy)',
                  color: 'var(--on-primary)',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--secondary)',
                  animation: 'fadeInModal 0.2s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Sparkles size={18} style={{ color: 'var(--stat-cyan)' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{toastMessage}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{
                      background: 'var(--brand-blue)',
                      padding: '0.35rem 0.8rem',
                      fontSize: '0.78rem',
                      gap: '0.35rem',
                    }}
                    onClick={() => navigate('/athlete')}
                  >
                    <span>Ver en Inicio</span>
                    <ArrowRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setToastMessage(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--on-primary-subtle)',
                      cursor: 'pointer',
                      padding: '2px',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

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
          </>
        )}
      </div>

      {/* ── Modal Selector para Exportar Gráfico a una Burbuja de Inicio ── */}
      {exportModalOpen && (
        <div className="routine-modal-backdrop" onClick={() => setExportModalOpen(false)}>
          <div
            className="routine-modal-card"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="routine-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--stat-cyan-bg)',
                    color: 'var(--stat-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pin size={18} style={{ transform: 'rotate(45deg)' }} />
                </div>
                <div>
                  <h3 className="routine-modal-title">Exportar a Inicio</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
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

            <div className="routine-modal-body" style={{ gap: '1.15rem' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                El gráfico se adaptará automáticamente a la burbuja que elijas en el Bento Grid de
                tu pantalla principal (Fila 1, 2 o 3).
              </p>

              {/* Botón de asignación rápida */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleExportToDashboard()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                }}
              >
                <Sparkles size={16} />
                <span>Fijar en la primera burbuja libre disponible</span>
              </button>

              <div style={{ position: 'relative', textAlign: 'center', margin: '0.25rem 0' }}>
                <span
                  style={{
                    background: 'var(--bg-card)',
                    padding: '0 0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  o elegí una burbuja específica:
                </span>
              </div>

              {/* Lista de burbujas vacías */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleExportToDashboard(slot.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.95rem',
                        borderRadius: '10px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LayoutGrid size={15} style={{ color: 'var(--secondary)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{slot.name}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {slot.colSpan === 2 ? '2 columnas' : '1 columna'} · Disponible
                      </span>
                    </button>
                  ))
                ) : (
                  <p
                    style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}
                  >
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

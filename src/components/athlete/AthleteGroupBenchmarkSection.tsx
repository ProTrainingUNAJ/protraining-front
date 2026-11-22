import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Sparkles,
  HelpCircle,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import { athleteBenchmarkService } from '../../api/athleteBenchmark';
import { structureService } from '../../api/structureService';
import { GroupBenchmarkMetric, GroupBenchmarkResponse } from '../../types/benchmark';
import { Category } from '../../types/structure';
import './AthleteGroupBenchmarkSection.css';

interface AthleteGroupBenchmarkSectionProps {
  athleteId: string;
}

export const AthleteGroupBenchmarkSection: React.FC<AthleteGroupBenchmarkSectionProps> = ({
  athleteId,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [benchmark, setBenchmark] = useState<GroupBenchmarkResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // 1. Cargar datos del atleta (/me) para conocer sus categorías asignadas
  useEffect(() => {
    let isMounted = true;
    structureService
      .getMe()
      .then((me) => {
        if (!isMounted) return;
        const myCategories = (me?.categories || []) as Category[];
        setCategories(myCategories);
        if (myCategories.length > 0) {
          setSelectedCategoryId(myCategories[0].id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('No se pudieron obtener las categorías del atleta', err);
      });

    return () => {
      isMounted = false;
    };
  }, [athleteId]);

  // 2. Cargar benchmark del grupo para el atleta y la categoría seleccionada
  useEffect(() => {
    let isMounted = true;
    if (!athleteId) return;

    athleteBenchmarkService
      .getMyGroupBenchmark(athleteId, selectedCategoryId || undefined)
      .then((data) => {
        if (isMounted) {
          setBenchmark(data);
          setError(null);
        }
      })
      .catch(() => {
        // El detalle del back puede ser técnico (permisos entre servicios): al atleta se le muestra un mensaje propio
        if (isMounted) {
          setError('No pudimos cargar la comparación con tu grupo. Probá de nuevo más tarde.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [athleteId, selectedCategoryId, reloadTrigger]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const handleCategoryChange = (newCategoryId: string) => {
    setSelectedCategoryId(newCategoryId);
    setLoading(true);
  };

  // Helper de badges accesibles (WCAG 2.1: texto + color + icono)
  const renderStatusBadge = (metric: GroupBenchmarkMetric) => {
    if (
      metric.status === 'InsufficientGroupData' ||
      metric.groupAverage === null ||
      metric.groupAverage === undefined
    ) {
      return (
        <span
          className="badge benchmark-badge is-unmeasured"
          aria-label="Estado: Datos insuficientes"
          data-testid={`badge-status-${metric.dimension}`}
        >
          <HelpCircle size={13} aria-hidden="true" />
          <span>Datos insuficientes</span>
        </span>
      );
    }

    if (metric.status === 'BelowAverage' || metric.isWeakestPoint) {
      return (
        <span
          className="badge benchmark-badge is-below"
          aria-label="Estado: Por debajo del promedio"
          data-testid={`badge-status-${metric.dimension}`}
        >
          <AlertTriangle size={13} aria-hidden="true" />
          <span>{metric.isWeakestPoint ? 'Punto a mejorar' : 'Por debajo del promedio'}</span>
        </span>
      );
    }

    if (metric.status === 'AboveAverage') {
      return (
        <span
          className="badge benchmark-badge is-above"
          aria-label="Estado: Superior al promedio"
          data-testid={`badge-status-${metric.dimension}`}
        >
          <CheckCircle2 size={13} aria-hidden="true" />
          <span>Superior al promedio</span>
        </span>
      );
    }

    return (
      <span
        className="badge benchmark-badge is-equal"
        aria-label="Estado: En el promedio"
        data-testid={`badge-status-${metric.dimension}`}
      >
        <Minus size={13} aria-hidden="true" />
        <span>En el promedio</span>
      </span>
    );
  };

  const weakestMetric = benchmark?.metrics.find((m) => m.isWeakestPoint);

  return (
    <section
      className="card benchmark-section-card"
      aria-labelledby="group-benchmark-heading"
      data-testid="athlete-group-benchmark-section"
    >
      {/* Encabezado con Selector de Categoría (Multicategoría N:N) */}
      <div className="benchmark-header">
        <div className="benchmark-title-wrap">
          <div className="benchmark-icon-box" aria-hidden="true">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 id="group-benchmark-heading" className="benchmark-title">
              Mis Números vs. Promedio del Grupo
            </h2>
            <p className="benchmark-subtitle">
              Comparativa de rendimiento contra los promedios anónimos de tu categoría.
            </p>
          </div>
        </div>

        {/* Selector de Categoría cuando el atleta tiene múltiples */}
        <div className="benchmark-meta-actions">
          {categories.length > 1 && (
            <div className="benchmark-category-pill">
              <FolderTree size={15} className="benchmark-category-icon" aria-hidden="true" />
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                aria-label="Seleccionar categoría de comparación"
                data-testid="benchmark-category-select"
                className="select-field"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary benchmark-refresh-btn"
            onClick={handleRefresh}
            title="Recargar métricas"
            aria-label="Recargar métricas de comparación"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta del punto a mejorar más débil */}
      {weakestMetric && (
        <div className="benchmark-error-banner" role="alert" data-testid="weakest-point-alert">
          <div className="benchmark-error-content">
            <AlertTriangle size={22} className="benchmark-error-icon" aria-hidden="true" />
            <div>
              <strong className="benchmark-error-title">
                Principal punto a mejorar: {weakestMetric.dimension}
              </strong>
              <span className="benchmark-error-desc">
                Tu marca ({weakestMetric.athleteValue} {weakestMetric.unit || ''}) está{' '}
                {weakestMetric.trend?.toLowerCase() || 'por debajo del promedio de tu división'}.
                Consultá con tu preparador físico para ajustar tu plan.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Estado de Carga */}
      {loading && (
        <div className="benchmark-loading-container" aria-live="polite">
          <RefreshCw size={24} className="spin benchmark-loading-icon" />
          <p className="benchmark-loading-text">
            Consultando promedios anónimos de la categoría...
          </p>
        </div>
      )}

      {/* Estado de Error */}
      {error && !loading && (
        <div className="benchmark-error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Estado sin mediciones */}
      {!loading && !error && (!benchmark || benchmark.metrics.length === 0) && (
        <div className="benchmark-empty-card" data-testid="empty-benchmark-state">
          <HelpCircle size={32} className="benchmark-empty-icon" aria-hidden="true" />
          <h3 className="benchmark-empty-title">Sin evaluaciones comparativas disponibles</h3>
          <p className="benchmark-empty-desc">
            Aún no se registraron evaluaciones físicas para tu perfil o tu categoría no cuenta con
            promedios cargados esta semana.
          </p>
        </div>
      )}

      {/* Grilla de Métricas Comparativas */}
      {!loading && !error && benchmark && benchmark.metrics.length > 0 && (
        <div className="benchmark-grid" data-testid="benchmark-metrics-grid">
          {benchmark.metrics.map((metric) => (
            <div
              key={metric.dimension}
              className={`card benchmark-card-item${metric.isWeakestPoint ? ' is-below-point' : ''}`}
              data-testid={`benchmark-card-${metric.dimension}`}
            >
              <div className="benchmark-card-header">
                <div className="benchmark-card-title-wrap">
                  <h3 className="benchmark-card-test-name">{metric.dimension}</h3>
                  <span className="benchmark-card-unit">
                    {metric.direction === 'LowerIsBetter' ? 'Menor es mejor' : 'Mayor es mejor'}
                  </span>
                </div>
                {renderStatusBadge(metric)}
              </div>

              {/* Valores comparados */}
              <div className="benchmark-metrics-row">
                <div className="benchmark-metric-box is-athlete">
                  <span className="benchmark-metric-label">Mi resultado</span>
                  <span
                    className="benchmark-metric-val"
                    data-testid={`athlete-val-${metric.dimension}`}
                  >
                    {metric.athleteValue} {metric.unit || ''}
                  </span>
                </div>

                <div className="benchmark-metric-box">
                  <span className="benchmark-metric-label">Promedio categoría</span>
                  <span
                    className={
                      metric.groupAverage !== null && metric.groupAverage !== undefined
                        ? 'benchmark-metric-val'
                        : 'benchmark-metric-unmeasured'
                    }
                    data-testid={`group-avg-${metric.dimension}`}
                  >
                    {metric.groupAverage !== null && metric.groupAverage !== undefined
                      ? `${metric.groupAverage} ${metric.unit || ''}`
                      : 'Todavía no hay suficientes datos del grupo'}
                  </span>
                </div>
              </div>

              {/* Diferencia y Tendencia */}
              {metric.difference !== null &&
              metric.difference !== undefined &&
              metric.groupAverage !== null &&
              metric.groupAverage !== undefined ? (
                <div className="benchmark-card-footer">
                  <span className="benchmark-footer-target">
                    Diferencia:{' '}
                    <strong
                      style={{
                        color:
                          metric.status === 'BelowAverage'
                            ? 'var(--stat-red)'
                            : metric.status === 'AboveAverage'
                              ? 'var(--stat-green)'
                              : 'var(--text-main)',
                      }}
                    >
                      {metric.difference > 0 ? '+' : ''}
                      {metric.difference} {metric.unit || ''}
                    </strong>
                  </span>

                  <div className="benchmark-footer-higher-better">
                    <Sparkles
                      size={13}
                      className="benchmark-footer-sparkle-icon"
                      aria-hidden="true"
                    />
                    <span>{metric.trend || `${metric.percentageDifference}%`}</span>
                  </div>
                </div>
              ) : (
                <div className="benchmark-card-footer benchmark-footer-tag">
                  <span>Pendiente de acumular mediciones grupales suficientes</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

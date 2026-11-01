import React, { useState, useEffect, useCallback } from 'react';
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
import { athleteBenchmarkService } from '../../services/athleteBenchmarkService';
import { structureService } from '../../api/structureService';
import { GroupBenchmarkMetric, GroupBenchmarkResponse } from '../../types/benchmark';
import { Category } from '../../types/structure';

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
  const fetchBenchmark = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await athleteBenchmarkService.getMyGroupBenchmark(
        athleteId,
        selectedCategoryId || undefined,
      );
      setBenchmark(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo cargar la comparación grupal.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [athleteId, selectedCategoryId]);

  useEffect(() => {
    void fetchBenchmark();
  }, [fetchBenchmark]);

  // Helper de badges accesibles (WCAG 2.1: texto + color + icono)
  const renderStatusBadge = (metric: GroupBenchmarkMetric) => {
    if (metric.status === 'BelowAverage' || metric.isWeakestPoint) {
      return (
        <span
          className="badge"
          style={{
            background: 'var(--stat-red-bg, rgba(239, 68, 68, 0.15))',
            color: 'var(--stat-red, #ef4444)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
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
          className="badge"
          style={{
            background: 'var(--stat-green-bg, rgba(34, 197, 94, 0.15))',
            color: 'var(--stat-green, #22c55e)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
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
        className="badge"
        style={{
          background: 'var(--bg-subtle, rgba(148, 163, 184, 0.15))',
          color: 'var(--text-muted, #94a3b8)',
          border: '1px solid var(--border)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
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
      className="card"
      style={{
        marginTop: '1.75rem',
        padding: '1.5rem',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
      aria-labelledby="group-benchmark-heading"
      data-testid="athlete-group-benchmark-section"
    >
      {/* Encabezado con Selector de Categoría (Multicategoría N:N) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--stat-cyan-bg, rgba(6, 182, 212, 0.15))',
              color: 'var(--stat-cyan, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <h2
              id="group-benchmark-heading"
              style={{
                margin: 0,
                fontSize: '1.15rem',
                fontWeight: 800,
                color: 'var(--text-main)',
              }}
            >
              Mis Números vs. Promedio del Grupo
            </h2>
            <p
              style={{
                margin: '0.2rem 0 0 0',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              Comparativa de rendimiento contra los promedios anónimos de tu categoría (KAN-449).
            </p>
          </div>
        </div>

        {/* Selector de Categoría cuando el atleta tiene múltiples */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {categories.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FolderTree size={15} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                aria-label="Seleccionar categoría de comparación"
                data-testid="benchmark-category-select"
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle, #1e293b)',
                  color: 'var(--text-main)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
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
            className="btn btn-secondary"
            onClick={() => void fetchBenchmark()}
            title="Recargar métricas"
            aria-label="Recargar métricas de comparación"
            style={{
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Alerta del punto a mejorar más débil */}
      {weakestMetric && (
        <div
          style={{
            background: 'var(--stat-red-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
          role="alert"
          data-testid="weakest-point-alert"
        >
          <AlertTriangle
            size={22}
            style={{ color: 'var(--stat-red, #ef4444)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <div>
            <strong
              style={{
                display: 'block',
                fontSize: '0.9rem',
                color: 'var(--stat-red, #ef4444)',
                fontWeight: 800,
              }}
            >
              Principal punto a mejorar: {weakestMetric.dimension}
            </strong>
            <span
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-main)',
                lineHeight: 1.4,
              }}
            >
              Tu marca ({weakestMetric.athleteValue} {weakestMetric.unit || ''}) está{' '}
              {weakestMetric.trend?.toLowerCase() || 'por debajo del promedio de tu división'}.
              Consultá con tu preparador físico para ajustar tu plan.
            </span>
          </div>
        </div>
      )}

      {/* Estado de Carga */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}
          aria-live="polite"
        >
          <RefreshCw size={24} className="spin" style={{ marginBottom: '0.5rem' }} />
          <p style={{ margin: 0 }}>Consultando promedios anónimos de la categoría...</p>
        </div>
      )}

      {/* Estado de Error */}
      {error && !loading && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--stat-red, #ef4444)',
            padding: '1rem',
            borderRadius: '10px',
            fontSize: '0.88rem',
            textAlign: 'center',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Estado sin mediciones */}
      {!loading && !error && (!benchmark || benchmark.metrics.length === 0) && (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            color: 'var(--text-muted)',
          }}
          data-testid="empty-benchmark-state"
        >
          <HelpCircle size={32} style={{ marginBottom: '0.5rem', opacity: 0.7 }} aria-hidden="true" />
          <h3 style={{ fontSize: '0.95rem', margin: '0.3rem 0', color: 'var(--text-main)' }}>
            Sin evaluaciones comparativas disponibles
          </h3>
          <p style={{ fontSize: '0.82rem', maxWidth: '420px', margin: '0 auto' }}>
            Aún no se registraron evaluaciones físicas para tu perfil o tu categoría no cuenta con
            promedios cargados esta semana.
          </p>
        </div>
      )}

      {/* Grilla de Métricas Comparativas */}
      {!loading && !error && benchmark && benchmark.metrics.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
          data-testid="benchmark-metrics-grid"
        >
          {benchmark.metrics.map((metric) => (
            <div
              key={metric.dimension}
              className="card"
              style={{
                margin: 0,
                padding: '1.15rem',
                borderRadius: '12px',
                border: metric.isWeakestPoint
                  ? '1px solid var(--stat-red, #ef4444)'
                  : '1px solid var(--border)',
                background: metric.isWeakestPoint
                  ? 'var(--bg-subtle, rgba(239, 68, 68, 0.04))'
                  : 'var(--bg-card)',
                boxShadow: metric.isWeakestPoint
                  ? '0 2px 10px rgba(239, 68, 68, 0.12)'
                  : 'none',
              }}
              data-testid={`benchmark-card-${metric.dimension}`}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                    }}
                  >
                    {metric.dimension}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {metric.direction === 'LowerIsBetter' ? 'Menor es mejor' : 'Mayor es mejor'}
                  </span>
                </div>
                {renderStatusBadge(metric)}
              </div>

              {/* Valores comparados */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'var(--bg-subtle, #1e293b)',
                  marginBottom: '0.75rem',
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Mi resultado
                  </span>
                  <span
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                    }}
                    data-testid={`athlete-val-${metric.dimension}`}
                  >
                    {metric.athleteValue} {metric.unit || ''}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                    }}
                  >
                    Promedio categoría
                  </span>
                  <span
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                    }}
                    data-testid={`group-avg-${metric.dimension}`}
                  >
                    {metric.groupAverage} {metric.unit || ''}
                  </span>
                </div>
              </div>

              {/* Diferencia y Tendencia */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>
                  Diferencia:{' '}
                  <strong
                    style={{
                      color:
                        metric.status === 'BelowAverage'
                          ? 'var(--stat-red, #ef4444)'
                          : metric.status === 'AboveAverage'
                            ? 'var(--stat-green, #22c55e)'
                            : 'var(--text-main)',
                    }}
                  >
                    {metric.difference !== undefined && metric.difference > 0 ? '+' : ''}
                    {metric.difference} {metric.unit || ''}
                  </strong>
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={13} style={{ color: 'var(--stat-cyan)' }} aria-hidden="true" />
                  <span>{metric.trend || `${metric.percentageDifference}%`}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};


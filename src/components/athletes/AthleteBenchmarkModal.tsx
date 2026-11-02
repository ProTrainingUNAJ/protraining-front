import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { athleteBenchmarkService } from '../../api/athleteBenchmark';
import { CategoryBenchmarkSummary } from '../../types/benchmark';
import { formatBenchmarkDelta, getStatusBadgeInfo } from '../../utils/benchmarkCalculator';

interface AthleteBenchmarkModalProps {
  athleteId: string;
  athleteName: string;
  categories: Array<{ id: string; name: string }>;
  initialCategoryId?: string;
  onClose: () => void;
}

export const AthleteBenchmarkModal: React.FC<AthleteBenchmarkModalProps> = ({
  athleteId,
  athleteName,
  categories,
  initialCategoryId,
  onClose,
}) => {
  // Categoría seleccionada para la comparativa (respetando N:N)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategoryId || (categories.length > 0 ? categories[0].id : ''),
  );

  const [summary, setSummary] = useState<CategoryBenchmarkSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(selectedCategoryId));
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const activeCategory = categories.find((c) => c.id === selectedCategoryId);
  const categoryName = activeCategory ? activeCategory.name : 'Categoría';

  useEffect(() => {
    let active = true;
    if (!selectedCategoryId) {
      return;
    }

    const cat = categories.find((c) => c.id === selectedCategoryId);
    const name = cat ? cat.name : 'Categoría';

    athleteBenchmarkService
      .getAthleteBenchmark(athleteId, selectedCategoryId, athleteName, name)
      .then((data) => {
        if (active) {
          setSummary(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar la comparativa de la categoría.',
          );
          setSummary(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [athleteId, athleteName, categories, selectedCategoryId, reloadTrigger]);

  // Soporte de tecla Escape para accesibilidad
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose} data-testid="athlete-benchmark-modal-overlay">
      <div
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-benchmark-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%' }}
      >
        {/* Cabecera del modal */}
        <div className="plan-picker-header">
          <div>
            <h2 id="modal-benchmark-title" style={{ margin: 0, fontSize: '1.25rem' }}>
              Rendimiento frente al grupo
            </h2>
            <p
              style={{
                margin: '0.25rem 0 0',
                color: 'var(--text-muted, #6c757d)',
                fontSize: '0.9rem',
              }}
            >
              Atleta: <strong>{athleteName}</strong>
            </p>
          </div>
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onClose}
            aria-label="Cerrar modal de comparativa"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Selector de categoría (cuando pertenece a más de una) */}
        {categories.length > 1 && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#f8f9fa',
              borderRadius: '6px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <label
              htmlFor="benchmark-category-select"
              style={{ fontSize: '0.875rem', fontWeight: 600, color: '#495057' }}
            >
              Categoría de comparación:
            </label>
            <select
              id="benchmark-category-select"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setLoading(true);
              }}
              style={{
                flex: 1,
                padding: '0.35rem 0.6rem',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '0.875rem',
                background: '#ffffff',
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mensaje informativo de categoría actual */}
        {categories.length === 1 && (
          <div
            style={{
              fontSize: '0.85rem',
              color: '#6c757d',
              marginBottom: '0.75rem',
            }}
          >
            Comparando frente a los promedios de la categoría: <strong>{categoryName}</strong>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div
            className="alert-banner danger"
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              background: '#f8d7da',
              color: '#842029',
              borderRadius: '6px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={18} aria-hidden="true" />
            <span style={{ flex: 1, fontSize: '0.9rem' }}>{error}</span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setReloadTrigger((prev) => prev + 1)}
              style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Estado de Carga */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6c757d' }}>
            <Loader2
              size={32}
              className="plan-spin"
              style={{ animation: 'spin 1s linear infinite' }}
              aria-hidden="true"
            />
            <p style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>
              Calculando promedios y métricas de la categoría...
            </p>
          </div>
        )}

        {/* Contenido principal cuando no está cargando */}
        {!loading && summary && (
          <div>
            {/* Banner de Punto más Débil (si existe con mediciones válidas) */}
            {summary.weakestPoint && (
              <div
                role="status"
                style={{
                  background: '#fff3cd',
                  border: '1px solid #ffecb5',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                }}
              >
                <AlertTriangle
                  size={24}
                  style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }}
                  aria-hidden="true"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#997404', fontSize: '1rem' }}>
                    Punto más débil identificado: {summary.weakestPoint.testName}
                  </div>
                  <p style={{ margin: '0.25rem 0 0', color: '#664d03', fontSize: '0.875rem' }}>
                    Resultado del atleta:{' '}
                    <strong>
                      {summary.weakestPoint.athleteValue} {summary.weakestPoint.unit}
                    </strong>{' '}
                    frente al promedio grupal de{' '}
                    <strong>
                      {summary.weakestPoint.groupAverage} {summary.weakestPoint.unit}
                    </strong>{' '}
                    ({summary.weakestPoint.percentageDelta}% de diferencia).
                  </p>
                </div>
              </div>
            )}

            {/* Resumen numérico */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  background: '#f8f9fa',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>
                  Atletas Evaluados
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#212529' }}>
                  {summary.athleteCount}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>en {categoryName}</span>
              </div>

              <div
                style={{
                  background: '#f8f9fa',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>
                  Tests Comparados
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#212529' }}>
                  {summary.items.length}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>batería de pruebas</span>
              </div>

              <div
                style={{
                  background: '#f8f9fa',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>
                  Puntos a Mejorar
                </span>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: summary.areasToImproveCount > 0 ? '#d97706' : '#198754',
                  }}
                >
                  {summary.areasToImproveCount}{' '}
                  {summary.areasToImproveCount === 1 ? 'test' : 'tests'}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>por debajo del grupo</span>
              </div>
            </div>

            {/* Lista de Tests Físicos */}
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                marginBottom: '0.75rem',
                color: '#333',
              }}
            >
              Comparativa de Evaluaciones Físicas
            </h3>

            {summary.items.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: '#f8f9fa',
                  borderRadius: '6px',
                  color: '#6c757d',
                }}
              >
                <HelpCircle
                  size={32}
                  style={{ marginBottom: '0.5rem', opacity: 0.5 }}
                  aria-hidden="true"
                />
                <p style={{ margin: 0, fontWeight: 500 }}>Todavía no hay tests cargados</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {summary.items.map((item) => {
                  const badge = getStatusBadgeInfo(item.status, item.isWeakestPoint);

                  // Estilos de badge accesibles (con color y contraste semántico)
                  let badgeBg = '#e9ecef';
                  let badgeColor = '#495057';
                  let badgeBorder = '#ced4da';
                  if (badge.variant === 'danger') {
                    badgeBg = '#f8d7da';
                    badgeColor = '#842029';
                    badgeBorder = '#f5c2c7';
                  } else if (badge.variant === 'warning') {
                    badgeBg = '#fff3cd';
                    badgeColor = '#664d03';
                    badgeBorder = '#ffecb5';
                  } else if (badge.variant === 'success') {
                    badgeBg = '#d1e7dd';
                    badgeColor = '#0f5132';
                    badgeBorder = '#badbcc';
                  }

                  return (
                    <div
                      key={item.testName}
                      data-testid={`benchmark-card-${item.testName.replace(/\s+/g, '-').toLowerCase()}`}
                      style={{
                        border: item.isWeakestPoint ? '2px solid #f5c2c7' : '1px solid #dee2e6',
                        borderRadius: '8px',
                        padding: '1rem',
                        background: item.isWeakestPoint ? '#fffbfa' : '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong style={{ fontSize: '1rem', color: '#212529' }}>
                              {item.testName}
                            </strong>
                            {item.motorSkill && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  background: '#e9ecef',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  color: '#495057',
                                }}
                              >
                                {item.motorSkill}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                            Dirección de mejora:{' '}
                            {item.direction === 'higher_is_better'
                              ? 'Mayor valor es mejor'
                              : 'Menor tiempo es mejor'}
                          </span>
                        </div>

                        {/* Badge de estado accesible */}
                        <div
                          role="note"
                          aria-label={badge.ariaDescription}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                          }}
                        >
                          {badge.variant === 'danger' && (
                            <AlertTriangle size={14} aria-hidden="true" />
                          )}
                          {badge.variant === 'warning' && (
                            <TrendingDown size={14} aria-hidden="true" />
                          )}
                          {badge.variant === 'success' && (
                            <TrendingUp size={14} aria-hidden="true" />
                          )}
                          {badge.variant === 'neutral' && <Minus size={14} aria-hidden="true" />}
                          {badge.variant === 'secondary' && (
                            <HelpCircle size={14} aria-hidden="true" />
                          )}
                          <span>{badge.label}</span>
                        </div>
                      </div>

                      {/* Métricas: Atleta vs Grupo */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '0.5rem',
                          marginTop: '0.75rem',
                          padding: '0.5rem 0',
                          borderTop: '1px solid #f1f3f5',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>
                            Resultado Atleta
                          </span>
                          <span
                            style={{
                              fontSize: item.athleteValue !== null ? '1rem' : '0.85rem',
                              fontWeight: 600,
                              color: item.athleteValue !== null ? '#212529' : '#6c757d',
                              fontStyle: item.athleteValue !== null ? 'normal' : 'italic',
                            }}
                          >
                            {item.athleteValue !== null
                              ? `${item.athleteValue} ${item.unit}`
                              : 'Todavía no hay tests cargados'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>
                            Promedio Categoría
                          </span>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: '#212529' }}>
                            {item.groupAverage !== null
                              ? `${item.groupAverage} ${item.unit}`
                              : 'Sin promedio'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6c757d', display: 'block' }}>
                            Diferencia
                          </span>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color:
                                item.status === 'below_average'
                                  ? '#d97706'
                                  : item.status === 'above_average'
                                    ? '#198754'
                                    : '#6c757d',
                            }}
                          >
                            {formatBenchmarkDelta(item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pie del modal */}
        <div
          style={{
            marginTop: '1.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            borderTop: '1px solid #dee2e6',
            paddingTop: '1rem',
          }}
        >
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, ShieldCheck, FileText, RefreshCw, Layers, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { CategoryMetricsPanel } from '../../components/dashboard/CategoryMetricsPanel';
import { RecordsReliabilityPanel } from '../../components/records/RecordsReliabilityPanel';
import { ReportsExportPanel } from '../../components/dashboard/ReportsExportPanel';
import { categoryDashboardService } from '../../api/categoryDashboard';
import { structureService } from '../../api/structureService';
import { exercisesService } from '../../api/exercises';
import type { Category, Organization } from '../../types/structure';
import type { CategoryDashboardSummary } from '../../types/categoryDashboard';
import type { CatalogExercise } from '../../types/trainingPlans';
import {
  DASHBOARD_PERIOD_OPTIONS,
  getCategoryDashboardRange,
  parseCategoryDashboardPeriod,
  type CategoryDashboardPeriod,
} from '../../utils/categoryDashboardRange';

export type StatisticsTab = 'statistics' | 'reports';

function parseTab(tabParam: string | null): StatisticsTab {
  if (tabParam === 'reports') return 'reports';
  return 'statistics';
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Página unificada de Estadísticas & Informes (KAN-650, KAN-651).
 * Integra en una sola vista con navegación armónica por pestañas:
 * 1. Estadísticas del Plantel (Métricas de presentismo, lesiones y carga de categoría)
 * 2. Confiabilidad de Récords (Auditoría de 1RM de atletas)
 * 3. Informes & Exportación (Reportes ejecutivos en PDF, CSV y texto para copiar)
 */
export const StatisticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = parseTab(searchParams.get('tab'));
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>(
    searchParams.get('orgId') || '',
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    searchParams.get('catId') || '',
  );
  const selectedCategoryIdRef = useRef(selectedCategoryId);

  const [period, setPeriod] = useState<CategoryDashboardPeriod>(() =>
    parseCategoryDashboardPeriod(searchParams.get('period')),
  );

  // Catálogo de ejercicios para el filtro opcional de confiabilidad
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(
    searchParams.get('exerciseId') || '',
  );

  const [loadingStructure, setLoadingStructure] = useState(true);
  const [structureError, setStructureError] = useState<string | null>(null);

  const [summary, setSummary] = useState<CategoryDashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Helper para actualizar searchParams en la URL sin recargar
  const updateSearchParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  // 1. Cargar Organizaciones y Categorías del PF
  useEffect(() => {
    let mounted = true;

    async function loadStructure() {
      try {
        const orgs = await structureService.getOrganizations();
        if (!mounted) return;
        setOrganizations(orgs);

        const categoriesByOrg = await Promise.all(
          orgs.map((org) => structureService.getCategories(org.id).catch(() => [] as Category[])),
        );
        if (!mounted) return;
        const seenCatIds = new Set<string>();
        const allCategories: Category[] = [];
        for (const cat of categoriesByOrg.flat()) {
          if (cat.id && !seenCatIds.has(cat.id)) {
            seenCatIds.add(cat.id);
            allCategories.push(cat);
          }
        }
        setCategories(allCategories);

        const currentCatId = selectedCategoryIdRef.current;
        if (currentCatId && !allCategories.some((c) => c.id === currentCatId)) {
          selectedCategoryIdRef.current = '';
          setSelectedCategoryId('');
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setStructureError(
          errorMessage(err, 'No se pudieron cargar las organizaciones y categorías.'),
        );
      } finally {
        if (mounted) setLoadingStructure(false);
      }
    }

    loadStructure();

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Cargar ejercicios del catálogo (para filtro de Confiabilidad)
  useEffect(() => {
    let mounted = true;

    exercisesService
      .search('', 1, 300)
      .then((res) => {
        if (mounted) setExercises(res.items);
      })
      .catch(() => {
        if (mounted) setExercises([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Categorías filtradas según la organización seleccionada
  const availableCategories = useMemo(() => {
    if (!selectedOrganizationId) return categories;
    return categories.filter((c) => c.organizationId === selectedOrganizationId);
  }, [categories, selectedOrganizationId]);

  // ID de categoría efectivo para la consulta:
  // Si seleccionó una categoría, se usa esa. Si seleccionó "Todas", se toma la primera de la lista disponible.
  const effectiveCategoryId = useMemo(() => {
    if (selectedCategoryId) return selectedCategoryId;
    return availableCategories[0]?.id || '';
  }, [selectedCategoryId, availableCategories]);

  // 3. Cargar Resumen de Categoría (para Estadísticas del Plantel e Informes)
  useEffect(() => {
    if (!effectiveCategoryId) return;

    let mounted = true;

    // KAN-651: SilentNotFound para resiliencia ante categorías sin métricas o 404
    categoryDashboardService
      .getByCategory(effectiveCategoryId, getCategoryDashboardRange(period), {
        silentNotFound: true,
      })
      .then((data) => {
        if (!mounted) return;
        setSummary(data);
        setSummaryError(null);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setSummary(null);
        setSummaryError(errorMessage(err, 'No se pudo cargar el resumen de la categoría.'));
      })
      .finally(() => {
        if (mounted) setLoadingSummary(false);
      });

    return () => {
      mounted = false;
    };
  }, [effectiveCategoryId, period, reloadKey]);

  // Manejo de cambio de pestaña
  const handleTabChange = (tab: StatisticsTab) => {
    updateSearchParam('tab', tab === 'statistics' ? '' : tab);
  };

  // Manejo de cambio de organización
  const handleOrganizationChange = (orgId: string) => {
    setSelectedOrganizationId(orgId);
    updateSearchParam('orgId', orgId);

    // Si la categoría actual no pertenece a la nueva organización, resetearla
    if (orgId && selectedCategoryId) {
      const belongs = categories.some(
        (c) => c.id === selectedCategoryId && c.organizationId === orgId,
      );
      if (!belongs) {
        selectedCategoryIdRef.current = '';
        setSelectedCategoryId('');
        updateSearchParam('catId', '');
        setSummary(null);
      }
    }
    setLoadingSummary(true);
  };

  // Manejo de cambio de categoría
  const handleCategoryChange = (catId: string) => {
    selectedCategoryIdRef.current = catId;
    setSelectedCategoryId(catId);
    updateSearchParam('catId', catId);
    setLoadingSummary(true);
  };

  // Manejo de cambio de período
  const handlePeriodChange = (nextPeriod: CategoryDashboardPeriod) => {
    setPeriod(nextPeriod);
    updateSearchParam('period', nextPeriod);
    setLoadingSummary(true);
  };

  // Manejo de cambio de ejercicio
  const handleExerciseChange = (exId: string) => {
    setSelectedExerciseId(exId);
    updateSearchParam('exerciseId', exId);
  };

  // Botón Actualizar
  const handleRefresh = () => {
    setLoadingSummary(true);
    setReloadKey((k) => k + 1);
  };

  const selectedOrgName =
    organizations.find((o) => o.id === selectedOrganizationId)?.name || 'Todas las organizaciones';
  const selectedCatName =
    categories.find((c) => c.id === effectiveCategoryId)?.name || 'Todas las categorías';
  const periodLabel =
    DASHBOARD_PERIOD_OPTIONS.find((o) => o.value === period)?.label || 'Últimos 30 días';

  return (
    <div className="app-page-container">
      {/* Encabezado Principal con Pestañas Armónicas (Simétrico a Seguimiento) */}
      <PageHeader
        title="Estadísticas & Informes"
        description="Métricas agregadas del plantel, confiabilidad de 1RM y generación de informes ejecutivos."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'statistics' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('statistics')}
              style={{
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <BarChart3 size={15} />
              <span>Estadísticas y Confiabilidad</span>
            </button>

            <button
              type="button"
              className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('reports')}
              style={{
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <FileText size={15} />
              <span>Informes & Exportación</span>
            </button>
          </div>
        }
      />

      <div
        className="app-page-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Barra Superior de Filtros Coordinada (Organización + Categoría + Filtro Contextual) */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Organización */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <label
                htmlFor="statistics-org-select"
                style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                Organización:
              </label>
              <select
                id="statistics-org-select"
                aria-label="Filtrar por organización"
                value={selectedOrganizationId}
                onChange={(e) => handleOrganizationChange(e.target.value)}
                disabled={loadingStructure}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todas las organizaciones</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <label
                htmlFor="statistics-category-select"
                style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                Categoría:
              </label>
              <select
                id="statistics-category-select"
                aria-label="Filtrar por categoría"
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={loadingStructure || availableCategories.length === 0}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">Todas las categorías</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Contextual: Período (para Estadísticas del Plantel e Informes) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <label
                htmlFor="statistics-period-select"
                style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
              >
                Período:
              </label>
              <select
                id="statistics-period-select"
                aria-label="Seleccionar período de análisis"
                value={period}
                onChange={(e) => handlePeriodChange(parseCategoryDashboardPeriod(e.target.value))}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                {DASHBOARD_PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Contextual: Ejercicio (para Confiabilidad de Récords) */}
            {activeTab === 'statistics' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <label
                  htmlFor="statistics-exercise-select"
                  style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
                >
                  Ejercicio:
                </label>
                <select
                  id="statistics-exercise-select"
                  aria-label="Filtrar por ejercicio"
                  value={selectedExerciseId}
                  onChange={(e) => handleExerciseChange(e.target.value)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    maxWidth: '220px',
                  }}
                >
                  <option value="">Todos los ejercicios</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botón de Actualizar */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loadingStructure || loadingSummary}
            title="Actualizar datos"
            aria-label="Actualizar datos"
            style={{
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Error en carga de estructura */}
        {structureError && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {structureError}
            </span>
          </div>
        )}

        {/* CONTENIDO SEGÚN LA PESTAÑA ACTIVA */}
        {loadingStructure ? (
          <div className="card category-dashboard-state-card" role="status">
            <p className="category-dashboard-state-text">Cargando datos del club…</p>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No hay categorías disponibles"
            description="Creá una organización y categoría para consultar las métricas y reportes del plantel."
          />
        ) : (
          <>
            {/* PESTAÑA PRINCIPAL: ESTADÍSTICAS Y CONFIABILIDAD UNIFICADAS (KAN-650) */}
            {activeTab === 'statistics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Bloque 1: Estadísticas del Plantel */}
                <section aria-labelledby="section-all-team-stats">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <h2
                      id="section-all-team-stats"
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      <BarChart3 size={18} className="text-primary" />
                      <span>Estadísticas del Plantel</span>
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Presentismo, lesiones y carga en {periodLabel}
                    </span>
                  </div>
                  <CategoryMetricsPanel
                    summary={summary}
                    loading={loadingSummary}
                    error={summaryError}
                    onRetry={handleRefresh}
                  />
                </section>

                {/* Bloque 2: Confiabilidad de Récords */}
                <section aria-labelledby="section-all-records-reliability">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                      paddingBottom: '0.5rem',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <h2
                      id="section-all-records-reliability"
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text-main)',
                      }}
                    >
                      <ShieldCheck size={18} className="text-primary" />
                      <span>Confiabilidad de Récords (1RM)</span>
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Auditoría de vigencia y marcas de fuerza
                    </span>
                  </div>
                  {effectiveCategoryId ? (
                    <RecordsReliabilityPanel
                      categoryId={effectiveCategoryId}
                      exerciseId={selectedExerciseId || undefined}
                    />
                  ) : (
                    <EmptyState
                      icon={ShieldCheck}
                      title="Seleccioná una categoría"
                      description="Elegí una categoría en el filtro superior para auditar la confiabilidad de récords de sus atletas."
                    />
                  )}
                </section>
              </div>
            )}

            {/* PESTAÑA 2: INFORMES & EXPORTACIÓN */}
            {activeTab === 'reports' && (
              <ReportsExportPanel
                organizationName={selectedOrgName}
                categoryName={selectedCatName}
                summary={summary}
                periodLabel={periodLabel}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

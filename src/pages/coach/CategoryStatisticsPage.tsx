import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Layers, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { CategoryMetricsPanel } from '../../components/dashboard/CategoryMetricsPanel';
import { categoryDashboardService } from '../../api/categoryDashboard';
import { structureService } from '../../api/structureService';
import type { Category } from '../../types/structure';
import type { CategoryDashboardSummary } from '../../types/categoryDashboard';
import {
  DASHBOARD_PERIOD_OPTIONS,
  getCategoryDashboardRange,
  parseCategoryDashboardPeriod,
  type CategoryDashboardPeriod,
} from '../../utils/categoryDashboardRange';

async function fetchCategories(): Promise<Category[]> {
  const organizations = await structureService.getOrganizations();
  const byOrg = await Promise.all(
    organizations.map((organization) =>
      structureService.getCategories(organization.id).catch(() => [] as Category[]),
    ),
  );
  return byOrg.flat();
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Estadísticas agregadas de una categoría (KAN-504). El resumen se pide al
// microservicio de seguimiento para el PF responsable; nunca trae datos individuales.
export const CategoryStatisticsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(searchParams.get('catId') || '');
  // Ref para saber si el fetch de categorías cambió realmente la selección (el
  // efecto de montaje no debe reactivar "cargando" si el resumen ya llegó).
  const selectedCategoryIdRef = useRef(selectedCategoryId);
  const [period, setPeriod] = useState<CategoryDashboardPeriod>(() =>
    parseCategoryDashboardPeriod(searchParams.get('period')),
  );
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [summary, setSummary] = useState<CategoryDashboardSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(Boolean(searchParams.get('catId')));
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetchCategories()
      .then((allCategories) => {
        if (!mounted) return;
        const currentId = selectedCategoryIdRef.current;
        const nextId = allCategories.some((category) => category.id === currentId)
          ? currentId
          : (allCategories[0]?.id ?? '');
        setCategories(allCategories);
        if (nextId !== currentId) {
          selectedCategoryIdRef.current = nextId;
          setSelectedCategoryId(nextId);
          if (nextId) setLoadingSummary(true);
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setCategoriesError(
          errorMessage(error, 'No se pudieron cargar las categorías.'),
        );
      })
      .finally(() => {
        if (mounted) setLoadingCategories(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;

    let mounted = true;

    categoryDashboardService
      .getByCategory(selectedCategoryId, getCategoryDashboardRange(period))
      .then((data) => {
        if (mounted) setSummary(data);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setSummary(null);
        setSummaryError(errorMessage(error, 'No se pudo cargar el resumen de la categoría.'));
      })
      .finally(() => {
        if (mounted) setLoadingSummary(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedCategoryId, period, reloadKey]);

  const updateSearchParam = (key: string, value: string) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    selectedCategoryIdRef.current = categoryId;
    setSelectedCategoryId(categoryId);
    setSummaryError(null);
    setLoadingSummary(true);
    updateSearchParam('catId', categoryId);
  };

  const handlePeriodChange = (nextPeriod: CategoryDashboardPeriod) => {
    setPeriod(nextPeriod);
    setSummaryError(null);
    setLoadingSummary(true);
    updateSearchParam('period', nextPeriod);
  };

  const handleRefresh = () => {
    setLoadingCategories(true);
    setCategoriesError(null);
    fetchCategories()
      .then((allCategories) => {
        const currentId = selectedCategoryIdRef.current;
        const nextId = allCategories.some((category) => category.id === currentId)
          ? currentId
          : (allCategories[0]?.id ?? '');
        setCategories(allCategories);
        if (nextId !== currentId) {
          selectedCategoryIdRef.current = nextId;
          setSelectedCategoryId(nextId);
        }
      })
      .catch((error: unknown) => {
        setCategoriesError(errorMessage(error, 'No se pudieron cargar las categorías.'));
      })
      .finally(() => {
        setLoadingCategories(false);
      });
    setSummaryError(null);
    setLoadingSummary(true);
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="app-page-container">
      <PageHeader
        title="Estadísticas de categoría"
        description="Presentismo, lesiones y carga de entrenamiento en un solo lugar."
        actions={
          <div className="category-dashboard-toolbar">
            {categories.length > 0 && (
              <select
                className="category-dashboard-select"
                value={selectedCategoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                disabled={loadingCategories}
                aria-label="Seleccionar categoría"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}

            <select
              className="category-dashboard-select"
              value={period}
              onChange={(event) =>
                handlePeriodChange(parseCategoryDashboardPeriod(event.target.value))
              }
              aria-label="Seleccionar período"
            >
              {DASHBOARD_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={loadingCategories}
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Actualizar</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {categoriesError && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {categoriesError}
            </span>
          </div>
        )}

        {loadingCategories ? (
          <div className="card category-dashboard-state-card" role="status">
            <p className="category-dashboard-state-text">Cargando categorías…</p>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No hay categorías disponibles"
            description="Creá una categoría y asociá atletas para ver sus estadísticas."
          />
        ) : (
          <CategoryMetricsPanel
            summary={selectedCategoryId ? summary : null}
            loading={loadingSummary}
            error={summaryError}
            onRetry={handleRefresh}
          />
        )}
      </div>
    </div>
  );
};

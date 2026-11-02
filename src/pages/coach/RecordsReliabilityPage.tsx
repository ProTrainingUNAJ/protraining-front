import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/shell/PageHeader';
import { RecordsReliabilityPanel } from '../../components/records/RecordsReliabilityPanel';
import { structureService } from '../../api/structureService';
import { exercisesService } from '../../api/exercises';
import { Category } from '../../types/structure';
import type { CatalogExercise } from '../../types/trainingPlans';

export function RecordsReliabilityPage() {
  const [searchParams] = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    searchParams.get('catId') || '',
  );
  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar categorías del PF.
  useEffect(() => {
    let mounted = true;

    structureService
      .getOrganizations()
      .catch(() => [])
      .then(async (organizations) => {
        const categoriesByOrg = await Promise.all(
          organizations.map((organization) =>
            structureService.getCategories(organization.id).catch(() => [] as Category[]),
          ),
        );
        if (!mounted) return;
        const allCategories = categoriesByOrg.flat();
        setCategories(allCategories);
        setSelectedCategoryId((current) => current || allCategories[0]?.id || '');
        setLoadingCategories(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorías.');
        setLoadingCategories(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Cargar ejercicios del catálogo para el filtro opcional.
  useEffect(() => {
    let mounted = true;

    exercisesService
      .search('', 1, 500)
      .then((response) => {
        if (!mounted) return;
        setExercises(response.items);
      })
      .catch(() => {
        if (!mounted) return;
        setExercises([]);
      })
      .finally(() => {
        if (mounted) setLoadingExercises(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefreshCategories = async () => {
    setLoadingCategories(true);
    setError(null);
    try {
      const organizations = await structureService.getOrganizations().catch(() => []);
      const categoriesByOrg = await Promise.all(
        organizations.map((organization) =>
          structureService.getCategories(organization.id).catch(() => [] as Category[]),
        ),
      );
      const allCategories = categoriesByOrg.flat();
      setCategories(allCategories);
      if (!allCategories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(allCategories[0]?.id || '');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorías.');
    } finally {
      setLoadingCategories(false);
    }
  };

  return (
    <div className="app-page-container">
      <PageHeader
        title="Confiabilidad de récords"
        description="Resumen por categoría de cuántos atletas tienen récords confiables y a cuáles conviene testear."
        actions={
          <div className="records-reliability-page-toolbar">
            {categories.length > 0 && (
              <select
                className="records-reliability-select"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
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
              className="records-reliability-select"
              value={selectedExerciseId}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              disabled={loadingExercises}
              aria-label="Filtrar por ejercicio"
            >
              <option value="">Todos los ejercicios</option>
              {exercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefreshCategories}
              disabled={loadingCategories}
              title="Actualizar listado"
              aria-label="Actualizar categorías"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Actualizar</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {error && (
          <div className="alert-banner danger records-reliability-alert" role="alert">
            <div className="records-reliability-alert-row">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {loadingCategories ? (
          <div className="card records-reliability-state-card">
            <p className="records-reliability-state-text">Cargando categorías…</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="card records-reliability-state-card">
            <Layers size={44} className="records-reliability-state-icon" aria-hidden="true" />
            <h2 className="records-reliability-state-title">No hay categorías disponibles</h2>
            <p className="records-reliability-state-text">
              Creá una categoría y asociá atletas para ver el resumen de confiabilidad.
            </p>
          </div>
        ) : selectedCategoryId ? (
          <RecordsReliabilityPanel
            categoryId={selectedCategoryId}
            exerciseId={selectedExerciseId || undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

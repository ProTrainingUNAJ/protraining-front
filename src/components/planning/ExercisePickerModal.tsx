import { useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, Search, X } from 'lucide-react';
import { exercisesService } from '../../api/exercises';
import { CatalogExercise, ExercisePage } from '../../types/trainingPlans';

interface ExercisePickerModalProps {
  onClose: () => void;
  onSelect: (exercise: CatalogExercise) => void;
}

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 300;

export function ExercisePickerModal({ onClose, onSelect }: ExercisePickerModalProps) {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ExercisePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Espera a que el PF deje de escribir antes de buscar.
  useEffect(() => {
    const timer = setTimeout(() => {
      const nextSearch = searchText.trim();
      if (nextSearch === search) return;
      setLoading(true);
      setSearch(nextSearch);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText, search]);

  useEffect(() => {
    let active = true;
    exercisesService
      .search(search, page, PAGE_SIZE)
      .then((data) => {
        if (active) {
          setResult(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la biblioteca.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [search, page]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const goToPage = (nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  };

  const items = result?.items ?? [];
  const totalPages = Math.max(result?.totalPages ?? 1, 1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plan-picker-header">
          <h2 id="plan-picker-title">Agregar ejercicio</h2>
          <button type="button" className="plan-icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="plan-picker-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscá por nombre, por ejemplo sentadilla"
            aria-label="Buscar ejercicio"
            autoFocus
          />
        </div>

        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {loading ? (
          <p className="plan-empty plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Buscando ejercicios…
          </p>
        ) : items.length === 0 && !error ? (
          <p className="plan-empty">No encontramos ejercicios con esa búsqueda.</p>
        ) : (
          <ul className="plan-picker-list">
            {items.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  className="plan-picker-item"
                  onClick={() => onSelect(exercise)}
                >
                  <span className="plan-picker-item-info">
                    <strong>{exercise.name}</strong>
                    <span>
                      {[exercise.muscleGroup, exercise.equipment].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <Plus size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="plan-picker-pager">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => goToPage(page - 1)}
            disabled={loading || page <= 1}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Anterior</span>
          </button>
          <span>
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => goToPage(page + 1)}
            disabled={loading || page >= totalPages}
          >
            <span>Siguiente</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

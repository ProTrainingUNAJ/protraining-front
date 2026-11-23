import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Dumbbell,
  Tag,
  Activity,
  Loader2,
  AlertCircle,
  Layers,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ExerciseGifImage } from '../../components/exercises/ExerciseGifImage';
import { ExerciseDetailModal } from '../../components/exercises/ExerciseDetailModal';
import { ExerciseTypeBadge } from '../../components/exercises/ExerciseTypeBadge';
import { listExercises, Exercise, type ExerciseMediaDto } from '../../api/generated/entrenamiento';
import { CHIP_CATEGORIES, GROUP_SUB_MUSCLES } from '../../constants/muscleFilters';

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  exerciseType?: Exercise['exerciseType'] | null;
  videoUrl?: string | null;
  videoSource?: 'Pf' | 'Catalog' | null;
  equipment: string;
  images?: string[];
  // Ilustraciones de terceros en orden de preferencia (KAN-549).
  media?: ExerciseMediaDto[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  // Variantes (KAN-554): la etiqueta si es una variante, y las variantes si es un ejercicio base.
  variantLabel?: string | null;
  variants: ExerciseItem[];
}

const EXERCISE_TYPES = [
  { label: 'Todos los tipos', value: 'Todos' },
  { label: 'Distancia', value: 'Distance' },
  { label: 'Tiempo', value: 'Time' },
  { label: 'Repeticiones', value: 'Reps' },
  { label: 'Con carga', value: 'Weight' },
] as const;

const PAGE_SIZE = 20; // Cantidad de ejercicios por página

interface ExerciseApiResponse extends Omit<Partial<Exercise>, 'id' | 'variants' | 'exerciseType'> {
  id?: string | number;
  name?: string;
  category?: string;
  muscleGroup?: string;
  exerciseType?: Exercise['exerciseType'] | null;
  equipment?: string | null;
  images?: string[];
  photoUrl1?: string | null;
  photoUrl2?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  variantLabel?: string | null;
  variants?: ExerciseApiResponse[] | null;
}

const mapExerciseToItem = (item: ExerciseApiResponse): ExerciseItem => {
  const images =
    item.images && item.images.length > 0
      ? item.images
      : [item.photoUrl1, item.photoUrl2].filter((url): url is string => Boolean(url));

  return {
    id: String(item.id ?? ''),
    name: item.name ?? 'Sin nombre',
    category: item.category || 'General',
    muscleGroup: item.muscleGroup || 'Cuerpo Completo',
    exerciseType: item.exerciseType ?? null,
    videoUrl: item.videoUrl ?? null,
    videoSource:
      ((item as Record<string, unknown>).videoSource as 'Pf' | 'Catalog' | null) ??
      (item.videoUrl ? 'Catalog' : null),
    equipment: item.equipment || 'Sin equipamiento',
    images,
    media: item.media ?? [],
    primaryMuscles:
      item.primaryMuscles && item.primaryMuscles.length > 0 ? item.primaryMuscles : [],
    secondaryMuscles: item.secondaryMuscles ?? [],
    variantLabel: item.variantLabel ?? null,
    variants: (item.variants ?? []).map(mapExerciseToItem),
  };
};

function extractExerciseList(data: unknown): ExerciseApiResponse[] {
  if (Array.isArray(data)) {
    return data as ExerciseApiResponse[];
  }
  if (
    data &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as { items: unknown }).items)
  ) {
    return (data as { items: ExerciseApiResponse[] }).items;
  }
  return [];
}

export const TrainingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
    }
    if (isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypeDropdownOpen]);

  // Cerrar dropdown con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isTypeDropdownOpen) {
        setIsTypeDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTypeDropdownOpen]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [modalExercise, setModalExercise] = useState<ExerciseItem | null>(null);
  // Variante elegida dentro del detalle; null muestra el ejercicio base.
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const openDetail = (exercise: ExerciseItem) => {
    setActiveVariantId(null);
    setModalExercise(exercise);
  };

  const handleExerciseVideoChange = (exerciseId: string, nextVideoUrl: string | null) => {
    const nextSource: 'Pf' | null = nextVideoUrl ? 'Pf' : null;
    const applyUpdate = (item: ExerciseItem): ExerciseItem => ({
      ...item,
      ...(item.id === exerciseId ? { videoUrl: nextVideoUrl, videoSource: nextSource } : {}),
      variants: item.variants.map((variant) =>
        variant.id === exerciseId
          ? { ...variant, videoUrl: nextVideoUrl, videoSource: nextSource }
          : variant,
      ),
    });

    setExercises((prev) => prev.map(applyUpdate));
    setModalExercise((prev) => (prev ? applyUpdate(prev) : null));
  };

  const shownExercise =
    activeVariantId && modalExercise
      ? (modalExercise.variants.find((variant) => variant.id === activeVariantId) ?? modalExercise)
      : modalExercise;

  const currentExerciseForModal = shownExercise
    ? {
        ...shownExercise,
        variants: modalExercise?.variants,
      }
    : null;

  // Carga inicial y filtros por Chip o Buscador directamente al Backend
  useEffect(() => {
    let isMounted = true;

    // Si escribe texto espera 350ms; si tocó un chip, pide al instante (0ms)
    const debounceDelay = searchTerm.trim() ? 350 : 0;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await listExercises({
          throwOnError: true,
          query: {
            page: 1,
            pageSize: PAGE_SIZE,
            search: searchTerm.trim() || undefined,
            muscleGroup: selectedCategory === 'Todos' ? undefined : selectedCategory,
            muscle: selectedMuscle ? selectedMuscle.toLowerCase() : undefined,
            exerciseType:
              selectedType === 'Todos' ? undefined : (selectedType as Exercise['exerciseType']),
            groupVariants: true,
          },
        });

        if (!isMounted) return;

        const rawList = extractExerciseList(response.data);
        const mapped = rawList.map(mapExerciseToItem);

        setExercises(mapped);
        setPage(1);
        setHasMore(rawList.length >= PAGE_SIZE);
        if (response.data && 'totalCount' in response.data) {
          setTotalCount(response.data.totalCount);
          setHasMore(response.data.page < response.data.totalPages);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error al cargar ejercicios del backend:', err);
        setError('No se pudo cargar la biblioteca');
        setExercises([]);
        setHasMore(false);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, debounceDelay);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, selectedCategory, selectedMuscle, selectedType, retryCount]);

  // Función para pedir la siguiente página manteniendo los filtros
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      const response = await listExercises({
        throwOnError: true,
        query: {
          page: nextPage,
          pageSize: PAGE_SIZE,
          search: searchTerm.trim() || undefined,
          muscleGroup: selectedCategory === 'Todos' ? undefined : selectedCategory,
          muscle: selectedMuscle ? selectedMuscle.toLowerCase() : undefined,
          exerciseType:
            selectedType === 'Todos' ? undefined : (selectedType as Exercise['exerciseType']),
          groupVariants: true,
        },
      });

      const rawList = extractExerciseList(response.data);
      if (rawList.length > 0) {
        const mapped = rawList.map(mapExerciseToItem);
        setExercises((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newItems = mapped.filter((e) => !existingIds.has(e.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setHasMore(rawList.length >= PAGE_SIZE);
        if (response.data && 'totalPages' in response.data) {
          setHasMore(nextPage < response.data.totalPages);
        }
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error al cargar más ejercicios:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const selectedTypeObj = EXERCISE_TYPES.find((t) => t.value === selectedType);
  const selectedTypeLabel = selectedTypeObj ? selectedTypeObj.label : 'Todos los tipos';
  const isTypeActive = selectedType !== 'Todos';

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Ejercicios"
        description="Banco de ejercicios, intensidades y metodologías de entrenamiento."
      />

      <div className="app-page-body">
        {/* Rediseño UX/UI de Filtros: Compacto, Moderno y Equilibrado (KAN-640) */}
        <div className="card training-filters-card">
          {/* Fila 1: Búsqueda y Filtros Generales */}
          <div className="training-filters-row training-filters-row-primary">
            {/* Buscador Prominente */}
            <div className="training-search-wrap">
              <Search size={16} className="training-search-icon" aria-hidden="true" />
              <input
                type="text"
                placeholder="Buscar por ejercicio o grupo muscular..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="training-search-input"
                aria-label="Buscar por ejercicio o grupo muscular"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="training-clear-search-btn"
                  onClick={() => setSearchTerm('')}
                  title="Borrar búsqueda"
                  aria-label="Borrar búsqueda"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Selector de Modalidad Compacto */}
            <div className="training-type-select-wrap" ref={typeDropdownRef}>
              <button
                type="button"
                className={`training-type-trigger-btn ${isTypeActive ? 'active' : ''}`}
                onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isTypeDropdownOpen}
                title="Filtrar por modalidad de ejercicio"
                data-testid="training-type-trigger"
              >
                <Layers size={14} aria-hidden="true" />
                <span className="training-type-trigger-text">
                  {isTypeActive ? selectedTypeLabel : 'Modalidad'}
                </span>
                <ChevronDown
                  size={14}
                  className={`training-type-chevron ${isTypeDropdownOpen ? 'open' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* Dropdown accesible de modalidades */}
              <div
                className={`training-type-dropdown ${isTypeDropdownOpen ? 'open' : ''}`}
                role="group"
                aria-label="Filtro por modalidad de ejercicio"
              >
                {EXERCISE_TYPES.map((t) => {
                  const isSelected = selectedType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="button"
                      aria-pressed={isSelected}
                      className={`training-type-option ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedType(t.value);
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      <span className="training-type-option-dot" />
                      <span className="training-type-option-label">{t.label}</span>
                      {isSelected && (
                        <Check
                          size={14}
                          className="training-type-option-check"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fila 2: Grupo Muscular (Chips compactos en azul institucional ProTraining) */}
          <div className="training-filters-row training-groups-row">
            <div
              className="training-chips-scroll"
              role="group"
              aria-label="Filtro por grupo muscular"
            >
              {CHIP_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="button"
                    aria-pressed={isSelected}
                    className={`training-group-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedMuscle(null);
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fila 3: Músculos Específicos (Depende exclusivamente de la categoría seleccionada, excluyendo vacíos KAN-633) */}
          {selectedCategory !== 'Todos' && Boolean(GROUP_SUB_MUSCLES[selectedCategory]?.length) && (
            <div className="training-filters-row training-submuscles-row">
              <div className="training-submuscles-indicator">
                <span className="training-submuscles-prefix">Músculos:</span>
              </div>
              <div
                className="training-subchips-scroll"
                role="group"
                aria-label="Filtro por músculo puntual"
              >
                {GROUP_SUB_MUSCLES[selectedCategory].map((subMuscle) => {
                  const isSelected = selectedMuscle === subMuscle;
                  return (
                    <button
                      key={subMuscle}
                      type="button"
                      role="button"
                      aria-pressed={isSelected}
                      className={`training-submuscle-chip ${isSelected ? 'active' : ''}`}
                      onClick={() =>
                        setSelectedMuscle((prev) => (prev === subMuscle ? null : subMuscle))
                      }
                    >
                      {subMuscle}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Indicador de carga si está conectando al backend */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              padding: '0.5rem',
            }}
          >
            <Loader2 size={18} className="spin" />
            <span style={{ fontSize: '0.85rem' }}>Actualizando catálogo desde el servidor...</span>
          </div>
        )}

        {/* Estado de Error si el backend falla */}
        {error && !isLoading ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '3.5rem',
              margin: 0,
            }}
          >
            <AlertCircle size={44} style={{ margin: '0 auto 1rem', color: 'var(--danger)' }} />
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                margin: '0 0 0.5rem',
                color: 'var(--text-main)',
              }}
            >
              {error}
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Ocurrió un inconveniente al conectar con el servidor. Revisá tu conexión o probá
              nuevamente.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setRetryCount((prev) => prev + 1)}
              style={{ minHeight: '40px', padding: '0.5rem 1.5rem' }}
            >
              Reintentar
            </button>
          </div>
        ) : !isLoading && exercises.length === 0 ? (
          /* Estado vacío si no hay coincidencias */
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '3.5rem',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            <Dumbbell size={44} style={{ margin: '0 auto 1rem', opacity: 0.35 }} />
            <h3
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                margin: '0 0 0.5rem',
                color: 'var(--text-main)',
              }}
            >
              {selectedMuscle
                ? 'No hay ejercicios para ese músculo'
                : 'No se encontraron ejercicios'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {selectedMuscle
                ? 'Prueba seleccionando otro músculo o limpiando el filtro.'
                : 'Prueba modificando el término de búsqueda o seleccionando otra categoría.'}
            </p>
          </div>
        ) : (
          /* Lista de tarjetas y botón Cargar más */
          <>
            {/* Contador de ejercicios encontrados */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0 0.25rem',
                marginBottom: '-0.25rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
              }}
            >
              <span>
                Mostrando {exercises.length} de {totalCount} ejercicios
              </span>
            </div>
            <div className="training-exercises-grid">
              {exercises.map((ex) => (
                <div key={ex.id} className="card training-exercise-card">
                  <div>
                    {/* Clic en la foto abre el modal ampliado de detalle (KAN-625) */}
                    <div
                      className="exercise-card-media-clickable"
                      onClick={() => openDetail(ex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetail(ex);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver técnica y anatomía de ${ex.name}`}
                    >
                      <ExerciseGifImage
                        images={ex.images}
                        media={ex.media}
                        name={ex.name}
                        showCredit={false}
                      />
                    </div>

                    <div className="exercise-card-header-meta">
                      <div className="exercise-badges-group">
                        <span className="badge badge-info">
                          <Tag size={12} /> {ex.category}
                        </span>
                        <ExerciseTypeBadge type={ex.exerciseType} />
                      </div>
                      {ex.variants.length > 0 && (
                        <span
                          className="badge badge-primary"
                          title={ex.variants.map((v) => v.variantLabel).join(' · ')}
                        >
                          <Layers size={12} /> {ex.variants.length}{' '}
                          {ex.variants.length === 1 ? 'variante' : 'variantes'}
                        </span>
                      )}
                    </div>

                    {/* Clic en el nombre abre el modal ampliado de detalle (KAN-625) */}
                    <h3
                      className="exercise-card-title-clickable"
                      onClick={() => openDetail(ex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetail(ex);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      title={`Ver técnica y anatomía de ${ex.name}`}
                    >
                      {ex.name}
                    </h3>
                    <p className="exercise-card-muscle-group">Grupo: {ex.muscleGroup}</p>
                  </div>

                  <div className="exercise-card-footer">
                    <div className="exercise-card-equipment-wrap">
                      <Activity size={14} />
                      <span className="exercise-card-equipment">{ex.equipment}</span>
                    </div>
                    {/* Clic en anatomía abre el modal ampliado de detalle (KAN-625) */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openDetail(ex)}
                      title="Ver mapa anatómico y detalles"
                    >
                      Anatomía
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Cargar Más Ejercicios */}
            {hasMore && exercises.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '2rem', paddingBottom: '1rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  style={{
                    minHeight: '44px',
                    padding: '0.65rem 2rem',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  {isLoadingMore ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Loader2 size={16} className="spin" />
                      Cargando más ejercicios...
                    </span>
                  ) : (
                    <span>Cargar más ejercicios</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal ampliado de detalle del ejercicio con técnica animada, silueta anatómica y pautas (KAN-625) */}
        <ExerciseDetailModal
          isOpen={Boolean(modalExercise)}
          onClose={() => setModalExercise(null)}
          exercise={currentExerciseForModal}
          activeVariantId={activeVariantId}
          onSelectVariant={(variantId) => setActiveVariantId(variantId)}
          allowVideoEdit
          onVideoChange={handleExerciseVideoChange}
        />
      </div>
    </div>
  );
};

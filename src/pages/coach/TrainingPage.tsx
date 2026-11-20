import React, { useState, useEffect } from 'react';
import { Search, Dumbbell, Tag, Activity, Loader2, AlertCircle, Layers } from 'lucide-react';
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

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Ejercicios"
        description="Banco de ejercicios, intensidades y metodologías de entrenamiento."
      />

      <div className="app-page-body">
        {/* Filtros y Buscador */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Buscador */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Buscar por ejercicio o grupo muscular..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                margin: 0,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Chips Táctiles PWA - Tipo de ejercicio / Modalidad (KAN-453) */}
          <div
            className="exercise-chips-scroll"
            role="group"
            aria-label="Filtro por modalidad de ejercicio"
          >
            {EXERCISE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={selectedType === t.value}
                className={`touch-chip ${selectedType === t.value ? 'active' : ''}`}
                onClick={() => setSelectedType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Chips Táctiles PWA - Grupos principales */}
          <div
            className="exercise-chips-scroll"
            role="group"
            aria-label="Filtro por grupo muscular"
          >
            {CHIP_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                className={`touch-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedMuscle(null);
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Chips Táctiles PWA - Músculos puntuales según grupo seleccionado */}
          {selectedCategory !== 'Todos' && Boolean(GROUP_SUB_MUSCLES[selectedCategory]?.length) && (
            <div
              className="exercise-subchips-scroll"
              role="group"
              aria-label="Filtro por músculo puntual"
            >
              {GROUP_SUB_MUSCLES[selectedCategory].map((subMuscle) => (
                <button
                  key={subMuscle}
                  type="button"
                  aria-pressed={selectedMuscle === subMuscle}
                  className={`touch-subchip ${selectedMuscle === subMuscle ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedMuscle((prev) => (prev === subMuscle ? null : subMuscle))
                  }
                >
                  {subMuscle}
                </button>
              ))}
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="card"
                  style={{
                    margin: 0,
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
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
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        margin: '0 0 0.4rem',
                        color: 'var(--text-main)',
                        lineHeight: 1.3,
                      }}
                    >
                      {ex.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                      Grupo: {ex.muscleGroup}
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Activity size={14} />
                      <span>{ex.equipment}</span>
                    </div>
                    {/* Clic en anatomía abre el modal ampliado de detalle (KAN-625) */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openDetail(ex)}
                      style={{
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        minHeight: '28px',
                        borderRadius: 'var(--radius)',
                      }}
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
        />
      </div>
    </div>
  );
};

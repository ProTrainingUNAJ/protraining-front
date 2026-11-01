import React, { useState, useEffect } from 'react';
import { Search, Dumbbell, Tag, Activity, Loader2, X, AlertCircle, Layers } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ExerciseGifImage } from '../../components/exercises/ExerciseGifImage';
import { ExerciseMuscleMap } from '../../components/exercises/ExerciseMuscleMap';
import { getMuscleSpanishName } from '../../utils/exerciseMuscleMapper';
import { listExercises, Exercise } from '../../api/generated/entrenamiento';
import { CHIP_CATEGORIES, GROUP_SUB_MUSCLES } from '../../constants/muscleFilters';

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  images?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  // Variantes (KAN-554): la etiqueta si es una variante, y las variantes si es un ejercicio base.
  variantLabel?: string | null;
  variants: ExerciseItem[];
}

const PAGE_SIZE = 20; // Cantidad de ejercicios por página

interface ExerciseApiResponse extends Omit<Partial<Exercise>, 'id' | 'variants'> {
  id?: string | number;
  name?: string;
  category?: string;
  muscleGroup?: string;
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
    equipment: item.equipment || 'Sin equipamiento',
    images,
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
    modalExercise?.variants.find((variant) => variant.id === activeVariantId) ?? modalExercise;

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
  }, [searchTerm, selectedCategory, selectedMuscle, retryCount]);

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

          {/* Chips Táctiles PWA - Grupos principales */}
          <div
            className="exercise-chips-scroll"
            role="tablist"
            aria-label="Filtro por grupo muscular"
          >
            {CHIP_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
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
          {selectedCategory !== 'Todos' && GROUP_SUB_MUSCLES[selectedCategory] && (
            <div
              className="exercise-subchips-scroll"
              role="tablist"
              aria-label="Filtro por músculo puntual"
            >
              {GROUP_SUB_MUSCLES[selectedCategory].map((subMuscle) => (
                <button
                  key={subMuscle}
                  type="button"
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
              Ocurrió un inconveniente al conectar con el servidor. Verifica tu conexión o intenta
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
                    <ExerciseGifImage images={ex.images} name={ex.name} />

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.65rem',
                      }}
                    >
                      <span
                        className="badge badge-info"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Tag size={12} /> {ex.category}
                      </span>
                      {ex.variants.length > 0 && (
                        <span
                          className="badge badge-primary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title={ex.variants.map((variant) => variant.variantLabel).join(' · ')}
                        >
                          <Layers size={12} /> {ex.variants.length}{' '}
                          {ex.variants.length === 1 ? 'variante' : 'variantes'}
                        </span>
                      )}
                    </div>

                    <h3
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

        {/* Modal de Detalle Anatómico del Ejercicio (KAN-320) */}
        {modalExercise && shownExercise && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--routine-modal-overlay)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
            onClick={() => setModalExercise(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`Detalle anatómico de ${modalExercise.name}`}
          >
            <div
              className="card"
              style={{
                margin: 0,
                padding: '1.5rem',
                maxWidth: '650px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="badge badge-info">{modalExercise.category}</span>
                  </div>
                  <h2
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-main)',
                    }}
                  >
                    {modalExercise.name}
                  </h2>
                  {shownExercise.variantLabel && (
                    <p
                      style={{
                        margin: '0.25rem 0 0',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      Variante: {shownExercise.variantLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setModalExercise(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem',
                  }}
                  aria-label="Cerrar ventana"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Variantes del ejercicio (KAN-554): cada una conserva su id, sus fotos y sus músculos */}
              {modalExercise.variants.length > 0 && (
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Variantes:
                  </strong>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`touch-chip ${activeVariantId === null ? 'active' : ''}`}
                      onClick={() => setActiveVariantId(null)}
                      aria-pressed={activeVariantId === null}
                    >
                      Principal
                    </button>
                    {modalExercise.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        className={`touch-chip ${activeVariantId === variant.id ? 'active' : ''}`}
                        onClick={() => setActiveVariantId(variant.id)}
                        aria-pressed={activeVariantId === variant.id}
                        title={variant.name}
                      >
                        {variant.variantLabel ?? variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Animación GIF si está disponible */}
              {shownExercise.images && shownExercise.images.length > 0 && (
                <div
                  style={{
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    maxHeight: '220px',
                  }}
                >
                  <ExerciseGifImage images={shownExercise.images} name={shownExercise.name} />
                </div>
              )}

              {/* Información de músculos y mapa anatómico KAN-320 */}
              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Músculos Involucrados:
                </strong>

                {/* Descriptive chips for primary and secondary muscles */}
                {((shownExercise.primaryMuscles && shownExercise.primaryMuscles.length > 0) ||
                  (shownExercise.secondaryMuscles &&
                    shownExercise.secondaryMuscles.length > 0)) && (
                  <div className="exercise-muscle-chips">
                    {shownExercise.primaryMuscles?.map((m, idx) => (
                      <span key={`pri-${idx}`} className="badge badge-primary exercise-muscle-chip">
                        {getMuscleSpanishName(m)} (Principal)
                      </span>
                    ))}
                    {shownExercise.secondaryMuscles?.map((m, idx) => (
                      <span key={`sec-${idx}`} className="badge badge-info exercise-muscle-chip">
                        {getMuscleSpanishName(m)} (Secundario)
                      </span>
                    ))}
                  </div>
                )}

                {/* Empty state message when no muscles are defined (Criterion 2) */}
                {(!shownExercise.primaryMuscles || shownExercise.primaryMuscles.length === 0) &&
                  (!shownExercise.secondaryMuscles ||
                    shownExercise.secondaryMuscles.length === 0) && (
                    <p
                      style={{
                        margin: '0.5rem 0',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      Este ejercicio no tiene grupos musculares específicos cargados (movilidad o
                      ejercicio general).
                    </p>
                  )}

                {/* Mapa muscular anatómico con dos intensidades y Smart View */}
                <ExerciseMuscleMap
                  primaryMuscles={shownExercise.primaryMuscles}
                  secondaryMuscles={shownExercise.secondaryMuscles}
                  showLegend={true}
                  showViewToggle={true}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalExercise(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

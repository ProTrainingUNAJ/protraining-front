import React, { useState, useEffect } from 'react';
import { Plus, Search, Dumbbell, Tag, Activity, Loader2 } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ExerciseGifImage } from '../../components/exercises/ExerciseGifImage';
import { listExercises, Exercise } from '../../api/generated/entrenamiento';

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  intensityLevel: 'Alta' | 'Media' | 'Baja';
  images?: string[];
}

const PAGE_SIZE = 20; // Cantidad de ejercicios por página

const CHIP_CATEGORIES = ['Todos', 'Piernas', 'Pecho', 'Espalda', 'Hombros', 'Brazos', 'Core'];

const INITIAL_EXERCISES: ExerciseItem[] = [
  {
    id: 'ex-1',
    name: 'Sentadilla Trasera con Barra (Back Squat)',
    category: 'Fuerza Máxima',
    muscleGroup: 'Piernas',
    equipment: 'Barra olímpica y discos',
    intensityLevel: 'Alta',
    images: ['Barbell_Squat/0.jpg', 'Barbell_Squat/1.jpg'],
  },
  {
    id: 'ex-2',
    name: 'Peso Muerto Rumano (RDL)',
    category: 'Fuerza',
    muscleGroup: 'Piernas',
    equipment: 'Barra olímpica',
    intensityLevel: 'Alta',
    images: ['Romanian_Deadlift/0.jpg', 'Romanian_Deadlift/1.jpg'],
  },
  {
    id: 'ex-3',
    name: 'Press Banca Plano',
    category: 'Fuerza Tren Superior',
    muscleGroup: 'Pecho',
    equipment: 'Banco plano y barra',
    intensityLevel: 'Media',
    images: ['Barbell_Bench_Press_-_Medium_Grip/0.jpg', 'Barbell_Bench_Press_-_Medium_Grip/1.jpg'],
  },
  {
    id: 'ex-4',
    name: 'Saltos Pliométricos a Cajón (Box Jumps)',
    category: 'Potencia',
    muscleGroup: 'Piernas',
    equipment: 'Cajón pliométrico 60cm',
    intensityLevel: 'Alta',
    images: [], // <-- Sin fotos para probar el criterio
  },
  {
    id: 'ex-5',
    name: 'Pase de Aceleración con Trineo',
    category: 'Velocidad / Aceleración',
    muscleGroup: 'Piernas',
    equipment: 'Trineo de arrastre con carga',
    intensityLevel: 'Alta',
    images: [],
  },
  {
    id: 'ex-6',
    name: 'Plank con Desestabilización',
    category: 'Core y Estabilidad',
    muscleGroup: 'Core',
    equipment: 'Fitball o colchoneta',
    intensityLevel: 'Baja',
    images: [],
  },
];

interface ExerciseApiResponse extends Omit<Partial<Exercise>, 'id'> {
  id?: string | number;
  name?: string;
  category?: string;
  muscleGroup?: string;
  equipment?: string | null;
  images?: string[];
  photoUrl1?: string | null;
  photoUrl2?: string | null;
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
    intensityLevel: 'Media',
    images,
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
  const [exercises, setExercises] = useState<ExerciseItem[]>(INITIAL_EXERCISES);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Llamada al backend para traer los ejercicios reales de exercises.json
  useEffect(() => {
    let isMounted = true;

    async function fetchExercises() {
      setIsLoading(true);
      try {
        const response = await listExercises({
          query: { page: 1, pageSize: PAGE_SIZE },
        });

        if (!isMounted) return;

        const rawList = extractExerciseList(response.data);

        if (rawList.length > 0) {
          const mapped: ExerciseItem[] = rawList.map(mapExerciseToItem);
          setExercises(mapped);
          setPage(1);
          setHasMore(rawList.length === PAGE_SIZE);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.warn('No se pudo conectar al backend de ejercicios. Usando catálogo inicial.', err);
        setHasMore(false); // Si falló el backend, no mostramos "cargar más"
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchExercises();

    return () => {
      isMounted = false;
    };
  }, []);

  // Función para cargar la siguiente página (Página 2, 3, etc.)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const response = await listExercises({
        query: { page: nextPage, pageSize: PAGE_SIZE },
      });
      const rawList = extractExerciseList(response.data);
      if (rawList.length > 0) {
        const mapped: ExerciseItem[] = rawList.map(mapExerciseToItem);
        // Sumar los nuevos sin duplicar IDs
        setExercises((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const newItems = mapped.filter((e) => !existingIds.has(e.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        setHasMore(rawList.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn('Error al cargar más ejercicios:', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Búsqueda en el backend con debounce (350ms) y tolerancia a errores ortográficos (pg_trgm)
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await listExercises({
          query: {
            search: searchTerm.trim() || undefined,
            page: 1,
            pageSize: PAGE_SIZE,
          },
        });

        const rawList = extractExerciseList(response.data);

        if (rawList.length > 0) {
          const mapped: ExerciseItem[] = rawList.map(mapExerciseToItem);
          setExercises(mapped);
          setPage(1);
          setHasMore(rawList.length >= PAGE_SIZE);
        } else if (searchTerm.trim()) {
          // Si buscó algo que no tuvo ninguna coincidencia ni con tolerancia
          setExercises([]);
          setHasMore(false);
        }
      } catch (err) {
        console.warn('Error en búsqueda del backend:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350); // Espera 350ms a que el usuario termine de escribir

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredExercises = exercises.filter((ex) => {
    const matchesCat =
      selectedCategory === 'Todos' ||
      ex.muscleGroup.toLowerCase() === selectedCategory.toLowerCase();

    // Si esta el backend apagado, usa includes
    if (exercises === INITIAL_EXERCISES) {
      const matchesSearch =
        !searchTerm.trim() ||
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch && (matchesCat || exercises !== INITIAL_EXERCISES);
    }

    return matchesCat;
  });

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Ejercicios"
        description="Banco de ejercicios, intensidades y metodologías de entrenamiento."
        actions={
          <button type="button" className="btn btn-primary" title="Registrar nuevo ejercicio">
            <Plus size={16} aria-hidden="true" />
            <span>Nuevo Ejercicio</span>
          </button>
        }
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

          {/* Chips Táctiles PWA */}
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
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
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

        {/* Catálogo de Ejercicios */}
        {filteredExercises.length === 0 ? (
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
              No se encontraron ejercicios
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Prueba modificando el término de búsqueda o cambiando la categoría.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {filteredExercises.map((ex) => (
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
                    {/* Animación GIF de las 2 fotos */}
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
                      <span className="badge badge-primary">Intensidad {ex.intensityLevel}</span>
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
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <Activity size={14} />
                    <span>Equipo: {ex.equipment}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Botón Cargar Más Ejercicios */}
            {hasMore && filteredExercises.length > 0 && (
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
      </div>
    </div>
  );
};

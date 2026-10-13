import React, { useState } from 'react';
import { Plus, Search, Dumbbell, Tag, Activity } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';

interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  equipment: string;
  intensityLevel: 'Alta' | 'Media' | 'Baja';
}

const INITIAL_EXERCISES: ExerciseItem[] = [
  {
    id: 'ex-1',
    name: 'Sentadilla Trasera con Barra (Back Squat)',
    category: 'Fuerza Máxima',
    muscleGroup: 'Cuádriceps / Glúteos',
    equipment: 'Barra olímpica y discos',
    intensityLevel: 'Alta',
  },
  {
    id: 'ex-2',
    name: 'Peso Muerto Rumano (RDL)',
    category: 'Fuerza',
    muscleGroup: 'Isquiosurales / Cadena posterior',
    equipment: 'Barra olímpica',
    intensityLevel: 'Alta',
  },
  {
    id: 'ex-3',
    name: 'Press Banca Plano',
    category: 'Fuerza Tren Superior',
    muscleGroup: 'Pectoral / Tríceps',
    equipment: 'Banco plano y barra',
    intensityLevel: 'Media',
  },
  {
    id: 'ex-4',
    name: 'Saltos Pliométricos a Cajón (Box Jumps)',
    category: 'Potencia',
    muscleGroup: 'Tren inferior',
    equipment: 'Cajón pliométrico 60cm',
    intensityLevel: 'Alta',
  },
  {
    id: 'ex-5',
    name: 'Pase de Aceleración con Trineo',
    category: 'Velocidad / Aceleración',
    muscleGroup: 'Potencia de zancada',
    equipment: 'Trineo de arrastre con carga',
    intensityLevel: 'Alta',
  },
  {
    id: 'ex-6',
    name: 'Plank con Desestabilización',
    category: 'Core y Estabilidad',
    muscleGroup: 'Zona media / Lumbar',
    equipment: 'Fitball o colchoneta',
    intensityLevel: 'Baja',
  },
];

export const TrainingPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [exercises] = useState<ExerciseItem[]>(INITIAL_EXERCISES);

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'Todas' || ex.category.includes(selectedCategory);
    return matchesSearch && matchesCat;
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
            flexWrap: 'wrap',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
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

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: 'auto',
                minWidth: '180px',
                margin: 0,
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: 600,
              }}
              aria-label="Filtrar por categoría de ejercicio"
            >
              <option value="Todas">Todas las categorías</option>
              <option value="Fuerza">Fuerza</option>
              <option value="Potencia">Potencia</option>
              <option value="Velocidad">Velocidad</option>
              <option value="Core">Core</option>
            </select>
          </div>
        </div>

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
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Dumbbell, Clock, Flame, CheckCircle, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';

interface WorkoutBlock {
  id: string;
  name: string;
  exercises: {
    name: string;
    sets: string;
    reps: string;
    rest: string;
    notes?: string;
  }[];
}

const TODAY_ROUTINE: WorkoutBlock[] = [
  {
    id: 'b-1',
    name: 'Bloque A — Activación y Movilidad Articular',
    exercises: [
      { name: 'Cat-Cow y Movilidad Torácica', sets: '2', reps: '10 repeticiones', rest: '30 seg' },
      { name: 'Rotaciones de Cadera 90/90', sets: '2', reps: '8 por lado', rest: '30 seg' },
      { name: 'Puente Glúteo Unilateral', sets: '2', reps: '10 por lado', rest: '45 seg' },
    ],
  },
  {
    id: 'b-2',
    name: 'Bloque B — Trabajo Principal de Fuerza',
    exercises: [
      { name: 'Back Squat (Sentadilla Trasera)', sets: '4', reps: '6 repeticiones @ RPE 8', rest: '120 seg', notes: 'Descenso controlado en 3 segundos' },
      { name: 'Press Militar con Mancuernas', sets: '3', reps: '8 repeticiones', rest: '90 seg' },
      { name: 'Peso Muerto Rumano Unilateral', sets: '3', reps: '8 por pierna', rest: '90 seg' },
    ],
  },
  {
    id: 'b-3',
    name: 'Bloque C — Core y Prevención de Lesiones',
    exercises: [
      { name: 'Pallof Press con Banda', sets: '3', reps: '12 por lado', rest: '45 seg' },
      { name: 'Plancha Lateral con Elevación de Pierna', sets: '3', reps: '30 seg por lado', rest: '45 seg' },
    ],
  },
];

export const RoutinePage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<'hoy' | 'manana' | 'viernes'>('hoy');
  const [completed, setCompleted] = useState(false);

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Mi Rutina"
        description="Ejercicios y sesiones programadas para hoy y los próximos días."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn ${selectedDay === 'hoy' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay('hoy')}
            >
              Hoy (Martes)
            </button>
            <button
              type="button"
              className={`btn ${selectedDay === 'manana' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay('manana')}
            >
              Miércoles
            </button>
            <button
              type="button"
              className={`btn ${selectedDay === 'viernes' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay('viernes')}
            >
              Viernes
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {/* Resumen de la Sesión */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="badge badge-info">Fuerza & Potencia</span>
              <span className="badge badge-warning">Microciclo 42</span>
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.25rem', color: 'var(--text-main)' }}>
              Sesión 2: Fuerza Máxima y Estabilidad
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
              Preparador asignado: Julián Pérez — Club Atlético Quilmes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Clock size={16} />
              <span>65 min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Flame size={16} />
              <span>RPE 7-8</span>
            </div>
            <button
              type="button"
              className={`btn ${completed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => setCompleted(!completed)}
              style={{ gap: '0.45rem' }}
            >
              {completed ? (
                <>
                  <CheckCircle size={16} />
                  <span>Completada</span>
                </>
              ) : (
                <>
                  <span>Marcar Completada</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bloques de la Rutina */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {TODAY_ROUTINE.map((block) => (
            <div key={block.id} className="card" style={{ margin: 0, padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  paddingBottom: '0.85rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <Dumbbell size={18} style={{ color: 'var(--secondary)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                  {block.name}
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {block.exercises.map((exercise, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'var(--bg-subtle)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}>
                        {exercise.name}
                      </strong>
                      {exercise.notes && (
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          Nota: {exercise.notes}
                        </small>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {exercise.sets} series × {exercise.reps}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Descanso: {exercise.rest}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

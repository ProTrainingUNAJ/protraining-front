import React, { useState } from 'react';
import { Plus, Filter, ChevronLeft, ChevronRight, Clock, Dumbbell } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';

interface PlannedSession {
  id: string;
  day: string;
  date: string;
  title: string;
  intensity: 'Alta' | 'Media' | 'Baja' | 'Recuperación';
  duration: string;
  category: string;
}

const INITIAL_SESSIONS: PlannedSession[] = [
  {
    id: 's-1',
    day: 'Lunes',
    date: '13 Oct',
    title: 'Fuerza Máxima y Potencia',
    intensity: 'Alta',
    duration: '75 min',
    category: 'Primera División',
  },
  {
    id: 's-2',
    day: 'Martes',
    date: '14 Oct',
    title: 'Resistencia Aeróbica y Táctico',
    intensity: 'Media',
    duration: '90 min',
    category: 'Primera División',
  },
  {
    id: 's-3',
    day: 'Miércoles',
    date: '15 Oct',
    title: 'Recuperación Activa y Movilidad',
    intensity: 'Recuperación',
    duration: '45 min',
    category: 'Todas las divisiones',
  },
  {
    id: 's-4',
    day: 'Jueves',
    date: '16 Oct',
    title: 'Velocidad y Cambios de Dirección',
    intensity: 'Alta',
    duration: '60 min',
    category: 'Primera División',
  },
  {
    id: 's-5',
    day: 'Viernes',
    date: '17 Oct',
    title: 'Activación Pre-Competitiva',
    intensity: 'Baja',
    duration: '50 min',
    category: 'Primera División',
  },
];

export const PlanningPage: React.FC = () => {
  const [selectedCycle, setSelectedCycle] = useState('Microciclo 42 - Competitivo');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sessions] = useState<PlannedSession[]>(INITIAL_SESSIONS);

  const getIntensityBadgeClass = (intensity: PlannedSession['intensity']) => {
    switch (intensity) {
      case 'Alta':
      case 'Media':
      case 'Baja':
        return 'badge badge-primary';
      case 'Recuperación':
        return 'badge badge-success';
      default:
        return 'badge';
    }
  };

  const filteredSessions = sessions.filter(
    (s) =>
      selectedCategory === 'Todas' ||
      s.category === selectedCategory ||
      s.category === 'Todas las divisiones',
  );

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Planificación"
        description="Planificación de microciclos, sesiones y calendario de entrenamiento deportivo."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" title="Filtrar planificación">
              <Filter size={16} aria-hidden="true" />
              <span>Filtros</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              title="Crear nueva sesión o microciclo"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Nueva Sesión</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {/* Controles de Navegación de Microciclo */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                className="coach-icon-btn"
                style={{ width: '36px', height: '36px' }}
                aria-label="Microciclo anterior"
                onClick={() => setSelectedCycle('Microciclo 41 - Carga General')}
              >
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                {selectedCycle}
              </span>
              <button
                type="button"
                className="coach-icon-btn"
                style={{ width: '36px', height: '36px' }}
                aria-label="Microciclo siguiente"
                onClick={() => setSelectedCycle('Microciclo 43 - Competitivo')}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              13 de Octubre – 19 de Octubre
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label
              htmlFor="plan-cat-select"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}
            >
              División:
            </label>
            <select
              id="plan-cat-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <option value="Todas">Todas las divisiones</option>
              <option value="Primera División">Primera División</option>
              <option value="Reserva">Reserva</option>
              <option value="Sub-20">Sub-20</option>
            </select>
          </div>
        </div>

        {/* Cronograma Semanal de Sesiones */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredSessions.map((session) => (
            <div
              key={session.id}
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
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--secondary)' }}>
                    {session.day} {session.date}
                  </span>
                  <span className={getIntensityBadgeClass(session.intensity)}>
                    {session.intensity}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: '0 0 0.5rem',
                    color: 'var(--text-main)',
                    lineHeight: 1.3,
                  }}
                >
                  {session.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  {session.category}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} />
                  {session.duration}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Dumbbell size={14} />4 bloques
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

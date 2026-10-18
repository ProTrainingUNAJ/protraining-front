import React, { useState, useMemo } from 'react';
import { Activity, Search, Users } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { AthleteTrafficLightCard } from '../../components/monitoring/AthleteTrafficLightCard';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import {
  AthleteTrafficLightItem,
  TrafficLightStatus,
} from '../../components/monitoring/trafficLight.types';

const INITIAL_TRAFFIC_LIGHT_DATA: AthleteTrafficLightItem[] = [
  {
    id: 'ath-1',
    name: 'Santiago Gómez',
    position: 'Defensor Central',
    category: 'Primera División',
    status: 'red',
    statusLabel: 'Atención Crítica',
    recommendation: 'Kinesiología y reposo activo. No realizar sprints ni giros bruscos.',
    sleepHours: 5.0,
    sleepQuality: 'Mala',
    rpe: 9,
    submittedAt: '08:15 hs',
    notes: 'Amanecí con la rodilla izquierda muy hinchada tras el choque del viernes.',
    pains: [
      { zone: 'Rodilla izquierda (Menisco/Tendón)', level: 5 },
      { zone: 'Zona Lumbar', level: 3 },
    ],
  },
  {
    id: 'ath-2',
    name: 'Joaquín Silva',
    position: 'Extremo Derecho',
    category: 'Primera División',
    status: 'red',
    statusLabel: 'Atención Crítica',
    recommendation: 'Entrenamiento diferenciado de tren superior sin impacto ni aceleraciones.',
    sleepHours: 5.5,
    sleepQuality: 'Regular',
    rpe: 8.5,
    submittedAt: '08:30 hs',
    notes: 'Sentí un pinchazo agudo en el isquiotibial derecho al frenar en el último ejercicio.',
    pains: [{ zone: 'Isquiotibial derecho', level: 4 }],
  },
  {
    id: 'ath-3',
    name: 'Martín Benítez',
    position: 'Mediocampista Central',
    category: 'Primera División',
    status: 'yellow',
    statusLabel: 'Precaución',
    recommendation: 'Reducir volumen de saltos pliométricos y sprints de más de 30 metros.',
    sleepHours: 6.0,
    sleepQuality: 'Regular',
    rpe: 7.5,
    submittedAt: '09:05 hs',
    notes: 'Sobrecarga en los gemelos después del doble turno del jueves.',
    pains: [{ zone: 'Gemelo izquierdo', level: 3 }],
  },
  {
    id: 'ath-4',
    name: 'Facundo Rossi',
    position: 'Delantero Centro',
    category: 'Primera División',
    status: 'yellow',
    statusLabel: 'Precaución',
    recommendation: 'Calentamiento miofascial extendido y control en frenadas intensas.',
    sleepHours: 6.5,
    sleepQuality: 'Buena',
    rpe: 7.0,
    submittedAt: '08:45 hs',
    notes: 'Leve molestia lumbar al hacer bisagra de cadera.',
    pains: [{ zone: 'Erectores lumbares', level: 2 }],
  },
  {
    id: 'ath-5',
    name: 'Tomás Morales',
    position: 'Lateral Izquierdo',
    category: 'Primera División',
    status: 'yellow',
    statusLabel: 'Precaución',
    recommendation: 'Monitorear respuesta en los primeros 20 min de práctica.',
    sleepHours: 6.0,
    sleepQuality: 'Regular',
    rpe: 6.5,
    submittedAt: '09:12 hs',
    pains: [{ zone: 'Cuádriceps derecho', level: 2 }],
  },
  {
    id: 'ath-6',
    name: 'Nicolás Castro',
    position: 'Volante Ofensivo',
    category: 'Primera División',
    status: 'yellow',
    statusLabel: 'Precaución',
    recommendation: 'Evitar ejercicios de pateo con pierna inhábil.',
    sleepHours: 7.0,
    sleepQuality: 'Buena',
    rpe: 6.0,
    submittedAt: '09:20 hs',
    pains: [{ zone: 'Aductor izquierdo', level: 2 }],
  },
  {
    id: 'ath-7',
    name: 'Lucas Fernández',
    position: 'Mediocampista',
    category: 'Primera División',
    status: 'green',
    statusLabel: 'Óptimo',
    recommendation: 'Apto para completar el 100% de la carga planificada del día.',
    sleepHours: 8.0,
    sleepQuality: 'Muy Buena',
    rpe: 6.0,
    submittedAt: '08:10 hs',
    notes: 'Me siento con energía y recuperado del partido.',
    pains: [],
  },
  {
    id: 'ath-8',
    name: 'Agustín Díaz',
    position: 'Defensor Lateral',
    category: 'Primera División',
    status: 'green',
    statusLabel: 'Óptimo',
    recommendation: 'Apto sesión completa.',
    sleepHours: 8.0,
    sleepQuality: 'Muy Buena',
    rpe: 5.5,
    submittedAt: '08:25 hs',
    pains: [],
  },
  {
    id: 'ath-9',
    name: 'Gonzalo Ríos',
    position: 'Arquero',
    category: 'Primera División',
    status: 'green',
    statusLabel: 'Óptimo',
    recommendation: 'Apto para trabajos específicos de arco y potencia.',
    sleepHours: 8.5,
    sleepQuality: 'Excelente',
    rpe: 5.0,
    submittedAt: '07:55 hs',
    pains: [],
  },
  {
    id: 'ath-10',
    name: 'Mateo Romero',
    position: 'Defensor Central',
    category: 'Primera División',
    status: 'green',
    statusLabel: 'Óptimo',
    recommendation: 'Apto sesión completa.',
    sleepHours: 7.5,
    sleepQuality: 'Buena',
    rpe: 6.0,
    submittedAt: '08:40 hs',
    pains: [],
  },
  {
    id: 'ath-11',
    name: 'Franco Benítez',
    position: 'Volante Mixto',
    category: 'Primera División',
    status: 'green',
    statusLabel: 'Óptimo',
    recommendation: 'Apto sesión completa.',
    sleepHours: 7.5,
    sleepQuality: 'Buena',
    rpe: 5.0,
    submittedAt: '08:50 hs',
    pains: [],
  },
  {
    id: 'ath-12',
    name: 'Julián Cardozo',
    position: 'Extremo Izquierdo',
    category: 'Primera División',
    status: 'green',
    statusLabel: 'Óptimo',
    recommendation: 'Apto sesión completa.',
    sleepHours: 8.0,
    sleepQuality: 'Muy Buena',
    rpe: 6.0,
    submittedAt: '09:00 hs',
    pains: [],
  },
  {
    id: 'ath-13',
    name: 'Alan Paredes',
    position: 'Mediocampista',
    category: 'Primera División',
    status: 'gray',
    statusLabel: 'Sin Check-in',
    recommendation: 'Recordar completar el check-in antes de ingresar al vestuario.',
  },
  {
    id: 'ath-14',
    name: 'Enzo Giménez',
    position: 'Delantero',
    category: 'Primera División',
    status: 'gray',
    statusLabel: 'Sin Check-in',
    recommendation: 'Recordar completar el check-in antes de ingresar al vestuario.',
  },
];

type FilterColor = 'all' | TrafficLightStatus;

export const MonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'traffic-light' | 'attendance'>('traffic-light');
  const [selectedDivision, setSelectedDivision] = useState('Primera División');
  const [colorFilter, setColorFilter] = useState<FilterColor>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [athletes, setAthletes] = useState<AthleteTrafficLightItem[]>(INITIAL_TRAFFIC_LIGHT_DATA);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteTrafficLightItem | null>(null);

  // Counters for Segmented Color Chips (KAN-366)
  const counts = useMemo(() => {
    return {
      all: athletes.length,
      red: athletes.filter((a) => a.status === 'red').length,
      yellow: athletes.filter((a) => a.status === 'yellow').length,
      green: athletes.filter((a) => a.status === 'green').length,
      gray: athletes.filter((a) => a.status === 'gray').length,
    };
  }, [athletes]);

  // Reactive real-time filtering
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      // Color status filter
      if (colorFilter !== 'all' && a.status !== colorFilter) return false;

      // Text query filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          a.name.toLowerCase().includes(query) ||
          a.position.toLowerCase().includes(query) ||
          (a.notes && a.notes.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [athletes, colorFilter, searchTerm]);

  // Assign differentiated training regimen directly from quick sheet
  const handleAssignDifferentiated = (athleteId: string) => {
    setAthletes((prev) =>
      prev.map((a) =>
        a.id === athleteId
          ? {
              ...a,
              status: 'yellow',
              statusLabel: 'Diferenciado',
              recommendation: 'Asignado a plan de rehabilitación y descarga muscular.',
            }
          : a,
      ),
    );
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Principal */}
      <PageHeader
        title="Seguimiento & Semáforo del Día"
        description="Evaluación de readiness antes de la práctica, niveles de riesgo muscular y asistencia del plantel."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'traffic-light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('traffic-light')}
              style={{
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Activity size={15} />
              <span>Semáforo del Día</span>
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('attendance')}
              style={{
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Users size={15} />
              <span>Asistencia & RPE</span>
            </button>
          </div>
        }
      />

      <div
        className="app-page-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Category and Search Bar */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
          }}
        >
          {/* Division / Category Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <label
              htmlFor="category-select"
              style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
            >
              Plantel:
            </label>
            <select
              id="category-select"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              <option value="Primera División">Primera División</option>
              <option value="Reserva">Reserva</option>
              <option value="Sub-20">Sub-20</option>
            </select>
          </div>

          {/* Athlete Search Input */}
          <div
            style={{
              position: 'relative',
              maxWidth: '320px',
              width: '100%',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar atleta por nombre o posición..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
              }}
            />
          </div>
        </div>

        {activeTab === 'traffic-light' ? (
          <>
            {/* Segmented Color Filter Chips (KAN-366 Criterion 3) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.25rem',
              }}
              role="tablist"
              aria-label="Filtro de atletas por color del semáforo"
            >
              {/* All */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'all' ? 'active' : ''}`}
                onClick={() => setColorFilter('all')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  border: '1px solid var(--border)',
                  background: colorFilter === 'all' ? 'var(--primary)' : 'var(--bg-card)',
                  color: colorFilter === 'all' ? 'var(--on-primary)' : 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <span>Todos</span>
                <span
                  style={{
                    background:
                      colorFilter === 'all' ? 'rgba(255,255,255,0.2)' : 'var(--bg-subtle)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {counts.all}
                </span>
              </button>

              {/* Red - Critical Attention */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'red' ? 'active' : ''}`}
                onClick={() => setColorFilter('red')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid var(--border)',
                  background: colorFilter === 'red' ? 'var(--pain-level-5)' : 'var(--bg-card)',
                  color: colorFilter === 'red' ? '#ffffff' : 'var(--pain-level-5)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'red' ? '#ffffff' : 'var(--pain-level-5)',
                  }}
                />
                <span>Atención Crítica</span>
                <span
                  style={{
                    background:
                      colorFilter === 'red' ? 'rgba(0,0,0,0.2)' : 'var(--pain-level-5-bg)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {counts.red}
                </span>
              </button>

              {/* Yellow - Caution */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'yellow' ? 'active' : ''}`}
                onClick={() => setColorFilter('yellow')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid var(--border)',
                  background: colorFilter === 'yellow' ? 'var(--warning-text)' : 'var(--bg-card)',
                  color: colorFilter === 'yellow' ? '#ffffff' : 'var(--warning-text)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'yellow' ? '#ffffff' : 'var(--warning-text)',
                  }}
                />
                <span>Precaución</span>
                <span
                  style={{
                    background: colorFilter === 'yellow' ? 'rgba(0,0,0,0.2)' : 'var(--warning-bg)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {counts.yellow}
                </span>
              </button>

              {/* Green - Optimal */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'green' ? 'active' : ''}`}
                onClick={() => setColorFilter('green')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid var(--border)',
                  background: colorFilter === 'green' ? 'var(--stat-green)' : 'var(--bg-card)',
                  color: colorFilter === 'green' ? '#ffffff' : 'var(--stat-green)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'green' ? '#ffffff' : 'var(--stat-green)',
                  }}
                />
                <span>Óptimos</span>
                <span
                  style={{
                    background:
                      colorFilter === 'green' ? 'rgba(0,0,0,0.2)' : 'var(--stat-green-bg)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {counts.green}
                </span>
              </button>

              {/* Gray - Pending Check-in */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'gray' ? 'active' : ''}`}
                onClick={() => setColorFilter('gray')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: '1px solid var(--border)',
                  background: colorFilter === 'gray' ? 'var(--text-muted)' : 'var(--bg-card)',
                  color: colorFilter === 'gray' ? '#ffffff' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'gray' ? '#ffffff' : 'var(--text-muted)',
                  }}
                />
                <span>Sin Check-in</span>
                <span
                  style={{
                    background: colorFilter === 'gray' ? 'rgba(0,0,0,0.2)' : 'var(--bg-subtle)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {counts.gray}
                </span>
              </button>
            </div>

            {/* Athlete Traffic Light Grid (KAN-366) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '0.85rem',
              }}
            >
              {filteredAthletes.map((athlete) => (
                <AthleteTrafficLightCard
                  key={athlete.id}
                  athlete={athlete}
                  onClick={() => setSelectedAthlete(athlete)}
                />
              ))}

              {filteredAthletes.length === 0 && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px dashed var(--border)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    No se encontraron atletas con los filtros seleccionados.
                  </p>
                </div>
              )}
            </div>

            {/* Accessible Quick Sheet (Bottom Sheet on Mobile, Modal on Desktop) */}
            <AthleteQuickSheet
              athlete={selectedAthlete}
              onClose={() => setSelectedAthlete(null)}
              onAssignDifferentiated={handleAssignDifferentiated}
            />
          </>
        ) : (
          /* Traditional attendance tab */
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
            }}
          >
            <Users size={32} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>
              Planilla de Asistencia Diaria
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              El registro de asistencia se sincroniza automáticamente con el Semáforo del Día.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

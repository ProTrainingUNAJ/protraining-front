import React, { useState } from 'react';
import { Activity, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';

interface AthleteTracking {
  id: string;
  name: string;
  status: 'Presente' | 'Ausente' | 'Diferenciado';
  rpeLoad: number; // Escala Borg 1-10
  minutes: number;
  notes: string;
}

const INITIAL_TRACKING: AthleteTracking[] = [
  {
    id: 't-1',
    name: 'Lucas Fernández',
    status: 'Presente',
    rpeLoad: 8,
    minutes: 75,
    notes: 'Completó sesión completa',
  },
  {
    id: 't-2',
    name: 'Martín Benítez',
    status: 'Presente',
    rpeLoad: 7,
    minutes: 75,
    notes: 'Buena respuesta neuromuscular',
  },
  {
    id: 't-3',
    name: 'Joaquín Silva',
    status: 'Diferenciado',
    rpeLoad: 4,
    minutes: 40,
    notes: 'Molestia en isquiotibial derecho',
  },
  {
    id: 't-4',
    name: 'Santiago Gómez',
    status: 'Ausente',
    rpeLoad: 0,
    minutes: 0,
    notes: 'Aviso por examen universitario',
  },
  {
    id: 't-5',
    name: 'Facundo Rossi',
    status: 'Presente',
    rpeLoad: 9,
    minutes: 75,
    notes: 'Carga máxima completada',
  },
];

export const MonitoringPage: React.FC = () => {
  const [selectedDivision, setSelectedDivision] = useState('Primera División');
  const [date] = useState('13 de Octubre de 2026');
  const [records] = useState<AthleteTracking[]>(INITIAL_TRACKING);

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Seguimiento"
        description="Monitoreo de asistencia, cargas de entrenamiento y respuestas físicas."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            title="Registrar asistencia del plantel"
          >
            <Plus size={16} aria-hidden="true" />
            <span>Registrar Asistencia</span>
          </button>
        }
      />

      <div className="app-page-body">
        {/* Controles de División y Fecha */}
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
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              Fecha: {date}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label
              htmlFor="mon-div-select"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}
            >
              División:
            </label>
            <select
              id="mon-div-select"
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
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
              <option value="Primera División">Primera División</option>
              <option value="Reserva">Reserva</option>
              <option value="Sub-20">Sub-20</option>
            </select>
          </div>
        </div>

        {/* Resumen de Asistencia */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.35rem',
                color: 'var(--success-text)',
              }}
            >
              <CheckCircle2 size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Presentes</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>3 / 5</strong>
            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              60% del plantel
            </small>
          </div>

          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.35rem',
                color: 'var(--secondary)',
              }}
            >
              <Activity size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Carga Promedio (RPE)</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>7.0 / 10</strong>
            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Intensidad alta
            </small>
          </div>

          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.35rem',
                color: 'var(--warning-text)',
              }}
            >
              <AlertTriangle size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Diferenciados</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>1</strong>
            <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              En recuperación física
            </small>
          </div>
        </div>

        {/* Listado de Seguimiento Diario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {records.map((rec) => (
            <div
              key={rec.id}
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
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-main)',
                    }}
                  >
                    {rec.name}
                  </h3>
                  <span
                    className={
                      rec.status === 'Presente'
                        ? 'badge badge-success'
                        : rec.status === 'Diferenciado'
                          ? 'badge badge-warning'
                          : 'badge badge-danger'
                    }
                  >
                    {rec.status}
                  </span>
                </div>
                <p
                  style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.35rem 0 0' }}
                >
                  {rec.notes}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}
                  >
                    RPE Percibido
                  </span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--secondary)' }}>
                    {rec.rpeLoad > 0 ? `${rec.rpeLoad}/10` : '—'}
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}
                  >
                    Tiempo
                  </span>
                  <strong
                    style={{
                      fontSize: '1.1rem',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Clock size={14} /> {rec.minutes > 0 ? `${rec.minutes}m` : '0m'}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

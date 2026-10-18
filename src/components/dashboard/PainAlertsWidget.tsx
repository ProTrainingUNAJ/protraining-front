import React from 'react';
import { AlertTriangle, NotebookPen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  RED_TRAFFIC_LIGHT_ATHLETES,
  YELLOW_TRAFFIC_LIGHT_ATHLETES,
} from '../monitoring/trafficLightData';

const MedicalCrossIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = '#ffffff',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
  </svg>
);

export const PainAlertsWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();

  const redAthletes = RED_TRAFFIC_LIGHT_ATHLETES;
  const yellowAthletes = YELLOW_TRAFFIC_LIGHT_ATHLETES;
  const totalCount = redAthletes.length + yellowAthletes.length;

  const handleOpenMonitoring = (filter?: 'red' | 'yellow') => {
    navigate('/pf/monitoring', { state: { filter } });
  };

  const handleModifyRoutine = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/pf/planning');
  };

  return (
    <div
      className={`pain-alerts-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1.15rem',
      }}
    >
      {/* Encabezado del Widget */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
          paddingRight: '4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <AlertTriangle size={14} style={{ color: 'var(--pain-level-5)' }} />
          Alertas de Dolor
        </span>
        <span
          className="badge"
          style={{
            background: 'var(--pain-level-5-bg)',
            color: 'var(--pain-level-5)',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
          }}
        >
          {totalCount} Atletas
        </span>
      </div>

      {/* Contenedor de los 2 Stickies (Rojo y Amarillo con movimiento independiente) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.85rem',
          flex: 1,
          alignItems: 'stretch',
        }}
      >
        {/* 1. Sticky ROJO · Molestia Crítica (Movimiento Propio) */}
        <div
          onClick={() => handleOpenMonitoring('red')}
          role="button"
          tabIndex={0}
          title="Ver atletas con Molestia Crítica en el semáforo"
          className="pain-sticky-item pain-sticky-red"
          style={{
            background: '#dc2626',
            borderRadius: '14px',
            padding: '0.85rem 0.95rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)',
            minHeight: '185px',
          }}
        >
          <div>
            {/* Cruz médica blanca superior */}
            <div style={{ marginBottom: '0.45rem' }}>
              <MedicalCrossIcon size={24} color="#ffffff" />
            </div>

            {/* Título en negrita oscura */}
            <h4
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#111827',
                margin: '0 0 0.55rem',
                letterSpacing: '-0.01em',
              }}
            >
              Molestia Crítica
            </h4>

            {/* Lista de nombres reales del semáforo rojo */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.98rem',
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.25,
              }}
            >
              {redAthletes.map((athlete) => (
                <span key={athlete.id}>{athlete.name}</span>
              ))}
            </div>
          </div>

          {/* Línea divisoria y logo de apunte para modificar la rutina */}
          <div
            style={{
              borderTop: '1px solid rgba(0, 0, 0, 0.18)',
              marginTop: '0.65rem',
              paddingTop: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={handleModifyRoutine}
              className="sticky-routine-btn"
              title="Modificar rutina del atleta"
              aria-label="Modificar rutina"
            >
              <NotebookPen size={15} />
              <span>Modificar rutina</span>
            </button>
          </div>
        </div>

        {/* 2. Sticky AMARILLO · Precaución (Movimiento Propio) */}
        <div
          onClick={() => handleOpenMonitoring('yellow')}
          role="button"
          tabIndex={0}
          title="Ver atletas con Precaución en el semáforo"
          className="pain-sticky-item pain-sticky-yellow"
          style={{
            background: '#facc15',
            borderRadius: '14px',
            padding: '0.85rem 0.95rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 14px rgba(250, 204, 21, 0.28)',
            minHeight: '185px',
          }}
        >
          <div>
            {/* Triángulo de advertencia blanco superior */}
            <div style={{ marginBottom: '0.45rem' }}>
              <AlertTriangle size={24} color="#ffffff" fill="#ffffff" />
            </div>

            {/* Título en negrita oscura */}
            <h4
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                color: '#111827',
                margin: '0 0 0.5rem',
                letterSpacing: '-0.01em',
              }}
            >
              Precaución
            </h4>

            {/* Lista de nombres reales del semáforo amarillo */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                fontSize: '0.9rem',
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.25,
              }}
            >
              {yellowAthletes.map((athlete) => (
                <span key={athlete.id}>{athlete.name}</span>
              ))}
            </div>
          </div>

          {/* Línea divisoria y logo de apunte para modificar la rutina */}
          <div
            style={{
              borderTop: '1px solid rgba(0, 0, 0, 0.18)',
              marginTop: '0.65rem',
              paddingTop: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={handleModifyRoutine}
              className="sticky-routine-btn"
              title="Modificar rutina del atleta"
              aria-label="Modificar rutina"
            >
              <NotebookPen size={15} />
              <span>Modificar rutina</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

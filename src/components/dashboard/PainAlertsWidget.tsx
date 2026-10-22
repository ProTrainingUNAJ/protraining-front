import React, { useMemo } from 'react';
import { AlertTriangle, NotebookPen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AthleteTrafficLightItem } from '../monitoring/trafficLight.types';

/**
 * Alertas de dolor del dashboard (KAN-365/KAN-366): sin datos ficticios;
 * recibe los atletas reales del semáforo del día y filtra rojos/amarillos.
 * Colores de los stickies y textos vía tokens de `tokens.css`
 * (--traffic-red/yellow, --pain-sticky-*, --sticky-btn-text, --border, --white),
 * con soporte claro/oscuro; cero literales rgba/hex (KAN-366).
 */

const MedicalCrossIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 22,
  color = 'var(--white)',
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ color }}>
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
  </svg>
);

interface PainAlertsWidgetProps {
  /** Atletas del semáforo del día (todas las categorías); se filtran rojos y amarillos. */
  athletes?: AthleteTrafficLightItem[];
  className?: string;
}

export const PainAlertsWidget: React.FC<PainAlertsWidgetProps> = ({
  athletes = [],
  className = '',
}) => {
  const navigate = useNavigate();

  const redAthletes = useMemo(
    () => athletes.filter((athlete) => athlete.status === 'red'),
    [athletes],
  );
  const yellowAthletes = useMemo(
    () => athletes.filter((athlete) => athlete.status === 'yellow'),
    [athletes],
  );
  const totalCount = redAthletes.length + yellowAthletes.length;

  const handleOpenMonitoring = (filter: 'red' | 'yellow') => {
    navigate(`/pf/monitoring?filter=${filter}`, { state: { filter } });
  };

  const handleModifyRoutine = (e: React.MouseEvent, filter: 'red' | 'yellow') => {
    e.stopPropagation();
    navigate(`/pf/monitoring?filter=${filter}`, { state: { filter } });
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
        className="pain-alerts-stickies-grid"
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
            background: 'var(--traffic-red)',
            borderRadius: '14px',
            padding: '0.85rem 0.95rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--pain-sticky-red-shadow)',
            minHeight: '185px',
          }}
        >
          <div>
            {/* Cruz médica blanca superior */}
            <div style={{ marginBottom: '0.45rem' }}>
              <MedicalCrossIcon size={24} />
            </div>

            {/* Título en negrita oscura */}
            <h4
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                color: 'var(--sticky-btn-text)',
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
                color: 'var(--sticky-btn-text)',
                lineHeight: 1.25,
              }}
            >
              {redAthletes.length > 0 ? (
                redAthletes.map((athlete) => <span key={athlete.id}>{athlete.name}</span>)
              ) : (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.75 }}>
                  Sin alertas críticas hoy
                </span>
              )}
            </div>
          </div>

          {/* Línea divisoria y logo de apunte para modificar la rutina */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              marginTop: '0.65rem',
              paddingTop: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={(e) => handleModifyRoutine(e, 'red')}
              className="sticky-routine-btn"
              title="Modificar rutina de atletas con Atención Crítica"
              aria-label="Modificar rutina con Atención Crítica"
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
            background: 'var(--traffic-yellow)',
            borderRadius: '14px',
            padding: '0.85rem 0.95rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--pain-sticky-yellow-shadow)',
            minHeight: '185px',
          }}
        >
          <div>
            {/* Triángulo de advertencia blanco superior */}
            <div style={{ marginBottom: '0.45rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--white)', fill: 'var(--white)' }} />
            </div>

            {/* Título en negrita oscura */}
            <h4
              style={{
                fontSize: '1.05rem',
                fontWeight: 900,
                color: 'var(--sticky-btn-text)',
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
                color: 'var(--sticky-btn-text)',
                lineHeight: 1.25,
              }}
            >
              {yellowAthletes.length > 0 ? (
                yellowAthletes.map((athlete) => <span key={athlete.id}>{athlete.name}</span>)
              ) : (
                <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.75 }}>
                  Sin precauciones hoy
                </span>
              )}
            </div>
          </div>

          {/* Línea divisoria y logo de apunte para modificar la rutina */}
          <div
            style={{
              borderTop: '1px solid var(--border)',
              marginTop: '0.65rem',
              paddingTop: '0.45rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={(e) => handleModifyRoutine(e, 'yellow')}
              className="sticky-routine-btn"
              title="Modificar rutina de atletas con Precaución"
              aria-label="Modificar rutina con Precaución"
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

import React from 'react';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  const handleOpenMonitoring = () => {
    navigate('/pf/monitoring');
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
          4 Atletas
        </span>
      </div>

      {/* Contenedor de los 2 Stickies (Rojo y Amarillo) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem',
          flex: 1,
          alignItems: 'stretch',
        }}
      >
        {/* 1. Sticky ROJO · Molestia Crítica */}
        <div
          onClick={handleOpenMonitoring}
          role="button"
          tabIndex={0}
          title="Ver atletas con Molestia Crítica en el monitoreo"
          style={{
            background: '#dc2626',
            borderRadius: '14px',
            padding: '0.85rem 0.95rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.28)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            minHeight: '175px',
          }}
        >
          <div>
            {/* Cruz médica blanca superior */}
            <div style={{ marginBottom: '0.5rem' }}>
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

            {/* Lista de nombres */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.25,
              }}
            >
              <span>Julián Antunes</span>
              <span>Damaris Morán</span>
            </div>
          </div>

          {/* Línea divisoria e icono de chat */}
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
            <MessageSquare size={17} color="rgba(0, 0, 0, 0.3)" fill="rgba(0, 0, 0, 0.3)" />
          </div>
        </div>

        {/* 2. Sticky AMARILLO · Precaución */}
        <div
          onClick={handleOpenMonitoring}
          role="button"
          tabIndex={0}
          title="Ver atletas con Precaución en el monitoreo"
          style={{
            background: '#facc15',
            borderRadius: '14px',
            padding: '0.85rem 0.95rem 0.65rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(250, 204, 21, 0.28)',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            minHeight: '175px',
          }}
        >
          <div>
            {/* Triángulo de advertencia blanco superior */}
            <div style={{ marginBottom: '0.5rem' }}>
              <AlertTriangle size={24} color="#ffffff" fill="#ffffff" />
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
              Precaución
            </h4>

            {/* Lista de nombres */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.25,
              }}
            >
              <span>Valentina Ruiz</span>
              <span>Mateo Silva</span>
            </div>
          </div>

          {/* Línea divisoria e icono de chat */}
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
            <MessageSquare size={17} color="rgba(0, 0, 0, 0.3)" fill="rgba(0, 0, 0, 0.3)" />
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';

interface TrafficLightSummaryProps {
  redCount?: number;
  yellowCount?: number;
  greenCount?: number;
  grayCount?: number;
  className?: string;
}

export const TrafficLightSummaryWidget: React.FC<TrafficLightSummaryProps> = ({
  redCount = 2,
  yellowCount = 4,
  greenCount = 16,
  grayCount = 2,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`traffic-light-summary-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1.15rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem',
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
          <Activity size={14} style={{ color: 'var(--primary)' }} />
          Semáforo del Día
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
          }}
        >
          Plantel Primera
        </span>
      </div>

      {/* Grid de contadores del semáforo KAN-366 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.4rem',
          textAlign: 'center',
          margin: '0.35rem 0 0.85rem',
        }}
      >
        {/* Rojo */}
        <div
          style={{
            background: 'var(--pain-level-5-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.55rem 0.25rem',
          }}
        >
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: 'var(--pain-level-5)',
              lineHeight: 1,
            }}
          >
            {redCount}
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--pain-level-5)' }}>
            Riesgo
          </span>
        </div>

        {/* Amarillo */}
        <div
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.55rem 0.25rem',
          }}
        >
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: 'var(--warning-text)',
              lineHeight: 1,
            }}
          >
            {yellowCount}
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--warning-text)' }}>
            Alerta
          </span>
        </div>

        {/* Verde */}
        <div
          style={{
            background: 'var(--stat-green-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.55rem 0.25rem',
          }}
        >
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: 'var(--stat-green)',
              lineHeight: 1,
            }}
          >
            {greenCount}
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--stat-green)' }}>
            Aptos
          </span>
        </div>

        {/* Gris / Sin responder */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.55rem 0.25rem',
          }}
        >
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: 'var(--text-muted)',
              lineHeight: 1,
            }}
          >
            {grayCount}
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Sin dato
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/pf/monitoring')}
        className="btn btn-secondary"
        style={{
          width: '100%',
          padding: '0.45rem 0.75rem',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          borderRadius: '9999px',
        }}
      >
        <span>Ver Semáforo Detallado</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

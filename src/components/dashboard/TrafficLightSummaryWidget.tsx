import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight } from 'lucide-react';
import { TrafficLightCounts } from '../../api/seguimientoService';

interface TrafficLightSummaryProps {
  /** Conteos reales del semáforo del día (KAN-365); en 0 mientras carga. */
  counts?: TrafficLightCounts;
  loading?: boolean;
  /** Texto del encabezado derecho (plantel/resumen representado). */
  subtitle?: string;
  className?: string;
}

interface DonutMetricProps {
  percentage: number;
  count: number;
  total: number;
  color: string;
  label: string;
  onClick?: () => void;
}

const DonutMetric: React.FC<DonutMetricProps> = ({
  percentage,
  count,
  total,
  color,
  label,
  onClick,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const radius = 42;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius; // ~263.89
  const arcLength = (percentage / 100) * circumference;
  const strokeDashoffset = circumference - arcLength;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className="donut-metric-item"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.45rem',
        cursor: onClick ? 'pointer' : 'default',
        flex: 1,
        minWidth: 0,
        outline: 'none',
        transform: isHovered ? 'scale(1.14)' : 'scale(1)',
        transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), filter 0.22s ease',
        filter: isHovered ? 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.16))' : 'none',
        zIndex: isHovered ? 5 : 1,
      }}
      title={`${label}: ${count} de ${total} (${percentage}%)`}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '86px',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{
            width: '100%',
            height: '100%',
            transform: 'rotate(-90deg)',
          }}
        >
          {/* Track de fondo gris circular */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Arco de progreso de color del semáforo */}
          {percentage > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
              style={{
                transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          )}
        </svg>

        {/* Tipografía central: porcentaje perfectamente centrado */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              lineHeight: 1,
              color: 'var(--text-main)',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const TrafficLightSummaryWidget: React.FC<TrafficLightSummaryProps> = ({
  counts,
  loading = false,
  subtitle = 'Todos los planteles',
  className = '',
}) => {
  const navigate = useNavigate();

  const redCount = counts?.red ?? 0;
  const yellowCount = counts?.yellow ?? 0;
  const greenCount = counts?.green ?? 0;
  const grayCount = counts?.gray ?? 0;

  const total = counts?.all ?? redCount + yellowCount + greenCount + grayCount;
  const redPct = total > 0 ? Math.round((redCount / total) * 100) : 0;
  const yellowPct = total > 0 ? Math.round((yellowCount / total) * 100) : 0;
  const greenPct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
  const grayPct = total > 0 ? Math.round((grayCount / total) * 100) : 0;

  const handleNavigate = () => {
    navigate('/pf/monitoring');
  };

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
          {loading ? 'Cargando…' : subtitle}
        </span>
      </div>

      {/* Grid de 4 donas radiales del semáforo KAN-366 según referencia del usuario */}
      <div
        className="traffic-light-summary-donuts"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          margin: '0.35rem 0 0.85rem',
        }}
      >
        {loading ? (
          <p
            style={{
              margin: '0 auto',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            Consultando el semáforo del día…
          </p>
        ) : (
          <>
            {/* 1. Rojo - Atención Crítica */}
            <DonutMetric
              percentage={redPct}
              count={redCount}
              total={total}
              color="var(--traffic-red)"
              label="Atención Crítica"
              onClick={() => navigate('/pf/monitoring?filter=red', { state: { filter: 'red' } })}
            />

            {/* 2. Amarillo - Precaución */}
            <DonutMetric
              percentage={yellowPct}
              count={yellowCount}
              total={total}
              color="var(--traffic-yellow)"
              label="Precaución"
              onClick={() =>
                navigate('/pf/monitoring?filter=yellow', { state: { filter: 'yellow' } })
              }
            />

            {/* 3. Verde - Óptimos */}
            <DonutMetric
              percentage={greenPct}
              count={greenCount}
              total={total}
              color="var(--traffic-green)"
              label="Óptimos"
              onClick={() =>
                navigate('/pf/monitoring?filter=green', { state: { filter: 'green' } })
              }
            />

            {/* 4. Gris - Sin Check-in */}
            <DonutMetric
              percentage={grayPct}
              count={grayCount}
              total={total}
              color="var(--traffic-gray)"
              label="Sin Check-in"
              onClick={() => navigate('/pf/monitoring?filter=gray', { state: { filter: 'gray' } })}
            />
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleNavigate}
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

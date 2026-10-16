import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Dumbbell, Zap, Activity, Award, Pin, X } from 'lucide-react';
import { EVOLUTION_METRICS, MetricDefinition } from './progressMetricsData';

export interface EvolutionChartWidgetProps {
  metricKey: 'cmj' | 'squat' | 'sprint' | 'rpe' | 'yoyo';
  variant?: 'full' | 'compact';
  colSpan?: number;
  onRemove?: () => void;
  onExportClick?: () => void;
  isExported?: boolean;
}

const getMetricIcon = (key: string, size = 16) => {
  switch (key) {
    case 'cmj':
      return <TrendingUp size={size} strokeWidth={2.5} />;
    case 'squat':
      return <Dumbbell size={size} strokeWidth={2.5} />;
    case 'sprint':
      return <Zap size={size} strokeWidth={2.5} />;
    case 'rpe':
      return <Activity size={size} strokeWidth={2.5} />;
    case 'yoyo':
      return <Award size={size} strokeWidth={2.5} />;
    default:
      return <TrendingUp size={size} strokeWidth={2.5} />;
  }
};

export const EvolutionChartWidget: React.FC<EvolutionChartWidgetProps> = ({
  metricKey,
  variant = 'compact',
  colSpan = 1,
  onRemove,
  onExportClick,
  isExported = false,
}) => {
  const metric: MetricDefinition = EVOLUTION_METRICS[metricKey] || EVOLUTION_METRICS.cmj;
  const isCompact = variant === 'compact' && colSpan === 1;

  // Compact dashboard card render (colSpan: 1)
  if (isCompact) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          width: '100%',
          padding: '0.85rem 1rem',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera del Widget Compacto */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: `${metric.color}18`,
                color: metric.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getMetricIcon(metric.key, 15)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.1,
                }}
              >
                {metric.shortName}
              </span>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                }}
              >
                Evolución
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: metric.color,
                background: `${metric.color}15`,
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
                letterSpacing: '0.02em',
              }}
            >
              {metric.deltaPercent}
            </span>

            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.65,
                }}
                title="Quitar gráfico de esta burbuja"
                aria-label="Quitar gráfico"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Valor actual destacado */}
        <div style={{ margin: '0.35rem 0 0.15rem', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
            <strong
              style={{
                fontSize: '1.45rem',
                fontWeight: 900,
                color: 'var(--text-main)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {metric.currentValue}
            </strong>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
              }}
            >
              {metric.unit}
            </span>
          </div>
        </div>

        {/* Mini Sparkline Chart interactivo que llena el fondo inferior */}
        <div
          style={{
            height: '56px',
            width: '100%',
            marginTop: 'auto',
            marginLeft: '-6px',
            marginRight: '-6px',
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metric.data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${metric.gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={metric.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={metric.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as { date: string; value: number };
                    return (
                      <div
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                        }}
                      >
                        <span>
                          {data.date}: {data.value} {metric.unit}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={metric.color}
                strokeWidth={2.4}
                fill={`url(#spark-${metric.gradientId})`}
                dot={{ r: 2.5, fill: metric.color, stroke: 'var(--bg-card)', strokeWidth: 1.5 }}
                activeDot={{ r: 4.5, fill: metric.color, stroke: 'var(--bg-card)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Extended / full card render (on ProgressPage or wide card colSpan >= 2)
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        gap: '0.85rem',
      }}
    >
      {/* Cabecera completa */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: `${metric.color}18`,
              color: metric.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {getMetricIcon(metric.key, 20)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                {metric.name}
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-subtle)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                {metric.category}
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {metric.description}
            </p>
          </div>
        </div>

        {/* Acciones: Botón de exportar a Inicio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.25rem',
              background: 'var(--bg-subtle)',
              padding: '0.35rem 0.75rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Actual:
            </span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 900 }}>
              {metric.currentValue}
            </strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {metric.unit}
            </span>
            <span
              style={{
                marginLeft: '0.35rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: metric.color,
              }}
            >
              ({metric.deltaPercent})
            </span>
          </div>

          {onExportClick && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onExportClick}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                padding: '0.45rem 0.85rem',
                borderColor: isExported ? 'var(--stat-green)' : 'var(--border)',
                color: isExported ? 'var(--stat-green)' : 'var(--text-main)',
                background: isExported ? 'var(--stat-green-bg)' : 'var(--bg-card)',
              }}
              title="Exportar este gráfico al menú de Inicio en una burbuja Bento"
            >
              <Pin size={14} style={{ transform: 'rotate(45deg)' }} />
              <span>{isExported ? 'Fijado en Inicio' : 'Exportar a Inicio'}</span>
            </button>
          )}

          {onRemove && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRemove}
              style={{ padding: '0.45rem 0.65rem' }}
              title="Quitar de esta burbuja"
              aria-label="Quitar de esta burbuja"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Gráfico Amplio Recharts */}
      <div style={{ height: '240px', width: '100%', marginTop: '0.5rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.data} margin={{ top: 12, right: 18, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id={`full-${metric.gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
              opacity={0.6}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as { date: string; value: number };
                  return (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1.5px solid var(--border)',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '10px',
                        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.12)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <div
                        style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}
                      >
                        Medición: {data.date}
                      </div>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 900,
                          color: metric.color,
                          marginTop: '0.15rem',
                        }}
                      >
                        {data.value} {metric.unit}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={metric.color}
              strokeWidth={3}
              fill={`url(#full-${metric.gradientId})`}
              dot={{ r: 4, fill: metric.color, stroke: 'var(--bg-card)', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: metric.color, stroke: 'var(--bg-card)', strokeWidth: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Resumen inferior de evolución */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div
          style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            REGISTRO INICIAL
          </span>
          <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {metric.initialValue} {metric.unit}
          </strong>
        </div>

        <div
          style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            MEJOR MARCA (PR)
          </span>
          <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--stat-green)' }}>
            {metric.currentValue} {metric.unit}
          </strong>
        </div>

        <div
          style={{ background: 'var(--bg-subtle)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
            GANANCIA TOTAL
          </span>
          <strong style={{ display: 'block', fontSize: '0.95rem', color: metric.color }}>
            {metric.deltaAbsolute} ({metric.deltaPercent})
          </strong>
        </div>
      </div>
    </div>
  );
};

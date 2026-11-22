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
import { TrendingUp, Dumbbell, Zap, Activity, Award, Pin, X, LineChart } from 'lucide-react';
import { METRIC_PRESENTATION, MetricDefinition, MetricKey } from '../../utils/evolutionMetrics';
import './EvolutionChartWidget.css';

export interface EvolutionChartWidgetProps {
  metricKey: string;
  // Métrica armada con la evolución real; si no hay mediciones, el widget lo dice
  metric?: MetricDefinition | null;
  loading?: boolean;
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
    case 'fatigue':
      return <Activity size={size} strokeWidth={2.5} />;
    case 'yoyo':
      return <Award size={size} strokeWidth={2.5} />;
    default:
      return <TrendingUp size={size} strokeWidth={2.5} />;
  }
};

export const EvolutionChartWidget: React.FC<EvolutionChartWidgetProps> = ({
  metricKey,
  metric,
  loading = false,
  variant = 'compact',
  colSpan = 1,
  onRemove,
  onExportClick,
  isExported = false,
}) => {
  const isCompact = variant === 'compact' && colSpan === 1;

  if (!metric) {
    const presentation = METRIC_PRESENTATION[metricKey as MetricKey];
    const title = presentation?.shortName ?? 'Evolución';
    return (
      <div className={`evolution-empty${isCompact ? ' is-compact' : ''}`} role="status">
        <LineChart size={isCompact ? 22 : 32} className="evolution-empty-icon" aria-hidden="true" />
        <strong className="evolution-empty-title">{title}</strong>
        <p className="evolution-empty-desc">
          {loading ? 'Cargando mediciones…' : 'Todavía no hay mediciones en este período.'}
        </p>
        {onRemove && (
          <button type="button" className="btn btn-secondary" onClick={onRemove}>
            Quitar
          </button>
        )}
      </div>
    );
  }

  const deltaColor = metric.isPositiveImprovement ? 'var(--success-text)' : 'var(--danger-text)';
  const hasChange = metric.data.length > 1;

  // Compact dashboard card render (colSpan: 1)
  if (isCompact) {
    return (
      <div className="evolution-widget-compact">
        {/* Cabecera del Widget Compacto */}
        <div className="evolution-widget-card-header">
          <div className="evolution-widget-card-header-left">
            <div
              className="evolution-widget-icon-wrap"
              style={{
                background: `color-mix(in srgb, ${metric.color} 9%, transparent)`,
                color: metric.color,
              }}
            >
              {getMetricIcon(metric.key, 15)}
            </div>
            <div className="evolution-widget-header-titles">
              <span className="evolution-widget-short-name">{metric.shortName}</span>
              <span className="evolution-widget-target-desc">Evolución</span>
            </div>
          </div>

          <div className="evolution-widget-header-actions">
            {hasChange && (
              <span
                className="evolution-widget-compact-delta"
                style={{
                  color: deltaColor,
                  background: `color-mix(in srgb, ${deltaColor} 10%, transparent)`,
                }}
              >
                {metric.deltaPercent}
              </span>
            )}

            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="evolution-widget-icon-btn"
                title="Quitar gráfico de esta burbuja"
                aria-label="Quitar gráfico"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Valor actual destacado */}
        <div className="evolution-widget-metric-row">
          <div className="evolution-widget-val-wrap">
            <strong className="evolution-widget-current-val">{metric.currentValue}</strong>
            <span className="evolution-widget-unit">{metric.unit}</span>
          </div>
        </div>

        {/* Mini Sparkline Chart interactivo que llena el fondo inferior */}
        <div className="evolution-widget-sparkline-box">
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
                      <div className="evolution-tooltip-box">
                        <span className="evolution-tooltip-val">
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
    <div className="evolution-widget-full">
      {/* Cabecera completa */}
      <div className="evolution-widget-full-header">
        <div className="evolution-widget-full-meta-left">
          <div
            className="evolution-widget-full-icon-box"
            style={{
              background: `color-mix(in srgb, ${metric.color} 9%, transparent)`,
              color: metric.color,
            }}
          >
            {getMetricIcon(metric.key, 20)}
          </div>
          <div>
            <div className="evolution-widget-full-title-row">
              <h3 className="evolution-widget-full-title">{metric.name}</h3>
              <span className="evolution-widget-unit-badge">{metric.category}</span>
            </div>
            <p className="evolution-widget-full-subtitle">{metric.description}</p>
          </div>
        </div>

        {/* Acciones: Botón de exportar a Inicio */}
        <div className="evolution-widget-full-meta-right">
          <div className="evolution-widget-kpi-pill">
            <span className="evolution-widget-kpi-pill-label">Actual:</span>
            <strong className="evolution-widget-kpi-pill-val">{metric.currentValue}</strong>
            <span className="evolution-widget-unit">{metric.unit}</span>
            {hasChange && (
              <span
                className="evolution-widget-delta"
                style={{
                  color: deltaColor,
                  marginLeft: '0.35rem',
                }}
              >
                ({metric.deltaPercent})
              </span>
            )}
          </div>

          {onExportClick && (
            <button
              type="button"
              className={`btn btn-secondary evolution-widget-pin-btn${isExported ? ' is-pinned' : ''}`}
              onClick={onExportClick}
              title="Exportar este gráfico al menú de Inicio en una burbuja Bento"
            >
              <Pin size={14} className="evolution-widget-pin-icon" />
              <span>{isExported ? 'Fijado en Inicio' : 'Exportar a Inicio'}</span>
            </button>
          )}

          {onRemove && (
            <button
              type="button"
              className="btn btn-secondary evolution-widget-remove-btn"
              onClick={onRemove}
              title="Quitar de esta burbuja"
              aria-label="Quitar de esta burbuja"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Gráfico Amplio Recharts */}
      <div className="evolution-widget-chart-container">
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
                    <div className="evolution-tooltip-box">
                      <div className="evolution-tooltip-date">Medición: {data.date}</div>
                      <div
                        className="evolution-tooltip-val evolution-widget-tooltip-metric-val"
                        style={{ color: metric.color }}
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
      <div className="evolution-widget-stats-summary">
        <div className="evolution-widget-stat-card">
          <span className="evolution-widget-stat-card-label">Primera medición</span>
          <strong className="evolution-widget-stat-card-val">
            {metric.initialValue} {metric.unit}
          </strong>
        </div>

        <div className="evolution-widget-stat-card">
          <span className="evolution-widget-stat-card-label">Última medición</span>
          <strong className="evolution-widget-stat-card-val">
            {metric.currentValue} {metric.unit}
          </strong>
        </div>

        <div className="evolution-widget-stat-card">
          <span className="evolution-widget-stat-card-label">Cambio en el período</span>
          {hasChange ? (
            <strong className="evolution-widget-stat-card-val" style={{ color: deltaColor }}>
              {metric.deltaAbsolute} ({metric.deltaPercent})
            </strong>
          ) : (
            <strong className="evolution-widget-stat-card-val evolution-widget-stat-card-muted">
              Una sola medición
            </strong>
          )}
        </div>
      </div>
    </div>
  );
};

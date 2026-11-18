import React from 'react';
import { TrendingUp, Loader2, AlertCircle, HeartPulse, Info, Calendar } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { AthleteWeeklyTrendsResponse, WeeklyTrendPoint } from '../../types/seguimiento';
import { formatDayMonth, formatIsoDate } from '../../utils/argentinaDate';
import { EmptyState } from '../EmptyState';

export interface AthleteWeeklyTrendsChartProps {
  trends: AthleteWeeklyTrendsResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

interface ChartPoint {
  key: string;
  label: string;
  weekStartDate: string;
  weekEndDate: string;
  averageWellness: number | null;
  totalLoad: number | null;
  totalMinutes: number;
  checkInCount: number;
  loadCount: number;
  wellnessBreakdown?: WeeklyTrendPoint['wellnessBreakdown'];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: ChartPoint;
  }>;
}

function AthleteTrendsTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="athlete-trends-tooltip" role="tooltip">
      <p className="athlete-trends-tooltip-title">
        Semana {formatIsoDate(item.weekStartDate)} - {formatIsoDate(item.weekEndDate)}
      </p>

      {item.averageWellness !== null && (
        <div className="athlete-trends-tooltip-row">
          <span className="athlete-trends-tooltip-marker wellness-marker" aria-hidden="true" />
          <span>
            Bienestar: <strong>{item.averageWellness.toFixed(1)} / 5</strong>
          </span>
        </div>
      )}

      {item.totalLoad !== null && (
        <div className="athlete-trends-tooltip-row">
          <span className="athlete-trends-tooltip-marker load-marker" aria-hidden="true" />
          <span>
            Carga acumulada: <strong>{item.totalLoad.toLocaleString('es-AR')} UA</strong>
            {item.totalMinutes > 0 && ` (${item.totalMinutes} min)`}
          </span>
        </div>
      )}

      <div className="athlete-trends-tooltip-row">
        <span>
          Registros:{' '}
          <strong>
            {item.checkInCount} check-in{item.checkInCount === 1 ? '' : 's'}
          </strong>
          {item.loadCount > 0 &&
            ` · ${item.loadCount} entrenamiento${item.loadCount === 1 ? '' : 's'}`}
        </span>
      </div>
    </div>
  );
}

export const AthleteWeeklyTrendsChart: React.FC<AthleteWeeklyTrendsChartProps> = ({
  trends,
  loading = false,
  error = null,
  onRetry,
}) => {
  if (loading) {
    return (
      <div
        className="card athlete-trends-card rm-chart-empty"
        role="status"
        aria-label="Cargando tendencias"
      >
        <Loader2 size={24} className="plan-spin" aria-hidden="true" />
        <p className="rm-chart-empty-text">Cargando tendencias de bienestar y carga…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="alert-banner danger evolution-alert-banner"
        role="alert"
        data-testid="athlete-trends-error-banner"
      >
        <div className="athlete-trends-error-content">
          <span className="plan-inline">
            <AlertCircle size={18} aria-hidden="true" />
            {error}
          </span>
          {onRetry && (
            <button
              type="button"
              className="btn btn-secondary athlete-trends-retry-btn"
              onClick={onRetry}
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  const rawWeeks = trends?.weeks ?? [];

  // Filtrar semanas con al menos algún registro (check-in o carga)
  const chartPoints: ChartPoint[] = rawWeeks.map((w) => ({
    key: w.weekStartDate,
    label: `Sem ${formatDayMonth(w.weekStartDate)}`,
    weekStartDate: w.weekStartDate,
    weekEndDate: w.weekEndDate,
    averageWellness:
      typeof w.averageWellness === 'number' ? Number(w.averageWellness.toFixed(1)) : null,
    totalLoad: typeof w.totalLoad === 'number' ? w.totalLoad : null,
    totalMinutes: w.totalMinutes ?? 0,
    checkInCount: w.checkInCount,
    loadCount: w.loadCount,
    wellnessBreakdown: w.wellnessBreakdown,
  }));

  const hasData = chartPoints.some(
    (p) =>
      p.averageWellness !== null || (p.totalLoad !== null && p.totalLoad > 0) || p.checkInCount > 0,
  );

  if (!hasData) {
    return (
      <div data-testid="athlete-trends-empty-state">
        <EmptyState
          icon={TrendingUp}
          title="Todavía no hay registros de bienestar o carga"
          description="A medida que completes tus check-ins diarios y cargues tus entrenamientos, vas a ver acá cómo evoluciona tu bienestar y fatiga semana a semana."
        />
      </div>
    );
  }

  // Cálculos resumen de las semanas con datos
  const weeksWithWellness = chartPoints.filter((p) => p.averageWellness !== null);
  const avgWellness =
    weeksWithWellness.length > 0
      ? (
          weeksWithWellness.reduce((acc, p) => acc + (p.averageWellness ?? 0), 0) /
          weeksWithWellness.length
        ).toFixed(1)
      : null;

  const weeksWithLoad = chartPoints.filter((p) => p.totalLoad !== null && p.totalLoad > 0);
  const avgLoad =
    weeksWithLoad.length > 0
      ? Math.round(
          weeksWithLoad.reduce((acc, p) => acc + (p.totalLoad ?? 0), 0) / weeksWithLoad.length,
        )
      : null;

  const totalCheckIns = chartPoints.reduce((acc, p) => acc + p.checkInCount, 0);
  const weeksCount = chartPoints.length;

  return (
    <div
      className="athlete-trends-card"
      data-testid="athlete-weekly-trends-chart"
      role="region"
      aria-label="Tendencias de bienestar y carga de las últimas 4 semanas"
    >
      <div className="athlete-trends-header">
        <div>
          <div className="athlete-trends-header-title-group">
            <HeartPulse size={20} aria-hidden="true" />
            <h2 className="athlete-trends-title">Tendencia de Bienestar y Carga</h2>
          </div>
          <p className="athlete-trends-subtitle">
            Evolución semanal entre tu estado de recuperación física y la carga acumulada.
          </p>
        </div>
        <span className="athlete-trends-period-badge">
          <Calendar size={13} className="athlete-trends-period-icon" />
          Últimas 4 semanas
        </span>
      </div>

      {/* Mini KPIs de Resumen */}
      <div className="athlete-trends-kpi-grid">
        <div className="athlete-trends-kpi-item">
          <span className="athlete-trends-kpi-label">Bienestar promedio</span>
          <div className="athlete-trends-kpi-value">
            <strong>{avgWellness !== null ? avgWellness : '—'}</strong>
            <span className="athlete-trends-kpi-unit">/ 5</span>
          </div>
          <span className="athlete-trends-kpi-hint">
            {avgWellness !== null
              ? Number(avgWellness) >= 4
                ? 'Óptima recuperación'
                : Number(avgWellness) >= 3
                  ? 'Recuperación regular'
                  : 'Atención a la fatiga'
              : 'Sin check-ins'}
          </span>
        </div>

        <div className="athlete-trends-kpi-item">
          <span className="athlete-trends-kpi-label">Carga promedio</span>
          <div className="athlete-trends-kpi-value">
            <strong>{avgLoad !== null ? avgLoad.toLocaleString('es-AR') : '—'}</strong>
            <span className="athlete-trends-kpi-unit">UA</span>
          </div>
          <span className="athlete-trends-kpi-hint">Por semana activa</span>
        </div>

        <div className="athlete-trends-kpi-item">
          <span className="athlete-trends-kpi-label">Check-ins cargados</span>
          <div className="athlete-trends-kpi-value">
            <strong>{totalCheckIns}</strong>
            <span className="athlete-trends-kpi-unit">días</span>
          </div>
          <span className="athlete-trends-kpi-hint">En el período</span>
        </div>
      </div>

      {/* Gráfico Combinado Responsivo */}
      <div className="athlete-trends-chart-wrapper">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartPoints} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            {/* Eje Izquierdo: Carga en UA */}
            <YAxis
              yAxisId="load"
              unit=" UA"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              width={42}
            />
            {/* Eje Derecho: Bienestar en escala 1 a 5 */}
            <YAxis
              yAxisId="wellness"
              orientation="right"
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              width={24}
            />
            <Tooltip content={<AthleteTrendsTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '0.4rem', fontSize: '0.78rem' }}
            />
            <Bar
              yAxisId="load"
              dataKey="totalLoad"
              name="Carga semanal (UA)"
              fill="var(--secondary)"
              fillOpacity={0.4}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <Line
              yAxisId="wellness"
              type="monotone"
              dataKey="averageWellness"
              name="Bienestar (1-5)"
              stroke="var(--primary)"
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 4, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              activeDot={{
                r: 6,
                fill: 'var(--secondary)',
                stroke: 'var(--bg-card)',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Mensaje sutil si hay menos de 4 semanas registradas */}
      {weeksCount > 0 && weeksCount < 4 && (
        <div className="athlete-trends-partial-alert">
          <Info size={14} aria-hidden="true" />
          <span>
            Mostrando {weeksCount} {weeksCount === 1 ? 'semana registrada' : 'semanas registradas'}{' '}
            de actividad.
          </span>
        </div>
      )}
    </div>
  );
};

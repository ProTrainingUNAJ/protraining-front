import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryDashboardLoadWeek } from '../../types/categoryDashboard';
import { formatDayMonth, formatIsoDate } from '../../utils/argentinaDate';

export interface CategoryMetricsChartProps {
  weeks: CategoryDashboardLoadWeek[];
}

interface ChartPoint {
  label: string;
  periodLabel: string;
  totalLoad: number;
  totalMinutes: number;
  recordsCount: number;
}

interface CategoryLoadTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}

function CategoryLoadTooltip({ active, payload }: CategoryLoadTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="category-dashboard-tooltip" role="tooltip">
      <p className="category-dashboard-tooltip-title">Semana {point.periodLabel}</p>
      <p>
        Carga: <strong>{point.totalLoad.toLocaleString('es-AR')} UA</strong>
      </p>
      <p>
        {point.totalMinutes.toLocaleString('es-AR')} min · {point.recordsCount}{' '}
        {point.recordsCount === 1 ? 'registro' : 'registros'}
      </p>
    </div>
  );
}

// Evolución semanal de carga (UA Foster) de la categoría. Solo totales agregados.
export const CategoryMetricsChart: React.FC<CategoryMetricsChartProps> = ({ weeks }) => {
  const points: ChartPoint[] = weeks.map((week) => ({
    label: formatDayMonth(week.weekStart),
    periodLabel: `${formatIsoDate(week.weekStart)} - ${formatIsoDate(week.weekEnd)}`,
    totalLoad: week.totalLoad,
    totalMinutes: week.totalMinutes,
    recordsCount: week.recordsCount,
  }));

  return (
    <div
      className="category-dashboard-chart"
      role="img"
      aria-label="Carga semanal total de la categoría en unidades de actividad"
      data-testid="category-dashboard-chart"
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={points} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            unit=" UA"
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            width={54}
          />
          <Tooltip content={<CategoryLoadTooltip />} />
          <Bar
            dataKey="totalLoad"
            name="Carga semanal (UA)"
            fill="var(--secondary)"
            fillOpacity={0.45}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

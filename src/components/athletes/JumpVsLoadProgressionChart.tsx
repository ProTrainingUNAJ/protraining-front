import { AlertCircle, ArrowUpRight, Loader2, TrendingUp } from 'lucide-react';
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
import { FitnessTestEvolutionSeries, WeeklyLoadEvolutionPoint } from '../../types/seguimiento';
import { formatIsoDate } from '../../utils/argentinaDate';

export interface JumpVsLoadProgressionChartProps {
  fitnessTests: FitnessTestEvolutionSeries[];
  weeklyLoads?: WeeklyLoadEvolutionPoint[];
  isCoach?: boolean;
  loading?: boolean;
  error?: string | null;
}

export interface JumpVsLoadChartPoint {
  key: string;
  label: string;
  weekStartDate?: string;
  weekEndDate?: string;
  jumpHeight: number | null;
  jumpDate?: string;
  jumpLabel?: string;
  weeklyLoad?: number;
  totalMinutes?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    payload: JumpVsLoadChartPoint;
  }>;
  isCoach?: boolean;
}

function JumpVsLoadTooltip({ active, payload, isCoach }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rm-chart-tooltip" role="tooltip">
      <p className="rm-chart-tooltip-title">
        {item.weekStartDate && item.weekEndDate
          ? `Semana: ${formatIsoDate(item.weekStartDate)} - ${formatIsoDate(item.weekEndDate)}`
          : `Fecha: ${item.label}`}
      </p>

      {item.jumpHeight !== null && (
        <div className="jump-load-tooltip-row">
          <span className="jump-load-tooltip-marker jump-marker" aria-hidden="true" />
          <span className="rm-chart-tooltip-meta">
            Salto CMJ: <strong>{item.jumpHeight} cm</strong>
            {item.jumpDate && ` (${formatIsoDate(item.jumpDate)})`}
          </span>
        </div>
      )}

      {isCoach && typeof item.weeklyLoad === 'number' && (
        <div className="jump-load-tooltip-row">
          <span className="jump-load-tooltip-marker load-marker" aria-hidden="true" />
          <span className="rm-chart-tooltip-meta">
            Carga semanal: <strong>{item.weeklyLoad} UA</strong>
            {typeof item.totalMinutes === 'number' && ` (${item.totalMinutes} min)`}
          </span>
        </div>
      )}
    </div>
  );
}

function formatWeekLabel(dateIso: string): string {
  try {
    const [, month, day] = dateIso.split('-');
    if (day && month) {
      return `${day}/${month}`;
    }
    return dateIso;
  } catch {
    return dateIso;
  }
}

export function JumpVsLoadProgressionChart({
  fitnessTests,
  weeklyLoads = [],
  isCoach = true,
  loading = false,
  error = null,
}: JumpVsLoadProgressionChartProps) {
  if (loading) {
    return (
      <div className="rm-chart-empty" role="status">
        <Loader2 size={24} className="plan-spin" aria-hidden="true" />
        <p className="rm-chart-empty-text">Cargando evolución de salto y carga…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner danger" role="alert">
        <span className="plan-inline">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </span>
      </div>
    );
  }

  // Buscar el test de salto (CMJ o similar)
  const jumpTest = fitnessTests.find((t) => {
    const name = t.testName.toLowerCase();
    const capacity = t.motorCapacity.toLowerCase();
    return (
      name.includes('salto') ||
      name.includes('cmj') ||
      capacity.includes('power') ||
      t.unit.toLowerCase() === 'cm'
    );
  });

  const jumpPoints = jumpTest ? jumpTest.points : [];

  // Si no hay tests de salto y no hay carga, mostrar estado vacío
  if (jumpPoints.length === 0 && (!isCoach || weeklyLoads.length === 0)) {
    return (
      <div className="rm-chart-empty" role="status" data-testid="jump-load-empty">
        <TrendingUp size={36} className="rm-chart-empty-icon" aria-hidden="true" />
        <p className="rm-chart-empty-title">Sin tests de salto registrados</p>
        <p className="rm-chart-empty-text">
          Todavía no hay evaluaciones de salto registradas para este atleta en el rango
          seleccionado.
        </p>
      </div>
    );
  }

  // Construir puntos del gráfico alineados por semana
  const chartData: JumpVsLoadChartPoint[] =
    isCoach && weeklyLoads.length > 0
      ? weeklyLoads.map((w) => {
          // Buscar saltos dentro de esta semana [weekStartDate, weekEndDate]
          const matchingJumps = jumpPoints.filter((jp) => {
            return jp.date >= w.weekStartDate && jp.date <= w.weekEndDate;
          });

          let bestJump: number | null = null;
          let jumpDate: string | undefined;
          let jumpLabel: string | undefined;

          if (matchingJumps.length > 0) {
            const sorted = [...matchingJumps].sort((a, b) => b.value - a.value);
            bestJump = sorted[0].value;
            jumpDate = sorted[0].date;
            jumpLabel = sorted[0].label ?? `${bestJump} cm`;
          }

          return {
            key: w.weekStartDate,
            label: formatWeekLabel(w.weekStartDate),
            weekStartDate: w.weekStartDate,
            weekEndDate: w.weekEndDate,
            jumpHeight: bestJump,
            jumpDate,
            jumpLabel,
            weeklyLoad: w.totalLoad,
            totalMinutes: w.totalMinutes,
          };
        })
      : [...jumpPoints]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((jp) => ({
            key: jp.date,
            label: formatIsoDate(jp.date),
            jumpHeight: jp.value,
            jumpDate: jp.date,
            jumpLabel: jp.label ?? `${jp.value} cm`,
          }));

  const hasJumpData = chartData.some((p) => p.jumpHeight !== null);

  return (
    <div className="rm-evolution-container" data-testid="jump-load-chart-container">
      <div className="rm-evolution-header">
        <div className="jump-load-header-title">
          <ArrowUpRight size={18} aria-hidden="true" />
          <h3 className="jump-load-title">
            {isCoach ? 'Salto vs. Carga Semanal' : 'Progresión de Salto'}
          </h3>
        </div>
        <span className="jump-load-subtitle">
          {isCoach
            ? 'Relación entre altura de salto (cm) y carga de entrenamiento acumulada (min × RPE).'
            : 'Altura alcanzada en tests físicos de salto vertical (cm).'}
        </span>
      </div>

      <div className="rm-evolution-chart-wrap" data-testid="jump-load-chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={chartData}
            margin={{ top: 16, right: isCoach ? 24 : 12, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              unit=" cm"
              domain={['dataMin - 3', 'dataMax + 3']}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            {isCoach && (
              <YAxis
                yAxisId="right"
                orientation="right"
                unit=" UA"
                domain={[0, 'dataMax + 200']}
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
            )}
            <Tooltip content={<JumpVsLoadTooltip isCoach={isCoach} />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '0.5rem', fontSize: '0.8rem' }}
            />

            {isCoach && (
              <Bar
                yAxisId="right"
                dataKey="weeklyLoad"
                name="Carga semanal"
                fill="var(--secondary)"
                fillOpacity={0.35}
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            )}

            <Line
              yAxisId="left"
              type="monotone"
              dataKey="jumpHeight"
              name="Salto"
              stroke="var(--primary)"
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              activeDot={{
                r: 7,
                fill: 'var(--secondary)',
                stroke: 'var(--bg-card)',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {!hasJumpData && (
          <p className="rm-chart-single-note">
            No se registraron tests de salto en el período seleccionado
          </p>
        )}
      </div>
    </div>
  );
}

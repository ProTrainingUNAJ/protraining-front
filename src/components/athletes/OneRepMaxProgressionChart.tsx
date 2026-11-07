import { useEffect, useState, useId } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AlertCircle, Dumbbell, Loader2, TrendingUp } from 'lucide-react';
import { athleteRecordsService } from '../../api/athleteRecords';
import { AthleteRecordItem, formatRecordOrigin } from '../../types/athleteRecords';
import { StrengthEvolutionSeries } from '../../types/seguimiento';

export interface OneRepMaxProgressionChartProps {
  athleteId: string;
  strengthUnavailable?: boolean;
  strengthSeries?: StrengthEvolutionSeries[];
  loading?: boolean;
  error?: string | null;
  suppressBanner?: boolean;
  bannerTestId?: string;
}

export interface ProgressionPoint {
  id: string;
  date: string;
  rawDate: string;
  weightKg: number;
  originLabel: string;
  exerciseName: string;
}

interface TooltipPayloadItem {
  payload: ProgressionPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function OneRepMaxTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="rm-chart-tooltip" role="tooltip">
      <p className="rm-chart-tooltip-title">{item.exerciseName}</p>
      <p className="rm-chart-tooltip-weight">{item.weightKg} kg</p>
      <p className="rm-chart-tooltip-meta">Fecha: {item.date}</p>
      <p className="rm-chart-tooltip-meta">Origen: {item.originLabel}</p>
    </div>
  );
}

function formatChartDate(isoDateTime: string): string {
  try {
    const d = new Date(isoDateTime);
    if (isNaN(d.getTime())) return isoDateTime;
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoDateTime;
  }
}

export function OneRepMaxProgressionChart({
  athleteId,
  strengthUnavailable,
  strengthSeries,
  loading: externalLoading,
  error: externalError,
  suppressBanner = false,
  bannerTestId,
}: OneRepMaxProgressionChartProps) {
  const selectId = useId();
  const [internalRecords, setInternalRecords] = useState<AthleteRecordItem[]>([]);
  const hasExternalStrength = Boolean(strengthSeries && strengthSeries.length > 0);
  const [internalLoading, setInternalLoading] = useState(!hasExternalStrength);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');

  useEffect(() => {
    // Si la serie externa ya vino con datos, no consultamos la API interna
    if (hasExternalStrength) return;

    let active = true;

    athleteRecordsService
      .listHistory(athleteId)
      .then((data) => {
        if (!active) return;
        setInternalRecords(data);
        setInternalError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setInternalError(err instanceof Error ? err.message : 'No se pudo cargar la evolución.');
      })
      .finally(() => {
        if (active) setInternalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [athleteId, hasExternalStrength]);

  const loading = hasExternalStrength
    ? (externalLoading ?? false)
    : externalLoading || internalLoading;
  const error = externalError !== undefined ? externalError : internalError;

  // Agrupar ejercicios según provengan de strengthSeries o de internalRecords
  const exerciseOptions: Array<{ id: string; name: string; points: ProgressionPoint[] }> =
    hasExternalStrength && strengthSeries
      ? strengthSeries
          .filter((s) => s.points.length > 0)
          .map((s) => {
            const sortedPoints = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
            return {
              id: s.exerciseId,
              name: s.exerciseName,
              points: sortedPoints.map((p, idx) => ({
                id: `${s.exerciseId}-${p.date}-${idx}`,
                date: formatChartDate(p.date),
                rawDate: p.date,
                weightKg: p.value,
                originLabel: p.label ?? `${p.value} ${s.unit}`,
                exerciseName: s.exerciseName,
              })),
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      : (() => {
          const exerciseMap = new Map<
            string,
            { id: string; name: string; records: AthleteRecordItem[] }
          >();
          internalRecords.forEach((record) => {
            const existing = exerciseMap.get(record.exerciseId);
            if (existing) {
              existing.records.push(record);
            } else {
              exerciseMap.set(record.exerciseId, {
                id: record.exerciseId,
                name: record.exerciseName,
                records: [record],
              });
            }
          });

          return Array.from(exerciseMap.values())
            .map((entry) => {
              const sorted = [...entry.records].sort(
                (a, b) => new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime(),
              );
              return {
                id: entry.id,
                name: entry.name,
                points: sorted.map((record) => ({
                  id: record.id,
                  date: formatChartDate(record.achievedAt),
                  rawDate: record.achievedAt,
                  weightKg: record.weightKg,
                  originLabel: formatRecordOrigin(record.origin),
                  exerciseName: record.exerciseName,
                })),
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        })();

  // Asegurar selección válida del ejercicio
  const effectiveExerciseId = exerciseOptions.some((opt) => opt.id === selectedExerciseId)
    ? selectedExerciseId
    : exerciseOptions[0]?.id || '';

  const activeExercise = exerciseOptions.find((opt) => opt.id === effectiveExerciseId);
  const chartData: ProgressionPoint[] = activeExercise ? activeExercise.points : [];

  if (loading) {
    return (
      <div className="rm-chart-empty" role="status">
        <Loader2 size={24} className="plan-spin" aria-hidden="true" />
        <p className="rm-chart-empty-text">Cargando evolución…</p>
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

  const effectiveBannerTestId = bannerTestId ?? 'strength-unavailable-alert';

  if (strengthUnavailable && exerciseOptions.length === 0) {
    if (suppressBanner) {
      return (
        <div className="rm-chart-empty" role="status">
          <TrendingUp size={36} className="rm-chart-empty-icon" aria-hidden="true" />
          <p className="rm-chart-empty-title">Sin récords cargados</p>
          <p className="rm-chart-empty-text">
            Todavía no hay récords registrados para mostrar la evolución.
          </p>
        </div>
      );
    }
    return (
      <div
        className="alert-banner warning evolution-alert-banner"
        role="status"
        data-testid={effectiveBannerTestId}
      >
        <span className="plan-inline">
          <AlertCircle size={18} aria-hidden="true" />
          No pudimos cargar los récords de fuerza en este momento.
        </span>
      </div>
    );
  }

  if (exerciseOptions.length === 0) {
    return (
      <div className="rm-chart-empty" role="status">
        <TrendingUp size={36} className="rm-chart-empty-icon" aria-hidden="true" />
        <p className="rm-chart-empty-title">Sin récords cargados</p>
        <p className="rm-chart-empty-text">
          Todavía no hay récords registrados para mostrar la evolución.
        </p>
      </div>
    );
  }

  return (
    <div className="rm-evolution-container" data-testid="rm-line-chart-container">
      {strengthUnavailable && !suppressBanner && (
        <div
          className="alert-banner warning evolution-alert-banner"
          role="status"
          data-testid={effectiveBannerTestId}
        >
          <span className="plan-inline">
            <AlertCircle size={18} aria-hidden="true" />
            No pudimos cargar los récords de fuerza en este momento.
          </span>
        </div>
      )}
      <div className="rm-evolution-header">
        <div className="rm-evolution-selector-group">
          <label htmlFor={selectId} className="rm-evolution-label">
            <Dumbbell size={16} aria-hidden="true" />
            <span>Ejercicio:</span>
          </label>
          <select
            id={selectId}
            className="rm-evolution-select"
            value={effectiveExerciseId}
            onChange={(e) => setSelectedExerciseId(e.target.value)}
            data-testid="exercise-selector"
          >
            {exerciseOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rm-evolution-chart-wrap" data-testid="rm-line-chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <YAxis
              unit=" kg"
              domain={['dataMin - 5', 'dataMax + 5']}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip content={<OneRepMaxTooltip />} />
            <Line
              type="monotone"
              dataKey="weightKg"
              name="1RM"
              stroke="var(--secondary)"
              strokeWidth={2.5}
              dot={{ r: 5, fill: 'var(--secondary)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              activeDot={{ r: 7, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {chartData.length === 1 && (
          <p className="rm-chart-single-note">Todavía no hay evolución para mostrar</p>
        )}
      </div>
    </div>
  );
}

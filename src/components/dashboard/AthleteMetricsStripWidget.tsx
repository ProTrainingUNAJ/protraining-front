import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useAthleteEvolution } from '../../hooks/useAthleteEvolution';
import { buildEvolutionMetrics, type MetricKey } from '../../utils/evolutionMetrics';
import { WidgetErrorState } from './WidgetErrorState';
import { changeFromPrevious } from './athleteHomeUtils';
import './dashboardWidgets.css';
import './AthleteMetricsStripWidget.css';

// Las 4 marcas de Progreso, en una sola tarjeta (KAN-594). La fatiga es del check-in, no una marca.
const STRIP_METRICS: { key: MetricKey; label: string }[] = [
  { key: 'cmj', label: 'Salto CMJ' },
  { key: 'squat', label: '1RM Sentadilla' },
  { key: 'sprint', label: 'Sprint 30 m' },
  { key: 'yoyo', label: 'Resistencia' },
];

const formatValue = (value: number) => value.toLocaleString('es-AR', { maximumFractionDigits: 2 });

// Línea chica de la evolución, sin ejes: alcanza para ver la tendencia
const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const width = 120;
  const height = 36;
  const pad = 3;
  if (values.length < 2) {
    return (
      <svg className="metrics-strip__spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <circle cx={width / 2} cy={height / 2} r={2.5} className="metrics-strip__spark-dot" />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = height - pad - ((value - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(',');
  return (
    <svg
      className="metrics-strip__spark"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points.join(' ')} className="metrics-strip__spark-line" />
      <circle cx={last[0]} cy={last[1]} r={2.5} className="metrics-strip__spark-dot" />
    </svg>
  );
};

/**
 * "Mis marcas" en el Inicio del atleta (KAN-594): Salto CMJ, 1RM Sentadilla, Sprint y Resistencia
 * en una fila, cada una con su último valor, cuánto cambió desde la medición anterior y una línea
 * chica de la evolución. Reemplaza a los 4 gráficos grandes; el detalle sigue en Progreso.
 */
export const AthleteMetricsStripWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { evolution, loading, error } = useAthleteEvolution('3m');
  const metrics = useMemo(() => buildEvolutionMetrics(evolution), [evolution]);
  const hasAny = STRIP_METRICS.some(({ key }) => metrics[key]);

  return (
    <section className={`dash-w metrics-strip ${className}`} aria-labelledby="metrics-strip-title">
      <header className="dash-w__header">
        <h3 id="metrics-strip-title" className="dash-w__eyebrow">
          <TrendingUp size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Mis marcas
        </h3>
      </header>

      {error ? (
        <WidgetErrorState message="No pudimos cargar tus marcas." />
      ) : loading ? (
        <p className="dash-w__empty" role="status">
          Cargando tus marcas…
        </p>
      ) : !hasAny ? (
        <p className="dash-w__empty">
          Todavía no tenés mediciones. Van a aparecer acá después de tus tests de campo.
        </p>
      ) : (
        <>
          <ul className="metrics-strip__grid">
            {STRIP_METRICS.map(({ key, label }) => {
              const metric = metrics[key];
              const change = metric ? changeFromPrevious(metric) : null;
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="metrics-strip__cell"
                    onClick={() => navigate('/athlete/progress')}
                    aria-label={
                      metric
                        ? `${label}: ${formatValue(metric.currentValue)} ${metric.unit}${
                            change ? `, ${change.text} desde la medición anterior` : ''
                          }. Ver en Progreso`
                        : `${label}: sin mediciones. Ver en Progreso`
                    }
                  >
                    <span className="metrics-strip__label">{label}</span>
                    {metric ? (
                      <>
                        <span className="metrics-strip__value">
                          {formatValue(metric.currentValue)}
                          <span className="metrics-strip__unit">{metric.unit}</span>
                        </span>
                        {change ? (
                          <span
                            className={`metrics-strip__change metrics-strip__change--${change.trend}`}
                            data-testid={`metric-change-${key}`}
                          >
                            {change.text}
                          </span>
                        ) : (
                          <span className="metrics-strip__change metrics-strip__change--same">
                            Primera medición
                          </span>
                        )}
                        <Sparkline values={metric.data.map((p) => p.value)} />
                      </>
                    ) : (
                      <span className="metrics-strip__none">Sin mediciones</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="btn btn-primary dash-w__cta"
            onClick={() => navigate('/athlete/progress')}
          >
            Ver mi progreso
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

import React from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import {
  RELIABILITY_GROUP_COLORS,
  RELIABILITY_GROUP_LABELS,
  RELIABILITY_GROUP_ORDER,
  type RecordReliabilityGroup,
  type RecordReliabilityGroupKey,
} from '../../types/recordsReliability';

export interface RecordsReliabilityChartProps {
  groups: RecordReliabilityGroup[];
  totalAthletes: number;
  totalRecords: number;
  selectedGroup: RecordReliabilityGroupKey | null;
  onSelectGroup: (groupKey: RecordReliabilityGroupKey) => void;
}

interface SegmentLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
}

// Los grupos que representan récords. "Sin datos" no se grafica porque no tiene
// récords: se muestra aparte como cantidad de atletas sin marcas.
const RECORD_GROUP_ORDER = RELIABILITY_GROUP_ORDER.filter(
  (groupKey): groupKey is Exclude<RecordReliabilityGroupKey, 'NoData'> => groupKey !== 'NoData',
);

// Etiqueta dentro del segmento. Se omite cuando el grupo no tiene récords.
function SegmentLabel({ x, y, width, height, value }: SegmentLabelProps) {
  const count = Number(value);
  const left = Number(x) || 0;
  const top = Number(y) || 0;
  const segmentWidth = Number(width) || 0;
  const segmentHeight = Number(height) || 0;

  if (!Number.isFinite(count) || count <= 0 || segmentWidth < 18 || segmentHeight < 14) {
    return null;
  }

  return (
    <text
      x={left + segmentWidth / 2}
      y={top + segmentHeight / 2}
      fill="var(--white)"
      fontSize={12}
      fontWeight={800}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {count}
    </text>
  );
}

function formatLegendCount(groupKey: RecordReliabilityGroupKey, group?: RecordReliabilityGroup) {
  if (groupKey === 'NoData') {
    const athletes = group?.athleteCount ?? 0;
    return `${athletes} ${athletes === 1 ? 'atleta' : 'atletas'}`;
  }

  return String(group?.recordCount ?? 0);
}

// Gráfico de barras apiladas horizontales con un segmento por grupo de récords
// (KAN-417). Los segmentos SVG no son navegables por teclado: la leyenda de
// botones de abajo expone la misma acción con aria-pressed.
export function RecordsReliabilityChart({
  groups,
  totalAthletes,
  totalRecords,
  selectedGroup,
  onSelectGroup,
}: RecordsReliabilityChartProps) {
  if (totalAthletes <= 0) return null;

  const counts = RECORD_GROUP_ORDER.reduce<Record<string, number>>((acc, groupKey) => {
    acc[groupKey] = groups.find((group) => group.group === groupKey)?.recordCount ?? 0;
    return acc;
  }, {});

  const noData = groups.find((group) => group.group === 'NoData');
  const noDataAthletes = noData?.athleteCount ?? 0;
  const chartData = [{ name: 'Total', ...counts }];

  return (
    <div className="card records-reliability-chart-card">
      <div className="records-reliability-chart-header">
        <div>
          <h2 className="records-reliability-chart-title">Confiabilidad de las marcas</h2>
          <p className="records-reliability-chart-description">
            Elegí un estado para ver qué atletas tienen récords de ese origen. Los récords se
            grafican por estado; Sin datos se muestra aparte como atletas sin marcas.
          </p>
        </div>
      </div>

      {totalRecords > 0 ? (
        <div className="records-reliability-chart" aria-hidden="true">
          <ResponsiveContainer width="100%" height={64} minWidth={240}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 0, bottom: 4, left: 0 }}
              barCategoryGap={0}
            >
              <XAxis type="number" hide domain={[0, Math.max(totalRecords, 1)]} />
              <YAxis type="category" dataKey="name" hide />
              {RECORD_GROUP_ORDER.map((groupKey) => (
                <Bar
                  key={groupKey}
                  dataKey={groupKey}
                  stackId="reliability"
                  fill={RELIABILITY_GROUP_COLORS[groupKey]}
                  barSize={40}
                  isAnimationActive={false}
                  className="records-reliability-chart-segment"
                  onClick={() => onSelectGroup(groupKey)}
                >
                  <LabelList dataKey={groupKey} content={(props) => <SegmentLabel {...props} />} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="records-reliability-empty">No hay récords cargados en la categoría.</p>
      )}

      <p className="records-reliability-nodata-note">
        Sin datos: {noDataAthletes} {noDataAthletes === 1 ? 'atleta' : 'atletas'} sin récords (no se
        grafica).
      </p>

      <div className="records-reliability-legend" role="group" aria-label="Grupos de confiabilidad">
        {RELIABILITY_GROUP_ORDER.map((groupKey) => {
          const selected = selectedGroup === groupKey;
          const group = groups.find((item) => item.group === groupKey);

          return (
            <button
              key={groupKey}
              type="button"
              className={`records-reliability-legend-btn${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelectGroup(groupKey)}
            >
              <span
                className="records-reliability-legend-dot"
                style={{ background: RELIABILITY_GROUP_COLORS[groupKey] }}
                aria-hidden="true"
              />
              <span>
                {RELIABILITY_GROUP_LABELS[groupKey]} ({formatLegendCount(groupKey, group)})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

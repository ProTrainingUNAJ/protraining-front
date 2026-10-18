import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

const WEEKLY_DATA = [
  { day: 'Lun', rpe: 6.5, load: 450 },
  { day: 'Mar', rpe: 8.2, load: 620 },
  { day: 'Mié', rpe: 5.0, load: 380 },
  { day: 'Jue', rpe: 7.8, load: 590 },
  { day: 'Vie', rpe: 8.5, load: 680 },
  { day: 'Sáb', rpe: 4.0, load: 310 },
  { day: 'Dom', rpe: 0, load: 0 },
];

export const WeeklyLoadSparklineWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`weekly-load-widget ${className}`}
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
          marginBottom: '0.35rem',
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
          <TrendingUp size={14} style={{ color: 'var(--secondary)' }} />
          Carga Semanal (RPE)
        </span>
        <span className="badge badge-primary" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
          Fase: Carga Óptima
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
        <span
          style={{
            fontSize: '1.6rem',
            fontWeight: 900,
            color: 'var(--text-main)',
            lineHeight: 1,
          }}
        >
          3.030
        </span>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          u.a. (Unidades Arbitrarias Foster)
        </span>
      </div>

      {/* Gráfico sparkline interactivo */}
      <div style={{ width: '100%', height: '80px', marginTop: '0.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={WEEKLY_DATA} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="loadSparklineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.45} />
                <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" hide />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <strong>{data.day}</strong>: RPE {data.rpe} ({data.load} u.a.)
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="load"
              stroke="var(--secondary)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#loadSparklineGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

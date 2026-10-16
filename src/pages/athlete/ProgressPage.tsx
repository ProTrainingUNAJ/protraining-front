import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  Activity,
  Calendar,
  Zap,
  Pin,
  ArrowRight,
  Sparkles,
  X,
  LayoutGrid,
  Dumbbell,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { EvolutionChartWidget } from '../../components/athlete/EvolutionChartWidget';
import { EVOLUTION_METRICS } from '../../components/athlete/progressMetricsData';

interface EvaluationItem {
  id: string;
  date: string;
  testName: string;
  result: string;
  delta: string;
  category: string;
}

const HISTORY_EVALUATIONS: EvaluationItem[] = [
  {
    id: 'ev-1',
    date: '08 Oct 2026',
    testName: 'Salto Vertical con Contramovimiento (CMJ)',
    result: '42.5 cm',
    delta: '+2.1 cm',
    category: 'Potencia',
  },
  {
    id: 'ev-2',
    date: '25 Sep 2026',
    testName: '1RM Estimado en Sentadilla Trasera',
    result: '135 kg',
    delta: '+5.0 kg',
    category: 'Fuerza Máxima',
  },
  {
    id: 'ev-3',
    date: '10 Sep 2026',
    testName: 'Sprint 30 metros (Fotocélulas)',
    result: '3.98 seg',
    delta: '-0.07 seg',
    category: 'Velocidad',
  },
  {
    id: 'ev-4',
    date: '20 Ago 2026',
    testName: 'Test Yo-Yo de Recuperación Intermitente (Nivel 1)',
    result: '2.040 m',
    delta: '+160 m',
    category: 'Resistencia',
  },
];

type MetricKey = 'cmj' | 'squat' | 'sprint' | 'rpe' | 'yoyo';

const readExportedState = (): Record<string, string> => {
  try {
    const athleteKey = 'protraining_wireframe_bento_athlete_v4';
    const saved = localStorage.getItem(athleteKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      const mapping: Record<string, string> = {};
      const checkCard = (c: { type?: string; chartMetric?: string; name?: string }) => {
        if (c.type === 'progress-chart' && c.chartMetric) {
          mapping[c.chartMetric] = c.name || 'Burbuja de Inicio';
        }
      };
      if (Array.isArray(parsed.row1)) parsed.row1.forEach(checkCard);
      if (Array.isArray(parsed.row2)) parsed.row2.forEach(checkCard);
      if (Array.isArray(parsed.row3)) parsed.row3.forEach(checkCard);
      return mapping;
    }
  } catch {
    // Ignore fallback
  }
  return {};
};

export const ProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('Últimos 3 meses');
  const [activeMetric, setActiveMetric] = useState<MetricKey>('cmj');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track which metrics are already exported to Home/Dashboard (initialized from localStorage)
  const [exportedMetrics, setExportedMetrics] = useState<Record<string, string>>(readExportedState);

  // Update state after exporting
  const refreshExportedState = () => {
    setExportedMetrics(readExportedState());
  };

  // Retrieve available empty slots from Dashboard
  const getAvailableSlots = () => {
    try {
      const athleteKey = 'protraining_wireframe_bento_athlete_v4';
      const saved = localStorage.getItem(athleteKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const slots: { rowId: number; cardId: string; name: string; colSpan: number }[] = [];

        interface StoredBentoCard {
          id: string;
          name?: string;
          type: string;
          colSpan?: number;
          chartMetric?: string;
        }

        const extractEmpty = (rowArr: unknown, rowNum: number) => {
          if (Array.isArray(rowArr)) {
            (rowArr as StoredBentoCard[]).forEach((c) => {
              if (c.type === 'empty') {
                slots.push({
                  rowId: rowNum,
                  cardId: c.id,
                  name: c.name || `Fila ${rowNum}`,
                  colSpan: c.colSpan || 1,
                });
              }
            });
          }
        };

        extractEmpty(parsed.row1, 1);
        extractEmpty(parsed.row2, 2);
        extractEmpty(parsed.row3, 3);
        return slots;
      }
    } catch {
      // Fallback
    }

    // Default slots if no custom layout is stored yet
    return [
      { rowId: 1, cardId: 'r1-c1', name: 'Módulo 1-A (Fila 1)', colSpan: 1 },
      { rowId: 1, cardId: 'r1-c2', name: 'Módulo 1-B (Fila 1)', colSpan: 1 },
      { rowId: 1, cardId: 'r1-c3', name: 'Módulo 1-C (Fila 1)', colSpan: 1 },
      { rowId: 2, cardId: 'r2-c1', name: 'Módulo 2-A (Fila 2)', colSpan: 1 },
    ];
  };

  // Export selected metric to chosen Dashboard slot
  const handleExportToDashboard = (targetCardId?: string) => {
    try {
      const athleteKey = 'protraining_wireframe_bento_athlete_v4';
      const coachKey = 'protraining_wireframe_bento_coach_v4';

      const updateKey = (key: string) => {
        let parsed: { row1: unknown[]; row2: unknown[]; row3: unknown[] };
        const saved = localStorage.getItem(key);
        if (saved) {
          parsed = JSON.parse(saved);
        } else {
          parsed = {
            row1: [
              { id: 'r1-c1', name: 'Módulo 1-A', colSpan: 1, type: 'empty' },
              { id: 'r1-c2', name: 'Módulo 1-B', colSpan: 1, type: 'empty' },
              { id: 'r1-c3', name: 'Módulo 1-C', colSpan: 1, type: 'empty' },
              { id: 'r1-c4', name: 'Horario y Clima', colSpan: 1, type: 'training-weather' },
            ],
            row2: [
              { id: 'r2-c1', name: 'Módulo 2-A', colSpan: 1, type: 'empty' },
              { id: 'r2-c2', name: 'Módulo 2-B', colSpan: 1, type: 'empty' },
              { id: 'r2-c3', name: 'Módulo 2-C', colSpan: 1, type: 'empty' },
              { id: 'r2-c4', name: 'Módulo 2-D', colSpan: 1, type: 'empty' },
              { id: 'r2-c5', name: 'Módulo 2-E', colSpan: 1, type: 'empty' },
            ],
            row3: [
              { id: 'r3-suite', name: 'ProTraining Suite', colSpan: 2, type: 'suite' },
              { id: 'r3-empty-1', name: 'Módulo 3-B', colSpan: 1, type: 'empty' },
              { id: 'r3-empty-2', name: 'Módulo 3-C', colSpan: 1, type: 'empty' },
            ],
          };
        }

        let assigned = false;
        let assignedCardName = '';

        const replaceInRow = (
          row: { id: string; type: string; name?: string; chartMetric?: string }[],
        ) => {
          return row.map((card) => {
            if (
              !assigned &&
              ((targetCardId && card.id === targetCardId) ||
                (!targetCardId && card.type === 'empty'))
            ) {
              assigned = true;
              assignedCardName = card.name || 'Burbuja';
              return {
                ...card,
                type: 'progress-chart',
                chartMetric: activeMetric,
                name: `Evolución: ${EVOLUTION_METRICS[activeMetric].shortName}`,
              };
            }
            return card;
          });
        };

        if (Array.isArray(parsed.row1))
          parsed.row1 = replaceInRow(
            parsed.row1 as { id: string; type: string; name?: string; chartMetric?: string }[],
          );
        if (!assigned && Array.isArray(parsed.row2))
          parsed.row2 = replaceInRow(
            parsed.row2 as { id: string; type: string; name?: string; chartMetric?: string }[],
          );
        if (!assigned && Array.isArray(parsed.row3))
          parsed.row3 = replaceInRow(
            parsed.row3 as { id: string; type: string; name?: string; chartMetric?: string }[],
          );

        localStorage.setItem(key, JSON.stringify(parsed));
        return { assigned, assignedCardName };
      };

      const result = updateKey(athleteKey);
      updateKey(coachKey);

      refreshExportedState();
      setExportModalOpen(false);

      if (result.assigned) {
        setToastMessage(
          `¡Gráfico de ${EVOLUTION_METRICS[activeMetric].shortName} exportado con éxito a Inicio (${result.assignedCardName})!`,
        );
        setTimeout(() => setToastMessage(null), 6000);
      } else {
        setToastMessage(
          'No se encontraron burbujas vacías en Inicio. Puedes liberar una burbuja en Inicio primero.',
        );
        setTimeout(() => setToastMessage(null), 5000);
      }
    } catch {
      setToastMessage('Hubo un error al exportar el gráfico.');
    }
  };

  const availableSlots = getAvailableSlots();

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Mi Progreso"
        description="Historial de cargas, tests físicos y evolución de rendimiento."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <option value="Último mes">Último mes</option>
              <option value="Últimos 3 meses">Últimos 3 meses</option>
              <option value="Temporada completa">Temporada completa</option>
            </select>
          </div>
        }
      />

      <div className="app-page-body">
        {/* Toast Notificador Flotante */}
        {toastMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              background: 'var(--brand-navy)',
              color: '#ffffff',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--secondary)',
              animation: 'fadeInModal 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Sparkles size={18} style={{ color: 'var(--stat-cyan)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{toastMessage}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'var(--secondary)',
                  padding: '0.35rem 0.8rem',
                  fontSize: '0.78rem',
                  gap: '0.35rem',
                }}
                onClick={() => navigate('/athlete')}
              >
                <span>Ver en Inicio</span>
                <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Métricas Principales de Evolución (4 KPIs Superiores) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* 1. Salto Vertical CMJ */}
          <div
            className="card"
            style={{
              margin: 0,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--stat-cyan-bg)',
                    color: 'var(--stat-cyan)',
                    flexShrink: 0,
                  }}
                >
                  <TrendingUp size={18} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Salto Vertical CMJ
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <strong
                  style={{
                    fontSize: '1.65rem',
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  42.5
                </strong>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  cm
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '0.65rem',
                fontSize: '0.78rem',
              }}
            >
              <span
                style={{
                  padding: '0.15rem 0.45rem',
                  borderRadius: '6px',
                  background: 'var(--stat-green-bg)',
                  color: 'var(--stat-green)',
                  fontWeight: 800,
                }}
              >
                +5.2%
              </span>
              <span style={{ color: 'var(--text-muted)' }}>vs. inicio de temporada</span>
            </div>
          </div>

          {/* 2. Asistencia a Sesiones */}
          <div
            className="card"
            style={{
              margin: 0,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--stat-green-bg)',
                    color: 'var(--stat-green)',
                    flexShrink: 0,
                  }}
                >
                  <Award size={18} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Asistencia a Sesiones
                </span>
              </div>
              <strong
                style={{
                  fontSize: '1.65rem',
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                96%
              </strong>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '0.65rem',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
              }}
            >
              <span
                style={{
                  padding: '0.15rem 0.45rem',
                  borderRadius: '6px',
                  background: 'var(--stat-green-bg)',
                  color: 'var(--stat-green)',
                  fontWeight: 800,
                }}
              >
                24 / 25
              </span>
              <span>sesiones completadas</span>
            </div>
          </div>

          {/* 3. Carga RPE Promedio */}
          <div
            className="card"
            style={{
              margin: 0,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              boxSizing: 'border-box',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: 'var(--stat-purple-bg)',
                      color: 'var(--stat-purple)',
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={18} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    Carga RPE Promedio
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '6px',
                    background: 'var(--stat-purple-bg)',
                    color: 'var(--stat-purple)',
                    border: '1px solid var(--stat-purple-border)',
                  }}
                >
                  Borg CR10
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <strong
                  style={{
                    fontSize: '1.65rem',
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  7.2
                </strong>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  / 10
                </span>
              </div>
            </div>

            <div style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '0.35rem',
                }}
              >
                <div
                  style={{
                    width: '72%',
                    height: '100%',
                    background:
                      'linear-gradient(90deg, var(--stat-cyan) 0%, var(--stat-purple) 100%)',
                    borderRadius: '3px',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.76rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Esfuerzo programado</span>
                <span style={{ color: 'var(--stat-purple)', fontWeight: 800 }}>
                  Óptimo (Zona 4)
                </span>
              </div>
            </div>
          </div>

          {/* 4. Potencia Pico Relativa */}
          <div
            className="card"
            style={{
              margin: 0,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--stat-amber-bg)',
                    color: 'var(--stat-amber)',
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} strokeWidth={2.5} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  Potencia Pico Relativa
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <strong
                  style={{
                    fontSize: '1.65rem',
                    color: 'var(--text-main)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  54.2
                </strong>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  W/kg
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                marginTop: '0.65rem',
                fontSize: '0.78rem',
              }}
            >
              <span
                style={{
                  padding: '0.15rem 0.45rem',
                  borderRadius: '6px',
                  background: 'var(--stat-amber-bg)',
                  color: 'var(--stat-amber)',
                  fontWeight: 800,
                }}
              >
                Élite
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Nivel competitivo</span>
            </div>
          </div>
        </div>

        {/* ── SECCIÓN NUEVA: Gráficos de Evolución Deportiva y Exportación a Inicio ── */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Cabecera y Selector de Métricas */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.2rem',
                }}
              >
                <TrendingUp size={18} style={{ color: 'var(--secondary)' }} />
                <h2
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 800,
                    margin: 0,
                    color: 'var(--text-main)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Gráficos de Evolución Deportiva
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Monitoreo continuo de fuerza, potencia, velocidad y resistencia. Podés exportar
                cualquier gráfico como burbuja en tu pantalla de Inicio.
              </p>
            </div>

            {/* Chips de selección de métrica */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(
                [
                  { key: 'cmj', label: 'Salto CMJ', icon: <TrendingUp size={13} /> },
                  { key: 'squat', label: '1RM Sentadilla', icon: <Dumbbell size={13} /> },
                  { key: 'sprint', label: 'Sprint 30m', icon: <Zap size={13} /> },
                  { key: 'rpe', label: 'Carga RPE', icon: <Activity size={13} /> },
                  { key: 'yoyo', label: 'Test Yo-Yo', icon: <Award size={13} /> },
                ] as { key: MetricKey; label: string; icon: React.ReactNode }[]
              ).map((m) => {
                const isSelected = activeMetric === m.key;
                const isPinned = !!exportedMetrics[m.key];

                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setActiveMetric(m.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSelected
                        ? '1.5px solid var(--secondary)'
                        : '1px solid var(--border)',
                      background: isSelected ? 'var(--secondary)' : 'var(--bg-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-main)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                    {isPinned && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: isSelected ? '#ffffff' : 'var(--stat-green)',
                        }}
                        title="Fijado en Inicio"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gráfico Activo en Gran Formato */}
          <EvolutionChartWidget
            metricKey={activeMetric}
            variant="full"
            isExported={!!exportedMetrics[activeMetric]}
            onExportClick={() => setExportModalOpen(true)}
          />
        </div>

        {/* Historial de Evaluaciones Físicas */}
        <div className="card" style={{ margin: 0, padding: '1.5rem' }}>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              marginBottom: '0.35rem',
              color: 'var(--text-main)',
            }}
          >
            Registro de Evaluaciones Físicas
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Resultados de las mediciones realizadas por el cuerpo técnico en campo y gimnasio.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {HISTORY_EVALUATIONS.map((evalItem) => (
              <div
                key={evalItem.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        color: 'var(--text-muted)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid var(--border)',
                      }}
                    >
                      {evalItem.category}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {evalItem.date}
                    </span>
                  </div>
                  <strong
                    style={{ fontSize: '0.95rem', color: 'var(--text-main)', display: 'block' }}
                  >
                    {evalItem.testName}
                  </strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'block',
                      }}
                    >
                      Resultado
                    </span>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                      {evalItem.result}
                    </strong>
                  </div>

                  <span
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '8px',
                      background: 'var(--stat-green-bg)',
                      color: 'var(--stat-green)',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                    }}
                  >
                    {evalItem.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modal Selector para Exportar Gráfico a una Burbuja de Inicio ── */}
      {exportModalOpen && (
        <div className="routine-modal-backdrop" onClick={() => setExportModalOpen(false)}>
          <div
            className="routine-modal-card"
            style={{ maxWidth: '580px' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="routine-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--stat-cyan-bg)',
                    color: 'var(--stat-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pin size={18} style={{ transform: 'rotate(45deg)' }} />
                </div>
                <div>
                  <h3 className="routine-modal-title">Exportar a Inicio</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Fijar gráfico de {EVOLUTION_METRICS[activeMetric].name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="routine-modal-close-btn"
                onClick={() => setExportModalOpen(false)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="routine-modal-body" style={{ gap: '1.15rem' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                El gráfico se adaptará automáticamente a la burbuja que elijas en el Bento Grid de
                tu pantalla principal (Fila 1, 2 o 3).
              </p>

              {/* Botón de asignación rápida */}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleExportToDashboard()}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.9rem',
                }}
              >
                <Sparkles size={16} />
                <span>Fijar en la primera burbuja libre disponible</span>
              </button>

              <div style={{ position: 'relative', textAlign: 'center', margin: '0.25rem 0' }}>
                <span
                  style={{
                    background: 'var(--bg-card)',
                    padding: '0 0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  o elegí una burbuja específica:
                </span>
              </div>

              {/* Lista de burbujas vacías */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '220px',
                  overflowY: 'auto',
                }}
              >
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.cardId}
                      type="button"
                      onClick={() => handleExportToDashboard(slot.cardId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.95rem',
                        borderRadius: '10px',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LayoutGrid size={15} style={{ color: 'var(--secondary)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{slot.name}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {slot.colSpan === 2 ? '2 columnas' : '1 columna'} · Disponible
                      </span>
                    </button>
                  ))
                ) : (
                  <p
                    style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}
                  >
                    Todas las burbujas están ocupadas actualmente.
                  </p>
                )}
              </div>
            </div>

            <div className="routine-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExportModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

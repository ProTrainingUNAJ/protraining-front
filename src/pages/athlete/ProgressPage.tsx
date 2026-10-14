import React, { useState } from 'react';
import { TrendingUp, Award, Activity, Calendar, Zap } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';

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

export const ProgressPage: React.FC = () => {
  const [period, setPeriod] = useState('Últimos 3 meses');

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
        {/* Métricas Principales de Evolución */}
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

          {/* 3. Carga RPE Promedio (Destacada con alto contraste) */}
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

            {/* Barra de progreso de carga RPE */}
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
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '1rem 1.15rem',
                  borderRadius: '10px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
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
                    <span className="badge badge-info">{evalItem.category}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {evalItem.date}
                    </span>
                  </div>
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                    {evalItem.testName}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}
                    >
                      Resultado
                    </span>
                    <strong style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>
                      {evalItem.result}
                    </strong>
                  </div>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      background: 'var(--stat-green-bg)',
                      color: 'var(--stat-green)',
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
    </div>
  );
};

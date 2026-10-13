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
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--secondary)',
                marginBottom: '0.35rem',
              }}
            >
              <TrendingUp size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Salto Vertical CMJ</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>42.5 cm</strong>
            <small
              style={{
                color: 'var(--success-text)',
                display: 'block',
                marginTop: '0.25rem',
                fontWeight: 600,
              }}
            >
              +5.2% vs. inicio de temporada
            </small>
          </div>

          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--success-text)',
                marginBottom: '0.35rem',
              }}
            >
              <Award size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Asistencia a Sesiones</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>96%</strong>
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              24 de 25 sesiones completadas
            </small>
          </div>

          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--primary)',
                marginBottom: '0.35rem',
              }}
            >
              <Activity size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Carga RPE Promedio</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>7.2 / 10</strong>
            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
              Esfuerzo óptimo programado
            </small>
          </div>

          <div className="card" style={{ margin: 0, padding: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--warning-text, #eab308)',
                marginBottom: '0.35rem',
              }}
            >
              <Zap size={18} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Potencia Pico Relativa</span>
            </div>
            <strong style={{ fontSize: '1.6rem', color: 'var(--text-main)' }}>54.2 W/kg</strong>
            <small
              style={{
                color: 'var(--success-text)',
                display: 'block',
                marginTop: '0.25rem',
                fontWeight: 600,
              }}
            >
              Nivel de élite competitivo
            </small>
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
                  padding: '1rem',
                  borderRadius: '10px',
                  background: 'var(--bg-subtle)',
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
                  <span className="badge badge-success" style={{ fontWeight: 700 }}>
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

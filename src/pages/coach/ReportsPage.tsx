import React, { useState } from 'react';
import { BarChart3, Download, FileText, Calendar, Filter } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';

interface ReportCard {
  id: string;
  title: string;
  category: string;
  dateGenerated: string;
  description: string;
  format: 'PDF' | 'Excel';
}

const INITIAL_REPORTS: ReportCard[] = [
  {
    id: 'rep-1',
    title: 'Informe Semanal de Carga Aguda vs. Crónica (A:C Ratio)',
    category: 'Cargas y Fatiga',
    dateGenerated: '12 Oct 2026',
    description: 'Análisis de ratio de esfuerzo y prevención de sobreentrenamiento del plantel.',
    format: 'PDF',
  },
  {
    id: 'rep-2',
    title: 'Resultados del Test de Potencia Muscular (CMJ)',
    category: 'Evaluaciones Físicas',
    dateGenerated: '08 Oct 2026',
    description: 'Medición de altura de salto, tiempo de vuelo y asimetría de piernas.',
    format: 'Excel',
  },
  {
    id: 'rep-3',
    title: 'Consolidado Mensual de Asistencia y Cumplimiento',
    category: 'Asistencia',
    dateGenerated: '30 Sep 2026',
    description: 'Porcentaje de presencias, ausencias justificadas y sesiones diferenciadas.',
    format: 'PDF',
  },
  {
    id: 'rep-4',
    title: 'Reporte de Bienestar y Recuperación (Wellness)',
    category: 'Salud y Monitoreo',
    dateGenerated: '28 Sep 2026',
    description: 'Promedios de sueño, estrés y dolor muscular recopilados vía check-in.',
    format: 'PDF',
  },
];

export const ReportsPage: React.FC = () => {
  const [reports] = useState<ReportCard[]>(INITIAL_REPORTS);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  const filteredReports = reports.filter(
    (r) => selectedCategory === 'Todas' || r.category === selectedCategory,
  );

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Informes"
        description="Reportes de rendimiento deportivo, evolución física y análisis de métricas."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            title="Generar nuevo reporte personalizado"
          >
            <BarChart3 size={16} aria-hidden="true" />
            <span>Generar Informe</span>
          </button>
        }
      />

      <div className="app-page-body">
        {/* Controles de Filtrado */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Tipo de informe:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
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
              <option value="Todas">Todos los informes</option>
              <option value="Cargas y Fatiga">Cargas y Fatiga</option>
              <option value="Evaluaciones Físicas">Evaluaciones Físicas</option>
              <option value="Asistencia">Asistencia</option>
              <option value="Salud y Monitoreo">Salud y Monitoreo</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <Calendar size={15} />
            <span>Últimos 30 días</span>
          </div>
        </div>

        {/* Listado de Informes Disponibles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredReports.map((rep) => (
            <div
              key={rep.id}
              className="card"
              style={{
                margin: 0,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span className="badge badge-info">{rep.category}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {rep.dateGenerated}
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: '0 0 0.4rem',
                    color: 'var(--text-main)',
                    lineHeight: 1.3,
                  }}
                >
                  {rep.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {rep.description}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                  }}
                >
                  <FileText size={14} /> Formato {rep.format}
                </span>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', gap: '0.35rem' }}
                >
                  <Download size={13} />
                  <span>Descargar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

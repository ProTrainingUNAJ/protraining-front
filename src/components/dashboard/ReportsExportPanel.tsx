import React, { useState } from 'react';
import {
  Printer,
  ClipboardCopy,
  Check,
  Calendar,
  Users,
  Activity,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import type { CategoryDashboardSummary } from '../../types/categoryDashboard';
import './ReportsExportPanel.css';

export interface ReportsExportPanelProps {
  organizationName?: string;
  categoryName?: string;
  summary: CategoryDashboardSummary | null;
  periodLabel?: string;
}

export type ReportType = 'executive' | 'attendance' | 'health' | 'records';

const REPORT_TITLES: Record<ReportType, string> = {
  executive: 'Informe Ejecutivo: Rendimiento y Disponibilidad del Plantel',
  attendance: 'Reporte Detallado de Asistencia, Minutos y Carga Diaria',
  health: 'Reporte Epidemiológico y Monitoreo de Lesiones',
  records: 'Auditoría de Marcas Personales y Confiabilidad de 1RM',
};

export const ReportsExportPanel: React.FC<ReportsExportPanelProps> = ({
  organizationName = 'Todas las organizaciones',
  categoryName = 'Todas las categorías',
  summary,
  periodLabel = 'Últimos 30 días',
}) => {
  const [reportType, setReportType] = useState<ReportType>('executive');
  const [copied, setCopied] = useState(false);

  // Generar CSV descargable según el reporte
  const handleDownloadCsv = () => {
    let csvContent = '\uFEFF'; // BOM para que Excel abra UTF-8 con tildes correctamente
    const dateStr = new Date().toLocaleDateString('es-AR');

    if (reportType === 'executive' || reportType === 'attendance') {
      csvContent += `PROTRAINING - REPORTE EJECUTIVO DE CATEGORÍA\r\n`;
      csvContent += `Organización;${organizationName}\r\n`;
      csvContent += `Categoría;${categoryName}\r\n`;
      csvContent += `Período;${periodLabel}\r\n`;
      csvContent += `Fecha de emisión;${dateStr}\r\n\r\n`;
      csvContent += `Métrica;Valor;Detalle\r\n`;
      csvContent += `Atletas Evaluados;${summary?.athleteCount ?? 0};Total de deportistas con actividad\r\n`;
      csvContent += `Presentismo Promedio;${summary?.attendance.attendancePercentage ?? 0}%;Días presentes sobre días evaluados\r\n`;
      csvContent += `Días Presentes;${summary?.attendance.presentDays ?? 0};Sesiones asistidas\r\n`;
      csvContent += `Días Ausentes;${summary?.attendance.absentDays ?? 0};Faltas registradas\r\n`;
      csvContent += `Carga Total Acumulada;${summary?.load.totalLoad ?? 0} UA;Unidades Arbitrarias (Foster)\r\n`;
      csvContent += `Minutos Totales;${summary?.load.totalMinutes ?? 0} min;Tiempo de entrenamiento\r\n`;
      csvContent += `Lesiones Activas;${summary?.injuries.activeCount ?? 0};Atletas no aptos\r\n`;
      csvContent += `En Readaptación;${summary?.injuries.inRecoveryCount ?? 0};Atletas con plan diferenciado\r\n`;
      csvContent += `Altas en el Período;${summary?.injuries.clearedInPeriodCount ?? 0};Recuperaciones completadas\r\n`;
    } else if (reportType === 'health') {
      csvContent += `PROTRAINING - REPORTE DE SALUD Y READINESS\r\n`;
      csvContent += `Organización;${organizationName}\r\n`;
      csvContent += `Categoría;${categoryName}\r\n`;
      csvContent += `Período;${periodLabel}\r\n\r\n`;
      csvContent += `Estado;Cantidad;Porcentaje Estimado\r\n`;
      csvContent += `Lesiones Activas;${summary?.injuries.activeCount ?? 0};Atención Crítica\r\n`;
      csvContent += `En Recuperación;${summary?.injuries.inRecoveryCount ?? 0};Precaución\r\n`;
      csvContent += `Altas Médicas;${summary?.injuries.clearedInPeriodCount ?? 0};Retorno a la práctica\r\n`;
      csvContent += `Atletas Afectados;${summary?.injuries.athletesAffected ?? 0};Total con antecedentes en el rango\r\n`;
    } else {
      csvContent += `PROTRAINING - REPORTE DE CONFIABILIDAD DE FUERZA (1RM)\r\n`;
      csvContent += `Organización;${organizationName}\r\n`;
      csvContent += `Categoría;${categoryName}\r\n`;
      csvContent += `Fecha;${dateStr}\r\n\r\n`;
      csvContent += `Nivel;Criterio;Estado de Auditoría\r\n`;
      csvContent += `Alta Confiabilidad;Tests recientes y consistentes;Apto para prescripción\r\n`;
      csvContent += `Confiabilidad Media;Estimación Epley o > 30 días;Revisión sugerida\r\n`;
      csvContent += `Sin Datos Recientes;Requiere toma de test;Pendiente de evaluación\r\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Reporte_${reportType}_${categoryName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copia un resumen en texto plano, legible en un mail, un chat o un documento (KAN-660)
  const handleCopyReport = () => {
    navigator.clipboard.writeText(buildReportSummaryText()).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      },
      () => setCopied(false),
    );
  };

  const buildReportSummaryText = () =>
    [
      `ProTraining · ${REPORT_TITLES[reportType]}`,
      `Organización: ${organizationName}`,
      `Categoría: ${categoryName}`,
      `Período: ${periodLabel}`,
      `Emitido: ${new Date().toLocaleDateString('es-AR')}`,
      '',
      'Métricas del plantel',
      `- Atletas en seguimiento: ${summary?.athleteCount ?? 0}`,
      `- Presentismo promedio: ${summary?.attendance.attendancePercentage ?? 0} % (${summary?.attendance.presentDays ?? 0} presentes, ${summary?.attendance.absentDays ?? 0} ausentes)`,
      `- Carga total acumulada: ${summary?.load.totalLoad ?? 0} UA (${summary?.load.totalMinutes ?? 0} min)`,
      `- Lesiones activas: ${summary?.injuries.activeCount ?? 0}`,
      `- En readaptación: ${summary?.injuries.inRecoveryCount ?? 0}`,
      `- Altas en el período: ${summary?.injuries.clearedInPeriodCount ?? 0}`,
    ].join('\n');

  // Imprimir reporte maquetado
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="reports-export"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Barra de opciones de reporte y acciones de exportación (no se imprime) */}
      <div
        className="card reports-export__toolbar"
        style={{
          margin: 0,
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <label
            htmlFor="report-type-select"
            style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
          >
            Tipo de Informe:
          </label>
          <select
            id="report-type-select"
            aria-label="Seleccionar tipo de informe"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="executive">📊 Resumen Ejecutivo Integral</option>
            <option value="attendance">📋 Planilla de Asistencia & Carga (RPE)</option>
            <option value="health">🛡️ Historial de Lesiones y Readiness</option>
            <option value="records">🏋️ Auditoría de Fuerza y Récords (1RM)</option>
          </select>
        </div>

        {/* Acciones de exportación (KAN-660) */}
        <div className="reports-export-actions">
          <button
            type="button"
            className="btn btn-secondary reports-export-btn"
            onClick={handleDownloadCsv}
            title="Descargar archivo estructurado CSV compatible con Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Descargar CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary reports-export-btn"
            onClick={handlePrint}
            title="Imprimir o guardar como documento PDF oficial"
          >
            <Printer size={16} />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            className={`btn reports-export-btn ${copied ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleCopyReport}
            title="Copiar el resumen del informe como texto"
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <ClipboardCopy size={16} aria-hidden="true" />
            )}
            <span>{copied ? 'Copiado' : 'Copiar informe'}</span>
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? 'Informe copiado al portapapeles' : ''}
          </span>
        </div>
      </div>

      {/* Previsualización del Informe: es lo único que sale al imprimir */}
      <div
        className="card reports-export__sheet"
        style={{
          margin: 0,
          padding: '1.75rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
        }}
      >
        {/* Cabecera del Documento Oficial */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.35rem',
              }}
            >
              <span
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Documento Oficial
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Emitido el {new Date().toLocaleDateString('es-AR')}
              </span>
            </div>
            <h2
              style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}
            >
              {REPORT_TITLES[reportType]}
            </h2>
            <div
              style={{
                display: 'flex',
                gap: '1.5rem',
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                <strong>Organización:</strong> {organizationName}
              </span>
              <span>
                <strong>Categoría:</strong> {categoryName}
              </span>
              <span>
                <strong>Ventana temporal:</strong> {periodLabel}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 900,
                color: 'var(--primary)',
                letterSpacing: '-0.5px',
              }}
            >
              PROTRAINING
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Plataforma de Alto Rendimiento
            </div>
          </div>
        </div>

        {/* Tarjetas de métricas consolidadas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              padding: '1.1rem',
              borderRadius: '12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Users size={16} />
              <span>Plantel Activo</span>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '0.35rem',
              }}
            >
              {summary?.athleteCount ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Atletas con registro en el ciclo
            </div>
          </div>

          <div
            style={{
              padding: '1.1rem',
              borderRadius: '12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Calendar size={16} />
              <span>Presentismo General</span>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '0.35rem',
              }}
            >
              {summary?.attendance.attendancePercentage ?? 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {summary?.attendance.presentDays ?? 0} presentes ·{' '}
              {summary?.attendance.absentDays ?? 0} ausentes
            </div>
          </div>

          <div
            style={{
              padding: '1.1rem',
              borderRadius: '12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#10b981',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <Activity size={16} />
              <span>Carga Acumulada</span>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '0.35rem',
              }}
            >
              {summary?.load.totalLoad ? `${summary.load.totalLoad} UA` : '0 UA'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {summary?.load.totalMinutes ?? 0} minutos totales (Foster)
            </div>
          </div>

          <div
            style={{
              padding: '1.1rem',
              borderRadius: '12px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#ef4444',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={16} />
              <span>Estado Clínico</span>
            </div>
            <div
              style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                marginTop: '0.35rem',
              }}
            >
              {summary?.injuries.activeCount ?? 0}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                activas
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {summary?.injuries.inRecoveryCount ?? 0} en readaptación ·{' '}
              {summary?.injuries.clearedInPeriodCount ?? 0} altas
            </div>
          </div>
        </div>

        {/* Tabla resumen del reporte */}
        <div
          className="reports-export__table"
          style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}
              >
                <th
                  style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}
                >
                  Dimensión Evaluada
                </th>
                <th
                  style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}
                >
                  Métrica Observada
                </th>
                <th
                  style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}
                >
                  Estado / Diagnóstico
                </th>
                <th
                  style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}
                >
                  Recomendación Técnica
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                  Asistencia & Compromiso
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {summary?.attendance.attendancePercentage ?? 0}% de regularidad
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      color:
                        (summary?.attendance.attendancePercentage ?? 0) >= 80
                          ? '#10b981'
                          : '#f59e0b',
                      fontWeight: 700,
                    }}
                  >
                    {(summary?.attendance.attendancePercentage ?? 0) >= 80 ? 'Óptimo' : 'Regular'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                  Mantener registro diario y evaluar causas de inasistencias en la planilla de
                  asistencia.
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                  Carga & Intensidad (Foster)
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {summary?.load.totalLoad ?? 0} UA registradas
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>Dentro de rango seguro</span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                  Regular los picos de UA previos a fechas de competencia oficial en el calendario.
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                  Prevención & Readaptación
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {summary?.injuries.activeCount ?? 0} atletas lesionados
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      color: (summary?.injuries.activeCount ?? 0) > 0 ? '#ef4444' : '#10b981',
                      fontWeight: 700,
                    }}
                  >
                    {(summary?.injuries.activeCount ?? 0) > 0
                      ? 'Atención Prioritaria'
                      : 'Plantel Disponible'}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                  Supervisar planes diferenciados y confirmar alta médica antes de reincorporar al
                  grupo.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

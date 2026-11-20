import React from 'react';
import { Activity, AlertCircle, BarChart3, ClipboardList, HeartPulse, Loader2 } from 'lucide-react';
import type { CategoryDashboardSummary } from '../../types/categoryDashboard';
import { formatIsoDate } from '../../utils/argentinaDate';
import { EmptyState } from '../EmptyState';
import { CategoryMetricsChart } from './CategoryMetricsChart';

export interface CategoryMetricsPanelProps {
  summary: CategoryDashboardSummary | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function hasData(summary: CategoryDashboardSummary): boolean {
  return (
    summary.attendance.evaluatedAthleteDays > 0 ||
    summary.load.recordsCount > 0 ||
    summary.injuries.activeCount > 0 ||
    summary.injuries.inRecoveryCount > 0 ||
    summary.injuries.clearedInPeriodCount > 0
  );
}

// Resumen ejecutivo de la categoría: presentismo, lesiones y carga.
// Todos los valores son agregados; nunca se muestran atletas ni datos clínicos individuales.
export const CategoryMetricsPanel: React.FC<CategoryMetricsPanelProps> = ({
  summary,
  loading = false,
  error = null,
  onRetry,
}) => {
  if (loading) {
    return (
      <div
        className="card category-dashboard-state-card"
        role="status"
        aria-label="Cargando resumen de la categoría"
        data-testid="category-dashboard-loading"
      >
        <Loader2 size={26} className="plan-spin" aria-hidden="true" />
        <p className="category-dashboard-state-text">Cargando el resumen de la categoría…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert-banner danger" role="alert" data-testid="category-dashboard-error">
        <div className="category-dashboard-alert-row">
          <span className="plan-inline">
            <AlertCircle size={18} aria-hidden="true" />
            {error}
          </span>
          {onRetry && (
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!summary || !hasData(summary)) {
    return (
      <div data-testid="category-dashboard-empty">
        <EmptyState
          icon={BarChart3}
          title="Todavía no hay registros en el período"
          description="Cuando los atletas carguen entrenamientos o se registren correcciones de asistencia, vas a ver acá el presentismo, las lesiones y la carga total de la categoría."
        />
      </div>
    );
  }

  const { attendance, injuries, load } = summary;

  return (
    <div
      className="category-dashboard-panel"
      data-testid="category-dashboard-panel"
      role="region"
      aria-label="Resumen de presentismo, lesiones y carga"
    >
      <div className="category-dashboard-period">
        Período: {formatIsoDate(summary.from)} al {formatIsoDate(summary.to)}
      </div>

      <div className="category-dashboard-kpis">
        <article className="category-dashboard-kpi">
          <div className="category-dashboard-kpi-header">
            <Activity size={18} aria-hidden="true" />
            <h2>Presentismo</h2>
          </div>
          <p className="category-dashboard-kpi-value" data-testid="category-dashboard-attendance">
            {attendance.attendancePercentage.toFixed(1)}%
          </p>
          <p className="category-dashboard-kpi-detail">
            {attendance.presentDays} de {attendance.evaluatedAthleteDays} días-atleta evaluados
          </p>
          <p className="category-dashboard-kpi-hint">
            {attendance.absentDays} ausencias · {attendance.withoutRecordDays} sin registro
          </p>
        </article>

        <article className="category-dashboard-kpi">
          <div className="category-dashboard-kpi-header">
            <HeartPulse size={18} aria-hidden="true" />
            <h2>Lesiones</h2>
          </div>
          <p className="category-dashboard-kpi-value" data-testid="category-dashboard-injuries">
            {injuries.activeCount} activas
          </p>
          <p className="category-dashboard-kpi-detail">
            {injuries.inRecoveryCount} en recuperación · {injuries.clearedInPeriodCount} altas
          </p>
          <p className="category-dashboard-kpi-hint">
            {injuries.athletesAffected} atletas afectados
          </p>
        </article>

        <article className="category-dashboard-kpi">
          <div className="category-dashboard-kpi-header">
            <BarChart3 size={18} aria-hidden="true" />
            <h2>Carga total</h2>
          </div>
          <p className="category-dashboard-kpi-value" data-testid="category-dashboard-load">
            {load.totalLoad.toLocaleString('es-AR')} UA
          </p>
          <p className="category-dashboard-kpi-detail">
            {load.totalMinutes.toLocaleString('es-AR')} minutos
          </p>
          <p className="category-dashboard-kpi-hint">
            {load.recordsCount} {load.recordsCount === 1 ? 'registro' : 'registros'}
          </p>
        </article>

        <article className="category-dashboard-kpi">
          <div className="category-dashboard-kpi-header">
            <ClipboardList size={18} aria-hidden="true" />
            <h2>Días evaluados</h2>
          </div>
          <p className="category-dashboard-kpi-value">{summary.evaluatedDays}</p>
          <p className="category-dashboard-kpi-detail">
            con carga o correcciones en {summary.athleteCount}{' '}
            {summary.athleteCount === 1 ? 'atleta' : 'atletas'}
          </p>
          <p className="category-dashboard-kpi-hint">
            Días con carga o corrección (la corrección prevalece)
          </p>
        </article>
      </div>

      <section
        className="category-dashboard-section"
        aria-labelledby="category-dashboard-chart-title"
      >
        <h2 id="category-dashboard-chart-title">Carga por semana</h2>
        {load.weeks.length > 0 ? (
          <CategoryMetricsChart weeks={load.weeks} />
        ) : (
          <p className="category-dashboard-state-text">No hay cargas registradas en el período.</p>
        )}
      </section>

      <p className="category-dashboard-privacy-note">
        Solo se muestran totales anónimos de la categoría.
      </p>
    </div>
  );
};

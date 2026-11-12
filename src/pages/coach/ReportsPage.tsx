import { BarChart3 } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';

// Los informes descargables todavía no existen: la pantalla lo dice en lugar de mostrar ejemplos
export function ReportsPage() {
  return (
    <div className="app-page-container">
      <PageHeader
        title="Informes"
        description="Reportes de rendimiento deportivo, evolución física y análisis de métricas."
      />
      <div className="app-page-body">
        <EmptyState
          icon={BarChart3}
          title="Los informes van a estar disponibles próximamente"
          description="Mientras tanto, el estado del plantel lo ves en Seguimiento y la evolución de cada atleta en su ficha."
        />
      </div>
    </div>
  );
}

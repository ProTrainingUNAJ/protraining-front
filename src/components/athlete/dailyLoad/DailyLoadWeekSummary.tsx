import React from 'react';
import { Flame } from 'lucide-react';
import type { AthleteWeek } from '../../../types/seguimiento';
import { WeekCompletionStrip } from '../WeekCompletionStrip';

interface DailyLoadWeekSummaryProps {
  week: AthleteWeek | null;
  isLoading: boolean;
}

export const DailyLoadWeekSummary: React.FC<DailyLoadWeekSummaryProps> = ({ week, isLoading }) => {
  const completedDaysCount = week?.days ? week.days.filter((d) => d.completed).length : 0;

  return (
    <section className="dl-week-summary-card" aria-label="Semana del atleta">
      <div className="dl-week-summary-header">
        <div className="dl-week-summary-title-wrap">
          <h2 className="dl-week-summary-title">Tu semana</h2>
          <span className="dl-week-summary-subtitle">
            {completedDaysCount} de 7 días con actividad
          </span>
        </div>

        {completedDaysCount > 0 && (
          <div
            className="dl-week-streak-badge"
            aria-label={`${completedDaysCount} de 7 días con actividad`}
          >
            <Flame size={15} className="dl-streak-icon" />
            <span>{completedDaysCount} de 7 días con actividad</span>
          </div>
        )}
      </div>

      <div className="dl-week-strip-wrap">
        <WeekCompletionStrip days={week?.days ?? []} isLoading={isLoading} />
      </div>

      {!isLoading && (!week || week.days.length === 0) && (
        <p className="dl-week-empty">No se pudo cargar la semana. Reintentá en unos segundos.</p>
      )}
    </section>
  );
};

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { structureService } from '../../api/structureService';
import { matchesApi } from '../../api/matches';
import type { Match, SeasonPhase } from '../../types/structure';
import { todayInArgentina } from '../../utils/argentinaDate';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { daysFromToday, formatWeekdayDayMonth } from './dashboardDates';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';
import './NextMatchWidget.css';

// Hasta dónde se busca el próximo partido
export const NEXT_MATCH_LOOKAHEAD_DAYS = 30;

const VENUE_LABEL: Record<Match['homeOrAway'], string> = {
  Home: 'Local',
  Away: 'Visitante',
  Neutral: 'Neutral',
};

interface NextMatch {
  match: Match;
  groupLabel: string;
  phase: SeasonPhase | null;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; next: NextMatch | null };

function countdownLabel(days: number): string {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `Faltan ${days} días`;
}

// La fase vigente hoy (por ejemplo, "Pretemporada" hasta el viernes)
function currentPhase(phases: SeasonPhase[], today: string): SeasonPhase | null {
  return phases.find((phase) => phase.startDate <= today && today <= phase.endDate) ?? null;
}

/**
 * Próximo partido (menú "+" del Inicio del PF, KAN-594): el partido más cercano de cualquier
 * categoría del PF en los próximos 30 días, con rival, local o visitante, día y hora en hora
 * Argentina, cuánto falta y la fase de la temporada vigente.
 */
export const NextMatchWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const showSkeleton = useDelayedLoading(state.status === 'loading');
  const today = todayInArgentina();

  useEffect(() => {
    let active = true;

    async function load(): Promise<NextMatch | null> {
      const [organizations, categories] = await Promise.all([
        structureService.getOrganizations().catch(() => []),
        structureService.getCategories(),
      ]);
      if (categories.length === 0) return null;
      const orgNames = new Map(organizations.map((org) => [org.id, org.name]));

      const results = await Promise.allSettled(
        categories.map((category) => matchesApi.getCategoryMatches(category.id)),
      );
      if (results.every((result) => result.status === 'rejected')) {
        throw new Error('No se pudo consultar el calendario de partidos.');
      }

      const upcoming = results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
        .filter((match) => {
          const days = daysFromToday(match.matchDate, today);
          return days >= 0 && days <= NEXT_MATCH_LOOKAHEAD_DAYS;
        })
        .sort((a, b) => a.matchDate.localeCompare(b.matchDate));
      const match = upcoming[0];
      if (!match) return null;

      const category = categories.find((item) => item.id === match.categoryId);
      const orgName = category ? orgNames.get(category.organizationId) : undefined;
      const groupLabel = category
        ? orgName
          ? `${orgName} · ${category.name}`
          : category.name
        : 'Categoría';
      // La fase es un extra: si falla, se muestra igual el partido.
      const phases = await matchesApi.getCategorySeasonPhases(match.categoryId).catch(() => []);
      return { match, groupLabel, phase: currentPhase(phases, today) };
    }

    load()
      .then((next) => {
        if (active) setState({ status: 'ready', next });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          message:
            err instanceof Error && err.message
              ? err.message
              : 'No se pudo consultar el calendario de partidos.',
        });
      });
    return () => {
      active = false;
    };
  }, [reloadKey, today]);

  const retry = () => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  };

  const next = state.status === 'ready' ? state.next : null;
  const days = next ? daysFromToday(next.match.matchDate, today) : 0;
  const time = next?.match.startTime ? next.match.startTime.slice(0, 5) : null;

  return (
    <section className={`dash-w next-match-widget ${className}`} aria-labelledby="next-match-title">
      <header className="dash-w__header">
        <h3 id="next-match-title" className="dash-w__eyebrow">
          <Trophy size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Próximo partido
        </h3>
        {next && <span className="dash-w__count">{countdownLabel(days)}</span>}
      </header>

      {state.status === 'loading' &&
        (showSkeleton ? (
          <div role="status" aria-label="Cargando el calendario">
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null)}

      {state.status === 'error' && <WidgetErrorState message={state.message} onRetry={retry} />}

      {state.status === 'ready' && !next && (
        <p className="dash-w__empty">
          No hay partidos cargados en los próximos {NEXT_MATCH_LOOKAHEAD_DAYS} días.
        </p>
      )}

      {next && (
        <>
          <div className="next-match-widget__body">
            <span className="next-match-widget__opponent">vs. {next.match.opponent}</span>
            <span className="next-match-widget__when">
              {formatWeekdayDayMonth(next.match.matchDate)}
              {time ? ` · ${time}` : ''}
              <span className="next-match-widget__venue">{VENUE_LABEL[next.match.homeOrAway]}</span>
            </span>
            <span className="next-match-widget__meta">{next.groupLabel}</span>
            {next.phase && (
              <span className="next-match-widget__meta">Fase actual: {next.phase.name}</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary dash-w__cta next-match-widget__action"
            onClick={() => navigate('/pf/calendar')}
          >
            Ver calendario
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

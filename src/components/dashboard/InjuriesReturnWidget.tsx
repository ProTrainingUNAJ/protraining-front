import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, HeartPulse } from 'lucide-react';
import { structureService } from '../../api/structureService';
import { listAthleteInjuries, type AthleteInjury } from '../../api/seguimientoService';
import { getMuscleSpanishName } from '../../utils/exerciseMuscleMapper';
import { todayInArgentina, formatDayMonth } from '../../utils/argentinaDate';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { daysFromToday } from './dashboardDates';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';
import './InjuriesReturnWidget.css';

const VISIBLE_ITEMS = 4;

interface InjuryRow {
  injury: AthleteInjury;
  athleteName: string;
}

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; rows: InjuryRow[] };

function returnLabel(estimatedReturnDate: string, today: string): string {
  const date = estimatedReturnDate.slice(0, 10);
  const days = daysFromToday(date, today);
  if (days < 0) return `Retorno previsto el ${formatDayMonth(date)}, ya pasó`;
  if (days === 0) return 'Vuelve hoy';
  if (days === 1) return 'Vuelve mañana';
  return `Vuelve en ${days} días (${formatDayMonth(date)})`;
}

/**
 * Lesiones y retornos (menú "+" del Inicio del PF, KAN-594): las lesiones activas y en
 * recuperación del plantel, con la zona y cuándo vuelve cada atleta, la más próxima primero.
 *
 * No hay un endpoint por lote que traiga las lesiones en recuperación (el resumen por lote solo
 * cuenta las activas), así que se pide el historial de cada atleta del PF, en paralelo.
 */
export const InjuriesReturnWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const showSkeleton = useDelayedLoading(state.status === 'loading');
  const today = todayInArgentina();

  useEffect(() => {
    let active = true;

    async function load(): Promise<InjuryRow[]> {
      const athletes = await structureService.getAthletes();
      if (athletes.length === 0) return [];

      const results = await Promise.allSettled(
        athletes.map((athlete) => listAthleteInjuries(athlete.id)),
      );
      if (results.every((result) => result.status === 'rejected')) {
        throw new Error('No se pudieron consultar las lesiones del plantel.');
      }

      return results
        .flatMap((result, index) => {
          if (result.status !== 'fulfilled') return [];
          const athlete = athletes[index];
          const athleteName =
            athlete.fullName?.trim() || `${athlete.firstName} ${athlete.lastName}`.trim();
          return result.value
            .filter((injury) => injury.status === 'Active' || injury.status === 'InRecovery')
            .map((injury) => ({ injury, athleteName }));
        })
        .sort((a, b) => a.injury.estimatedReturnDate.localeCompare(b.injury.estimatedReturnDate));
    }

    load()
      .then((rows) => {
        if (active) setState({ status: 'ready', rows });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          message:
            err instanceof Error && err.message
              ? err.message
              : 'No se pudieron consultar las lesiones del plantel.',
        });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  };

  const rows = state.status === 'ready' ? state.rows : [];

  return (
    <section
      className={`dash-w injuries-return-widget ${className}`}
      aria-labelledby="injuries-return-title"
    >
      <header className="dash-w__header">
        <h3 id="injuries-return-title" className="dash-w__eyebrow">
          <HeartPulse size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Lesiones y retornos
        </h3>
        {rows.length > 0 && <span className="dash-w__count">{rows.length}</span>}
      </header>

      {state.status === 'loading' &&
        (showSkeleton ? (
          <div role="status" aria-label="Cargando lesiones">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null)}

      {state.status === 'error' && <WidgetErrorState message={state.message} onRetry={retry} />}

      {state.status === 'ready' && rows.length === 0 && (
        <p className="dash-w__empty">No hay lesiones activas.</p>
      )}

      {rows.length > 0 && (
        <>
          <ul className="injuries-return-widget__list">
            {rows.slice(0, VISIBLE_ITEMS).map(({ injury, athleteName }) => {
              const isActive = injury.status === 'Active';
              return (
                <li key={injury.id} className="injuries-return-widget__item">
                  <span className="injuries-return-widget__athlete">{athleteName}</span>
                  <span
                    className={`dash-w__chip ${isActive ? 'dash-w__chip--red' : 'dash-w__chip--yellow'}`}
                  >
                    <span className="dash-w__dot" aria-hidden="true" />
                    {isActive ? 'Activa' : 'En recuperación'}
                  </span>
                  <span className="injuries-return-widget__zone">
                    {getMuscleSpanishName(injury.zone) || injury.zone}
                  </span>
                  <span className="injuries-return-widget__return">
                    {returnLabel(injury.estimatedReturnDate, today)}
                  </span>
                </li>
              );
            })}
          </ul>
          {rows.length > VISIBLE_ITEMS && (
            <p className="injuries-return-widget__more">y {rows.length - VISIBLE_ITEMS} más</p>
          )}
          <button
            type="button"
            className="dash-w__btn injuries-return-widget__action"
            onClick={() => navigate('/pf/monitoring')}
          >
            Ver en Seguimiento
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

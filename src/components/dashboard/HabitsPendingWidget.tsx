import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { recommendationsService, type AthleteRecommendation } from '../../api/recommendations';
import { structureService } from '../../api/structureService';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';
import './HabitsPendingWidget.css';

const VISIBLE_ITEMS = 3;
const TYPE_LABEL: Record<AthleteRecommendation['type'], string> = {
  Habits: 'Hábitos',
  Training: 'Entrenamiento',
};

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: AthleteRecommendation[]; names: Map<string, string> };

/**
 * Recomendaciones por aprobar (menú "+" del Inicio del PF, KAN-594): lo que la IA propuso y
 * todavía espera el OK del PF antes de llegarle al atleta. Muestra las primeras y lleva a
 * Recomendaciones para revisarlas.
 */
export const HabitsPendingWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const showSkeleton = useDelayedLoading(state.status === 'loading');

  useEffect(() => {
    let active = true;
    // Los nombres son un extra: si falla la lista de atletas, se muestran igual las recomendaciones.
    Promise.all([
      recommendationsService.listRecommendations({ status: 'Pending' }),
      structureService.getAthletes().catch(() => []),
    ])
      .then(([items, athletes]) => {
        if (!active) return;
        const names = new Map(
          athletes.map((athlete) => [
            athlete.id,
            athlete.fullName?.trim() || `${athlete.firstName} ${athlete.lastName}`.trim(),
          ]),
        );
        setState({ status: 'ready', items, names });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setState({
          status: 'error',
          message:
            err instanceof Error && err.message
              ? err.message
              : 'No se pudieron cargar las recomendaciones.',
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

  return (
    <section
      className={`dash-w habits-pending-widget ${className}`}
      aria-labelledby="habits-pending-title"
    >
      <header className="dash-w__header">
        <h3 id="habits-pending-title" className="dash-w__eyebrow">
          <Sparkles size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Recomendaciones por aprobar
        </h3>
        {state.status === 'ready' && state.items.length > 0 && (
          <span className="dash-w__count">{state.items.length}</span>
        )}
      </header>

      {state.status === 'loading' &&
        (showSkeleton ? (
          <div role="status" aria-label="Cargando recomendaciones">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null)}

      {state.status === 'error' && <WidgetErrorState message={state.message} onRetry={retry} />}

      {state.status === 'ready' && state.items.length === 0 && (
        <p className="dash-w__empty">No hay recomendaciones esperando tu OK.</p>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <>
          <ul className="habits-pending-widget__list">
            {state.items.slice(0, VISIBLE_ITEMS).map((item) => (
              <li key={item.id} className="habits-pending-widget__item">
                <span className="habits-pending-widget__athlete">
                  {state.names.get(item.athleteId) ?? 'Atleta'}
                </span>
                <span className="habits-pending-widget__title">{item.title}</span>
                <span className="habits-pending-widget__type">{TYPE_LABEL[item.type]}</span>
              </li>
            ))}
          </ul>
          {state.items.length > VISIBLE_ITEMS && (
            <p className="habits-pending-widget__more">
              y {state.items.length - VISIBLE_ITEMS} más
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary dash-w__cta habits-pending-widget__action"
            onClick={() =>
              // La página abre en "Analizar plantel": si todo lo pendiente es de hábitos, se va
              // directo a esa vista para no caer en una lista vacía (ensayo, KAN-481).
              navigate(
                state.items.some((item) => item.type !== 'Habits')
                  ? '/pf/recommendations'
                  : '/pf/recommendations?view=habits',
              )
            }
          >
            Revisar
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </section>
  );
};

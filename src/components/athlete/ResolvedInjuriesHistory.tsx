import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listResolvedInjuries, AthleteInjury } from '../../api/seguimientoService';

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

interface ResolvedInjuriesHistoryProps {
  athleteId: string;
}

export function ResolvedInjuriesHistory({ athleteId }: ResolvedInjuriesHistoryProps) {
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    let active = true;
    listResolvedInjuries(athleteId)
      .then((data) => {
        if (active) {
          setError(null);
          setInjuries(data);
        }
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error ? err.message : 'No se pudieron cargar las molestias resueltas.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [athleteId]);

  if (loading) {
    return (
      <p className="plan-empty plan-inline">
        <Loader2 size={16} className="plan-spin" aria-hidden="true" />
        Cargando historial de molestias…
      </p>
    );
  }

  if (error) {
    return <p className="plan-empty">{error}</p>;
  }

  if (injuries.length === 0) {
    return <p className="plan-empty">Todavía no tenés molestias resueltas.</p>;
  }

  return (
    <ul className="injury-list">
      {injuries.map((injury) => (
        <li key={injury.id} className="injury-item">
          <div className="injury-item-header">
            <span className="injury-item-title">{injury.zone}</span>
          </div>
          <p className="injury-item-desc">{injury.description}</p>
          <div className="injury-item-dates">
            <span>Lesión: {formatDate(injury.injuryDate)}</span>
            {injury.clearedAt && <span>Alta: {formatDate(injury.clearedAt)}</span>}
            <span>
              Pico de dolor: {injury.peakPain != null ? `${injury.peakPain}/10` : 'Sin registros'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

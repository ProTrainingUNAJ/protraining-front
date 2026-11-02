import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { recordsReliabilityService } from '../../api/recordsReliability';
import {
  RELIABILITY_GROUP_ORDER,
  RELIABILITY_GROUP_LABELS,
  RELIABILITY_GROUP_DESCRIPTIONS,
  type RecordsReliabilitySummary,
} from '../../types/recordsReliability';

export interface RecordsReliabilityPanelProps {
  categoryId: string;
  exerciseId?: string;
}

export function RecordsReliabilityPanel({ categoryId, exerciseId }: RecordsReliabilityPanelProps) {
  const [data, setData] = useState<RecordsReliabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!categoryId) return;
    let active = true;

    recordsReliabilityService
      .getByCategory(categoryId, exerciseId)
      .then((summary) => {
        if (active) {
          setError(null);
          setData(summary);
        }
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [categoryId, exerciseId, reloadKey]);

  if (loading) {
    return (
      <div className="card records-reliability-state-card">
        <Loader2 size={20} className="plan-spin" aria-hidden="true" />
        <p className="records-reliability-state-text">Cargando resumen de confiabilidad…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card records-reliability-group-card">
        <div className="alert-banner danger records-reliability-alert-row" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary records-reliability-retry-button"
          onClick={() => {
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const total = data.totalAthletes || 0;

  return (
    <div className="records-reliability-panel">
      <div className="card records-reliability-summary-card">
        <div className="records-reliability-summary-row">
          <Users size={16} aria-hidden="true" />
          <span>
            {total} {total === 1 ? 'atleta' : 'atletas'} en la categoría
          </span>
        </div>
      </div>

      <div className="records-reliability-grid">
        {RELIABILITY_GROUP_ORDER.map((groupKey) => {
          const group = data.groups.find((g) => g.group === groupKey);
          const count = group?.count ?? 0;
          const percentage = group?.percentage ?? 0;
          const athletes = group?.athletes ?? [];
          const needsTesting = groupKey === 'Estimated' || groupKey === 'NoData';

          return (
            <div
              key={groupKey}
              className={`card records-reliability-group-card${needsTesting ? ' needs-testing' : ''}`}
            >
              <div className="records-reliability-group-header">
                <h3 className="records-reliability-group-title">
                  {RELIABILITY_GROUP_LABELS[groupKey]}
                </h3>
                <span className="badge badge-info">
                  {count} · {percentage.toFixed(1)}%
                </span>
              </div>
              <p className="records-reliability-group-description">
                {RELIABILITY_GROUP_DESCRIPTIONS[groupKey]}
                {needsTesting && count > 0 ? ' Conviene testear.' : ''}
              </p>
              {athletes.length === 0 ? (
                <p className="records-reliability-empty">Sin atletas en este grupo.</p>
              ) : (
                <ul className="records-reliability-athlete-list">
                  {athletes.map((athlete) => (
                    <li key={athlete.athleteId}>{athlete.name}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

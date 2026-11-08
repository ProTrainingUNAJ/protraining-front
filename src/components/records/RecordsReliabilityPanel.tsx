import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Users } from 'lucide-react';
import { recordsReliabilityService } from '../../api/recordsReliability';
import {
  RELIABILITY_GROUP_LABELS,
  type RecordReliabilityGroupKey,
  type RecordsReliabilitySummary,
} from '../../types/recordsReliability';
import { AthleteRecordsModal } from '../athletes/AthleteRecordsModal';
import { RecordsReliabilityChart } from './RecordsReliabilityChart';

export interface RecordsReliabilityPanelProps {
  categoryId: string;
  exerciseId?: string;
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function RecordsReliabilityPanel({ categoryId, exerciseId }: RecordsReliabilityPanelProps) {
  const [data, setData] = useState<RecordsReliabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<RecordReliabilityGroupKey | null>(null);
  const [detailAthlete, setDetailAthlete] = useState<{ id: string; name: string } | null>(null);

  // Click en un segmento o en la leyenda: si ya estaba elegido, se deselecciona.
  const handleSelectGroup = (groupKey: RecordReliabilityGroupKey) => {
    setSelectedGroup((current) => (current === groupKey ? null : groupKey));
  };

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
  const totalRecords = data.totalRecords || 0;
  const selected = selectedGroup
    ? data.groups.find((group) => group.group === selectedGroup)
    : undefined;

  const selectedCount =
    selectedGroup === 'NoData' ? (selected?.athleteCount ?? 0) : (selected?.recordCount ?? 0);
  const selectedCountLabel =
    selectedGroup === 'NoData'
      ? pluralize(selectedCount, 'atleta', 'atletas')
      : pluralize(selectedCount, 'récord', 'récords');

  return (
    <div className="records-reliability-panel">
      <div className="card records-reliability-summary-card">
        <div className="records-reliability-summary-row">
          <Users size={16} aria-hidden="true" />
          <span>
            {pluralize(total, 'atleta', 'atletas')} en la categoría ·{' '}
            {pluralize(totalRecords, 'récord', 'récords')} cargados
          </span>
        </div>
        <p className="records-reliability-summary-hint">
          Cada atleta puede aparecer en más de un grupo: se cuenta la cantidad de récords vigentes
          de cada origen. Quien no tiene ningún récord aparece en Sin datos.
        </p>
      </div>

      <RecordsReliabilityChart
        groups={data.groups}
        totalAthletes={total}
        totalRecords={totalRecords}
        selectedGroup={selectedGroup}
        onSelectGroup={handleSelectGroup}
      />

      {selectedGroup && (
        <div className="card records-reliability-detail" role="status" aria-live="polite">
          <div className="records-reliability-detail-header">
            <h3 className="records-reliability-detail-title">
              {RELIABILITY_GROUP_LABELS[selectedGroup]} ({selectedCountLabel})
            </h3>
            <button
              type="button"
              className="btn btn-secondary records-reliability-detail-close"
              onClick={() => setSelectedGroup(null)}
            >
              Cerrar detalle
            </button>
          </div>
          {(selected?.athletes ?? []).length === 0 ? (
            <p className="records-reliability-empty">No hay atletas en este grupo.</p>
          ) : (
            <ul className="records-reliability-detail-list">
              {(selected?.athletes ?? []).map((athlete) => (
                <li key={athlete.athleteId} className="records-reliability-detail-item">
                  <span>
                    <strong>{athlete.name}</strong> —{' '}
                    {selectedGroup === 'NoData'
                      ? 'sin récords'
                      : pluralize(athlete.recordCount, 'récord', 'récords')}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary records-reliability-detail-see"
                    onClick={() => setDetailAthlete({ id: athlete.athleteId, name: athlete.name })}
                  >
                    Ver detalle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {detailAthlete && (
        <AthleteRecordsModal
          athleteId={detailAthlete.id}
          athleteName={detailAthlete.name}
          readOnly
          onClose={() => setDetailAthlete(null)}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Dumbbell, Loader2, X } from 'lucide-react';
import { athleteRecordsService } from '../../api/athleteRecords';
import { ExercisePickerModal } from '../planning/ExercisePickerModal';
import { AthleteRecordItem, RecordOrigin } from '../../types/athleteRecords';
import { CatalogExercise } from '../../types/trainingPlans';

interface AthleteRecordsModalProps {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
}

const ORIGIN_LABELS: Record<RecordOrigin, string> = {
  TestedInSession: 'Testeado',
  Reported: 'Reportado',
  EstimatedEpley: 'Estimado',
};

const WEIGHT_MAX_KG = 500;

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatKg(weightKg: number): string {
  return `${weightKg.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
}

export function AthleteRecordsModal({ athleteId, athleteName, onClose }: AthleteRecordsModalProps) {
  const [records, setRecords] = useState<AthleteRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [exercise, setExercise] = useState<CatalogExercise | null>(null);
  const [weight, setWeight] = useState('');
  const [origin, setOrigin] = useState<RecordOrigin>('TestedInSession');
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    let active = true;
    athleteRecordsService
      .listCurrent(athleteId)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los récords.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [athleteId]);

  // Con el buscador abierto, Escape cierra solo el buscador.
  useEffect(() => {
    if (showPicker) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, saving, showPicker]);

  const closePicker = useCallback(() => setShowPicker(false), []);

  const selectExercise = (selected: CatalogExercise) => {
    setExercise(selected);
    setShowPicker(false);
    setSavedMessage(null);
    // Si ya tiene récord en ese ejercicio, se muestra el actual como referencia.
    const current = records.find((r) => r.exerciseId === selected.id);
    setWeight(current ? String(current.weightKg) : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise) {
      setError('Elegí el ejercicio.');
      return;
    }
    const weightKg = Number(weight);
    if (!weight || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > WEIGHT_MAX_KG) {
      setError(`El 1RM tiene que ser mayor a 0 y hasta ${WEIGHT_MAX_KG} kg.`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = await athleteRecordsService.save(athleteId, exercise.id, weightKg, origin);
      // Queda uno solo por ejercicio: el nuevo reemplaza al anterior.
      setRecords((current) =>
        [...current.filter((r) => r.exerciseId !== saved.exerciseId), saved].sort((a, b) =>
          a.exerciseName.localeCompare(b.exerciseName, 'es'),
        ),
      );
      setSavedMessage(`Se guardó ${formatKg(saved.weightKg)} en ${saved.exerciseName}.`);
      setExercise(null);
      setWeight('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el récord.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onClick={saving ? undefined : onClose}>
        <div
          className="modal-content plan-picker"
          role="dialog"
          aria-modal="true"
          aria-labelledby="athlete-records-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="plan-picker-header">
            <h2 id="athlete-records-title">Récords de {athleteName}</h2>
            <button
              type="button"
              className="plan-icon-btn"
              onClick={onClose}
              disabled={saving}
              aria-label="Cerrar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <p className="plan-empty">
            Con el 1RM de cada ejercicio se calcula el peso que ve el atleta en su rutina: por
            ejemplo, 100 kg al 80% son 80 kg.
          </p>

          {error && (
            <div className="alert-banner danger" role="alert">
              <span className="plan-inline">
                <AlertCircle size={18} aria-hidden="true" />
                {error}
              </span>
            </div>
          )}

          {savedMessage && (
            <div className="alert-banner success" role="status">
              <span className="plan-inline">
                <Check size={18} aria-hidden="true" />
                {savedMessage}
              </span>
            </div>
          )}

          {loading ? (
            <p className="plan-empty plan-inline">
              <Loader2 size={16} className="plan-spin" aria-hidden="true" />
              Cargando récords…
            </p>
          ) : records.length === 0 ? (
            <p className="plan-empty">Todavía no tiene récords cargados.</p>
          ) : (
            <ul className="records-list">
              {records.map((record) => (
                <li key={record.id} className="records-item">
                  <span className="records-item-name">{record.exerciseName}</span>
                  <span className="records-item-weight">{formatKg(record.weightKg)}</span>
                  <span className="records-item-meta">
                    {ORIGIN_LABELS[record.origin]} · {formatDate(record.achievedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form className="records-form" onSubmit={handleSubmit}>
            <h3>Cargar un récord</h3>

            <div className="plan-field">
              <span>Ejercicio</span>
              <button
                type="button"
                className="btn btn-secondary records-exercise-btn"
                onClick={() => setShowPicker(true)}
                disabled={saving}
              >
                <Dumbbell size={16} aria-hidden="true" />
                <span>{exercise ? exercise.name : 'Elegir de la biblioteca'}</span>
              </button>
            </div>

            <div className="records-form-row">
              <label className="plan-field">
                <span>1RM (kg)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0.5}
                  max={WEIGHT_MAX_KG}
                  step={0.5}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={saving}
                  placeholder="Ej. 100"
                />
              </label>
              <label className="plan-field">
                <span>Origen</span>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as RecordOrigin)}
                  disabled={saving}
                >
                  <option value="TestedInSession">Testeado</option>
                  <option value="Reported">Reportado</option>
                </select>
              </label>
            </div>

            <div className="plan-picker-pager">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cerrar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || !exercise}>
                {saving && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
                <span>{saving ? 'Guardando…' : 'Guardar récord'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPicker && (
        <ExercisePickerModal onClose={closePicker} onSelect={selectExercise} filterUsedByPf />
      )}
    </>
  );
}

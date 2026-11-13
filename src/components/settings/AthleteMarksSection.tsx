import React, { useEffect, useState } from 'react';
import { AlertCircle, Award, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { structureService } from '../../api/structureService';
import { athleteRecordsService } from '../../api/athleteRecords';
import {
  RECORD_ORIGIN_LABELS,
  type AthleteRecordItem,
  type RecordOrigin,
} from '../../types/athleteRecords';
import type { CatalogExercise } from '../../types/trainingPlans';
import { ExercisePickerModal } from '../planning/ExercisePickerModal';

const MIN_WEIGHT_KG = 1;
const MAX_WEIGHT_KG = 500;

// En Mis marcas distinguimos la estimación del onboarding del Epley del PF.
const MARKS_ORIGIN_LABELS: Record<RecordOrigin, string> = {
  ...RECORD_ORIGIN_LABELS,
  EstimatedEpley: 'Estimada (onboarding)',
};

interface StagedMark {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
}

const getCachedAthleteId = (userId?: string): string | null => {
  if (!userId) return null;
  try {
    return localStorage.getItem(`protraining_athlete_me_${userId}`);
  } catch {
    return null;
  }
};

const setCachedAthleteId = (userId: string, id: string) => {
  try {
    localStorage.setItem(`protraining_athlete_me_${userId}`, id);
  } catch {
    // Ignorado en entornos sin almacenamiento.
  }
};

function formatKg(value: number): string {
  return `${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
}

export function AthleteMarksSection() {
  const { user } = useAuth();
  const cachedAthleteId = getCachedAthleteId(user?.id);

  const [athleteId, setAthleteId] = useState<string | null>(cachedAthleteId);
  const [athleteLoading, setAthleteLoading] = useState(!cachedAthleteId && Boolean(user?.id));
  const [athleteError, setAthleteError] = useState<string | null>(null);

  const [records, setRecords] = useState<AthleteRecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(Boolean(user?.id));
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<CatalogExercise | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [staged, setStaged] = useState<StagedMark[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Resuelve el athleteId de la cuenta con el mismo caché que CheckInPage.
  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    structureService
      .getMe()
      .then((me) => {
        if (!active) return;
        if (me?.athleteId) {
          setAthleteId(me.athleteId);
          setCachedAthleteId(user.id, me.athleteId);
          setAthleteError(null);
        } else if (!cachedAthleteId) {
          setRecordsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (!cachedAthleteId) {
          setAthleteError(
            err instanceof Error ? err.message : 'No se pudo identificar a tu atleta.',
          );
          setRecordsLoading(false);
        }
      })
      .finally(() => {
        if (active) setAthleteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, cachedAthleteId]);

  useEffect(() => {
    if (!athleteId) return;

    let active = true;

    athleteRecordsService
      .listCurrent(athleteId)
      .then((items) => {
        if (active) {
          setRecords(items);
          setRecordsError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setRecordsError(err instanceof Error ? err.message : 'No se pudieron cargar tus marcas.');
        }
      })
      .finally(() => {
        if (active) setRecordsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [athleteId, reloadKey]);

  const existingIds = new Set(records.map((record) => record.exerciseId));
  const stagedIds = new Set(staged.map((mark) => mark.exerciseId));

  const handleSelectExercise = (exercise: CatalogExercise) => {
    setSelectedExercise(exercise);
    setPickerOpen(false);
    setFormError(null);
    setSaveFeedback(null);
  };

  const handleAddMark = () => {
    setFormError(null);
    setSaveFeedback(null);

    if (!selectedExercise) {
      setFormError('Elegí un ejercicio para cargar la marca.');
      return;
    }

    const cleaned = weightInput.replace(',', '.').trim();
    const weight = Number(cleaned);
    if (cleaned === '' || !Number.isFinite(weight)) {
      setFormError('Ingresá un peso en kg válido.');
      return;
    }
    if (weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
      setFormError(
        `El peso debe estar entre ${MIN_WEIGHT_KG} y ${MAX_WEIGHT_KG} kg, igual que el máximo permitido por el sistema.`,
      );
      return;
    }
    if (existingIds.has(selectedExercise.id)) {
      setFormError('Ese ejercicio ya tiene una marca cargada; tu PF la administra.');
      return;
    }
    if (stagedIds.has(selectedExercise.id)) {
      setFormError('Ya agregaste una marca para ese ejercicio.');
      return;
    }

    setStaged((current) => [
      ...current,
      {
        exerciseId: selectedExercise.id,
        exerciseName: selectedExercise.name,
        weightKg: weight,
      },
    ]);
    setSelectedExercise(null);
    setWeightInput('');
  };

  const handleRemoveStaged = (exerciseId: string) => {
    setStaged((current) => current.filter((mark) => mark.exerciseId !== exerciseId));
  };

  const handleSave = async () => {
    setFormError(null);
    setSaveFeedback(null);

    if (staged.length === 0) {
      setFormError('Cargá al menos una marca antes de guardar.');
      return;
    }

    setSaving(true);
    try {
      const result = await athleteRecordsService.declareOnboarding(
        staged.map((mark) => ({
          exerciseId: mark.exerciseId,
          weightOneRepMaxKg: mark.weightKg,
        })),
      );

      const createdCount = result.created.length;
      const skippedCount = result.skipped.length;
      const skippedNames = result.skipped.map((item) => item.exerciseName);

      if (createdCount === 0) {
        setSaveFeedback({
          type: 'success',
          message:
            skippedNames.length === 1
              ? `${skippedNames[0]} ya la cargó tu PF.`
              : 'No se modificó ninguna: ya tenías marca en todos esos ejercicios.',
        });
      } else if (skippedCount > 0) {
        setSaveFeedback({
          type: 'success',
          message: `Se cargaron ${createdCount}. Ya tenías: ${skippedNames.join(', ')}.`,
        });
      } else {
        setSaveFeedback({
          type: 'success',
          message: `Se cargaron ${createdCount} ${createdCount === 1 ? 'marca' : 'marcas'}.`,
        });
      }

      setStaged([]);
      setSelectedExercise(null);
      setWeightInput('');
      setRecordsLoading(true);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setSaveFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'No se pudieron guardar las marcas.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (athleteLoading) {
    return (
      <div className="card athlete-marks-state-card">
        <Loader2 size={20} className="plan-spin" aria-hidden="true" />
        <p className="athlete-marks-state-text">Cargando tus marcas…</p>
      </div>
    );
  }

  if (athleteError) {
    return (
      <div className="card athlete-marks-state-card">
        <div className="alert-banner danger" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{athleteError}</span>
        </div>
      </div>
    );
  }

  if (!athleteId) {
    return (
      <div className="card athlete-marks-state-card">
        <p className="athlete-marks-state-text">
          No encontramos un atleta asociado a tu cuenta. Consultá con tu PF.
        </p>
      </div>
    );
  }

  return (
    <div className="athlete-marks-section">
      <div className="card athlete-marks-card">
        <div className="athlete-marks-header">
          <div>
            <h2 className="athlete-marks-title">
              <Award size={18} aria-hidden="true" /> Mis marcas
            </h2>
            <p className="athlete-marks-description">
              Declará tus mejores marcas de fuerza. Tu PF las revisa y valida en sesión.
            </p>
          </div>
        </div>

        {recordsLoading ? (
          <p className="athlete-marks-muted plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Cargando marcas existentes…
          </p>
        ) : recordsError ? (
          <div className="alert-banner danger" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{recordsError}</span>
          </div>
        ) : records.length === 0 ? (
          <p className="athlete-marks-muted">Todavía no tenés marcas cargadas.</p>
        ) : (
          <>
            <p className="athlete-marks-muted">
              Ya la tenés cargada; tu PF la administra. Estas marcas son solo de lectura.
            </p>
            <ul className="athlete-marks-list">
              {records.map((record) => (
                <li key={record.id} className="athlete-marks-item">
                  <span className="athlete-marks-item-name">{record.exerciseName}</span>
                  <span className="athlete-marks-item-weight">{formatKg(record.weightKg)}</span>
                  <span className="athlete-marks-item-origin">
                    {MARKS_ORIGIN_LABELS[record.origin] ?? record.origin}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="card athlete-marks-card">
        <h3 className="athlete-marks-subtitle">Declarar una marca</h3>
        <p className="athlete-marks-description">
          Elegí un ejercicio con carga y cargá tu 1RM estimado entre {MIN_WEIGHT_KG} y{' '}
          {MAX_WEIGHT_KG} kg.
        </p>

        <div className="athlete-marks-form-row">
          <button
            type="button"
            className="btn btn-secondary athlete-marks-picker-btn"
            onClick={() => {
              setPickerOpen(true);
              setFormError(null);
            }}
            disabled={recordsLoading}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{selectedExercise ? selectedExercise.name : 'Elegir ejercicio'}</span>
          </button>

          <div className="athlete-marks-weight-field">
            <label htmlFor="athlete-mark-weight">Peso (kg)</label>
            <input
              id="athlete-mark-weight"
              type="number"
              inputMode="decimal"
              min={MIN_WEIGHT_KG}
              max={MAX_WEIGHT_KG}
              step="0.5"
              value={weightInput}
              placeholder="Ej. 102.5"
              onChange={(e) => setWeightInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMark();
                }
              }}
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary athlete-marks-add-btn"
            onClick={handleAddMark}
            disabled={!selectedExercise}
          >
            Agregar
          </button>
        </div>

        {formError && (
          <div className="alert-banner danger athlete-marks-alert" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        {staged.length > 0 && (
          <ul className="athlete-marks-staged-list">
            {staged.map((mark) => (
              <li key={mark.exerciseId} className="athlete-marks-staged-item">
                <span className="athlete-marks-item-name">{mark.exerciseName}</span>
                <span className="athlete-marks-item-weight">{formatKg(mark.weightKg)}</span>
                <button
                  type="button"
                  className="plan-icon-btn athlete-marks-remove-btn"
                  onClick={() => handleRemoveStaged(mark.exerciseId)}
                  aria-label={`Quitar ${mark.exerciseName}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {saveFeedback && (
          <div
            className={`alert-banner ${saveFeedback.type === 'success' ? 'success' : 'danger'} athlete-marks-alert`}
            role={saveFeedback.type === 'success' ? 'status' : 'alert'}
          >
            {saveFeedback.type === 'success' ? (
              <Check size={18} aria-hidden="true" />
            ) : (
              <AlertCircle size={18} aria-hidden="true" />
            )}
            <span>{saveFeedback.message}</span>
          </div>
        )}

        <div className="athlete-marks-actions">
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                <span>Guardando…</span>
              </>
            ) : (
              <span>Guardar marcas</span>
            )}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <ExercisePickerModal
          onClose={() => setPickerOpen(false)}
          onSelect={handleSelectExercise}
          exerciseType="Weight"
          excludedIds={[...existingIds, ...stagedIds]}
        />
      )}
    </div>
  );
}

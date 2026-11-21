import React, { useState } from 'react';
import {
  X,
  Dumbbell,
  Activity as ActivityIcon,
  Trophy,
  User,
  Clock,
  Flame,
  Zap,
  Info,
} from 'lucide-react';
import { RpeSliderBar } from '../../common/RpeSliderBar';
import {
  ActivityKey,
  MainCategory,
  MAIN_CATEGORIES,
  RPE_LEVELS,
  MINUTE_PRESETS,
} from './dailyLoadTypes';

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activityKey: ActivityKey, minutes: number, rpe: number) => Promise<void>;
  editingKey?: ActivityKey | null;
  initialMinutes?: number;
  initialRpe?: number | null;
  existingActivities?: Partial<Record<ActivityKey, { minutes: number; rpe: number | null }>>;
}

const getMainCategoryIcon = (category: MainCategory) => {
  switch (category) {
    case 'gym':
      return <Dumbbell size={20} />;
    case 'sportTraining':
      return <ActivityIcon size={20} />;
    case 'match':
      return <Trophy size={20} />;
    case 'individualWork':
      return <User size={20} />;
  }
};

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingKey = null,
  initialMinutes = 0,
  initialRpe = null,
  existingActivities = {},
}) => {
  const [mainCategory, setMainCategory] = useState<MainCategory>(() => {
    if (editingKey === 'match1' || editingKey === 'match2') return 'match';
    if (editingKey) return editingKey as MainCategory;
    return 'gym';
  });
  const [matchSubIndex, setMatchSubIndex] = useState<1 | 2>(() => {
    return editingKey === 'match2' ? 2 : 1;
  });
  const [minutes, setMinutes] = useState<number>(() => (initialMinutes > 0 ? initialMinutes : 0));
  const [rpe, setRpe] = useState<number | null>(() => initialRpe ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Resolve specific ActivityKey based on category and sub-match
  const resolvedKey: ActivityKey =
    mainCategory === 'match'
      ? matchSubIndex === 1
        ? 'match1'
        : 'match2'
      : (mainCategory as ActivityKey);

  const existingRecord = existingActivities[resolvedKey];
  const isUpdatingExisting = Boolean(existingRecord && (existingRecord.minutes ?? 0) > 0);

  const calculatedUa = minutes > 0 && rpe !== null ? minutes * rpe : 0;
  const selectedRpeMeta = rpe !== null ? RPE_LEVELS.find((l) => l.val === rpe) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (minutes <= 0) {
      setErrorMessage('Debe ingresar minutos mayores a 0 para registrar.');
      return;
    }

    if (rpe === null || rpe < 0 || rpe > 10) {
      setErrorMessage('El RPE es obligatorio si los minutos son mayores a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(resolvedKey, minutes, rpe);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error al guardar la actividad. Reintentá.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="dl-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dl-modal-title"
    >
      <div className="dl-modal-card">
        {/* Modal Header */}
        <div className="dl-modal-header">
          <div>
            <h2 id="dl-modal-title" className="dl-modal-title">
              {editingKey ? 'Editar actividad' : 'Registrar actividad'}
            </h2>
            <p className="dl-modal-subtitle">
              Ingresá los minutos y el nivel de esfuerzo de la sesión
            </p>
          </div>
          <button
            type="button"
            className="dl-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="dl-modal-form">
          {/* 1. Selección simplificada de actividad */}
          <div className="dl-form-group">
            <label className="dl-form-label">Tipo de actividad</label>
            <div className="dl-category-selector" role="radiogroup" aria-label="Tipo de actividad">
              {MAIN_CATEGORIES.map((cat) => {
                const isSelected = mainCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`dl-category-pill ${isSelected ? 'dl-category-pill--selected' : ''}`}
                    onClick={() => {
                      setMainCategory(cat.id);
                      setErrorMessage(null);
                    }}
                  >
                    <span className="dl-category-pill-icon">{getMainCategoryIcon(cat.id)}</span>
                    <span className="dl-category-pill-label">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-selector para Partido: diferenciar Partido 1 de Partido 2 */}
            {mainCategory === 'match' && (
              <div className="dl-subselector-box" aria-label="Identificador de partido">
                <span className="dl-subselector-label">Identificar partido:</span>
                <div
                  className="dl-subselector-options"
                  role="radiogroup"
                  aria-label="Identificar partido"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={matchSubIndex === 1}
                    className={`dl-subselector-btn ${matchSubIndex === 1 ? 'dl-subselector-btn--selected' : ''}`}
                    onClick={() => setMatchSubIndex(1)}
                  >
                    <span>Partido 1</span>
                    <small>1° Partido / Titular</small>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={matchSubIndex === 2}
                    className={`dl-subselector-btn ${matchSubIndex === 2 ? 'dl-subselector-btn--selected' : ''}`}
                    onClick={() => setMatchSubIndex(2)}
                  >
                    <span>Partido 2</span>
                    <small>2° Partido / Suplente</small>
                  </button>
                </div>
              </div>
            )}

            {isUpdatingExisting && !editingKey && (
              <div className="dl-existing-notice">
                <Info size={14} />
                <span>
                  Ya registraste <strong>{existingRecord?.minutes}m</strong> (RPE{' '}
                  <strong>{existingRecord?.rpe}</strong>) hoy en esta actividad. Al guardar se
                  actualizará.
                </span>
              </div>
            )}
          </div>

          {/* 2. Duración en minutos */}
          <div className="dl-form-group">
            <div className="dl-form-label-row">
              <label htmlFor="dl-input-minutes" className="dl-form-label">
                <Clock size={15} />
                <span>Minutos dedicados</span>
              </label>
              <span className="dl-form-val-badge">{minutes} min</span>
            </div>

            <div className="dl-minutes-input-container">
              <input
                id="dl-input-minutes"
                type="number"
                min={0}
                max={600}
                value={minutes || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMinutes(isNaN(val) ? 0 : Math.max(0, val));
                  setErrorMessage(null);
                }}
                className="dl-modal-input"
                placeholder="0"
              />
              <span className="dl-minutes-input-suffix">min</span>
            </div>

            {/* Atajos rápidos de minutos */}
            <div className="dl-presets-row" aria-label="Atajos rápidos de minutos">
              {MINUTE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`dl-preset-chip ${minutes === preset ? 'dl-preset-chip--selected' : ''}`}
                  onClick={() => {
                    setMinutes(preset);
                    setErrorMessage(null);
                  }}
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>

          {/* 3. Escala RPE (0 a 10) */}
          <div className="dl-form-group">
            <div className="dl-form-label-row">
              <label htmlFor="dl-input-rpe" className="dl-form-label">
                <Flame size={15} />
                <span>Percepción del esfuerzo (RPE 0–10)</span>
              </label>
              <span className="dl-form-val-badge">
                {rpe !== null ? `Nivel ${rpe}` : 'Sin seleccionar'}
              </span>
            </div>

            <div className="dl-rpe-bar-container">
              <RpeSliderBar
                id="dl-input-rpe"
                value={rpe}
                onChange={(val) => {
                  setRpe(val);
                  setErrorMessage(null);
                }}
              />
            </div>

            {/* Tarjeta explicativa de RPE sobria y minimalista */}
            <div className="dl-rpe-desc-card">
              {selectedRpeMeta ? (
                <>
                  <div className="dl-rpe-desc-header">
                    <strong>
                      RPE {selectedRpeMeta.val} · {selectedRpeMeta.title}
                    </strong>
                    <span className="dl-rpe-tier-badge">{selectedRpeMeta.tier}</span>
                  </div>
                  <p className="dl-rpe-desc-text">{selectedRpeMeta.desc}</p>
                </>
              ) : (
                <p className="dl-rpe-desc-placeholder">
                  Seleccioná del 1 al 10 según la intensidad física sentida en la sesión.
                </p>
              )}
            </div>
          </div>

          {/* Vista previa de Foster Load (UA) */}
          {calculatedUa > 0 && (
            <div className="dl-foster-preview" aria-label="Carga de la sesión">
              <div className="dl-foster-preview-left">
                <Zap size={16} />
                <span>Carga de la sesión:</span>
              </div>
              <div className="dl-foster-preview-right">
                <strong className="dl-foster-val">{calculatedUa} UA</strong>
                <span className="dl-foster-sub">
                  ({minutes} min × RPE {rpe})
                </span>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="dl-error-box" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="dl-modal-actions">
            <button
              type="button"
              className="dl-btn dl-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="dl-btn dl-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando…' : 'Guardar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

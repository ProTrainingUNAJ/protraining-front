import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ChevronDown, Dumbbell, RefreshCw, RotateCcw } from 'lucide-react';
import type {
  AdaptationChange,
  AdaptationRecordContext,
  AuthorizedSubstituteContext,
  SuggestedRoutineExercise,
} from '../../api/athleteAdaptations';

export interface AdaptationDiffItemProps {
  baseEx: SuggestedRoutineExercise;
  adaptedEx: SuggestedRoutineExercise;
  change: AdaptationChange | null;
  index: number;
  substitutes: AuthorizedSubstituteContext[];
  chosenId: string;
  chosenName: string;
  isAuthorizedSubstitute: boolean;
  isManuallyReplaced: boolean;
  manualSubId?: string;
  manualSubName?: string;
  isEditing: boolean;
  submitting: boolean;
  conservativeRecordPercent: number;
  findRecordForExercise: (
    exerciseId?: string | null,
    exerciseName?: string | null,
  ) => AdaptationRecordContext | null;
  renderRecordOriginBadge: (
    exerciseId?: string | null,
    exerciseName?: string | null,
    isReference?: boolean,
  ) => React.ReactNode;
  formatZoneLabel: (zone?: string | null) => string;
  onSubstituteChange: (key: string, substituteExerciseId: string) => void;
  onRestoreBaseExercise: (key: string) => void;
  onOpenPicker: (target: {
    key: string;
    originalExerciseName: string;
    originalExerciseId?: string | null;
  }) => void;
}

export const AdaptationDiffItem: React.FC<AdaptationDiffItemProps> = ({
  baseEx,
  adaptedEx,
  change,
  index,
  substitutes,
  chosenId,
  chosenName,
  isAuthorizedSubstitute,
  isManuallyReplaced,
  manualSubId,
  manualSubName,
  isEditing,
  submitting,
  renderRecordOriginBadge,
  formatZoneLabel,
  onSubstituteChange,
  onRestoreBaseExercise,
  onOpenPicker,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Caso: Ejercicio sin cambios según el motor (o modificado manualmente por PF)
  if (!change) {
    const rowKey = baseEx.exerciseId || `${baseEx.exerciseName}-${index}`;
    const effectiveManualSubName =
      manualSubName || (manualSubId ? 'Ejercicio seleccionado' : adaptedEx.exerciseName);

    return (
      <div
        key={rowKey}
        className={`adaptation-diff-row ${isManuallyReplaced ? 'modified' : 'unchanged'}`}
        role="listitem"
      >
        <div className="adaptation-diff-grid">
          {/* Tarjeta izquierda: Rutina Original */}
          <div className={`adaptation-diff-col base ${isManuallyReplaced ? 'replaced' : ''}`}>
            <div className="adaptation-diff-col-top">
              <span className="adaptation-diff-col-label">Rutina Original</span>
              {isManuallyReplaced ? (
                <span className="badge adaptation-diff-replaced-badge">Reemplazado por PF</span>
              ) : (
                <span className="badge badge-subtle">Base</span>
              )}
            </div>
            <strong
              className={`adaptation-diff-ex-name ${isManuallyReplaced ? 'strikethrough' : ''}`}
            >
              {baseEx.exerciseName}
            </strong>
            <span className="adaptation-diff-ex-meta">
              <Dumbbell size={13} aria-hidden="true" className="adaptation-meta-icon" />
              <span>
                {baseEx.sets} series × {baseEx.reps} reps
                {baseEx.suggestedPercentage ? ` · ${baseEx.suggestedPercentage}% 1RM` : ''}
              </span>
            </span>
            {renderRecordOriginBadge(baseEx.exerciseId, baseEx.exerciseName)}
          </div>

          {/* Flecha central */}
          <div
            className={`adaptation-diff-arrow ${isManuallyReplaced ? 'active' : ''}`}
            aria-hidden="true"
          >
            <ArrowRight size={18} className="adaptation-arrow-desktop" />
            <ArrowDown size={16} className="adaptation-arrow-mobile" />
          </div>

          {/* Tarjeta derecha: Rutina Adaptada */}
          <div
            className={`adaptation-diff-col adapted ${isManuallyReplaced ? 'replacement' : 'unchanged'}`}
          >
            <div className="adaptation-diff-col-top">
              <span className="adaptation-diff-col-label adapted">Rutina Adaptada</span>
              <span
                className={`badge ${isManuallyReplaced ? 'adaptation-diff-edited-badge' : 'badge-subtle'}`}
              >
                {isManuallyReplaced ? 'Editado por PF' : 'Sin cambios'}
              </span>
            </div>
            <strong className={`adaptation-diff-ex-name ${isManuallyReplaced ? 'highlight' : ''}`}>
              {effectiveManualSubName}
            </strong>
            <span className="adaptation-diff-ex-meta">
              <Dumbbell size={13} aria-hidden="true" className="adaptation-meta-icon" />
              <span>
                {adaptedEx.sets} series × {adaptedEx.reps} reps
                {adaptedEx.suggestedPercentage ? ` · ${adaptedEx.suggestedPercentage}% 1RM` : ''}
              </span>
            </span>
            {renderRecordOriginBadge(
              isManuallyReplaced ? manualSubId : adaptedEx.exerciseId,
              effectiveManualSubName,
              isManuallyReplaced ? false : adaptedEx.isReference,
            )}

            {isEditing && baseEx.exerciseId && (
              <div className="adaptation-diff-inline-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm adaptation-diff-change-ex-btn"
                  onClick={() =>
                    onOpenPicker({
                      key: rowKey,
                      originalExerciseName: baseEx.exerciseName,
                      originalExerciseId: baseEx.exerciseId,
                    })
                  }
                  disabled={submitting}
                >
                  <RefreshCw size={13} aria-hidden="true" />
                  <span>Cambiar ejercicio</span>
                </button>
                {isManuallyReplaced && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onRestoreBaseExercise(rowKey)}
                    disabled={submitting}
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                    <span>Restaurar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Caso: Ejercicio modificado/reemplazado por lesión o adaptación
  const changeKey = change.originalExerciseId || change.originalExerciseName;
  const showReasonAccordion = isExpanded || isEditing;

  return (
    <div
      key={changeKey}
      className="adaptation-diff-row modified"
      role="listitem"
      data-testid={`adaptation-diff-item-${changeKey}`}
    >
      <div className="adaptation-diff-grid">
        {/* Columna Base (Rutina Original) */}
        <div className="adaptation-diff-col base replaced">
          <div className="adaptation-diff-col-top">
            <span className="adaptation-diff-col-label">Rutina Original</span>
            <span className="badge adaptation-diff-replaced-badge">Reemplazado</span>
          </div>
          <strong className="adaptation-diff-ex-name strikethrough">
            {change.originalExerciseName}
          </strong>
          <span className="adaptation-diff-ex-meta">
            <Dumbbell size={13} aria-hidden="true" className="adaptation-meta-icon" />
            <span>
              {baseEx.sets} series × {baseEx.reps} reps
              {baseEx.suggestedPercentage ? ` · ${baseEx.suggestedPercentage}% 1RM` : ''}
            </span>
          </span>
          {renderRecordOriginBadge(
            change.originalExerciseId ?? baseEx.exerciseId,
            change.originalExerciseName,
          )}
        </div>

        {/* Flecha central */}
        <div className="adaptation-diff-arrow active" aria-hidden="true">
          <ArrowRight size={18} className="adaptation-arrow-desktop" />
          <ArrowDown size={16} className="adaptation-arrow-mobile" />
        </div>

        {/* Columna Adaptada (Rutina Adaptada) */}
        <div className="adaptation-diff-col adapted replacement">
          <div className="adaptation-diff-col-top">
            <span className="adaptation-diff-col-label adapted">Rutina Adaptada</span>
            <span
              className={`badge ${isAuthorizedSubstitute ? 'badge-success' : 'adaptation-diff-edited-badge'}`}
            >
              {isAuthorizedSubstitute ? 'Sustituto autorizado' : 'Editado por PF'}
            </span>
          </div>
          <strong className="adaptation-diff-ex-name highlight">{chosenName}</strong>
          <span className="adaptation-diff-ex-meta">
            <Dumbbell size={13} aria-hidden="true" className="adaptation-meta-icon" />
            <span>
              {adaptedEx.sets} series × {adaptedEx.reps} reps
              {adaptedEx.suggestedPercentage ? ` · ${adaptedEx.suggestedPercentage}% 1RM` : ''}
            </span>
          </span>
          {renderRecordOriginBadge(chosenId, chosenName, adaptedEx.isReference)}
        </div>
      </div>

      {/* Botón acordeón para mostrar/ocultar justificación médica y deportiva (KAN-637) */}
      <div className="adaptation-diff-accordion-bar">
        <button
          type="button"
          className="adaptation-diff-toggle-reason-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={showReasonAccordion}
          data-testid={`toggle-reason-${changeKey}`}
        >
          <span>
            {showReasonAccordion
              ? 'Ocultar justificación médica'
              : 'Ver justificación médica y deportiva'}
          </span>
          <ChevronDown
            size={14}
            className={`adaptation-diff-chevron ${showReasonAccordion ? 'open' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Motivo y justificación médica desplegable */}
      <div
        className={`adaptation-diff-reason-box ${showReasonAccordion ? 'is-expanded' : 'is-collapsed'}`}
        data-testid={`reason-box-${changeKey}`}
      >
        <div className="adaptation-diff-reason-tags">
          <span className="badge adaptation-diff-zone-badge">
            Zona protegida: {formatZoneLabel(change.zone)}
          </span>
        </div>
        <p className="adaptation-diff-reason-text">
          <strong>Motivo médico / biomecánico:</strong> {change.reason}
        </p>

        {(substitutes.length > 1 || isEditing) && (
          <div className="adaptation-diff-substitute-picker">
            <label htmlFor={`adaptation-sub-select-${changeKey}`}>
              Ajustar sustituto autorizado:
            </label>
            <div className="adaptation-diff-select-wrap">
              <select
                id={`adaptation-sub-select-${changeKey}`}
                value={chosenId}
                onChange={(e) => onSubstituteChange(changeKey, e.target.value)}
                disabled={submitting}
              >
                {substitutes.map((sub) => (
                  <option key={sub.exerciseId} value={sub.exerciseId}>
                    {sub.name}
                    {sub.exerciseId === change.finalExerciseId
                      ? ' (Sugerido por el Asistente)'
                      : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="adaptation-diff-select-icon" aria-hidden="true" />
            </div>
            {isEditing && (
              <button
                type="button"
                className="btn btn-secondary btn-sm adaptation-diff-change-ex-btn"
                onClick={() =>
                  onOpenPicker({
                    key: changeKey,
                    originalExerciseName: change.originalExerciseName,
                    originalExerciseId: change.originalExerciseId,
                  })
                }
                disabled={submitting}
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Cambiar del catálogo</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

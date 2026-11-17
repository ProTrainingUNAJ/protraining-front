import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Dumbbell, Flame, CheckCircle, Info } from 'lucide-react';
import { ExerciseGifImage } from '../exercises/ExerciseGifImage';
import { ExerciseMuscleMiniMap } from './ExerciseMuscleMiniMap';
import { getMuscleSpanishName } from '../../utils/exerciseMuscleMapper';

export interface ExerciseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: {
    id?: string | null;
    exerciseId?: string;
    name?: string;
    exerciseName?: string;
    muscleGroup?: string;
    exerciseType?: string;
    images?: string[];
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
  } | null;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !exercise) return null;

  const title = exercise.exerciseName || exercise.name || 'Detalle del Ejercicio';
  const hasImages = Boolean(exercise.images && exercise.images.length > 0);
  const primaryMuscles = exercise.primaryMuscles ?? [];
  const secondaryMuscles = exercise.secondaryMuscles ?? [];

  const modalContent = (
    <div
      className="exercise-detail-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-detail-modal-title"
      onClick={onClose}
    >
      <div className="exercise-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <header className="exercise-detail-modal-header">
          <div className="exercise-detail-modal-header-info">
            <div className="exercise-detail-title-row">
              <div className="exercise-detail-icon-wrap" aria-hidden="true">
                <Dumbbell size={20} />
              </div>
              <h2 id="exercise-detail-modal-title" className="exercise-detail-title">
                {title}
              </h2>
            </div>
            <div className="exercise-detail-badges">
              {exercise.muscleGroup && (
                <span className="badge badge-primary">{exercise.muscleGroup}</span>
              )}
              {exercise.exerciseType && exercise.exerciseType !== 'Weight' && (
                <span className="badge badge-subtle">{exercise.exerciseType}</span>
              )}
            </div>
          </div>

          <button
            type="button"
            className="exercise-detail-modal-close"
            onClick={onClose}
            aria-label="Cerrar detalle del ejercicio"
          >
            <X size={20} />
          </button>
        </header>

        {/* Cuerpo del Modal */}
        <div className="exercise-detail-modal-body">
          {/* Visualización grande de fotos / técnica animada */}
          <section
            className="exercise-detail-media-section"
            aria-label="Demostración visual del ejercicio"
          >
            <div className="exercise-detail-media-wrapper">
              {hasImages ? (
                <ExerciseGifImage images={exercise.images} name={title} intervalMs={650} />
              ) : (
                <div className="exercise-detail-fallback">
                  <Dumbbell size={48} className="exercise-detail-fallback-icon" />
                  <p>Ilustración técnica en preparación para este ejercicio.</p>
                </div>
              )}
            </div>
            <p className="exercise-detail-media-hint">
              <Info size={14} aria-hidden="true" />
              <span>
                Demostración de posturas inicial y final para ejecutar la técnica correcta.
              </span>
            </p>
          </section>

          {/* Información anatómica y técnica */}
          <section
            className="exercise-detail-info-section"
            aria-label="Información anatómica y muscular"
          >
            <div className="exercise-detail-anatomy-block">
              <div className="exercise-detail-section-title">
                <Flame size={16} className="exercise-detail-section-icon" />
                <span>Músculos Involucrados</span>
              </div>

              <div className="exercise-detail-silhouette-wrap">
                <ExerciseMuscleMiniMap
                  primaryMuscles={primaryMuscles}
                  secondaryMuscles={secondaryMuscles}
                  muscleGroup={exercise.muscleGroup}
                  exerciseName={title}
                />
              </div>

              {/* Chips descriptivos de músculos */}
              {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) && (
                <div className="exercise-detail-chips-list">
                  {primaryMuscles.map((m, idx) => (
                    <span key={`pri-${idx}`} className="badge badge-primary">
                      {getMuscleSpanishName(m)} (Principal)
                    </span>
                  ))}
                  {secondaryMuscles.map((m, idx) => (
                    <span key={`sec-${idx}`} className="badge badge-subtle">
                      {getMuscleSpanishName(m)} (Secundario)
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Guía de ejecución técnica */}
            <div className="exercise-detail-tips-block">
              <div className="exercise-detail-section-title">
                <CheckCircle size={16} className="exercise-detail-section-icon" />
                <span>Pautas para una buena técnica</span>
              </div>
              <ul className="exercise-detail-tips-list">
                <li>
                  <strong>Postura y alineación:</strong> Mantené el torso firme y las articulaciones
                  estabilizadas durante todo el recorrido.
                </li>
                <li>
                  <strong>Control excéntrico:</strong> Realizá la bajada o retorno de manera
                  controlada y sin movimientos bruscos.
                </li>
                <li>
                  <strong>Rango completo:</strong> Buscá la amplitud articular óptima evitando
                  compensaciones posturales.
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Pie del modal */}
        <footer className="exercise-detail-modal-footer">
          <button
            type="button"
            className="btn btn-primary exercise-detail-close-btn"
            onClick={onClose}
          >
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Dumbbell, Flame, CheckCircle, Info, Video } from 'lucide-react';
import { ExerciseGifImage } from '../exercises/ExerciseGifImage';
import { ExerciseMuscleMiniMap } from './ExerciseMuscleMiniMap';
import { getMuscleSpanishName } from '../../utils/exerciseMuscleMapper';
import { exercisesService } from '../../api/exercises';
import { extractYouTubeId } from '../../utils/youtube';
import type { ExerciseMediaDto } from '../../api/generated/entrenamiento';

export interface ExerciseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: {
    id?: string | null;
    exerciseId?: string | null;
    name?: string;
    exerciseName?: string;
    category?: string;
    muscleGroup?: string;
    exerciseType?: string | null;
    videoUrl?: string | null;
    videoSource?: 'Pf' | 'Catalog' | null;
    images?: string[];
    media?: ExerciseMediaDto[];
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    variants?: Array<{
      id: string;
      name: string;
      variantLabel?: string | null;
    }>;
    variantLabel?: string | null;
  } | null;
  activeVariantId?: string | null;
  onSelectVariant?: (variantId: string | null) => void;
  allowVideoEdit?: boolean;
  onVideoChange?: (exerciseId: string, videoUrl: string | null) => void;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  isOpen,
  onClose,
  exercise,
  activeVariantId,
  onSelectVariant,
  allowVideoEdit = false,
  onVideoChange,
}) => {
  const exerciseId = exercise?.id ?? exercise?.exerciseId ?? null;
  const currentVideoUrl = exercise?.videoUrl ?? '';
  const exerciseKey = `${isOpen}:${exerciseId ?? ''}`;
  const [prevExerciseKey, setPrevExerciseKey] = useState(exerciseKey);
  const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);
  const [videoInput, setVideoInput] = useState(currentVideoUrl);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [videoFeedback, setVideoFeedback] = useState<{ text: string; error?: boolean } | null>(
    null,
  );

  // Reiniciar el editor de video cuando se abre/cierra el modal o cambia el ejercicio/variante.
  if (prevExerciseKey !== exerciseKey) {
    setPrevExerciseKey(exerciseKey);
    setIsVideoEditorOpen(false);
    setVideoInput(currentVideoUrl);
    setVideoFeedback(null);
  }

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

  const hasVideo = Boolean(exercise.videoUrl);
  const canEditVideo = Boolean(allowVideoEdit && exerciseId);

  const handleToggleVideoEditor = () => {
    setIsVideoEditorOpen((prev) => {
      const next = !prev;
      if (next) {
        setVideoInput(exercise.videoUrl ?? '');
        setVideoFeedback(null);
      }
      return next;
    });
  };

  const handleSaveVideo = async () => {
    if (!exerciseId) return;

    const trimmed = videoInput.trim();
    if (!trimmed || !extractYouTubeId(trimmed)) {
      setVideoFeedback({
        text: 'El link tiene que ser un video de YouTube.',
        error: true,
      });
      return;
    }

    setIsSavingVideo(true);
    setVideoFeedback(null);
    try {
      await exercisesService.updateVideoUrl(exerciseId, trimmed);
      onVideoChange?.(exerciseId, trimmed);
      setVideoFeedback({ text: '¡Video de YouTube actualizado con éxito!' });
    } catch (err) {
      setVideoFeedback({
        text: err instanceof Error && err.message ? err.message : 'Error al guardar el video.',
        error: true,
      });
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleRemoveVideo = async () => {
    if (!exerciseId) return;

    setIsSavingVideo(true);
    setVideoFeedback(null);
    try {
      await exercisesService.updateVideoUrl(exerciseId, null);
      onVideoChange?.(exerciseId, null);
      setVideoInput('');
      setVideoFeedback({ text: 'Se quitó tu video.' });
    } catch (err) {
      setVideoFeedback({
        text: err instanceof Error && err.message ? err.message : 'Error al quitar el video.',
        error: true,
      });
    } finally {
      setIsSavingVideo(false);
    }
  };

  const title = exercise.exerciseName || exercise.name || 'Detalle del Ejercicio';
  const hasImages = Boolean(
    (exercise.images && exercise.images.length > 0) ||
    (exercise.media && exercise.media.length > 0),
  );
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
              {exercise.variantLabel && (
                <span className="badge badge-info">Variante: {exercise.variantLabel}</span>
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

        {/* Variantes si están disponibles */}
        {exercise.variants && exercise.variants.length > 0 && onSelectVariant && (
          <div
            style={{
              padding: '0.75rem 1.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Variantes:
            </span>
            <button
              type="button"
              className={`touch-chip ${!activeVariantId ? 'active' : ''}`}
              onClick={() => onSelectVariant(null)}
              aria-pressed={!activeVariantId}
            >
              Principal
            </button>
            {exercise.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`touch-chip ${activeVariantId === v.id ? 'active' : ''}`}
                onClick={() => onSelectVariant(v.id)}
                aria-pressed={activeVariantId === v.id}
              >
                {v.variantLabel ?? v.name}
              </button>
            ))}
          </div>
        )}

        {/* Cuerpo del Modal */}
        <div className="exercise-detail-modal-body">
          {/* Visualización grande de fotos / técnica animada */}
          <section
            className="exercise-detail-media-section"
            aria-label="Demostración visual del ejercicio"
          >
            <div className="exercise-detail-media-wrapper">
              {hasImages ? (
                <ExerciseGifImage
                  images={exercise.images}
                  media={exercise.media}
                  name={title}
                  intervalMs={650}
                />
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
        <footer
          className={`exercise-detail-modal-footer${canEditVideo ? ' exercise-detail-modal-footer--with-video' : ''}`}
        >
          {canEditVideo && isVideoEditorOpen && (
            <div className="exercise-detail-video-editor">
              <div className="exercise-detail-video-row">
                <input
                  type="url"
                  className="exercise-detail-video-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  aria-label="Link de video de YouTube"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  disabled={isSavingVideo}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveVideo}
                  disabled={isSavingVideo}
                >
                  {isSavingVideo ? 'Guardando...' : 'Guardar'}
                </button>
                {hasVideo && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleRemoveVideo}
                    disabled={isSavingVideo}
                  >
                    Quitar video
                  </button>
                )}
              </div>
              {videoFeedback && (
                <p
                  className={`exercise-detail-video-feedback ${videoFeedback.error ? 'error' : 'success'}`}
                  role="status"
                >
                  {videoFeedback.text}
                </p>
              )}
            </div>
          )}

          {canEditVideo ? (
            <div className="exercise-detail-footer-actions">
              <button
                type="button"
                className="exercise-detail-video-trigger"
                onClick={handleToggleVideoEditor}
              >
                <Video size={15} aria-hidden="true" />
                <span>{hasVideo ? 'Cambiar video' : 'Agregar video de YouTube'}</span>
              </button>
              <button
                type="button"
                className="btn btn-primary exercise-detail-close-btn"
                onClick={onClose}
              >
                Entendido
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary exercise-detail-close-btn"
              onClick={onClose}
            >
              Entendido
            </button>
          )}
        </footer>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

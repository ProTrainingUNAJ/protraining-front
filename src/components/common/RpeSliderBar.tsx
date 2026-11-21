import React, { useRef, useState, useCallback } from 'react';
import { RPE_LEVELS_ARRAY, RPE_LEVELS_META } from '../routine/finishRoutineUtils';

export interface RpeSliderBarProps {
  value: number | null;
  onChange: (val: number) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * Barra continua y deslizable para la escala de esfuerzo RPE (1 a 10 de Foster).
 * Permite deslizar fluidamente con el dedo o mouse (touch & drag) o pulsar en cualquier nivel.
 * Conserva la gama cromática oficial de ProTraining según el número de RPE:
 * - 1-2: Azul suave (Recuperación)
 * - 3-4: Verde (Moderado)
 * - 5-6: Amarillo / Ámbar (Exigente)
 * - 7-8: Naranja / Coral (Muy Duro)
 * - 9-10: Rojo (Máximo)
 */
export const RpeSliderBar: React.FC<RpeSliderBarProps> = ({
  value,
  onChange,
  id,
  className = '',
  disabled = false,
  ariaLabel = 'Escala de esfuerzo RPE (1-10)',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Calcula el nivel RPE (1 al 10) a partir de la posición horizontal X del puntero
  const calcRpeFromPointer = useCallback((clientX: number): number => {
    if (!trackRef.current) return 1;
    const rect = trackRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 1;
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(0.9999, relativeX / rect.width));
    const step = Math.floor(ratio * 10) + 1;
    return Math.max(1, Math.min(10, step));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignorar si el navegador o jsdom no soporta pointer capture
    }
    const newLevel = calcRpeFromPointer(e.clientX);
    onChange(newLevel);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    const newLevel = calcRpeFromPointer(e.clientX);
    if (newLevel !== value) {
      onChange(newLevel);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignorar si ya fue liberado
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // Ignorar
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = value ?? 5;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, current - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(10, current + 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(1);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(10);
    }
  };

  const activeMeta = value !== null ? RPE_LEVELS_META[value] : null;
  const fillPercent = value !== null ? (value / 10) * 100 : 0;
  const thumbPercent = value !== null ? ((value - 0.5) / 10) * 100 : 0;

  return (
    <div
      className={`rpe-slider-container ${className}`}
      role="group"
      aria-label="Escala de esfuerzo"
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Input nativo sincronizado para lectores de pantalla y accesibilidad */}
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? ''}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (!isNaN(val) && val >= 1 && val <= 10) {
            onChange(val);
          }
        }}
        disabled={disabled}
        className="rpe-slider-native-input"
        aria-label={ariaLabel}
      />

      {/* Pista continua tipo barra de carga deslizable (Imagen 3) */}
      <div
        ref={trackRef}
        className={`rpe-slider-track ${isDragging ? 'rpe-slider-track--dragging' : ''} ${
          disabled ? 'rpe-slider-track--disabled' : ''
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Relleno dinámico de la barra de carga con degradado cromático Foster */}
        <div className="rpe-slider-fill" style={{ width: `${fillPercent}%` }} aria-hidden="true" />

        {/* Espectro cromático continuo en la base */}
        <div className="rpe-slider-spectrum" aria-hidden="true" />

        {/* Indicador / Thumb flotante circular con el valor de RPE actual adentro */}
        {activeMeta && value !== null && (
          <div
            className={`rpe-slider-thumb rpe-slider-thumb--${activeMeta.tier}`}
            style={{
              left: `${thumbPercent}%`,
            }}
            aria-hidden="true"
          >
            <span className="rpe-slider-thumb-label">{value}</span>
          </div>
        )}
      </div>

      {/* 10 marcas y botones táctiles interactivos de la escala */}
      <div className="rpe-slider-segments">
        {RPE_LEVELS_ARRAY.map(({ val, tier }) => {
          const isSelected = value === val;
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onChange(val);
              }}
              className={`rpe-slider-btn finish-routine-rpe-btn dl-rpe-btn finish-routine-rpe-btn--${tier} dl-rpe-btn--${tier} ${
                isSelected
                  ? 'rpe-slider-btn--selected finish-routine-rpe-btn--selected dl-rpe-btn--selected'
                  : ''
              }`}
              aria-label={`Nivel ${val}`}
              aria-pressed={isSelected}
            >
              <span className="rpe-slider-btn-num">{val}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

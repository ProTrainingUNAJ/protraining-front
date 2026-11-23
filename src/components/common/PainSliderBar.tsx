import React, { useRef, useState, useCallback } from 'react';
import { getPainColor, getPainLabel } from './painSliderUtils';

export interface PainSliderBarProps {
  value: number | null;
  onChange: (val: number) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  max?: number;
  ariaLabel?: string;
}

/**
 * Barra continua y deslizable con degradado de color (azul -> verde -> amarillo -> naranja -> rojo)
 * para evaluar el nivel de molestia muscular o dolor (0 a 10) según requerimiento visual KAN-642.
 */
export const PainSliderBar: React.FC<PainSliderBarProps> = ({
  value,
  onChange,
  id,
  className = '',
  disabled = false,
  min = 0,
  max = 10,
  ariaLabel = 'Nivel de dolor o molestia (0 a 10)',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const totalSteps = max - min; // 10 steps

  // Calcula el valor (min a max) a partir de la posición horizontal X del puntero
  const calcScoreFromPointer = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      if (rect.width <= 0) return min;
      const relativeX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
      const step = Math.round(ratio * totalSteps) + min;
      return Math.max(min, Math.min(max, step));
    },
    [min, max, totalSteps],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || e.button !== 0) return;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignorar si el navegador o jsdom no soporta pointer capture
    }
    const newLevel = calcScoreFromPointer(e.clientX);
    onChange(newLevel);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || disabled) return;
    const newLevel = calcScoreFromPointer(e.clientX);
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
        // Ignorar
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
    const current = value ?? 0;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(min, current - 1));
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(max, current + 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  const activeColor = getPainColor(value);
  // Porcentaje de 0 a 100%
  const thumbPercent = value !== null ? ((value - min) / totalSteps) * 100 : 0;

  // Array de valores numéricos de min a max (0 a 10 = 11 elementos)
  const stepsArray = Array.from({ length: totalSteps + 1 }, (_, i) => min + i);

  return (
    <div
      className={`pain-slider-container ${className}`}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      style={{
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        padding: '0.5rem 0.25rem 0.25rem',
        boxSizing: 'border-box',
        outline: 'none',
      }}
    >
      {/* Input nativo sincronizado para accesibilidad */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value ?? min}
        onChange={(e) => {
          const val = Number(e.target.value);
          if (!isNaN(val) && val >= min && val <= max) {
            onChange(val);
          }
        }}
        disabled={disabled}
        aria-label={ariaLabel}
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      {/* Pista continua con degradé cromático suave (Imagen 3) */}
      <div
        ref={trackRef}
        className={`pain-slider-track ${isDragging ? 'pain-slider-track--dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          position: 'relative',
          width: '100%',
          height: '1.45rem',
          borderRadius: '9999px',
          background: 'var(--pain-track-grad)',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.06)',
          cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Thumb circular flotante con el número activo (Imagen 3) */}
        {value !== null && (
          <div
            className="pain-slider-thumb"
            style={{
              position: 'absolute',
              top: '50%',
              left: `${thumbPercent}%`,
              transform: `translate(-50%, -50%) ${isDragging ? 'scale(1.12)' : 'scale(1)'}`,
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '50%',
              backgroundColor: activeColor,
              border: '3.5px solid var(--pain-scale-thumb-border)',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'left 0.15s ease, background-color 0.15s ease',
              willChange: 'left, transform',
            }}
            aria-hidden="true"
          >
            <span
              style={{
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 900,
                lineHeight: 1,
                fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
              }}
            >
              {value}
            </span>
          </div>
        )}
      </div>

      {/* 11 marcas numéricas interactivas debajo de la pista (0 a 10) */}
      <div
        className="pain-slider-segments"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${stepsArray.length}, 1fr)`,
          width: '100%',
          marginTop: '0.25rem',
          zIndex: 3,
        }}
      >
        {stepsArray.map((level) => {
          const isSelected = value === level;
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onChange(level);
              }}
              aria-label={`Nivel ${level}`}
              aria-pressed={isSelected}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                padding: '0.25rem 0',
                margin: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: isSelected ? 'var(--text-main, #0f2942)' : 'var(--text-muted, #64748b)',
                fontSize: isSelected ? '1rem' : '0.82rem',
                fontWeight: isSelected ? 900 : 700,
                borderRadius: '6px',
                transition: 'all 0.15s ease',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                fontFamily: 'inherit',
                transform: isSelected ? 'scale(1.15)' : 'none',
              }}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Rótulo descriptivo del nivel actual */}
      <div
        style={{
          marginTop: '0.25rem',
          textAlign: 'center',
          fontSize: '0.88rem',
          fontWeight: 700,
          color: activeColor,
          transition: 'color 0.2s ease',
        }}
      >
        {getPainLabel(value)}
      </div>
    </div>
  );
};

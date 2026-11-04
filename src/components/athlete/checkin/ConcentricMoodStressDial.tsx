import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SubtleFireworks } from './SubtleFireworks';
import {
  ConcentricMoodStressDialProps,
  MOODS,
  SVG_WIDTH,
  SVG_HEIGHT,
  CX,
  CY,
} from './mood/mood.types';
import { MoodWedges } from './mood/MoodWedges';
import { MoodBubbleFace } from './mood/MoodBubbleFace';
import { MoodStarEffects } from './mood/MoodStarEffects';
import { MoodSpeedometerNeedle } from './mood/MoodSpeedometerNeedle';

export type { ConcentricMoodStressDialProps };

export const ConcentricMoodStressDial: React.FC<ConcentricMoodStressDialProps> = ({
  moodRate,
  onMoodChange,
  className = '',
  onPrev,
  onNext,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [tearKey, setTearKey] = useState(0);
  const prevMoodRef = useRef(moodRate);

  const activeMood = MOODS[moodRate] || MOODS[3];
  const currentAngle = activeMood.angle;
  const isStarMood = moodRate === 4 || moodRate === 5;

  // Paleta de colores de estrellitas según si es Motivado o Excelente
  const starPalette =
    moodRate === 4
      ? ['var(--checkin-star-gold)', 'var(--checkin-star-green)', 'var(--checkin-star-yellow)']
      : ['var(--checkin-star-gold)', 'var(--checkin-star-violet)', 'var(--checkin-star-pink)'];

  useEffect(() => {
    if ((moodRate === 4 || moodRate === 5) && moodRate !== prevMoodRef.current) {
      setBurstKey((prev) => prev + 1);
    }
    if (moodRate === 1 && moodRate !== prevMoodRef.current) {
      setTearKey((prev) => prev + 1);
    }
    prevMoodRef.current = moodRate;
  }, [moodRate]);

  const handleSectorClick = (val: number) => {
    if (val === 4 || val === 5) {
      setBurstKey((prev) => prev + 1);
    }
    if (val === 1) {
      setTearKey((prev) => prev + 1);
    }
    onMoodChange(val);
  };

  const handlePointerCoord = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * SVG_WIDTH;
      const svgY = ((clientY - rect.top) / rect.height) * SVG_HEIGHT;

      const dx = svgX - CX;
      const dy = svgY - CY;
      const deg = Math.atan2(dx, -dy) * (180 / Math.PI);

      let val: number;
      if (deg < -54) {
        val = 1;
      } else if (deg < -18) {
        val = 2;
      } else if (deg < 18) {
        val = 3;
      } else if (deg < 54) {
        val = 4;
      } else {
        val = 5;
      }
      onMoodChange(val);
    },
    [onMoodChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    handlePointerCoord(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handlePointerCoord(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  return (
    <div className={`pixel-mood-screen-container ${className}`}>
      {/* ── Main Card ── */}
      <div className="pixel-mood-card">
        {/* Leves fuegos artificiales al seleccionar Excelente */}
        <SubtleFireworks active={moodRate === 5} triggerKey={burstKey} />

        {/* ── Cabecera Superior con Botones Circulares de Navegación ── */}
        <div className="pixel-mood-nav-wrap">
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              aria-label="Volver atrás"
              className="checkin-circular-nav-btn prev"
              title="Paso anterior"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          ) : (
            <div style={{ width: '40px', minWidth: '40px' }} />
          )}

          {/* Título Central */}
          <h1
            className="pixel-slide-title"
            style={{
              fontWeight: 800,
              color: 'var(--checkin-title-color)',
              textAlign: 'center',
              letterSpacing: '-0.025em',
              flex: 1,
            }}
          >
            ¿Cómo describes tu
            <br />
            ánimo?
          </h1>

          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              aria-label="Ir al siguiente paso"
              className="checkin-circular-nav-btn next"
              title="Siguiente paso"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ) : (
            <div style={{ width: '40px', minWidth: '40px' }} />
          )}
        </div>

        {/* ── Subtitle in Medium Blue ── */}
        <p
          className="pixel-slide-subtitle"
          style={{
            fontWeight: 500,
            color: 'var(--checkin-subtitle-color)',
            textAlign: 'center',
            letterSpacing: '-0.01em',
          }}
        >
          {activeMood.phrase}
        </p>

        {/* ── Floating Bubble con Efecto de Estrellitas para Motivado o Excelente ── */}
        <div className="pixel-mood-bubble-center">
          <MoodStarEffects isStarMood={isStarMood} burstKey={burstKey} starPalette={starPalette} />
          <MoodBubbleFace activeMood={activeMood} isStarMood={isStarMood} tearKey={tearKey} />
        </div>

        {/* ── Dos trazos curvos indicadores (︶ ︶) ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            marginBottom: '0.45rem',
            zIndex: 2,
          }}
          aria-hidden="true"
        >
          <svg width="22" height="13" viewBox="0 0 22 13" fill="none">
            <path
              d="M 3 4 Q 11 9 19 4"
              stroke="var(--checkin-waves-stroke)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 3 9 Q 11 14 19 9"
              stroke="var(--checkin-waves-stroke)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ── 180° Semicircular Selector con las 5 caras y aguja ── */}
        <div
          className={`mood-dial-touch-zone ${isDragging ? 'is-dragging' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              overflow: 'visible',
            }}
          >
            <MoodWedges onSectorClick={handleSectorClick} />
            <MoodSpeedometerNeedle angle={currentAngle} isDragging={isDragging} />
          </svg>
        </div>
      </div>
    </div>
  );
};

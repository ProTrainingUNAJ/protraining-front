import React, { useRef, useState, useCallback, useEffect } from 'react';
import { SubtleFireworks } from './SubtleFireworks';

export interface ConcentricMoodStressDialProps {
  moodRate: number; // 1 to 5
  onMoodChange: (val: number) => void;
  stressLevel: number; // 1 to 5
  onStressChange: (val: number) => void;
  title?: string;
  className?: string;
  onPrev?: () => void;
  onNext?: () => void;
}

interface MoodData {
  value: number;
  label: string;
  phrase: string;
  color: string;
  eyeType: 'sad' | 'worried' | 'neutral' | 'happy' | 'star';
  angle: number;
}

const MOODS: Record<number, MoodData> = {
  1: {
    value: 1,
    label: 'Desanimado',
    phrase: 'Me siento desanimado.',
    color: '#5D2517',
    eyeType: 'sad',
    angle: -72,
  },
  2: {
    value: 2,
    label: 'Regular',
    phrase: 'Me siento regular.',
    color: '#F05A22',
    eyeType: 'worried',
    angle: -36,
  },
  3: {
    value: 3,
    label: 'Neutral',
    phrase: 'Me siento neutral.',
    color: '#FFAE19',
    eyeType: 'neutral',
    angle: 0,
  },
  4: {
    value: 4,
    label: 'Motivado',
    phrase: 'Me siento motivado.',
    color: '#2CA049',
    eyeType: 'happy',
    angle: 36,
  },
  5: {
    value: 5,
    label: 'Excelente',
    phrase: 'Me siento excelente.',
    color: '#9B26B6',
    eyeType: 'star',
    angle: 72,
  },
};

// Dial geometry constants matching FOTO 2 & Paso 2 proportions
const SVG_WIDTH = 560;
const SVG_HEIGHT = 280;
const CX = 280;
const CY = 280;
const R_OUTER = 260;
const R_INNER = 148;

function createWedgePath(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const startRad = toRad(startDeg);
  const endRad = toRad(endDeg);

  const x1 = cx + rOuter * Math.cos(startRad);
  const y1 = cy + rOuter * Math.sin(startRad);
  const x2 = cx + rOuter * Math.cos(endRad);
  const y2 = cy + rOuter * Math.sin(endRad);

  const x3 = cx + rInner * Math.cos(endRad);
  const y3 = cy + rInner * Math.sin(endRad);
  const x4 = cx + rInner * Math.cos(startRad);
  const y4 = cy + rInner * Math.sin(startRad);

  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return `
    M ${x1} ${y1}
    A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4}
    Z
  `;
}

// 5-point star polygon points
const STAR_POINTS_RULETA =
  '0,-8 2.3,-2.4 8,-2.4 3.5,1 5.1,6.7 0,3.1 -5.1,6.7 -3.5,1 -8,-2.4 -2.3,-2.4';
const STAR_POINTS_BUBBLE =
  '0,-7.5 2.2,-2.3 7.5,-2.3 3.2,0.8 4.8,5.8 0,2.3 -4.8,5.8 -3.2,0.8 -7.5,-2.3 -2.2,-2.3';

// ── Partículas para la ráfaga de estrellitas al estar Motivado o Excelente ──
const BURST_STARS = [
  {
    id: 1,
    angle: -85,
    distance: 72,
    size: 18,
    type: 'four' as const,
    delay: 0,
    rot: 45,
    colorIdx: 0,
  },
  {
    id: 2,
    angle: -60,
    distance: 88,
    size: 14,
    type: 'five' as const,
    delay: 40,
    rot: -30,
    colorIdx: 1,
  },
  {
    id: 3,
    angle: -35,
    distance: 68,
    size: 20,
    type: 'four' as const,
    delay: 20,
    rot: 75,
    colorIdx: 2,
  },
  {
    id: 4,
    angle: -10,
    distance: 82,
    size: 15,
    type: 'five' as const,
    delay: 60,
    rot: 90,
    colorIdx: 0,
  },
  {
    id: 5,
    angle: 15,
    distance: 75,
    size: 17,
    type: 'four' as const,
    delay: 10,
    rot: -45,
    colorIdx: 1,
  },
  {
    id: 6,
    angle: 40,
    distance: 90,
    size: 13,
    type: 'five' as const,
    delay: 50,
    rot: 30,
    colorIdx: 2,
  },
  {
    id: 7,
    angle: 65,
    distance: 70,
    size: 19,
    type: 'four' as const,
    delay: 30,
    rot: 60,
    colorIdx: 0,
  },
  {
    id: 8,
    angle: 90,
    distance: 84,
    size: 14,
    type: 'five' as const,
    delay: 70,
    rot: -60,
    colorIdx: 1,
  },
  {
    id: 9,
    angle: 120,
    distance: 66,
    size: 16,
    type: 'four' as const,
    delay: 15,
    rot: 40,
    colorIdx: 2,
  },
  {
    id: 10,
    angle: 150,
    distance: 78,
    size: 13,
    type: 'five' as const,
    delay: 45,
    rot: -45,
    colorIdx: 0,
  },
  {
    id: 11,
    angle: 180,
    distance: 64,
    size: 18,
    type: 'four' as const,
    delay: 25,
    rot: 90,
    colorIdx: 1,
  },
  {
    id: 12,
    angle: 210,
    distance: 80,
    size: 14,
    type: 'five' as const,
    delay: 65,
    rot: -30,
    colorIdx: 2,
  },
  {
    id: 13,
    angle: 240,
    distance: 68,
    size: 16,
    type: 'four' as const,
    delay: 35,
    rot: 60,
    colorIdx: 0,
  },
  {
    id: 14,
    angle: 265,
    distance: 86,
    size: 13,
    type: 'five' as const,
    delay: 55,
    rot: -75,
    colorIdx: 1,
  },
  {
    id: 15,
    angle: 290,
    distance: 70,
    size: 18,
    type: 'four' as const,
    delay: 10,
    rot: 45,
    colorIdx: 2,
  },
  {
    id: 16,
    angle: 320,
    distance: 85,
    size: 14,
    type: 'five' as const,
    delay: 50,
    rot: -20,
    colorIdx: 0,
  },
];

// Estrellitas ambientales continuas que titilan alrededor de la burbuja
const AMBIENT_STARS = [
  {
    id: 'a1',
    x: -56,
    y: -26,
    size: 16,
    type: 'four' as const,
    duration: 2.2,
    delay: 0,
    colorIdx: 0,
  },
  {
    id: 'a2',
    x: 54,
    y: -28,
    size: 15,
    type: 'five' as const,
    duration: 2.6,
    delay: 0.5,
    colorIdx: 1,
  },
  {
    id: 'a3',
    x: -62,
    y: 16,
    size: 13,
    type: 'five' as const,
    duration: 2.4,
    delay: 0.9,
    colorIdx: 2,
  },
  {
    id: 'a4',
    x: 58,
    y: 14,
    size: 17,
    type: 'four' as const,
    duration: 2.8,
    delay: 0.3,
    colorIdx: 0,
  },
  {
    id: 'a5',
    x: -20,
    y: -54,
    size: 12,
    type: 'five' as const,
    duration: 2.3,
    delay: 1.2,
    colorIdx: 1,
  },
  {
    id: 'a6',
    x: 24,
    y: -52,
    size: 15,
    type: 'four' as const,
    duration: 2.5,
    delay: 0.7,
    colorIdx: 2,
  },
];

function renderStarSvg(type: 'four' | 'five', size: number, color: string) {
  if (type === 'four') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="-10 -10 20 20"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d="M 0 -10 Q 0 0 10 0 Q 0 0 0 10 Q 0 0 -10 0 Q 0 0 0 -10 Z"
          fill={color}
          filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.8)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 20 20"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polygon
        points="0,-8 2.4,-2.5 8.2,-2.5 3.5,0.9 5.3,6.2 0,2.6 -5.3,6.2 -3.5,0.9 -8.2,-2.5 -2.4,-2.5"
        fill={color}
        filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.8)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
      />
    </svg>
  );
}

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

  // Paleta de colores de estrellitas según si es Motivado (verde/oro) o Excelente (violeta/oro/fucsia)
  const starPalette =
    moodRate === 4 ? ['#FBBF24', '#4ADE80', '#FEF08A'] : ['#FBBF24', '#C084FC', '#F472B6'];

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
    <div
      className={`pixel-mood-screen-container ${className}`}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.2rem 0',
        userSelect: 'none',
      }}
    >
      {/* ── Main Card matching standard 820px x 880px dimensions ── */}
      <div
        className="pixel-mood-card"
        style={{
          width: '100%',
          maxWidth: '820px',
          height: 'auto',
          minHeight: 'auto',
          background: 'var(--checkin-card-bg)',
          borderRadius: '28px',
          border: '1.5px solid var(--checkin-card-border)',
          boxShadow: 'var(--checkin-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          overflow: 'visible',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Leves fuegos artificiales al seleccionar Excelente (violeta) */}
        <SubtleFireworks active={moodRate === 5} triggerKey={burstKey} />

        {/* ── Cabecera Superior con Botones Circulares de Navegación a la altura del Título ── */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.35rem',
            position: 'relative',
          }}
        >
          {/* Botón Circular Atrás (←) */}
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

          {/* Botón Circular Siguiente (→) */}
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

        {/* ── Subtitle in Medium Blue (#556987 in light, #9DA8B5 in dark) with Montserrat font ── */}
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
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Estilos CSS de animación para las estrellitas */}
          <style>{`
            @keyframes starBurstFly {
              0% {
                transform: translate(-50%, -50%) translate(0, 0) scale(0) rotate(0deg);
                opacity: 1;
              }
              35% {
                transform: translate(-50%, -50%) translate(calc(var(--star-dx) * 0.5), calc(var(--star-dy) * 0.5)) scale(1.35) rotate(calc(var(--star-rot) * 0.5));
                opacity: 1;
              }
              75% {
                transform: translate(-50%, -50%) translate(calc(var(--star-dx) * 0.9), calc(var(--star-dy) * 0.9)) scale(1) rotate(calc(var(--star-rot) * 0.9));
                opacity: 0.95;
              }
              100% {
                transform: translate(-50%, -50%) translate(var(--star-dx), var(--star-dy)) scale(0) rotate(var(--star-rot));
                opacity: 0;
              }
            }

            @keyframes starAmbientTwinkle {
              0%, 100% {
                transform: translate(-50%, -50%) scale(0.65) rotate(0deg);
                opacity: 0.25;
              }
              50% {
                transform: translate(-50%, -50%) scale(1.2) rotate(25deg);
                opacity: 1;
              }
            }

            @keyframes tearDropFall {
              0% {
                transform: translateY(0px) scale(0.3);
                opacity: 0;
              }
              20% {
                transform: translateY(2px) scale(1);
                opacity: 0.95;
              }
              65% {
                transform: translateY(12px) scale(1.05);
                opacity: 0.95;
              }
              85% {
                transform: translateY(18px) scale(0.85);
                opacity: 0.55;
              }
              100% {
                transform: translateY(22px) scale(0.2);
                opacity: 0;
              }
            }

            @keyframes bubbleReaction {
              0% {
                transform: scale(0.92);
              }
              45% {
                transform: scale(1.12);
              }
              75% {
                transform: scale(0.98);
              }
              100% {
                transform: scale(1);
              }
            }
          `}</style>

          {/* Ráfaga de estrellitas (Burst) que estalla al seleccionar Motivado o Excelente */}
          {isStarMood && (
            <div
              key={`burst-${burstKey}`}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0px',
                height: '0px',
                pointerEvents: 'none',
                zIndex: 4,
              }}
              aria-hidden="true"
            >
              {BURST_STARS.map((s) => {
                const rad = (s.angle * Math.PI) / 180;
                const dx = Math.round(s.distance * Math.cos(rad));
                const dy = Math.round(s.distance * Math.sin(rad));
                const color = starPalette[s.colorIdx];

                return (
                  <span
                    key={`b-${s.id}`}
                    style={{
                      position: 'absolute',
                      top: '0px',
                      left: '0px',
                      ['--star-dx' as string]: `${dx}px`,
                      ['--star-dy' as string]: `${dy}px`,
                      ['--star-rot' as string]: `${s.rot}deg`,
                      animation: `starBurstFly 0.85s cubic-bezier(0.25, 1, 0.5, 1) ${s.delay}ms forwards`,
                    }}
                  >
                    {renderStarSvg(s.type, s.size, color)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Estrellitas ambientales continuas que titilan suavemente alrededor de la burbuja */}
          {isStarMood && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0px',
                height: '0px',
                pointerEvents: 'none',
                zIndex: 4,
              }}
              aria-hidden="true"
            >
              {AMBIENT_STARS.map((s) => {
                const color = starPalette[s.colorIdx];
                return (
                  <span
                    key={`amb-${s.id}`}
                    style={{
                      position: 'absolute',
                      top: `${s.y}px`,
                      left: `${s.x}px`,
                      animation: `starAmbientTwinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
                    }}
                  >
                    {renderStarSvg(s.type, s.size, color)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Círculo de la burbuja responsivo con rebote al mover la aguja */}
          <div
            key={`bubble-circle-${moodRate}`}
            className="pixel-bubble-hero"
            style={{
              background: activeMood.color,
              boxShadow: isStarMood
                ? `0 0 26px ${activeMood.color}70, 0 8px 24px ${activeMood.color}45`
                : `0 8px 24px ${activeMood.color}45`,
              animation: 'bubbleReaction 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
            }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 60 60" style={{ width: '82%', height: '82%', overflow: 'visible' }}>
              {activeMood.eyeType === 'sad' ? (
                <>
                  {/* Sad dropped eyebrows + eyes matching FOTO 2 */}
                  <path
                    d="M 15 17 Q 21 21 27 21"
                    stroke="#2B1408"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 45 17 Q 39 21 33 21"
                    stroke="#2B1408"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle cx="21" cy="25" r="2.6" fill="#2B1408" />
                  <circle cx="39" cy="25" r="2.6" fill="#2B1408" />
                  <path
                    d="M 19 43 Q 30 31 41 43"
                    fill="none"
                    stroke="#2B1408"
                    strokeWidth="4.4"
                    strokeLinecap="round"
                  />

                  {/* Lágrima animada cayendo del ojo izquierdo exactamente DOS VECES */}
                  <g
                    key={`tear-${tearKey}`}
                    style={{
                      animation: 'tearDropFall 1.35s ease-in 0.15s 2 normal forwards',
                    }}
                  >
                    <path
                      d="M 21 27 C 19 29.5, 18.2 31.5, 18.6 33.5 C 19 35.5, 23 35.5, 23.4 33.5 C 23.8 31.5, 23 29.5, 21 27 Z"
                      fill="#38BDF8"
                      stroke="#0284C7"
                      strokeWidth="0.5"
                      filter="drop-shadow(0 0 2px rgba(56, 189, 248, 0.6))"
                    />
                    <circle cx="20.3" cy="32.5" r="0.7" fill="#FFFFFF" />
                  </g>
                </>
              ) : activeMood.eyeType === 'worried' ? (
                <>
                  {/* Orange face: two vertical pills + sad mouth */}
                  <rect x="20" y="18" width="5" height="13" rx="2.5" fill="#2B1408" />
                  <rect x="35" y="18" width="5" height="13" rx="2.5" fill="#2B1408" />
                  <path
                    d="M 19 41 Q 30 33 41 41"
                    fill="none"
                    stroke="#2B1408"
                    strokeWidth="4.4"
                    strokeLinecap="round"
                  />
                </>
              ) : activeMood.eyeType === 'neutral' ? (
                <>
                  {/* Yellow face: two pill eyes + straight horizontal mouth (FOTO 4) */}
                  <rect x="20" y="18" width="5.2" height="14" rx="2.6" fill="#2B1408" />
                  <rect x="35" y="18" width="5.2" height="14" rx="2.6" fill="#2B1408" />
                  <line
                    x1="18"
                    y1="39"
                    x2="42"
                    y2="39"
                    stroke="#2B1408"
                    strokeWidth="4.6"
                    strokeLinecap="round"
                  />
                </>
              ) : activeMood.eyeType === 'happy' ? (
                <>
                  {/* Green face: arched happy eyes + friendly smile */}
                  <path
                    d="M 17 24 Q 22 15 28 24"
                    stroke="#2B1408"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 32 24 Q 38 15 43 24"
                    stroke="#2B1408"
                    strokeWidth="3.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 19 36 Q 30 48 41 36"
                    fill="none"
                    stroke="#2B1408"
                    strokeWidth="4.4"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  {/* Violet face: TWO 5-POINT STAR EYES (⭐ ⭐) + wide smile */}
                  <g transform="translate(21, 21)">
                    <polygon points={STAR_POINTS_BUBBLE} fill="#2B1408" />
                  </g>
                  <g transform="translate(39, 21)">
                    <polygon points={STAR_POINTS_BUBBLE} fill="#2B1408" />
                  </g>
                  <path
                    d="M 18 36 Q 30 50 42 36"
                    fill="none"
                    stroke="#2B1408"
                    strokeWidth="4.6"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        {/* ── Two Fine Curved Stroke Indicators (︶ ︶) matching FOTO 2 & FOTO 4 ── */}
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

        {/* ── 180° Semicircular Selector with ALL 5 FACES UPRIGHT (0° ROTATION) matching FOTO 2 & Paso 2 proportions ── */}
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            height: '280px',
            position: 'relative',
            touchAction: 'none',
            cursor: 'grab',
            marginTop: '0.5rem',
          }}
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
            {/* 1. Sector Brown (left: -90° to -54°) */}
            <path
              d={createWedgePath(CX, CY, R_INNER, R_OUTER, -90, -54)}
              fill="#5D2517"
              onClick={() => handleSectorClick(1)}
              style={{ cursor: 'pointer' }}
            />
            {/* Cara grabada Marrón (Desanimado: cejas caídas tristes + boca caída) COMPLETAMENTE DERECHA (0° rotación) como FOTO 2 */}
            <g
              transform="translate(86, 217)"
              stroke="#2B1408"
              fill="none"
              onClick={() => handleSectorClick(1)}
              style={{ cursor: 'pointer' }}
            >
              {/* Cejas caídas \ / */}
              <path
                d="M -16 -10 Q -9 -7 -3 -7"
                stroke="#2B1408"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 3 -7 Q 9 -7 16 -10"
                stroke="#2B1408"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="-9" cy="0" r="3.2" fill="#2B1408" stroke="none" />
              <circle cx="9" cy="0" r="3.2" fill="#2B1408" stroke="none" />
              {/* Boca triste hacia abajo */}
              <path
                d="M -15 14 Q 0 4 15 14"
                stroke="#2B1408"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* 2. Sector Orange (left: -54° to -18°) */}
            <path
              d={createWedgePath(CX, CY, R_INNER, R_OUTER, -54, -18)}
              fill="#F05A22"
              onClick={() => handleSectorClick(2)}
              style={{ cursor: 'pointer' }}
            />
            {/* Cara grabada Naranja (Regular: dos ojos verticales + boca triste) COMPLETAMENTE DERECHA (0° rotación) como FOTO 2 */}
            <g
              transform="translate(160, 115)"
              stroke="#2B1408"
              fill="none"
              onClick={() => handleSectorClick(2)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x="-13"
                y="-12"
                width="6.5"
                height="18"
                rx="3.25"
                fill="#2B1408"
                stroke="none"
              />
              <rect
                x="6.5"
                y="-12"
                width="6.5"
                height="18"
                rx="3.25"
                fill="#2B1408"
                stroke="none"
              />
              <path
                d="M -14 13 Q 0 3 14 13"
                stroke="#2B1408"
                strokeWidth="4.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* 3. Sector Yellow (center: -18° to 18°) */}
            <path
              d={createWedgePath(CX, CY, R_INNER, R_OUTER, -18, 18)}
              fill="#FFAE19"
              onClick={() => handleSectorClick(3)}
              style={{ cursor: 'pointer' }}
            />
            {/* Cara grabada Amarillo (Neutral: dos ojos de cápsula + boca recta) COMPLETAMENTE DERECHA como FOTO 2 */}
            <g
              transform="translate(280, 76)"
              stroke="#2B1408"
              fill="none"
              onClick={() => handleSectorClick(3)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x="-13"
                y="-12"
                width="6.5"
                height="19"
                rx="3.25"
                fill="#2B1408"
                stroke="none"
              />
              <rect
                x="6.5"
                y="-12"
                width="6.5"
                height="19"
                rx="3.25"
                fill="#2B1408"
                stroke="none"
              />
              <line
                x1="-15"
                y1="14"
                x2="15"
                y2="14"
                stroke="#2B1408"
                strokeWidth="4.8"
                strokeLinecap="round"
              />
            </g>

            {/* 4. Sector Green (right: 18° to 54°) */}
            <path
              d={createWedgePath(CX, CY, R_INNER, R_OUTER, 18, 54)}
              fill="#2CA049"
              onClick={() => handleSectorClick(4)}
              style={{ cursor: 'pointer' }}
            />
            {/* Cara grabada Verde (Motivado: ojos sonrientes en arco + sonrisa) COMPLETAMENTE DERECHA (0° rotación) como FOTO 2 */}
            <g
              transform="translate(400, 115)"
              stroke="#2B1408"
              fill="none"
              onClick={() => handleSectorClick(4)}
              style={{ cursor: 'pointer' }}
            >
              <path
                d="M -15 -1 Q -8 -15 -1 -1"
                stroke="#2B1408"
                strokeWidth="4.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 1 -1 Q 8 -15 15 -1"
                stroke="#2B1408"
                strokeWidth="4.2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M -14 11 Q 0 26 14 11"
                stroke="#2B1408"
                strokeWidth="4.2"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* 5. Sector Violet (right: 54° to 90°) */}
            <path
              d={createWedgePath(CX, CY, R_INNER, R_OUTER, 54, 90)}
              fill="#9B26B6"
              onClick={() => handleSectorClick(5)}
              style={{ cursor: 'pointer' }}
            />
            {/* Cara grabada Violeta (Excelente: DOS ESTRELLAS ⭐ ⭐ HORIZONTALES + gran sonrisa) COMPLETAMENTE DERECHA (0° rotación) como FOTO 2 */}
            <g
              transform="translate(474, 217)"
              stroke="#2B1408"
              fill="none"
              onClick={() => handleSectorClick(5)}
              style={{ cursor: 'pointer' }}
            >
              {/* Star Eyes (Horizontal) */}
              <g transform="translate(-11, -4)">
                <polygon points={STAR_POINTS_RULETA} fill="#2B1408" stroke="none" />
              </g>
              <g transform="translate(11, -4)">
                <polygon points={STAR_POINTS_RULETA} fill="#2B1408" stroke="none" />
              </g>
              {/* Wide smile */}
              <path
                d="M -15 9 Q 0 29 15 9"
                stroke="#2B1408"
                strokeWidth="4.6"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* Inner Semicircle Background */}
            <circle cx={CX} cy={CY} r={R_INNER} fill="var(--checkin-inner-bg)" />

            {/* ── Indicador Pivotante de Velocímetro Deportivo ── */}
            <g
              style={{
                transformOrigin: `${CX}px ${CY}px`,
                transform: `rotate(${currentAngle}deg) ${isDragging ? 'scale(1.035)' : 'scale(1)'}`,
                transition: isDragging
                  ? 'none'
                  : 'transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1)',
                cursor: isDragging ? 'grabbing' : 'grab',
              }}
            >
              {/* Cuerpo y base circular sólida de la aguja (sin aros ni círculos extra) */}
              <path
                d={`
                  M ${CX - 12} ${CY - 16}
                  L ${CX - 3.5} ${CY - 240}
                  Q ${CX} ${CY - 245} ${CX + 3.5} ${CY - 240}
                  L ${CX + 12} ${CY - 16}
                  A 26 26 0 1 1 ${CX - 12} ${CY - 16}
                `}
                fill="var(--checkin-needle-color)"
                filter={
                  isDragging
                    ? 'drop-shadow(0px 8px 16px rgba(0, 0, 0, 0.45))'
                    : 'drop-shadow(0px 3px 6px rgba(0, 0, 0, 0.35))'
                }
                style={{
                  transition: 'filter 0.2s ease',
                }}
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

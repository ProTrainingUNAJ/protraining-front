import React, { useRef, useState, useCallback } from 'react';
import { Moon, Minus, Plus } from 'lucide-react';

export interface SleepWheelDialProps {
  value: number; // 0 to 24 in steps of 0.5
  onChange: (val: number) => void;
  title?: string;
  className?: string;
  showTitle?: boolean;
  showBadge?: boolean;
}

const CX = 160;
const CY = 180;
const RADIUS_OUTER = 145;
const RADIUS_INNER = 85;

// Standard athlete sleep range for the dial display: 4h to 12h
const MIN_DIAL = 4;
const MAX_DIAL = 12;

function createArcPath(
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

  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;

  return `
    M ${x1} ${y1}
    A ${rOuter} ${rOuter} 0 ${largeArcFlag} 1 ${x2} ${y2}
    L ${x3} ${y3}
    A ${rInner} ${rInner} 0 ${largeArcFlag} 0 ${x4} ${y4}
    Z
  `;
}

export const SleepWheelDial: React.FC<SleepWheelDialProps> = ({
  value,
  onChange,
  title = '¿Cuántas horas dormiste anoche?',
  className = '',
  showTitle = true,
  showBadge = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Map value to angle (-70° to +70°)
  const clampedVal = Math.min(MAX_DIAL, Math.max(MIN_DIAL, value));
  const normalizedProgress = (clampedVal - MIN_DIAL) / (MAX_DIAL - MIN_DIAL);
  const needleAngle = -70 + normalizedProgress * 140;

  const resolveValueFromCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * 320;
      const svgY = ((clientY - rect.top) / rect.height) * 200;

      const dx = svgX - CX;
      const dy = svgY - CY;

      const deg = Math.atan2(dx, -dy) * (180 / Math.PI);
      const clampedDeg = Math.min(70, Math.max(-70, deg));
      const prog = (clampedDeg + 70) / 140;
      const hours = MIN_DIAL + prog * (MAX_DIAL - MIN_DIAL);
      const rounded = Math.round(hours * 2) / 2;
      onChange(rounded);
    },
    [onChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    resolveValueFromCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    resolveValueFromCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const adjustHours = (delta: number) => {
    const nextVal = Math.min(24, Math.max(0, Math.round((value + delta) * 2) / 2));
    onChange(nextVal);
  };

  return (
    <div
      className={`sleep-wheel-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
        maxWidth: '460px',
        margin: '0 auto',
        userSelect: 'none',
      }}
    >
      {showTitle && (
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            margin: '0 0 0.35rem 0',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h3>
      )}

      {/* Stepper with central big number */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '0.4rem',
        }}
      >
        <button
          type="button"
          onClick={() => adjustHours(-0.5)}
          disabled={value <= 0}
          className="checkin-step-dot"
          style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
          aria-label="Restar media hora de sueño"
        >
          <Minus size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
          <span
            style={{
              fontSize: '3rem',
              fontWeight: 900,
              lineHeight: 1,
              color: '#08254A',
              letterSpacing: '-0.02em',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              color: '#1E3A5F',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            hs
          </span>
        </div>

        <button
          type="button"
          onClick={() => adjustHours(0.5)}
          disabled={value >= 24}
          className="checkin-step-dot"
          style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}
          aria-label="Sumar media hora de sueño"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Hero Moon Badge */}
      {showBadge && (
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'var(--info-bg)',
            border: '2px solid var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--secondary)',
            margin: '0.2rem auto',
            boxShadow: 'var(--shadow-sm)',
          }}
          aria-hidden="true"
        >
          <Moon size={32} />
        </div>
      )}

      {/* Interactive Arc Dial SVG */}
      <div
        style={{
          width: '100%',
          maxWidth: '340px',
          cursor: 'grab',
          touchAction: 'none',
          position: 'relative',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 320 200"
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          role="slider"
          aria-label="Ruleta interactiva de horas de sueño"
          aria-valuemin={0}
          aria-valuemax={24}
          aria-valuenow={value}
        >
          {/* Track background */}
          <path
            d={createArcPath(CX, CY, RADIUS_INNER - 2, RADIUS_OUTER + 2, -75, 75)}
            fill="var(--bg-subtle)"
            opacity="0.6"
          />

          {/* Color Gradient Track */}
          <path
            d={createArcPath(CX, CY, RADIUS_INNER, RADIUS_OUTER, -72, 72)}
            fill="var(--info-bg)"
            stroke="var(--border)"
            strokeWidth="1.5"
          />

          {/* Hour markers along the arc */}
          {[4, 6, 8, 10, 12].map((hr) => {
            const prog = (hr - MIN_DIAL) / (MAX_DIAL - MIN_DIAL);
            const ang = -70 + prog * 140;
            const rad = ((ang - 90) * Math.PI) / 180;
            const tx = CX + (RADIUS_OUTER - 20) * Math.cos(rad);
            const ty = CY + (RADIUS_OUTER - 20) * Math.sin(rad);

            return (
              <text
                key={hr}
                x={tx}
                y={ty + 4}
                fill="var(--text-main)"
                fontWeight="800"
                fontSize="12"
                textAnchor="middle"
              >
                {hr}h
              </text>
            );
          })}

          {/* Central Pivot Base */}
          <circle
            cx={CX}
            cy={CY}
            r="38"
            fill="var(--bg-card)"
            stroke="var(--border)"
            strokeWidth="2"
          />
          <circle cx={CX} cy={CY} r="28" fill="#202429" />

          {/* Rotating Needle */}
          <g
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              transform: `rotate(${needleAngle}deg)`,
              transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <path
              d={`
                M ${CX - 7} ${CY}
                L ${CX - 2} ${CY - 120}
                A 3 3 0 0 1 ${CX + 2} ${CY - 120}
                L ${CX + 7} ${CY}
                Z
              `}
              fill="#202429"
            />
            <circle cx={CX} cy={CY - 105} r="4.5" fill="#ffffff" />
            <circle cx={CX} cy={CY} r="7" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* Frequent Hours Quick Chips */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.4rem',
          flexWrap: 'wrap',
          marginTop: '0.35rem',
        }}
      >
        {[6, 7, 7.5, 8, 8.5, 9, 10].map((hr) => (
          <button
            key={hr}
            type="button"
            className={`checkin-sleep-quick-btn ${value === hr ? 'active' : ''}`}
            onClick={() => onChange(hr)}
          >
            {hr} hs
          </button>
        ))}
      </div>
    </div>
  );
};

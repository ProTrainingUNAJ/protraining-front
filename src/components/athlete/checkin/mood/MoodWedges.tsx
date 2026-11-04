import React from 'react';
import { CX, CY, R_INNER, R_OUTER, STAR_POINTS_RULETA, createWedgePath } from './mood.types';

interface MoodWedgesProps {
  onSectorClick: (val: number) => void;
}

export const MoodWedges: React.FC<MoodWedgesProps> = ({ onSectorClick }) => {
  return (
    <>
      {/* 1. Sector Brown (left: -90° to -54°) */}
      <path
        d={createWedgePath(CX, CY, R_INNER, R_OUTER, -90, -54)}
        fill="var(--checkin-mood-desanimado)"
        onClick={() => onSectorClick(1)}
        className="mood-wedge-sector"
      />
      {/* Cara grabada Marrón (Desanimado: cejas caídas tristes + boca caída) */}
      <g
        transform="translate(86, 217)"
        stroke="var(--checkin-mood-face-stroke)"
        fill="none"
        onClick={() => onSectorClick(1)}
        className="mood-wedge-face"
      >
        <path d="M -16 -10 Q -9 -7 -3 -7" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M 3 -7 Q 9 -7 16 -10" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="-9" cy="0" r="3.2" fill="var(--checkin-mood-face-stroke)" stroke="none" />
        <circle cx="9" cy="0" r="3.2" fill="var(--checkin-mood-face-stroke)" stroke="none" />
        <path d="M -15 14 Q 0 4 15 14" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* 2. Sector Orange (left: -54° to -18°) */}
      <path
        d={createWedgePath(CX, CY, R_INNER, R_OUTER, -54, -18)}
        fill="var(--checkin-mood-regular)"
        onClick={() => onSectorClick(2)}
        className="mood-wedge-sector"
      />
      {/* Cara grabada Naranja (Regular: dos ojos verticales + boca triste) */}
      <g
        transform="translate(160, 115)"
        stroke="var(--checkin-mood-face-stroke)"
        fill="none"
        onClick={() => onSectorClick(2)}
        className="mood-wedge-face"
      >
        <rect
          x="-13"
          y="-12"
          width="6.5"
          height="18"
          rx="3.25"
          fill="var(--checkin-mood-face-stroke)"
          stroke="none"
        />
        <rect
          x="6.5"
          y="-12"
          width="6.5"
          height="18"
          rx="3.25"
          fill="var(--checkin-mood-face-stroke)"
          stroke="none"
        />
        <path d="M -14 13 Q 0 3 14 13" strokeWidth="4.2" strokeLinecap="round" />
      </g>

      {/* 3. Sector Yellow (center: -18° to 18°) */}
      <path
        d={createWedgePath(CX, CY, R_INNER, R_OUTER, -18, 18)}
        fill="var(--checkin-mood-neutral)"
        onClick={() => onSectorClick(3)}
        className="mood-wedge-sector"
      />
      {/* Cara grabada Amarillo (Neutral: dos ojos de cápsula + boca recta) */}
      <g
        transform="translate(280, 76)"
        stroke="var(--checkin-mood-face-stroke)"
        fill="none"
        onClick={() => onSectorClick(3)}
        className="mood-wedge-face"
      >
        <rect
          x="-13"
          y="-12"
          width="6.5"
          height="19"
          rx="3.25"
          fill="var(--checkin-mood-face-stroke)"
          stroke="none"
        />
        <rect
          x="6.5"
          y="-12"
          width="6.5"
          height="19"
          rx="3.25"
          fill="var(--checkin-mood-face-stroke)"
          stroke="none"
        />
        <line x1="-15" y1="14" x2="15" y2="14" strokeWidth="4.8" strokeLinecap="round" />
      </g>

      {/* 4. Sector Green (right: 18° to 54°) */}
      <path
        d={createWedgePath(CX, CY, R_INNER, R_OUTER, 18, 54)}
        fill="var(--checkin-mood-motivado)"
        onClick={() => onSectorClick(4)}
        className="mood-wedge-sector"
      />
      {/* Cara grabada Verde (Motivado: ojos sonrientes en arco + sonrisa) */}
      <g
        transform="translate(400, 115)"
        stroke="var(--checkin-mood-face-stroke)"
        fill="none"
        onClick={() => onSectorClick(4)}
        className="mood-wedge-face"
      >
        <path d="M -15 -1 Q -8 -15 -1 -1" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M 1 -1 Q 8 -15 15 -1" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M -14 11 Q 0 26 14 11" strokeWidth="4.2" strokeLinecap="round" />
      </g>

      {/* 5. Sector Violet (right: 54° to 90°) */}
      <path
        d={createWedgePath(CX, CY, R_INNER, R_OUTER, 54, 90)}
        fill="var(--checkin-mood-excelente)"
        onClick={() => onSectorClick(5)}
        className="mood-wedge-sector"
      />
      {/* Cara grabada Violeta (Excelente: DOS ESTRELLAS ⭐ ⭐ HORIZONTALES + gran sonrisa) */}
      <g
        transform="translate(474, 217)"
        stroke="var(--checkin-mood-face-stroke)"
        fill="none"
        onClick={() => onSectorClick(5)}
        className="mood-wedge-face"
      >
        <g transform="translate(-11, -4)">
          <polygon
            points={STAR_POINTS_RULETA}
            fill="var(--checkin-mood-face-stroke)"
            stroke="none"
          />
        </g>
        <g transform="translate(11, -4)">
          <polygon
            points={STAR_POINTS_RULETA}
            fill="var(--checkin-mood-face-stroke)"
            stroke="none"
          />
        </g>
        <path d="M -15 9 Q 0 29 15 9" strokeWidth="4.6" strokeLinecap="round" />
      </g>

      {/* Inner Semicircle Background */}
      <circle cx={CX} cy={CY} r={R_INNER} fill="var(--checkin-inner-bg)" />
    </>
  );
};

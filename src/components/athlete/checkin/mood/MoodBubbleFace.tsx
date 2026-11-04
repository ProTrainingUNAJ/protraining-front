import React from 'react';
import { MoodData, STAR_POINTS_BUBBLE } from './mood.types';

interface MoodBubbleFaceProps {
  activeMood: MoodData;
  isStarMood: boolean;
  tearKey: number;
}

export const MoodBubbleFace: React.FC<MoodBubbleFaceProps> = ({
  activeMood,
  isStarMood,
  tearKey,
}) => {
  return (
    <div
      key={`bubble-circle-${activeMood.value}`}
      className={`pixel-bubble-hero ${isStarMood ? 'is-star' : ''}`}
      style={{
        background: activeMood.color,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 60 60"
        className="mood-bubble-svg"
        style={{ width: '82%', height: '82%', overflow: 'visible' }}
      >
        {activeMood.eyeType === 'sad' ? (
          <>
            {/* Sad dropped eyebrows + eyes */}
            <path
              d="M 15 17 Q 21 21 27 21"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 45 17 Q 39 21 33 21"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="2.4"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="21" cy="25" r="2.6" fill="var(--checkin-mood-face-stroke)" />
            <circle cx="39" cy="25" r="2.6" fill="var(--checkin-mood-face-stroke)" />
            <path
              d="M 19 43 Q 30 31 41 43"
              fill="none"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="4.4"
              strokeLinecap="round"
            />

            {/* Lágrima animada cayendo del ojo izquierdo exactamente DOS VECES */}
            <g key={`tear-${tearKey}`} className="mood-tear-drop">
              <path
                d="M 21 27 C 19 29.5, 18.2 31.5, 18.6 33.5 C 19 35.5, 23 35.5, 23.4 33.5 C 23.8 31.5, 23 29.5, 21 27 Z"
                fill="var(--cyan-accent)"
                stroke="var(--stat-cyan)"
                strokeWidth="0.5"
                filter="drop-shadow(0 0 2px rgba(56, 189, 248, 0.6))"
              />
              <circle cx="20.3" cy="32.5" r="0.7" fill="var(--white)" />
            </g>
          </>
        ) : activeMood.eyeType === 'worried' ? (
          <>
            {/* Orange face: two vertical pills + sad mouth */}
            <rect
              x="20"
              y="18"
              width="5"
              height="13"
              rx="2.5"
              fill="var(--checkin-mood-face-stroke)"
            />
            <rect
              x="35"
              y="18"
              width="5"
              height="13"
              rx="2.5"
              fill="var(--checkin-mood-face-stroke)"
            />
            <path
              d="M 19 41 Q 30 33 41 41"
              fill="none"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="4.4"
              strokeLinecap="round"
            />
          </>
        ) : activeMood.eyeType === 'neutral' ? (
          <>
            {/* Yellow face: two pill eyes + straight horizontal mouth */}
            <rect
              x="20"
              y="18"
              width="5.2"
              height="14"
              rx="2.6"
              fill="var(--checkin-mood-face-stroke)"
            />
            <rect
              x="35"
              y="18"
              width="5.2"
              height="14"
              rx="2.6"
              fill="var(--checkin-mood-face-stroke)"
            />
            <line
              x1="18"
              y1="39"
              x2="42"
              y2="39"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="4.6"
              strokeLinecap="round"
            />
          </>
        ) : activeMood.eyeType === 'happy' ? (
          <>
            {/* Green face: arched happy eyes + friendly smile */}
            <path
              d="M 17 24 Q 22 15 28 24"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 32 24 Q 38 15 43 24"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="3.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 19 36 Q 30 48 41 36"
              fill="none"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="4.4"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* Violet face: TWO 5-POINT STAR EYES (⭐ ⭐) + wide smile */}
            <g transform="translate(21, 21)">
              <polygon points={STAR_POINTS_BUBBLE} fill="var(--checkin-mood-face-stroke)" />
            </g>
            <g transform="translate(39, 21)">
              <polygon points={STAR_POINTS_BUBBLE} fill="var(--checkin-mood-face-stroke)" />
            </g>
            <path
              d="M 18 36 Q 30 50 42 36"
              fill="none"
              stroke="var(--checkin-mood-face-stroke)"
              strokeWidth="4.6"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
};


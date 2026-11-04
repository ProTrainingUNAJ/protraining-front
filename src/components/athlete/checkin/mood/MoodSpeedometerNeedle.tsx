import React from 'react';
import { CX, CY } from './mood.types';

interface MoodSpeedometerNeedleProps {
  angle: number;
  isDragging: boolean;
}

export const MoodSpeedometerNeedle: React.FC<MoodSpeedometerNeedleProps> = ({
  angle,
  isDragging,
}) => {
  return (
    <g
      className={`mood-needle-pivot ${isDragging ? 'is-dragging' : ''}`}
      style={{
        transformOrigin: `${CX}px ${CY}px`,
        transform: `rotate(${angle}deg) ${isDragging ? 'scale(1.035)' : 'scale(1)'}`,
      }}
    >
      <path
        d={`
          M ${CX - 12} ${CY - 16}
          L ${CX - 3.5} ${CY - 240}
          Q ${CX} ${CY - 245} ${CX + 3.5} ${CY - 240}
          L ${CX + 12} ${CY - 16}
          A 26 26 0 1 1 ${CX - 12} ${CY - 16}
        `}
        fill="var(--checkin-needle-color)"
        className={`mood-needle-body ${isDragging ? 'is-dragging' : ''}`}
      />
    </g>
  );
};

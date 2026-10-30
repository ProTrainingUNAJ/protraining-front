import React from 'react';
import { ConcentricMoodStressDial } from './ConcentricMoodStressDial';

export interface CheckInMoodStressSlideProps {
  moodRate: number;
  onMoodChange: (val: number) => void;
  stressLevel: number;
  onStressChange: (val: number) => void;
  onPrev?: () => void;
  onNext: () => void;
}

export const CheckInMoodStressSlide: React.FC<CheckInMoodStressSlideProps> = ({
  moodRate,
  onMoodChange,
  stressLevel,
  onStressChange,
  onPrev,
  onNext,
}) => {
  return (
    <div
      className="checkin-slide-card checkin-pixel-mood-slide"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 0,
        width: '100%',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <ConcentricMoodStressDial
        moodRate={moodRate}
        onMoodChange={onMoodChange}
        stressLevel={stressLevel}
        onStressChange={onStressChange}
        title="¿Cómo describes tu ánimo?"
        onPrev={onPrev}
        onNext={onNext}
      />
    </div>
  );
};

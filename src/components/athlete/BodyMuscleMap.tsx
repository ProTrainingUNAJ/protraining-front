import React from 'react';
import { InteractiveMuscleMap } from './InteractiveMuscleMap';

export interface BodyMuscleMapProps {
  musclePains: Record<string, number>;
  onPainChange: (muscleId: string, level: number) => void;
  onClearAll?: () => void;
  readOnly?: boolean;
}

/**
 * BodyMuscleMap — Bridge component compatible with CheckInPage and existing frontend callers.
 * Connects athlete pain state with the new vector anatomical engine
 * InteractiveMuscleMap SVG with native front and back views.
 */
export const BodyMuscleMap: React.FC<BodyMuscleMapProps> = ({
  musclePains,
  onPainChange,
  onClearAll,
  readOnly = false,
}) => {
  return (
    <InteractiveMuscleMap
      musclePains={musclePains}
      onPainChange={onPainChange}
      onClearAll={onClearAll}
      readOnly={readOnly}
      initialView="both"
    />
  );
};

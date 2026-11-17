import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';

export interface ExerciseThumbnailProps {
  images?: string[];
  exerciseName: string;
}

export const ExerciseThumbnail: React.FC<ExerciseThumbnailProps> = ({ images, exerciseName }) => {
  const [hasError, setHasError] = useState(false);
  const src = images && images.length > 0 && !hasError ? images[0] : null;

  return (
    <div className="plan-exercise-thumbnail" title={exerciseName}>
      {src ? (
        <img
          src={src}
          alt={`Ilustración de ${exerciseName}`}
          className="plan-exercise-thumbnail-img"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      ) : (
        <div className="plan-exercise-thumbnail-fallback" aria-hidden="true">
          <Dumbbell size={18} className="plan-exercise-fallback-icon" />
        </div>
      )}
    </div>
  );
};

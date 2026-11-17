import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';

export interface ExerciseThumbnailProps {
  images?: string[];
  exerciseName: string;
  onClick?: () => void;
}

export const ExerciseThumbnail: React.FC<ExerciseThumbnailProps> = ({
  images,
  exerciseName,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const src = images && images.length > 0 && !hasError ? images[0] : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`plan-exercise-thumbnail ${onClick ? 'is-clickable' : ''}`}
      title={onClick ? `Ver técnica y detalle de ${exerciseName}` : exerciseName}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={onClick ? `Ver técnica y detalle de ${exerciseName}` : undefined}
    >
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

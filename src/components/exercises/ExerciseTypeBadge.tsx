import React from 'react';
import { Exercise } from '../../api/generated/entrenamiento';

interface ExerciseTypeBadgeProps {
  type?: Exercise['exerciseType'] | string | null;
  className?: string;
}

export const ExerciseTypeBadge: React.FC<ExerciseTypeBadgeProps> = ({ type, className = '' }) => {
  switch (type) {
    case 'Distance':
      return <span className={`badge badge-info ${className}`.trim()}>Distancia</span>;
    case 'Time':
      return <span className={`badge badge-warning ${className}`.trim()}>Tiempo</span>;
    case 'Reps':
      return <span className={`badge badge-success ${className}`.trim()}>Repeticiones</span>;
    case 'Weight':
    default:
      // Si es "Con carga" (Weight) o no tiene tipo, no mostramos nada para no saturar la UI
      return null;
  }
};

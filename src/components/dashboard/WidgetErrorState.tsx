import React from 'react';
import { RotateCcw, WifiOff } from 'lucide-react';
import './dashboardWidgets.css';

interface WidgetErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Error de un widget del Inicio (KAN-594): se muestra en lugar de los datos, nunca como ceros,
 * para que un servicio caído no se confunda con "no hay nada para mirar".
 */
export const WidgetErrorState: React.FC<WidgetErrorStateProps> = ({ message, onRetry }) => (
  <div className="dash-w__error" role="alert">
    <WifiOff size={16} aria-hidden="true" />
    <p>{message}</p>
    {onRetry && (
      <button type="button" className="dash-w__btn" onClick={onRetry}>
        <RotateCcw size={14} aria-hidden="true" />
        Reintentar
      </button>
    )}
  </div>
);

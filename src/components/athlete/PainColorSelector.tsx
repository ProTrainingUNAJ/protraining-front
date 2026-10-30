import React from 'react';
import { OFFICIAL_PALETTE_ITEMS } from './muscleMap.config';

export interface PainColorSelectorProps {
  onSelectColor: (level: number, hex: string) => void;
  hasActiveInjury?: boolean;
  className?: string;
}

export const PainColorSelector: React.FC<PainColorSelectorProps> = ({
  onSelectColor,
  hasActiveInjury = false,
  className = '',
}) => {
  const visibleItems = OFFICIAL_PALETTE_ITEMS.filter((item) => {
    if (item.level === 6) {
      return Boolean(hasActiveInjury);
    }
    return true;
  });

  return (
    <div
      className={`muscle-pain-vertical-panel ${className}`}
      role="group"
      aria-label="Opciones de nivel de dolor"
    >
      {visibleItems.map((item) => {
        let dotModifier = 'muscle-pain-dot--white';
        if (item.level === 1) dotModifier = 'muscle-pain-dot--lvl1';
        else if (item.level === 2) dotModifier = 'muscle-pain-dot--lvl2';
        else if (item.level === 3) dotModifier = 'muscle-pain-dot--lvl3';
        else if (item.level === 4) dotModifier = 'muscle-pain-dot--lvl4';
        else if (item.level === 5) dotModifier = 'muscle-pain-dot--lvl5';
        else if (item.level === 6) dotModifier = 'muscle-pain-dot--injury';

        const title = item.level === 6 ? 'Lesión' : `Nivel ${item.level}`;

        return (
          <button
            key={item.id}
            type="button"
            className="muscle-pain-card-btn"
            onClick={() => onSelectColor(item.level, item.hex)}
            title={item.description}
          >
            <span
              className={`muscle-pain-dot ${dotModifier}`}
              style={{ backgroundColor: item.colorVar }}
            />
            <div className="muscle-pain-texts">
              <span className="muscle-pain-title">{title}</span>
              <span className="muscle-pain-subtitle">{item.name}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

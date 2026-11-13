import { Calendar } from 'lucide-react';
import { EvolutionRange, EVOLUTION_RANGE_OPTIONS } from '../../utils/evolutionRange';

export interface EvolutionRangeSelectorProps {
  value: EvolutionRange;
  onChange: (range: EvolutionRange) => void;
  disabled?: boolean;
}

export function EvolutionRangeSelector({
  value,
  onChange,
  disabled = false,
}: EvolutionRangeSelectorProps) {
  return (
    <div className="evolution-range-container">
      <div className="evolution-range-label-wrap">
        <Calendar size={16} aria-hidden="true" />
        <span className="evolution-range-label">Rango:</span>
      </div>
      <div
        className="evolution-range-selector"
        role="group"
        aria-label="Selector de rango de fechas para evolución"
      >
        {EVOLUTION_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`evolution-range-btn ${value === opt.key ? 'active' : ''}`}
            onClick={() => onChange(opt.key)}
            disabled={disabled}
            aria-pressed={value === opt.key}
            data-testid={`range-selector-${opt.key}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

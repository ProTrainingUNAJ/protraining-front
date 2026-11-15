import { IntensityMetric } from '../../types/trainingPlans';

interface IntensityTypeSelectorProps {
  value: IntensityMetric;
  disabled?: boolean;
  onChange: (value: IntensityMetric) => void;
}

export function IntensityTypeSelector({
  value,
  disabled = false,
  onChange,
}: IntensityTypeSelectorProps) {
  return (
    <div className="plan-intensity-selector" role="group" aria-label="Métrica de intensidad">
      <button
        type="button"
        className={`plan-intensity-btn ${value === 'RPE' ? 'active' : ''}`}
        onClick={() => onChange('RPE')}
        disabled={disabled}
        aria-pressed={value === 'RPE'}
        title="Escala de esfuerzo percibido (1 a 10)"
      >
        RPE
      </button>
      <button
        type="button"
        className={`plan-intensity-btn ${value === 'RIR' ? 'active' : ''}`}
        onClick={() => onChange('RIR')}
        disabled={disabled}
        aria-pressed={value === 'RIR'}
        title="Repeticiones en reserva (0 a 5)"
      >
        RIR
      </button>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Activity, Info } from 'lucide-react';
import { calculateBmi } from '../../utils/bmiCalculator';

export interface AthleteBmiGaugeProps {
  weightKg?: number | null;
  heightCm?: number | null;
  athleteName?: string;
  className?: string;
}

export const AthleteBmiGauge: React.FC<AthleteBmiGaugeProps> = ({
  weightKg,
  heightCm,
  athleteName,
  className = '',
}) => {
  const result = useMemo(() => calculateBmi(weightKg, heightCm), [weightKg, heightCm]);

  if (!result) {
    return (
      <div
        className={`athlete-bmi-card athlete-bmi-empty ${className}`}
        data-testid="athlete-bmi-empty"
      >
        <div className="athlete-bmi-empty-icon" aria-hidden="true">
          <Info size={20} />
        </div>
        <div className="athlete-bmi-empty-content">
          <h4 className="athlete-bmi-title">Índice de Masa Corporal (IMC)</h4>
          <p className="athlete-bmi-empty-text">
            {athleteName ? `${athleteName} no tiene ` : 'No se encuentra '}
            registrado peso o estatura completos en su configuración. Completá ambos datos en el
            perfil para visualizar el gráfico y diagnóstico del IMC.
          </p>
        </div>
      </div>
    );
  }

  const { bmi, category, gaugePercentage, heightM } = result;

  return (
    <div className={`athlete-bmi-card ${className}`} data-testid="athlete-bmi-gauge">
      {/* Cabecera con Métricas e Indicador */}
      <div className="athlete-bmi-header">
        <div className="athlete-bmi-header-left">
          <div className="athlete-bmi-badge-icon" aria-hidden="true">
            <Activity size={18} />
          </div>
          <div>
            <h4 className="athlete-bmi-title">Índice de Masa Corporal (IMC)</h4>
            <div className="athlete-bmi-chips">
              <span className="athlete-bmi-chip">
                <strong>Peso:</strong> {result.weightKg} kg
              </span>
              <span className="athlete-bmi-chip">
                <strong>Estatura:</strong> {result.heightCm} cm ({heightM} m)
              </span>
              <span className="athlete-bmi-chip athlete-bmi-chip-value">
                <strong>IMC:</strong> {bmi.toFixed(1)} kg/m²
              </span>
            </div>
          </div>
        </div>

        <div className="athlete-bmi-header-right">
          <span
            className={`athlete-bmi-category-badge category-${category.key}`}
            style={{
              backgroundColor: category.bgColor,
              borderColor: category.borderColor,
              color: category.color,
            }}
          >
            <span
              className="athlete-bmi-category-dot"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            {category.label}
          </span>
        </div>
      </div>

      {/* Escala Gráfica Visual y Marcador */}
      <div
        className="athlete-bmi-gauge-wrapper"
        aria-label={`Gráfico de IMC: ${bmi} (${category.label})`}
      >
        {/* Puntero / Aguja flotante */}
        <div
          className="athlete-bmi-marker-pin"
          style={{ left: `${gaugePercentage}%` }}
          data-testid="athlete-bmi-pin"
        >
          <div className="athlete-bmi-marker-bubble" style={{ borderColor: category.color }}>
            <span className="athlete-bmi-marker-val">{bmi.toFixed(1)}</span>
          </div>
          <div className="athlete-bmi-marker-arrow" style={{ borderTopColor: category.color }} />
          <div className="athlete-bmi-marker-line" style={{ backgroundColor: category.color }} />
        </div>

        {/* Pista segmentada de los 4 rangos */}
        <div className="athlete-bmi-track">
          <div
            className={`athlete-bmi-segment segment-underweight ${category.key === 'underweight' ? 'active' : ''}`}
            title="Bajo peso (< 18.5)"
          >
            <span className="athlete-bmi-segment-label">Bajo peso</span>
            <span className="athlete-bmi-segment-range">&lt; 18.5</span>
          </div>

          <div
            className={`athlete-bmi-segment segment-normal ${category.key === 'normal' ? 'active' : ''}`}
            title="Peso saludable (18.5 – 24.9)"
          >
            <span className="athlete-bmi-segment-label">Peso saludable</span>
            <span className="athlete-bmi-segment-range">18.5 – 24.9</span>
          </div>

          <div
            className={`athlete-bmi-segment segment-overweight ${category.key === 'overweight' ? 'active' : ''}`}
            title="Sobrepeso (25.0 – 29.9)"
          >
            <span className="athlete-bmi-segment-label">Sobrepeso</span>
            <span className="athlete-bmi-segment-range">25.0 – 29.9</span>
          </div>

          <div
            className={`athlete-bmi-segment segment-obese ${category.key === 'obese' ? 'active' : ''}`}
            title="Obesidad (≥ 30.0)"
          >
            <span className="athlete-bmi-segment-label">Obesidad</span>
            <span className="athlete-bmi-segment-range">≥ 30.0</span>
          </div>
        </div>
      </div>

      {/* Pie descriptivo */}
      <div className="athlete-bmi-footer">
        <span className="athlete-bmi-formula-note">
          Fórmula: <code>IMC = peso (kg) / estatura (m)²</code> · Clasificación oficial de la OMS
        </span>
      </div>
    </div>
  );
};

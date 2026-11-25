import React, { useMemo } from 'react';
import { Activity, Flame, Info, TrendingUp, Zap } from 'lucide-react';
import {
  calculateAthleteNutrition,
  type AthleteNutritionInput,
} from '../../utils/nutritionCalculator';
import './AthleteNutritionSummaryCard.css';

export interface AthleteNutritionSummaryCardProps {
  weightKg?: number | null;
  heightCm?: number | null;
  birthDate?: string | null;
  gender?: string | null;
  athleticGoal?: string | null;
  athleteName?: string;
  className?: string;
}

export const AthleteNutritionSummaryCard: React.FC<AthleteNutritionSummaryCardProps> = ({
  weightKg,
  heightCm,
  birthDate,
  gender,
  athleticGoal,
  athleteName,
  className = '',
}) => {
  const nutritionInput: AthleteNutritionInput = useMemo(
    () => ({
      weightKg,
      heightCm,
      birthDate,
      gender,
      athleticGoal,
    }),
    [weightKg, heightCm, birthDate, gender, athleticGoal],
  );

  const nutrition = useMemo(() => calculateAthleteNutrition(nutritionInput), [nutritionInput]);

  if (!nutrition) {
    return (
      <div
        className={`athlete-nutrition-empty-card ${className}`}
        data-testid="athlete-nutrition-empty"
      >
        <div className="athlete-nutrition-empty-icon" aria-hidden="true">
          <Info size={18} />
        </div>
        <div className="athlete-nutrition-empty-text">
          <h4>Calorías, Macronutrientes e IMC Personalizados</h4>
          <p>
            {athleteName ? `${athleteName} no tiene ` : 'No se encuentra '}
            registrado peso o estatura completos en su configuración. Completá ambos datos en el
            perfil para calcular el metabolismo basal (Mifflin-St Jeor), gasto energético,
            macronutrientes recomendados y el diagnóstico de IMC.
          </p>
        </div>
      </div>
    );
  }

  const {
    targetCalories,
    goalKey,
    goalLabel,
    goalPercentageAdjustment,
    bmr,
    tdee,
    macros,
    bmiResult,
  } = nutrition;

  const { protein, fat, carbs } = macros;

  return (
    <article
      className={`athlete-nutrition-card ${className}`}
      data-testid="athlete-nutrition-card"
      aria-labelledby="athlete-nutrition-heading"
    >
      {/* Cabecera: Título y Calorías Recomendadas Diarias */}
      <div className="athlete-nutrition-header">
        <div className="athlete-nutrition-title-block">
          <div className="athlete-nutrition-icon-badge" aria-hidden="true">
            <Flame size={20} />
          </div>
          <div>
            <h4 id="athlete-nutrition-heading" className="athlete-nutrition-title">
              Plan Nutricional Recomendado
            </h4>
            <p className="athlete-nutrition-subtitle">
              Calculado según tu metabolismo basal, nivel de actividad y objetivo deportivo
            </p>
          </div>
        </div>

        <div className="athlete-nutrition-target-box">
          <div className="athlete-nutrition-calories-large">
            {targetCalories.toLocaleString('es-AR')}
            <span className="athlete-nutrition-calories-unit">kcal / día</span>
          </div>
          <span
            className={`athlete-nutrition-goal-badge goal-${goalKey}`}
            title={`Ajuste calórico aplicado según objetivo: ${goalPercentageAdjustment >= 0 ? `+${goalPercentageAdjustment}%` : `${goalPercentageAdjustment}%`}`}
          >
            <TrendingUp size={12} aria-hidden="true" />
            {goalLabel} (
            {goalPercentageAdjustment >= 0
              ? `+${goalPercentageAdjustment}%`
              : `${goalPercentageAdjustment}%`}
            )
          </span>
        </div>
      </div>

      {/* Barra Visual Segmentada de Macronutrientes */}
      <div
        className="athlete-nutrition-macro-bar-container"
        aria-label={`Distribución de macronutrientes: Carbohidratos ${carbs.percentage}%, Proteínas ${protein.percentage}%, Grasas ${fat.percentage}%`}
      >
        <div className="athlete-nutrition-macro-bar">
          <div
            className="macro-bar-segment protein"
            style={{ width: `${protein.percentage}%` }}
            title={`Proteínas: ${protein.percentage}% (${protein.grams} g)`}
          />
          <div
            className="macro-bar-segment carbs"
            style={{ width: `${carbs.percentage}%` }}
            title={`Carbohidratos: ${carbs.percentage}% (${carbs.grams} g)`}
          />
          <div
            className="macro-bar-segment fat"
            style={{ width: `${fat.percentage}%` }}
            title={`Grasas: ${fat.percentage}% (${fat.grams} g)`}
          />
        </div>
      </div>

      {/* Grid de Métricas de Macronutrientes por g/kg */}
      <div className="athlete-nutrition-macros-grid">
        {/* Proteínas */}
        <div className="athlete-nutrition-macro-pill" data-testid="macro-pill-protein">
          <div className="macro-pill-top">
            <div className="macro-pill-label-wrapper">
              <span className="macro-pill-dot protein" aria-hidden="true" />
              <span className="macro-pill-name">Proteínas</span>
            </div>
            <span className="macro-pill-pct">{protein.percentage}%</span>
          </div>
          <div className="macro-pill-grams">
            {protein.grams}
            <span className="macro-pill-unit">g / día</span>
          </div>
          <div className="macro-pill-submetrics">
            <span>{protein.gramsPerKg} g/kg</span>
            <span>{protein.calories} kcal</span>
          </div>
        </div>

        {/* Carbohidratos */}
        <div className="athlete-nutrition-macro-pill" data-testid="macro-pill-carbs">
          <div className="macro-pill-top">
            <div className="macro-pill-label-wrapper">
              <span className="macro-pill-dot carbs" aria-hidden="true" />
              <span className="macro-pill-name">Carbohidratos</span>
            </div>
            <span className="macro-pill-pct">{carbs.percentage}%</span>
          </div>
          <div className="macro-pill-grams">
            {carbs.grams}
            <span className="macro-pill-unit">g / día</span>
          </div>
          <div className="macro-pill-submetrics">
            <span>{carbs.gramsPerKg} g/kg</span>
            <span>{carbs.calories} kcal</span>
          </div>
        </div>

        {/* Grasas */}
        <div className="athlete-nutrition-macro-pill" data-testid="macro-pill-fat">
          <div className="macro-pill-top">
            <div className="macro-pill-label-wrapper">
              <span className="macro-pill-dot fat" aria-hidden="true" />
              <span className="macro-pill-name">Grasas</span>
            </div>
            <span className="macro-pill-pct">{fat.percentage}%</span>
          </div>
          <div className="macro-pill-grams">
            {fat.grams}
            <span className="macro-pill-unit">g / día</span>
          </div>
          <div className="macro-pill-submetrics">
            <span>{fat.gramsPerKg} g/kg</span>
            <span>{fat.calories} kcal</span>
          </div>
        </div>
      </div>

      {/* Sección IMC: Diagnóstico y Escala Gráfica Visual (KAN-664) */}
      <div className="athlete-nutrition-bmi-section" data-testid="athlete-nutrition-bmi-section">
        <div className="athlete-nutrition-bmi-header">
          <div className="athlete-nutrition-bmi-header-left">
            <div className="athlete-nutrition-bmi-icon-badge" aria-hidden="true">
              <Activity size={16} />
            </div>
            <div>
              <h5 className="athlete-nutrition-bmi-title">Índice de Masa Corporal (IMC)</h5>
              <div className="athlete-nutrition-bmi-chips">
                <span className="athlete-nutrition-chip">
                  <strong>Peso:</strong> {bmiResult.weightKg} kg
                </span>
                <span className="athlete-nutrition-chip">
                  <strong>Estatura:</strong> {bmiResult.heightCm} cm ({bmiResult.heightM} m)
                </span>
                <span className="athlete-nutrition-chip athlete-nutrition-chip-highlight">
                  <strong>IMC:</strong> {bmiResult.bmi.toFixed(1)} kg/m²
                </span>
              </div>
            </div>
          </div>

          <div className="athlete-nutrition-bmi-header-right">
            <span
              className={`athlete-bmi-category-badge category-${bmiResult.category.key}`}
              style={{
                backgroundColor: bmiResult.category.bgColor,
                borderColor: bmiResult.category.borderColor,
                color: bmiResult.category.color,
              }}
            >
              <span
                className="athlete-bmi-category-dot"
                style={{ backgroundColor: bmiResult.category.color }}
                aria-hidden="true"
              />
              {bmiResult.category.label}
            </span>
          </div>
        </div>

        {/* Escala Gráfica Visual y Marcador Flotante */}
        <div
          className="athlete-bmi-gauge-wrapper"
          aria-label={`Gráfico de IMC: ${bmiResult.bmi} (${bmiResult.category.label})`}
          data-testid="athlete-bmi-gauge"
        >
          {/* Puntero / Aguja flotante con valor */}
          <div
            className="athlete-bmi-marker-pin"
            style={{ left: `${bmiResult.gaugePercentage}%` }}
            data-testid="athlete-bmi-pin"
          >
            <div
              className="athlete-bmi-marker-bubble"
              style={{ borderColor: bmiResult.category.color }}
            >
              <span className="athlete-bmi-marker-val">{bmiResult.bmi.toFixed(1)}</span>
            </div>
            <div
              className="athlete-bmi-marker-arrow"
              style={{ borderTopColor: bmiResult.category.color }}
            />
            <div
              className="athlete-bmi-marker-line"
              style={{ backgroundColor: bmiResult.category.color }}
            />
          </div>

          {/* Barra segmentada con las 4 categorías OMS */}
          <div className="athlete-bmi-track">
            <div className="athlete-bmi-segment segment-underweight">
              <span className="athlete-bmi-segment-label">Bajo peso</span>
              <span className="athlete-bmi-segment-range">&lt; 18.5</span>
            </div>
            <div className="athlete-bmi-segment segment-normal">
              <span className="athlete-bmi-segment-label">Peso saludable</span>
              <span className="athlete-bmi-segment-range">18.5 - 24.9</span>
            </div>
            <div className="athlete-bmi-segment segment-overweight">
              <span className="athlete-bmi-segment-label">Sobrepeso</span>
              <span className="athlete-bmi-segment-range">25.0 - 29.9</span>
            </div>
            <div className="athlete-bmi-segment segment-obese">
              <span className="athlete-bmi-segment-label">Obesidad</span>
              <span className="athlete-bmi-segment-range">&ge; 30.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie informativo: Metas y Gasto Energético */}
      <footer className="athlete-nutrition-footer">
        <div className="athlete-nutrition-footer-left">
          <span className="athlete-nutrition-chip-badge">
            <strong>TMB Basal:</strong> {bmr} kcal
          </span>
          <span className="athlete-nutrition-chip-badge">
            <strong>Gasto Total (TDEE):</strong> {tdee} kcal
          </span>
        </div>

        <div className="athlete-nutrition-footer-right">
          <Zap size={14} aria-hidden="true" />
          <span>Fórmula Mifflin-St Jeor · Factor Actividad ×1.6</span>
        </div>
      </footer>
    </article>
  );
};

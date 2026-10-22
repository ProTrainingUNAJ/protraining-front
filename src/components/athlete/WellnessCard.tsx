import React from 'react';

export interface WellnessScaleOption {
  value: number;
  label: string;
}

export interface WellnessCardProps {
  id: string;
  name: string;
  icon?: React.ReactNode;
  valueDisplay: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger';
  scaleDescription?: string;
  type: 'slider' | 'scale' | 'toggle';
  // Props for type === 'slider'
  sliderValue?: number;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  onSliderChange?: (val: number) => void;
  // Props for type === 'scale'
  scaleValue?: number;
  scaleOptions?: WellnessScaleOption[];
  onScaleChange?: (val: number) => void;
  // Props for type === 'toggle'
  toggleValue?: boolean;
  onToggleChange?: (val: boolean) => void;
  toggleLabels?: {
    falseLabel: string;
    trueLabel: string;
  };
}

export const WellnessCard: React.FC<WellnessCardProps> = ({
  id,
  name,
  icon,
  valueDisplay,
  badgeVariant = 'default',
  scaleDescription,
  type,
  sliderValue = 8,
  sliderMin = 0,
  sliderMax = 24,
  sliderStep = 0.5,
  onSliderChange,
  scaleValue = 3,
  onScaleChange,
  toggleValue = false,
  onToggleChange,
  toggleLabels = { falseLabel: 'Sin síntomas', trueLabel: 'Con síntomas' },
}) => {
  const getBadgeColors = () => {
    switch (badgeVariant) {
      case 'success':
        return {
          bg: 'var(--success-bg-strong)',
          color: 'var(--success-text)',
          border: 'var(--success-border)',
        };
      case 'warning':
        return {
          bg: 'var(--warning-bg-strong)',
          color: 'var(--warning-text)',
          border: 'var(--warning)',
        };
      case 'danger':
        return {
          bg: 'var(--danger-bg-strong)',
          color: 'var(--danger-text)',
          border: 'var(--danger-border)',
        };
      default:
        return {
          bg: 'var(--info-bg)',
          color: 'var(--info-text)',
          border: 'var(--info-border)',
        };
    }
  };

  const badgeColors = getBadgeColors();

  return (
    <div
      className="card checkin-wellness-card"
      style={{
        margin: 0,
        padding: '0.9rem 1rem',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '128px',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header: Name, Icon, and Current Value */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          marginBottom: '0.6rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {icon && (
            <span style={{ color: 'var(--secondary)', display: 'inline-flex', flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <strong
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-main)',
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {name}
          </strong>
        </div>

        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '0.15rem 0.5rem',
            borderRadius: '9999px',
            background: badgeColors.bg,
            color: badgeColors.color,
            border: `1px solid ${badgeColors.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          {valueDisplay}
        </span>
      </div>

      {/* 2. Interactive Control */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {type === 'slider' && (
          <div style={{ padding: '0.15rem 0' }}>
            <input
              id={id}
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={sliderStep}
              value={sliderValue}
              onChange={(e) => onSliderChange?.(Number(e.target.value))}
              aria-label={name}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: 'var(--secondary)',
                height: '28px',
                margin: 0,
              }}
            />
          </div>
        )}

        {type === 'scale' && (
          <div style={{ display: 'flex', gap: '0.3rem', width: '100%' }}>
            {[1, 2, 3, 4, 5].map((val) => {
              const isSelected = scaleValue === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onScaleChange?.(val)}
                  style={{
                    flex: 1,
                    minHeight: '36px',
                    padding: '0.25rem 0',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: isSelected ? '2px solid var(--secondary)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--info-bg)' : 'var(--bg-subtle)',
                    color: isSelected ? 'var(--info-text)' : 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${name} nivel ${val}`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        )}

        {type === 'toggle' && (
          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
            <button
              type="button"
              onClick={() => onToggleChange?.(false)}
              style={{
                flex: 1,
                minHeight: '36px',
                padding: '0.3rem 0.25rem',
                fontSize: '0.78rem',
                lineHeight: 1.15,
                fontWeight: 700,
                borderRadius: '6px',
                border: !toggleValue ? '2px solid var(--success)' : '1px solid var(--border)',
                background: !toggleValue ? 'var(--success-bg-strong)' : 'var(--bg-subtle)',
                color: !toggleValue ? 'var(--success-text)' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: !toggleValue ? 'scale(1.02)' : 'scale(1)',
                boxShadow: !toggleValue ? 'var(--shadow-sm)' : 'none',
              }}
              aria-pressed={!toggleValue}
            >
              {toggleLabels.falseLabel}
            </button>
            <button
              type="button"
              onClick={() => onToggleChange?.(true)}
              style={{
                flex: 1,
                minHeight: '36px',
                padding: '0.3rem 0.25rem',
                fontSize: '0.78rem',
                lineHeight: 1.15,
                fontWeight: 700,
                borderRadius: '6px',
                border: toggleValue ? '2px solid var(--danger)' : '1px solid var(--border)',
                background: toggleValue ? 'var(--danger-bg-strong)' : 'var(--bg-subtle)',
                color: toggleValue ? 'var(--danger-text)' : 'var(--text-main)',
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: toggleValue ? 'scale(1.02)' : 'scale(1)',
                boxShadow: toggleValue ? 'var(--shadow-sm)' : 'none',
              }}
              aria-pressed={toggleValue}
            >
              {toggleLabels.trueLabel}
            </button>
          </div>
        )}

        {/* 3. Subtle scale description */}
        {scaleDescription && (
          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              display: 'block',
              marginTop: '0.1rem',
            }}
          >
            {scaleDescription}
          </span>
        )}
      </div>
    </div>
  );
};

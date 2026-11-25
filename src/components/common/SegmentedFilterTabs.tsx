import React from 'react';

export type SegmentedFilterVariant =
  | 'all'
  | 'red'
  | 'yellow'
  | 'green'
  | 'gray'
  | 'pending'
  | 'approved'
  | 'discarded'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'muted';

export interface SegmentedFilterOption<T extends string = string> {
  value: T;
  label: string;
  shortLabel?: string;
  count?: number;
  hasDot?: boolean;
  variant?: SegmentedFilterVariant;
  testId?: string;
  ariaLabel?: string;
}

export interface SegmentedFilterTabsProps<T extends string = string> {
  options: Array<SegmentedFilterOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Componente unificado de pestañas/filtros segmentados (KAN-645).
 * Reutilizado en Recomendaciones, Semáforo del Día y Asistencia & RPE.
 */
export function SegmentedFilterTabs<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: SegmentedFilterTabsProps<T>): React.ReactElement {
  return (
    <div
      className={`segmented-tabs recommendations-tabs ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        const variantClass = option.variant ? `status-${option.variant}` : '';
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-pressed={isActive}
            data-testid={option.testId}
            aria-label={option.ariaLabel || option.label}
            className={`segmented-tab recommendations-tab ${variantClass}${isActive ? ' active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.hasDot && <span className="segmented-tab-dot" aria-hidden="true" />}
            {option.shortLabel ? (
              <>
                <span className="segmented-tab-label-full">{option.label}</span>
                <span className="segmented-tab-label-short">{option.shortLabel}</span>
              </>
            ) : (
              <span className="segmented-tab-label">{option.label}</span>
            )}
            {option.count !== undefined && (
              <span className="segmented-tab-count recommendations-tab-count">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

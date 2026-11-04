import React from 'react';
import { COLOR_SCALE, MetricKey } from './recovery.types';

export const getSleepColor = (hours: number): string => {
  if (hours <= 3) return COLOR_SCALE.brown; // 0 a 3 hs: MARRON
  if (hours === 4) return COLOR_SCALE.orange; // 4 hs: NARANJA
  if (hours === 5) return COLOR_SCALE.yellow; // 5 hs: AMARILLO
  if (hours <= 7) return COLOR_SCALE.green; // 6 a 7 hs: VERDE
  return COLOR_SCALE.violet; // 8 a 12 hs: VIOLETA
};

export const getQualityColor = (quality: number): string => {
  switch (quality) {
    case 1:
      return COLOR_SCALE.brown;
    case 2:
      return COLOR_SCALE.orange;
    case 3:
      return COLOR_SCALE.yellow;
    case 4:
      return COLOR_SCALE.green;
    case 5:
      return COLOR_SCALE.violet;
    default:
      return COLOR_SCALE.green;
  }
};

export const getFatigueColor = (fatigue: number): string => {
  switch (fatigue) {
    case 1:
      return COLOR_SCALE.violet;
    case 2:
      return COLOR_SCALE.green;
    case 3:
      return COLOR_SCALE.yellow;
    case 4:
      return COLOR_SCALE.orange;
    case 5:
      return COLOR_SCALE.brown;
    default:
      return COLOR_SCALE.orange;
  }
};

export const getSorenessColor = (soreness: number): string => {
  switch (soreness) {
    case 1:
      return COLOR_SCALE.violet;
    case 2:
      return COLOR_SCALE.green;
    case 3:
      return COLOR_SCALE.yellow;
    case 4:
      return COLOR_SCALE.orange;
    case 5:
      return COLOR_SCALE.brown;
    default:
      return COLOR_SCALE.violet;
  }
};

export const getMetricCurrentColor = (
  key: MetricKey,
  val: number | null,
): string => {
  if (val === null) return COLOR_SCALE.neutral;
  switch (key) {
    case 'sleepHours':
      return getSleepColor(val);
    case 'sleepQuality':
      return getQualityColor(val);
    case 'fatigueLevel':
      return getFatigueColor(val);
    case 'muscleSoreness':
      return getSorenessColor(val);
  }
};

export const renderBicepsMuscle = (
  size: number,
  innerLineColor: string,
  mainFill = 'var(--white)',
) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={mainFill}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <path
      d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1"
      fill={mainFill}
    />
    <path d="M15 14a5 5 0 0 0-7.584 2" stroke={innerLineColor} strokeWidth="1.8" />
    <path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" stroke={innerLineColor} strokeWidth="1.8" />
  </svg>
);

export function renderStarSvg(type: 'four' | 'five', size: number, color: string) {
  if (type === 'four') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="-10 -10 20 20"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          d="M 0 -10 Q 0 0 10 0 Q 0 0 0 10 Q 0 0 -10 0 Q 0 0 0 -10 Z"
          fill={color}
          filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 20 20"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polygon
        points="0,-10 2.9,-3.1 9.5,-3.1 4.2,1.2 6.2,8.1 0,3.8 -6.2,8.1 -4.2,1.2 -9.5,-3.1 -2.9,-3.1"
        fill={color}
        filter="drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.85)) drop-shadow(0px 0px 2px rgba(0, 0, 0, 0.15))"
      />
    </svg>
  );
}


import React from 'react';
import logoLight from '../../assets/protraining-logo-light.png';
import logoDark from '../../assets/protraining-logo-dark.png';

interface ProTrainingLogoProps {
  size?: number;
  height?: number;
  theme?: 'light' | 'dark';
  className?: string;
  alt?: string;
}

export const ProTrainingLogo: React.FC<ProTrainingLogoProps> = ({
  size,
  height = 54,
  theme,
  className = '',
  alt = 'ProTraining',
}) => {
  const h = size || height;

  // If a specific theme is forced via prop
  if (theme === 'light') {
    return (
      <img
        src={logoLight}
        alt={alt}
        className={`protraining-brand-logo ${className}`}
        style={{
          height: `${h}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }

  if (theme === 'dark') {
    return (
      <img
        src={logoDark}
        alt={alt}
        className={`protraining-brand-logo ${className}`}
        style={{
          height: `${h}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          flexShrink: 0,
        }}
      />
    );
  }

  // Dual rendering for instant CSS theme switching (zero flicker)
  return (
    <div
      className={`protraining-brand-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        height: `${h}px`,
      }}
    >
      <img
        src={logoLight}
        alt={alt}
        className="protraining-logo-img logo-theme-light"
        style={{
          height: `${h}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      <img
        src={logoDark}
        alt={alt}
        className="protraining-logo-img logo-theme-dark"
        style={{
          height: `${h}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
    </div>
  );
};

import React, { useState } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'rounded';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export interface ProfileAvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize | number;
  shape?: AvatarShape;
  className?: string;
  alt?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  name,
  size = 'md',
  shape = 'circle',
  className = '',
  alt,
}) => {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Si cambia la URL de la foto (por ejemplo con cache-busting ?v=...), reiniciamos el estado de error
  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
  }

  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] || 48;
  const fontSize = Math.max(10, Math.round(dimension * 0.38));
  const borderRadius = shape === 'circle' ? '50%' : '12px';

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?';

  const accessibleLabel = alt || `Foto de perfil de ${name}`;

  return (
    <div
      className={`profile-avatar ${className}`}
      style={{
        width: `${dimension}px`,
        height: `${dimension}px`,
        minWidth: `${dimension}px`,
        minHeight: `${dimension}px`,
        borderRadius,
        backgroundColor: 'var(--bg-subtle, #1e293b)',
        color: 'var(--text-main, #f8fafc)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: `${fontSize}px`,
        overflow: 'hidden',
        userSelect: 'none',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        position: 'relative',
      }}
      title={name}
      aria-label={accessibleLabel}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={accessibleLabel}
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
};


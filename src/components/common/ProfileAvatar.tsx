import React, { useState, useEffect } from 'react';
import { httpClient } from '../../api/axiosClient';

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

// Global cache for blob URLs to avoid redundant network requests across components
const blobUrlCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<string | null>>();

function isApiPhotoUrl(url: string): boolean {
  return url.startsWith('/api/') || url.startsWith('/estructura/') || url.startsWith('/identidad/');
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  src,
  name,
  size = 'md',
  shape = 'circle',
  className = '',
  alt,
}) => {
  const isApi = Boolean(src && isApiPhotoUrl(src));
  const cachedBlob = isApi && src ? blobUrlCache.get(src) : null;
  const [asyncBlobUrl, setAsyncBlobUrl] = useState<string | null>(cachedBlob || null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isApi || !src) return;
    if (blobUrlCache.has(src)) return;

    if (!httpClient || typeof httpClient.get !== 'function') {
      return;
    }

    let isMounted = true;
    let currentPromise = inFlightRequests.get(src);
    if (!currentPromise) {
      currentPromise = httpClient
        .get<Blob>(src, { responseType: 'blob' })
        .then((response: { data: Blob }) => {
          const blobUrl = URL.createObjectURL(response.data);
          blobUrlCache.set(src, blobUrl);
          inFlightRequests.delete(src);
          return blobUrl;
        })
        .catch(() => {
          inFlightRequests.delete(src);
          return null;
        });
      inFlightRequests.set(src, currentPromise);
    }

    currentPromise.then((blobUrl) => {
      if (!isMounted) return;
      if (blobUrl) {
        setAsyncBlobUrl(blobUrl);
        setHasError(false);
      } else {
        setHasError(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [src, isApi]);

  const resolvedSrc = isApi ? asyncBlobUrl || cachedBlob || null : src || null;

  const dimension = typeof size === 'number' ? size : SIZE_MAP[size] || 48;
  const fontSize = Math.max(10, Math.round(dimension * 0.38));
  const borderRadius = shape === 'circle' ? '50%' : '12px';

  const initials =
    name
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
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
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

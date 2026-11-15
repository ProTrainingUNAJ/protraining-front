import React, { useState, useRef } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';
import { ProfileAvatar, AvatarSize, AvatarShape } from './ProfileAvatar';
import { compressAndConvertToWebp } from '../../utils/imageCompressor';

export interface PhotoUploadControlProps {
  currentPhotoUrl?: string | null;
  name: string;
  size?: AvatarSize | number;
  shape?: AvatarShape;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  uploadButtonLabel?: string;
}

const SIZE_NUMBERS: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export const PhotoUploadControl: React.FC<PhotoUploadControlProps> = ({
  currentPhotoUrl,
  name,
  size = 'xl',
  shape = 'circle',
  onUpload,
  onDelete,
  disabled = false,
  className = '',
  uploadButtonLabel = 'Cambiar foto',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'compressing' | 'uploading' | 'success'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(0);
  const [photoRemoved, setPhotoRemoved] = useState<boolean>(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dimension = typeof size === 'number' ? size : SIZE_NUMBERS[size] || 96;
  const badgeSize = Math.max(26, Math.round(dimension * 0.32));
  const iconSize = Math.max(14, Math.round(badgeSize * 0.52));
  const borderRadius = shape === 'circle' ? '50%' : '14px';

  const hasPhoto = !photoRemoved && Boolean(currentPhotoUrl);
  const displayPhotoUrl =
    localPreviewUrl ||
    (hasPhoto && currentPhotoUrl
      ? `${currentPhotoUrl}${currentPhotoUrl.includes('?') ? '&' : '?'}v=${cacheBuster || '0'}`
      : null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';
    setErrorMessage(null);
    setIsUploading(true);
    setUploadStep('compressing');

    // Previsualización instantánea antes de subir
    try {
      const initialPreview = URL.createObjectURL(file);
      setLocalPreviewUrl(initialPreview);
    } catch {
      // Si el entorno no soporta createObjectURL (ej. jsdom), continúa normalmente
    }

    try {
      // Paso 1: Comprimir y convertir a WebP
      const compressedWebpFile = await compressAndConvertToWebp(file);

      // Paso 2: Subir al backend
      setUploadStep('uploading');
      await onUpload(compressedWebpFile);

      setPhotoRemoved(false);
      setCacheBuster(Date.now());
      setUploadStep('success');
      setTimeout(() => setUploadStep('idle'), 3000);
    } catch (err: unknown) {
      setLocalPreviewUrl(null);
      setUploadStep('idle');
      const msg = err instanceof Error ? err.message : 'No se pudo subir la foto.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || disabled || isDeleting || isUploading) return;

    const confirmed = window.confirm('¿Seguro que querés eliminar la foto de perfil?');
    if (!confirmed) return;

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await onDelete();
      setLocalPreviewUrl(null);
      setPhotoRemoved(true);
      setCacheBuster(Date.now());
      setUploadStep('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar la foto.';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = isUploading || isDeleting;

  return (
    <div
      className={`photo-upload-control ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      {/* Contenedor del avatar con botón interactivo */}
      <div
        style={{
          position: 'relative',
          width: `${dimension}px`,
          height: `${dimension}px`,
          cursor: disabled || isBusy ? 'default' : 'pointer',
          borderRadius,
        }}
        onClick={() => !disabled && !isBusy && fileInputRef.current?.click()}
        title={uploadButtonLabel}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isBusy) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-busy={isBusy}
        aria-label={`${uploadButtonLabel} para ${name}`}
      >
        <ProfileAvatar src={displayPhotoUrl} name={name} size={dimension} shape={shape} />

        {/* Overlay con spinner mientras se sube o se procesa */}
        {isBusy && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius,
              zIndex: 10,
              backdropFilter: 'blur(2px)',
            }}
          >
            <Loader2
              size={22}
              style={{
                animation: 'spin 1s linear infinite',
                marginBottom: '0.25rem',
              }}
            />
            <span>
              {uploadStep === 'compressing'
                ? 'Comprimiendo…'
                : isUploading
                  ? 'Guardando…'
                  : 'Borrando…'}
            </span>
          </div>
        )}

        {/* Botón flotante badge con icono de cámara */}
        {!isBusy && !disabled && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: `${badgeSize}px`,
              height: `${badgeSize}px`,
              borderRadius: '50%',
              backgroundColor: 'var(--primary, #3b82f6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
              border: '2px solid var(--bg-card, #ffffff)',
            }}
            title={uploadButtonLabel}
          >
            <Camera size={iconSize} />
          </div>
        )}
      </div>

      {/* Input nativo completamente oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled || isBusy}
      />

      {/* Acciones auxiliares de texto (Cambiar foto / Eliminar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.8rem',
        }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isBusy}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary, #3b82f6)',
            fontWeight: 600,
            cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
            padding: '0.2rem 0.35rem',
            borderRadius: '4px',
            textDecoration: 'underline',
          }}
        >
          {uploadButtonLabel}
        </button>

        {hasPhoto && onDelete && (
          <>
            <span style={{ color: 'var(--text-muted, #94a3b8)' }}>·</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || isBusy}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger, #ef4444)',
                fontWeight: 600,
                cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.2rem 0.35rem',
                borderRadius: '4px',
              }}
            >
              <Trash2 size={13} />
              <span>Eliminar</span>
            </button>
          </>
        )}
      </div>

      {/* Feedback visible durante la compresión, guardado y éxito */}
      {uploadStep === 'compressing' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--primary, #3b82f6)',
            fontSize: '0.78rem',
            fontWeight: 500,
          }}
        >
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Comprimiendo imagen a WebP…</span>
        </div>
      )}

      {uploadStep === 'uploading' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--primary, #3b82f6)',
            fontSize: '0.78rem',
            fontWeight: 500,
          }}
        >
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Guardando foto en el perfil…</span>
        </div>
      )}

      {uploadStep === 'success' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--success, #16a34a)',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <span>✓ Foto actualizada</span>
        </div>
      )}

      {/* Mensaje de error si falla la compresión o subida */}
      {errorMessage && (
        <p
          role="alert"
          style={{
            color: 'var(--danger, #ef4444)',
            fontSize: '0.75rem',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: '220px',
            margin: '0.1rem 0 0',
          }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

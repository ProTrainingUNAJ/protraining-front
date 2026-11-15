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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayPhotoUrl = currentPhotoUrl
    ? `${currentPhotoUrl}${currentPhotoUrl.includes('?') ? '&' : '?'}v=${cacheBuster || '0'}`
    : null;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Resetear valor para permitir seleccionar el mismo archivo si fue eliminado
    event.target.value = '';
    setErrorMessage(null);
    setIsUploading(true);

    try {
      // 1. Convertir y comprimir a WebP en el navegador (max 500px, quality 0.85, <= 200 KB)
      const compressedWebpFile = await compressAndConvertToWebp(file);

      // 2. Subir al endpoint dedicado
      await onUpload(compressedWebpFile);

      // 3. Forzar refresco visual inmediato con cache buster
      setCacheBuster(Date.now());
    } catch (err: unknown) {
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
      setCacheBuster(Date.now());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar la foto.';
      setErrorMessage(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = isUploading || isDeleting;

  return (
    <div className={`photo-upload-control flex flex-col items-center gap-3 ${className}`}>
      {/* Contenedor del avatar con overlay de carga interactiva */}
      <div
        className="relative group cursor-pointer"
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
        <ProfileAvatar
          src={displayPhotoUrl}
          name={name}
          size={size}
          shape={shape}
          className="transition-opacity group-hover:opacity-90"
        />

        {/* Overlay con spinner mientras se sube o se procesa */}
        {isBusy && (
          <div
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs font-semibold rounded-full z-10 transition-opacity"
            style={{ borderRadius: shape === 'circle' ? '50%' : '12px' }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-white mb-1" />
            <span>{isUploading ? 'Subiendo...' : 'Borrando...'}</span>
          </div>
        )}

        {/* Botón flotante con icono de cámara */}
        {!isBusy && !disabled && (
          <div
            className="absolute bottom-0 right-0 bg-brand-primary text-white p-2 rounded-full shadow-lg border-2 border-surface transform transition-transform group-hover:scale-110 flex items-center justify-center"
            style={{
              backgroundColor: 'var(--brand-primary, #3b82f6)',
              borderColor: 'var(--bg-surface, #0f172a)',
            }}
          >
            <Camera className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Input oculto para selección de imagen */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isBusy}
      />

      {/* Acciones auxiliares (Eliminar foto si ya tiene una) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isBusy}
          className="text-xs font-medium text-brand-primary hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/50 rounded px-1.5 py-0.5"
          style={{ color: 'var(--brand-primary, #3b82f6)' }}
        >
          {uploadButtonLabel}
        </button>

        {currentPhotoUrl && onDelete && (
          <>
            <span className="text-muted text-xs">·</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || isBusy}
              className="text-xs font-medium text-danger hover:underline flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-danger/50 rounded px-1.5 py-0.5"
              style={{ color: 'var(--danger, #ef4444)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar</span>
            </button>
          </>
        )}
      </div>

      {/* Mensaje de error si falla la compresión o subida */}
      {errorMessage && (
        <p
          className="text-xs text-danger text-center max-w-xs font-medium mt-1"
          role="alert"
          style={{ color: 'var(--danger, #ef4444)' }}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

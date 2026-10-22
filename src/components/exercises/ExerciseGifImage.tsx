import React, { useState, useEffect, useMemo } from 'react';

const FREE_EXERCISE_DB_RAW =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

interface ExerciseGifImageProps {
  images?: string[];
  name: string;
  intervalMs?: number; // Tiempo entre fotogramas (por defecto 480ms)
}

export function ExerciseGifImage({ images, name, intervalMs = 480 }: ExerciseGifImageProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Asegura que las URLs apunten al repositorio de free-exercise-db
  const validImages = useMemo(() => {
    if (!images || images.length === 0) return [];
    return images.map((img) => (img.startsWith('http') ? img : `${FREE_EXERCISE_DB_RAW}${img}`));
  }, [images]);

  // Precargar las imágenes en memoria para que no haya parpadeo blanco
  useEffect(() => {
    if (validImages.length === 0 || hasError) {
      return;
    }
    validImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [validImages, hasError]);

  // Alternar rápidamente entre imagen 0 e imagen 1
  useEffect(() => {
    if (validImages.length < 2) return;

    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % validImages.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [validImages, intervalMs]);

  // CRITERIO DE ACEPTACIÓN: Si no hay imágenes o falló la carga, no muestra nada y no falla
  if (validImages.length === 0 || hasError) {
    return null;
  }

  return (
    <div className="exercise-gif-container">
      <img
        src={validImages[frameIndex]}
        alt={`${name} - fotograma ${frameIndex + 1}`}
        className="exercise-gif-img"
        loading="lazy"
        onError={() => setHasError(true)}
      />
      {validImages.length >= 2 && <span className="exercise-gif-badge">GIF • 2 fotos</span>}
    </div>
  );
}

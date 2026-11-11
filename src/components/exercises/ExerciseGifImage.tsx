import React, { useState, useEffect, useMemo } from 'react';
import type { ExerciseMediaDto } from '../../api/generated/entrenamiento';

const FREE_EXERCISE_DB_RAW =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

// Tiempo entre fotogramas de las ilustraciones (KAN-549): más lento que las fotos,
// porque son dos poses (inicio y pico) y se tiene que entender el movimiento.
const MEDIA_FRAME_INTERVAL_MS = 800;

type LayerKind = 'frames' | 'gif' | 'photos';

interface Layer {
  kind: LayerKind;
  urls: string[];
  credit?: { text: string; url: string };
}

interface ExerciseGifImageProps {
  images?: string[];
  // Ilustraciones de terceros en orden de preferencia (KAN-549). Si ninguna carga, se usan las fotos.
  media?: ExerciseMediaDto[];
  name: string;
  intervalMs?: number; // Tiempo entre fotos (por defecto 480 ms)
}

const BADGE_BY_KIND: Record<LayerKind, string> = {
  frames: 'Ilustración',
  gif: 'Animación',
  photos: 'GIF • 2 fotos',
};

export function ExerciseGifImage({ images, media, name, intervalMs = 480 }: ExerciseGifImageProps) {
  // Capas en orden: primero las ilustraciones (RepDB → ExerciseDB → Everkinetic), al final las fotos.
  const layers = useMemo<Layer[]>(() => {
    const mediaLayers: Layer[] = (media ?? [])
      .filter((m) => m.urls.length > 0)
      .map((m) => ({
        kind: m.kind,
        urls: m.urls,
        credit: { text: m.credit, url: m.creditUrl },
      }));

    const photos = (images ?? []).map((img) =>
      img.startsWith('http') ? img : `${FREE_EXERCISE_DB_RAW}${img}`,
    );

    return photos.length > 0 ? [...mediaLayers, { kind: 'photos', urls: photos }] : mediaLayers;
  }, [images, media]);

  // Si cambia el ejercicio (otras capas), se vuelve a la primera capa y al primer fotograma:
  // la posición guardada solo vale para las capas con las que se guardó.
  const layersKey = layers.map((l) => l.urls.join('|')).join('||');
  const [position, setPosition] = useState({ key: layersKey, layer: 0, frame: 0 });
  const layerIndex = position.key === layersKey ? position.layer : 0;
  const frameIndex = position.key === layersKey ? position.frame : 0;

  const layer = layers[layerIndex];

  // Precargar los fotogramas de la capa actual para que no haya parpadeo blanco.
  useEffect(() => {
    layer?.urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [layer]);

  // Alternar entre los fotogramas (las ilustraciones y las fotos; un GIF ya se mueve solo).
  useEffect(() => {
    if (!layer || layer.kind === 'gif' || layer.urls.length < 2) return;

    const delay = layer.kind === 'frames' ? MEDIA_FRAME_INTERVAL_MS : intervalMs;
    const timer = setInterval(() => {
      setPosition((prev) =>
        prev.key === layersKey
          ? { ...prev, frame: (prev.frame + 1) % layer.urls.length }
          : { key: layersKey, layer: 0, frame: 1 % layer.urls.length },
      );
    }, delay);

    return () => clearInterval(timer);
  }, [layer, layersKey, intervalMs]);

  // Si no hay nada o ya fallaron todas las capas, no muestra nada y no falla.
  if (!layer) {
    return null;
  }

  // Si una imagen no carga (la fuente se cayó o cambió la URL), pasa a la capa siguiente.
  const handleError = () => {
    setPosition({ key: layersKey, layer: layerIndex + 1, frame: 0 });
  };

  const src = layer.urls[frameIndex % layer.urls.length];
  const showBadge = layer.kind === 'gif' || layer.urls.length >= 2;

  return (
    <div className="exercise-gif-wrapper">
      <div className={`exercise-gif-container exercise-gif-container--${layer.kind}`}>
        <img
          src={src}
          alt={`${name} - ${layer.kind === 'gif' ? 'animación' : `fotograma ${frameIndex + 1}`}`}
          className="exercise-gif-img"
          loading="lazy"
          onError={handleError}
        />
        {showBadge && <span className="exercise-gif-badge">{BADGE_BY_KIND[layer.kind]}</span>}
      </div>
      {layer.credit && (
        <a
          className="exercise-gif-credit"
          href={layer.credit.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {layer.credit.text}
        </a>
      )}
    </div>
  );
}

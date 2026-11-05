import React from 'react';
import { ExternalLink } from 'lucide-react';
import { extractYouTubeId, getYouTubeEmbedUrl, getYouTubeWatchUrl } from '../../utils/youtube';

interface ExerciseVideoPlayerProps {
  videoUrl: string;
  exerciseName: string;
}

export const ExerciseVideoPlayer: React.FC<ExerciseVideoPlayerProps> = ({
  videoUrl,
  exerciseName,
}) => {
  const videoId = extractYouTubeId(videoUrl);
  const watchUrl = getYouTubeWatchUrl(videoUrl);

  // Si la URL no es un ID estándar de YouTube, ofrecemos abrirlo directo
  if (!videoId) {
    return (
      <div
        className="exercise-video-fallback"
        style={{
          padding: '1rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Este video no puede reproducirse embebido.
        </p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
          }}
        >
          <ExternalLink size={15} />
          <span>Abrir en YouTube</span>
        </a>
      </div>
    );
  }

  return (
    <div className="exercise-video-wrapper" style={{ marginTop: '0.75rem' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--bg-main)',
        }}
      >
        <iframe
          src={getYouTubeEmbedUrl(videoId)}
          title={`Video de técnica: ${exerciseName}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 0 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <span>¿No se reproduce? Abrir en YouTube</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};

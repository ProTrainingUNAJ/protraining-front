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

  // Si no es un video de YouTube reconocido, no mostramos links inseguros
  if (!videoId || !watchUrl) {
    return null;
  }

  return (
    <div className="exercise-video-wrapper">
      <div className="exercise-video-frame-container">
        <iframe
          src={getYouTubeEmbedUrl(videoId)}
          title={`Video de técnica: ${exerciseName}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="exercise-video-iframe"
        />
      </div>
      <div className="exercise-video-actions">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="exercise-video-link"
        >
          <span>¿No se reproduce? Abrir en YouTube</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};

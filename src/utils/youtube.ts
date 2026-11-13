export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const regExp =
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.trim().match(regExp);
  return match ? match[1] : null;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function getYouTubeWatchUrl(videoIdOrUrl: string): string | null {
  const id = extractYouTubeId(videoIdOrUrl);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

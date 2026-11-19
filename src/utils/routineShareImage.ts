import logoLight from '../assets/protraining-logo-light.webp';
import frontSilhouetteUrl from '../assets/front-body-silhouette.webp';
import frontLineartUrl from '../assets/front-anatomy-lineart.webp';
import backSilhouetteUrl from '../assets/back-body-silhouette.webp';
import backLineartUrl from '../assets/back-anatomy-lineart.webp';
import {
  FRONT_OFFICIAL_MUSCLES,
  BACK_OFFICIAL_MUSCLES,
} from '../components/athlete/muscleMap.config';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
    img.src = src;
  });
}

export interface RoutineShareOptions {
  muscleColors?: Record<string, string>;
  totalLoad?: number;
  durationFormatted?: string;
  rpe?: number;
}

/**
 * Genera la imagen oficial de ProTraining lista para compartir en historias
 * de Instagram, Facebook, WhatsApp y otras apps en formato PNG de alta resolución.
 *
 * Contenido limpio y enfocado (acorde a solicitud del atleta):
 * - Logo oficial de ProTraining centrado en la parte superior.
 * - Siluetas anatómicas (frente y dorso) con los grupos musculares trabajados
 *   coloreados exactamente según su mapa de la sesión (primarios en azul, secundarios en gris).
 */
export async function generateRoutineShareImage(
  dataOrColors: Record<string, string> | RoutineShareOptions = {},
): Promise<File> {
  const muscleColors: Record<string, string> =
    'muscleColors' in dataOrColors
      ? ((dataOrColors as RoutineShareOptions).muscleColors ?? {})
      : (dataOrColors as Record<string, string>);

  const width = 1080;
  const height = 1080;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D del Canvas');
  }

  // 1. Fondo blanco limpio de alta fidelidad
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Cargar assets gráficos
  const [logoImg, frontSilImg, frontLineImg, backSilImg, backLineImg] = await Promise.all([
    loadImage(logoLight),
    loadImage(frontSilhouetteUrl),
    loadImage(frontLineartUrl),
    loadImage(backSilhouetteUrl),
    loadImage(backLineartUrl),
  ]);

  // 3. Logo oficial PROTRAINING centrado arriba
  const logoTargetHeight = 88;
  const logoRatio = logoImg.width / (logoImg.height || 1);
  const logoTargetWidth = logoTargetHeight * logoRatio;
  const logoX = (width - logoTargetWidth) / 2;
  const logoY = 65;
  ctx.drawImage(logoImg, logoX, logoY, logoTargetWidth, logoTargetHeight);

  // 4. Siluetas anatómicas (frente y espalda) como en el mapa muscular de la app
  const scale = 1.05;
  const bodyWidth = 380 * scale; // ~399px
  const gap = 60;
  const totalBodiesWidth = bodyWidth * 2 + gap; // ~858px
  const startX = (width - totalBodiesWidth) / 2;
  const frontX = startX;
  const backX = startX + bodyWidth + gap;
  const bodyY = 215;

  // ── Frente ──
  ctx.save();
  ctx.translate(frontX, bodyY);
  ctx.scale(scale, scale);
  ctx.drawImage(frontSilImg, 0, 0, 380, 680);
  FRONT_OFFICIAL_MUSCLES.forEach((muscle) => {
    const color = muscleColors[muscle.id];
    if (color && muscle.frontPath) {
      ctx.fillStyle = color;
      const path = new Path2D(muscle.frontPath);
      ctx.fill(path);
    }
  });
  ctx.drawImage(frontLineImg, 0, 0, 380, 680);
  ctx.restore();

  // ── Espalda ──
  ctx.save();
  ctx.translate(backX, bodyY);
  ctx.scale(scale, scale);
  ctx.drawImage(backSilImg, 0, 0, 380, 680);
  BACK_OFFICIAL_MUSCLES.forEach((muscle) => {
    const color = muscleColors[muscle.id];
    if (color && muscle.backPath) {
      ctx.fillStyle = color;
      const path = new Path2D(muscle.backPath);
      ctx.fill(path);
    }
  });
  ctx.drawImage(backLineImg, 0, 0, 380, 680);
  ctx.restore();

  // 5. Exportar a Blob y File PNG
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Error al generar el archivo PNG del canvas'));
          return;
        }
        const file = new File([blob], `protraining-rutina-${Date.now()}.png`, {
          type: 'image/png',
        });
        resolve(file);
      },
      'image/png',
      1.0,
    );
  });
}

/**
 * Descarga directamente el archivo PNG en el navegador
 */
export function downloadImageFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Comparte en Historias de Instagram:
 * 1. Intenta Web Share API con archivo nativo (en móviles abre Instagram Historias / Feed).
 * 2. Si falla o es escritorio: descarga el PNG y abre Instagram.
 */
export async function shareToInstagram(file: File): Promise<{ success: boolean; message: string }> {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'ProTraining',
        text: '¡Entrenamiento completado en ProTraining! 💪',
      });
      return { success: true, message: 'Compartido exitosamente en Instagram' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, message: 'Compartir cancelado' };
      }
    }
  }

  // Fallback: descarga la imagen y redirige a Instagram
  downloadImageFile(file);
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  return {
    success: true,
    message: 'Imagen descargada. Podés subirla directamente a tus historias de Instagram.',
  };
}

/**
 * Comparte en Historias o Feed de Facebook
 */
export async function shareToFacebook(file: File): Promise<{ success: boolean; message: string }> {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'ProTraining',
        text: '¡Entrenamiento completado en ProTraining! 💪',
      });
      return { success: true, message: 'Compartido exitosamente en Facebook' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, message: 'Compartir cancelado' };
      }
    }
  }

  downloadImageFile(file);
  window.open('https://www.facebook.com/', '_blank', 'noopener,noreferrer');
  return {
    success: true,
    message: 'Imagen descargada. Podés subirla directamente a tus historias de Facebook.',
  };
}

/**
 * Comparte en Estados de WhatsApp o chat
 */
export async function shareToWhatsApp(file: File): Promise<{ success: boolean; message: string }> {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'ProTraining',
        text: '¡Entrenamiento completado en ProTraining! 💪',
      });
      return { success: true, message: 'Compartido exitosamente en WhatsApp' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, message: 'Compartir cancelado' };
      }
    }
  }

  downloadImageFile(file);
  const text = encodeURIComponent('¡Completé mi entrenamiento en ProTraining! 💪');
  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  return {
    success: true,
    message: 'Imagen descargada. Podés compartirla en tu estado o chats de WhatsApp.',
  };
}

/**
 * Comparte la foto a cualquier otra aplicación o la descarga en formato PNG
 */
export async function shareToAnyApp(file: File): Promise<{ success: boolean; message: string }> {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'ProTraining - Mi Entrenamiento',
        text: '¡Entrenamiento completado en ProTraining! 💪',
      });
      return { success: true, message: 'Compartido exitosamente' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, message: 'Compartir cancelado' };
      }
    }
  }

  downloadImageFile(file);
  return { success: true, message: 'Imagen PNG descargada correctamente' };
}

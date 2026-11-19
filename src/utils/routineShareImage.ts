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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawMedalBadge(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
) {
  ctx.save();
  // Círculo base verde claro
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ecfdf5';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#10b981';
  ctx.stroke();

  // Ícono de Ribbon / Medalla olímpica en verde
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Aro de la medalla
  ctx.beginPath();
  ctx.arc(centerX, centerY - 6, 14, 0, Math.PI * 2);
  ctx.stroke();

  // Cintas colgantes
  ctx.beginPath();
  ctx.moveTo(centerX - 9, centerY + 6);
  ctx.lineTo(centerX - 12, centerY + 22);
  ctx.lineTo(centerX - 4, centerY + 17);
  ctx.lineTo(centerX, centerY + 20);
  ctx.lineTo(centerX + 4, centerY + 17);
  ctx.lineTo(centerX + 12, centerY + 22);
  ctx.lineTo(centerX + 9, centerY + 6);
  ctx.stroke();
  ctx.restore();
}

export interface RoutineShareOptions {
  muscleColors?: Record<string, string>;
  totalLoad?: number;
  durationFormatted?: string;
  rpe?: number;
}

/**
 * Genera la postal oficial de ¡Entrenamiento completado! de ProTraining lista para compartir
 * en historias de Instagram, Facebook, WhatsApp y cualquier app en formato PNG de alta resolución.
 * Incluye:
 * - Logo oficial de ProTraining en la cabecera.
 * - Insignia de medalla verde y títulos de celebración.
 * - Siluetas anatómicas (frente y dorso) con los músculos trabajados en la sesión.
 * - Tarjeta completa de rendimiento: Unidades Arbitrarias (UA), barra de escala Foster,
 *   duración de la sesión y nivel de esfuerzo RPE.
 */
export async function generateRoutineShareImage(
  dataOrColors: Record<string, string> | RoutineShareOptions = {},
): Promise<File> {
  const isDataObj =
    'totalLoad' in dataOrColors ||
    'durationFormatted' in dataOrColors ||
    'rpe' in dataOrColors ||
    'muscleColors' in dataOrColors;

  const muscleColors: Record<string, string> = isDataObj
    ? ((dataOrColors as RoutineShareOptions).muscleColors ?? {})
    : (dataOrColors as Record<string, string>);

  const totalLoad = isDataObj ? ((dataOrColors as RoutineShareOptions).totalLoad ?? 420) : 420;
  const durationFormatted = isDataObj
    ? ((dataOrColors as RoutineShareOptions).durationFormatted ?? '60:00')
    : '60:00';
  const rpe = isDataObj ? ((dataOrColors as RoutineShareOptions).rpe ?? 7) : 7;

  const width = 1080;
  const height = 1350;

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

  // Marco exterior sutil tipo postal
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 6;
  roundRect(ctx, 16, 16, width - 32, height - 32, 32);
  ctx.stroke();

  // 2. Cargar assets gráficos
  const [logoImg, frontSilImg, frontLineImg, backSilImg, backLineImg] = await Promise.all([
    loadImage(logoLight),
    loadImage(frontSilhouetteUrl),
    loadImage(frontLineartUrl),
    loadImage(backSilhouetteUrl),
    loadImage(backLineartUrl),
  ]);

  // 3. Logo oficial PROTRAINING centrado arriba
  const logoTargetHeight = 72;
  const logoRatio = logoImg.width / (logoImg.height || 1);
  const logoTargetWidth = logoTargetHeight * logoRatio;
  const logoX = (width - logoTargetWidth) / 2;
  const logoY = 46;
  ctx.drawImage(logoImg, logoX, logoY, logoTargetWidth, logoTargetHeight);

  // 4. Medalla verde circular animada
  drawMedalBadge(ctx, 540, 172, 38);

  // 5. Títulos de celebración
  ctx.fillStyle = '#0f172a';
  ctx.font = '900 38px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¡Entrenamiento completado!', 540, 240);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillText('Tu sesión quedó registrada con éxito y tus Unidades Arbitrarias', 540, 280);
  ctx.fillText('se sincronizaron con el semáforo de tu preparador físico.', 540, 308);

  // 6. Siluetas anatómicas (frente y espalda) con músculos trabajados en celeste
  const scale = 0.62;
  const bodyWidth = 380 * scale; // ~235px
  const gap = 60;
  const totalBodiesWidth = bodyWidth * 2 + gap;
  const startX = (width - totalBodiesWidth) / 2;
  const frontX = startX;
  const backX = startX + bodyWidth + gap;
  const bodyY = 350;

  const highlightFillColor = '#00c2ff';

  // ── Frente ──
  ctx.save();
  ctx.translate(frontX, bodyY);
  ctx.scale(scale, scale);
  ctx.drawImage(frontSilImg, 0, 0, 380, 680);
  FRONT_OFFICIAL_MUSCLES.forEach((muscle) => {
    if (muscleColors[muscle.id] && muscle.frontPath) {
      ctx.fillStyle = highlightFillColor;
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
    if (muscleColors[muscle.id] && muscle.backPath) {
      ctx.fillStyle = highlightFillColor;
      const path = new Path2D(muscle.backPath);
      ctx.fill(path);
    }
  });
  ctx.drawImage(backLineImg, 0, 0, 380, 680);
  ctx.restore();

  // 7. Tarjeta de Carga y Rendimiento Conseguido (acorde a IMAGEN 2)
  const cardX = 90;
  const cardY = 825;
  const cardW = 900;
  const cardH = 345;
  const cardRadius = 24;

  // Fondo de la tarjeta con esquinas redondeadas
  ctx.fillStyle = '#f8fafc';
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fill();

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();

  // Fila superior: Carga conseguida y valor en UA
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#64748b';
  ctx.font = '700 22px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillText('Carga conseguida en la sesión', cardX + 40, cardY + 54);

  // Valor de UA en azul ProTraining grande y negrita
  const uaText = String(totalLoad);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0077c8';
  ctx.font = '800 26px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillText('UA', cardX + cardW - 40, cardY + 54);

  ctx.font = '900 48px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillText(uaText, cardX + cardW - 40 - 45, cardY + 54);

  // Barra de progreso de UA multicolor
  const barX = cardX + 40;
  const barY = cardY + 98;
  const barW = cardW - 80;
  const barH = 18;
  const barRadius = 9;

  // Track de fondo gris
  ctx.fillStyle = '#e2e8f0';
  roundRect(ctx, barX, barY, barW, barH, barRadius);
  ctx.fill();

  // Relleno dinámico de UA con degradado multicolor (verde -> celeste -> dorado/rojo)
  const pct = Math.max(0.04, Math.min(1.0, totalLoad / 900));
  const fillWidth = Math.round(barW * pct);

  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(0.35, '#0284c7');
  gradient.addColorStop(0.7, '#f59e0b');
  gradient.addColorStop(1.0, '#ef4444');

  ctx.fillStyle = gradient;
  roundRect(ctx, barX, barY, fillWidth, barH, barRadius);
  ctx.fill();

  // Marcas de referencia de la escala de Foster
  const labelY = barY + 38;
  ctx.fillStyle = '#64748b';
  ctx.font = '700 17px Montserrat, system-ui, -apple-system, sans-serif';

  ctx.textAlign = 'left';
  ctx.fillText('0 UA (Mínimo)', barX, labelY);

  ctx.textAlign = 'center';
  ctx.fillText('200 UA (Medio)', barX + barW * 0.33, labelY);

  ctx.textAlign = 'center';
  ctx.fillText('400 UA (Óptimo)', barX + barW * 0.66, labelY);

  ctx.textAlign = 'right';
  ctx.fillText('600+ UA (Intenso)', barX + barW, labelY);

  // Línea divisoria en la tarjeta
  const divY = cardY + 185;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 40, divY);
  ctx.lineTo(cardX + cardW - 40, divY);
  ctx.stroke();

  // Resumen inferior de Duración y Esfuerzo
  const statY = cardY + 235;

  // Duración
  ctx.textAlign = 'center';
  ctx.font = '600 21px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  const durLabelWidth = ctx.measureText('Duración: ').width;
  ctx.font = '900 23px Montserrat, system-ui, -apple-system, sans-serif';
  const durValWidth = ctx.measureText(durationFormatted).width;
  const durTotalWidth = durLabelWidth + durValWidth;
  const durStartX = cardX + cardW * 0.28 - durTotalWidth / 2;

  ctx.textAlign = 'left';
  ctx.font = '600 21px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Duración: ', durStartX, statY);
  ctx.font = '900 23px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(durationFormatted, durStartX + durLabelWidth, statY);

  // Esfuerzo
  const rpeValText = `RPE ${rpe}`;
  ctx.font = '600 21px Montserrat, system-ui, -apple-system, sans-serif';
  const rpeLabelWidth = ctx.measureText('Esfuerzo: ').width;
  ctx.font = '900 23px Montserrat, system-ui, -apple-system, sans-serif';
  const rpeValWidth = ctx.measureText(rpeValText).width;
  const rpeTotalWidth = rpeLabelWidth + rpeValWidth;
  const rpeStartX = cardX + cardW * 0.72 - rpeTotalWidth / 2;

  ctx.font = '600 21px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Esfuerzo: ', rpeStartX, statY);
  ctx.font = '900 23px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(rpeValText, rpeStartX + rpeLabelWidth, statY);

  // 8. Pie de marca ProTraining
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 16px Montserrat, system-ui, -apple-system, sans-serif';
  ctx.fillText('protraining.app · Preparación Física de Alto Rendimiento', 540, 1260);

  // 9. Exportar a Blob y File PNG
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

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  shape: 'rect' | 'circle';
  opacity: number;
}

const CONFETTI_COLORS = [
  '#28b675', // Verde ProTraining
  '#0077c8', // Azul ProTraining
  '#ea9f11', // Dorado / Ámbar
  '#ff4d4f', // Coral festivo
  '#8b5cf6', // Púrpura brillante
  '#38bdf8', // Celeste cielo
  '#ec4899', // Rosa vibrante
  '#ffffff', // Blanco brillo
];

export interface ConfettiCelebrationProps {
  durationMs?: number;
  particleCount?: number;
}

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  durationMs = 3500,
  particleCount = 120,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generar partículas lanzadas desde los dos extremos y el centro superior
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const startX = width * (0.15 + Math.random() * 0.7);
      const startY = height * (0.1 + Math.random() * 0.25);

      particles.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 10 - 4, // Impulso inicial ascendente
        size: Math.random() * 8 + 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        wobble: Math.random() * Math.PI,
        wobbleSpeed: Math.random() * 0.1 + 0.05,
        shape: Math.random() > 0.35 ? 'rect' : 'circle',
        opacity: 1,
      });
    }

    const startTime = performance.now();
    let animId: number;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      ctx.clearRect(0, 0, width, height);

      // Desvanecimiento suave al final
      const fadeFactor = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;

      for (const p of particles) {
        // Físicas
        p.x += p.vx + Math.sin(p.wobble) * 1.5;
        p.y += p.vy;
        p.vy += 0.38; // Gravedad
        p.vx *= 0.985; // Fricción del aire
        p.rotation += p.rotationSpeed;
        p.wobble += p.wobbleSpeed;

        const currentOpacity = p.opacity * fadeFactor;
        if (currentOpacity <= 0) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(currentOpacity, 0);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [durationMs, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
};

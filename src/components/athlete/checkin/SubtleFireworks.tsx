import React, { useEffect, useRef } from 'react';

export interface SubtleFireworksProps {
  active: boolean;
  triggerKey?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
  history: Array<{ x: number; y: number }>;
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

const FIREWORK_COLORS = [
  '#C084FC', // Violet 400
  '#A855F7', // Violet 500
  '#E879F9', // Fuchsia 400
  '#F472B6', // Pink 400
  '#FBBF24', // Amber 400 (Golden sparkle)
  '#FDE047', // Yellow 300
  '#38BDF8', // Sky 400
  '#FFFFFF', // White highlight
];

export const SubtleFireworks: React.FC<SubtleFireworksProps> = ({ active, triggerKey = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.offsetWidth || 500);
    let height = (canvas.height = canvas.offsetHeight || 300);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          width = canvas.width = Math.round(w);
          height = canvas.height = Math.round(h);
        }
      }
    });
    resizeObserver.observe(canvas);

    const rockets: Rocket[] = [];
    const particles: Particle[] = [];

    const createExplosion = (x: number, y: number, baseColor?: string) => {
      const count = 24 + Math.floor(Math.random() * 8);
      const chosenColor =
        baseColor || FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const speed = 1.6 + Math.random() * 2.6;
        const color =
          Math.random() > 0.4
            ? chosenColor
            : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: 0.016 + Math.random() * 0.012,
          size: 1.8 + Math.random() * 1.4,
          color,
          history: [{ x, y }],
        });
      }
    };

    const launchFirework = (targetOffsetX = 0, targetYPercent = 0.3) => {
      const startX = width / 2 + targetOffsetX + (Math.random() - 0.5) * 20;
      const startY = height * 0.65;
      const targetY = height * targetYPercent + (Math.random() - 0.5) * 30;

      rockets.push({
        x: startX,
        y: startY,
        targetY: Math.max(targetY, 40),
        vy: -5.5 - Math.random() * 1.5,
        color: FIREWORK_COLORS[Math.floor(Math.random() * 4)],
        trail: [],
      });
    };

    // Staggered initial burst sequence when triggered
    const timer1 = setTimeout(() => launchFirework(-80, 0.28), 60);
    const timer2 = setTimeout(() => launchFirework(85, 0.25), 260);
    const timer3 = setTimeout(() => launchFirework(10, 0.2), 520);

    // Continuous gentle ambient bursts while remaining on violet
    const interval = setInterval(() => {
      const offset = (Math.random() - 0.5) * 160;
      launchFirework(offset, 0.22 + Math.random() * 0.12);
    }, 2800);

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update & draw rising rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y, alpha: 0.9 });
        if (r.trail.length > 6) r.trail.shift();

        // Draw rocket spark trail
        for (let t = 0; t < r.trail.length; t++) {
          const pt = r.trail[t];
          pt.alpha *= 0.75;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 191, 36, ${pt.alpha})`;
          ctx.fill();
        }

        r.y += r.vy;
        r.vy *= 0.98;

        // Draw rocket head spark
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = r.color;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (r.y <= r.targetY || r.vy >= -0.8) {
          createExplosion(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // 2. Update & draw exploding spark particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > 4) p.history.shift();

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.965; // Air drag
        p.vy += 0.058; // Gentle gravity
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Draw spark streak
        if (p.history.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let h = 1; h < p.history.length; h++) {
            ctx.lineTo(p.history[h].x, p.history[h].y);
          }
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.7;
          ctx.globalAlpha = Math.max(p.alpha * 0.5, 0);
          ctx.stroke();
        }

        // Draw spark particle with gentle shimmer
        const shimmer = Math.random() > 0.3 ? 1 : 0.75;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(p.alpha * shimmer, 0);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(interval);
      resizeObserver.disconnect();
    };
  }, [active, triggerKey]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        borderRadius: '28px',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    />
  );
};

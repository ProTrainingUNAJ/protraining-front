import React, { useState, useEffect } from 'react';

import runner3dImg from '../../assets/protraining-3d-runner.webp';

export const BentoShowcase: React.FC = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const interval = setInterval(() => {
      if (prefersReducedMotion) {
        setCurrentMessageIndex((prev) => (prev === 0 ? 1 : 0));
        return;
      }

      // Transición suave de opacidad
      setFadeState('out');
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev === 0 ? 1 : 0));
        setFadeState('in');
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="auth-visual-showcase" aria-label="Presentación de ProTraining">
      {/* Imagen 3D del runner de fondo */}
      <img src={runner3dImg} alt="Escultura 3D ProTraining" className="auth-visual-bg-image" />

      {/* Degradado atmosférico con tonos azul profundo y gris verdoso */}
      <div className="auth-visual-scrim" />

      {/* Titulares promocionales rotativos */}
      <div className="auth-visual-top">
        <div className="auth-visual-headline-container">
          <h2
            className={`font-extrabold auth-visual-headline fade-${fadeState}`}
            aria-live="polite"
          >
            {currentMessageIndex === 0 ? (
              <>
                Tu evolución deportiva diaria respaldada por{' '}
                <span className="font-bold-italic auth-visual-accent">ciencia de datos</span> y alto
                rendimiento.
              </>
            ) : (
              <>
                Revolucionando la forma en que planificamos, entrenamos y alcanzamos el{' '}
                <span className="font-bold-italic auth-visual-accent">máximo rendimiento</span>.
              </>
            )}
          </h2>
        </div>
      </div>

      {/* Tarjeta inferior de vidrio esmerilado */}
      <div className="auth-glass-card">
        {/* Descripción */}
        <p className="font-medium auth-glass-desc">
          Planificación precisa de cargas, monitorización biométrica y seguimiento integral del
          deportista.
        </p>
      </div>
    </aside>
  );
};

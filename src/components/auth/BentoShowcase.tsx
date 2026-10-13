import React, { useState, useEffect } from 'react';
import { ArrowUpRight, X, Info } from 'lucide-react';
import runner3dImg from '../../assets/protraining-3d-runner.jpg';

export const BentoShowcase: React.FC = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
  const [trialModalOpen, setTrialModalOpen] = useState(false);

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
    <aside className="auth-visual-showcase" aria-label="ProTraining High Performance Showcase">
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
        {/* Fila: burbuja promocional + botón de acción alineados */}
        <div className="promo-row">
          <div className="promo-bubble">
            <span className="font-extrabold">¡Pide una prueba de 30 días gratis!</span>
          </div>
          <button
            type="button"
            className="auth-glass-action-btn"
            aria-label="Solicitar prueba gratuita de 30 días"
            title="Solicitar prueba gratuita"
            onClick={() => setTrialModalOpen(true)}
          >
            <ArrowUpRight size={17} />
          </button>
        </div>

        {/* Descripción */}
        <p className="font-medium auth-glass-desc">
          Planificación precisa de cargas, monitorización biométrica y seguimiento integral del
          deportista.
        </p>
      </div>

      {/* Modal: prueba no disponible */}
      {trialModalOpen && (
        <div
          className="auth-info-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trial-modal-title"
        >
          <div className="auth-info-modal-card">
            <div className="auth-info-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Info size={20} color="var(--color-primary)" />
                <h2 id="trial-modal-title" className="font-extrabold auth-info-modal-title">
                  Prueba gratuita de 30 días
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setTrialModalOpen(false)}
                className="auth-info-modal-close"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <p className="font-medium auth-info-modal-body">
              La prueba gratuita de 30 días no se encuentra disponible de momento. Pronto podrás
              acceder a esta funcionalidad directamente desde la plataforma.
            </p>
            <div className="auth-info-modal-footer">
              <button
                type="button"
                onClick={() => setTrialModalOpen(false)}
                className="btn-pill-primary auth-info-modal-btn"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

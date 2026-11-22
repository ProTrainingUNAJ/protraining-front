import React, { useState } from 'react';
import { PainSliderBar } from '../../common/PainSliderBar';
import { getMuscleSpanishName } from '../../../utils/exerciseMuscleMapper';
import { Activity, Check } from 'lucide-react';

export interface ActiveInjuryItem {
  id: string;
  zone: string;
  description: string;
}

export interface ActiveInjuriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeInjuries: ReadonlyArray<ActiveInjuryItem>;
  injuryScores: Record<string, number | null>;
  onScoreChange: (injuryId: string, score: number) => void;
}

/**
 * Modal emergente centrado con backdrop desenfocado (Burbuja estilo Imagen 2)
 * para evaluar lesiones activas previamente registradas usando la barra continua de dolor (Imagen 3).
 */
export const ActiveInjuriesModal: React.FC<ActiveInjuriesModalProps> = ({
  isOpen,
  onClose,
  activeInjuries,
  injuryScores,
  onScoreChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  if (!isOpen || activeInjuries.length === 0) return null;

  const safeIndex = Math.min(currentIndex, activeInjuries.length - 1);
  const currentInjury = activeInjuries[safeIndex];
  const currentScore = currentInjury ? (injuryScores[currentInjury.id] ?? null) : null;
  const isLast = safeIndex >= activeInjuries.length - 1;

  const handleScoreChange = (val: number) => {
    if (currentInjury) {
      onScoreChange(currentInjury.id, val);
    }
  };

  const handleNextOrFinish = () => {
    // No se inventa un 0. El cero debe ser una elección del atleta; si no tocó la
    // barra el score queda sin definir y el wizard bloquea el avance hasta que lo puntúe.
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-injuries-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'var(--checkin-modal-backdrop, rgba(8, 37, 74, 0.45))',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeInValidationBackdrop 0.2s ease-out forwards',
      }}
      onClick={onClose}
    >
      <div
        className="active-injuries-modal-box"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--checkin-modal-bg, #ffffff)',
          borderRadius: '24px',
          border: '1.5px solid var(--checkin-modal-border, rgba(0, 0, 0, 0.08))',
          boxShadow: '0 20px 48px rgba(8, 37, 74, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08)',
          padding: '1.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
          animation: 'scaleUpValidationBox 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono circular suave en celeste (Imagen 2) */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'var(--info-bg)',
            border: '2px solid var(--info-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Activity size={32} color="var(--primary)" strokeWidth={2.4} />
        </div>

        {/* Título en Montserrat / fuente del sistema en negrita */}
        <h3
          id="active-injuries-modal-title"
          style={{
            fontFamily: 'var(--font-base)',
            fontSize: '1.35rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            margin: '0 0 0.4rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          Lesiones activas
        </h3>

        {/* Indicador de cantidad si hay más de 1 */}
        {activeInjuries.length > 1 && (
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--text-muted, #64748b)',
              marginBottom: '0.5rem',
            }}
          >
            Lesión {safeIndex + 1} de {activeInjuries.length}
          </div>
        )}

        {/* Tarjeta con zona y descripción de la lesión activa */}
        <div
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-subtle)',
            border: '1.5px solid var(--border)',
            borderRadius: '16px',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: '1.02rem',
              color: 'var(--text-main)',
              lineHeight: 1.45,
            }}
          >
            <span>
              {getMuscleSpanishName(currentInjury.zone) || currentInjury.zone} —{' '}
              {currentInjury.description}
            </span>
          </div>
        </div>

        {/* Indicación de uso */}
        <p
          style={{
            fontFamily: 'var(--font-base)',
            fontSize: '0.92rem',
            fontWeight: 500,
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            margin: '0 0 0.85rem 0',
          }}
        >
          Deslizá la barra para indicar el nivel de dolor que sentís hoy en esta lesión:
        </p>

        {/* Barra continua con degradado continuo y thumb con número (Imagen 3) */}
        <div style={{ width: '100%', marginBottom: '1.25rem' }}>
          <PainSliderBar
            value={currentScore}
            onChange={handleScoreChange}
            ariaLabel={`Nivel de dolor en ${getMuscleSpanishName(currentInjury.zone) || currentInjury.zone}`}
          />
          {(injuryScores[currentInjury.id] === null ||
            injuryScores[currentInjury.id] === undefined) && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted, #64748b)',
                margin: '0.4rem 0 0 0',
              }}
            >
              Deslizá la barra para puntuar esta lesión (0 a 10).
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            gap: '0.75rem',
          }}
        >
          {safeIndex > 0 && (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1.5px solid var(--border)',
                color: 'var(--text-main)',
                borderRadius: '9999px',
                fontFamily: 'var(--font-base)',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Anterior
            </button>
          )}

          <button
            type="button"
            onClick={handleNextOrFinish}
            style={{
              flex: 2,
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--primary)',
              color: 'var(--white, #ffffff)',
              borderRadius: '9999px',
              border: 'none',
              fontFamily: 'var(--font-base)',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(8, 37, 74, 0.25)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Check size={18} strokeWidth={2.5} />
            <span>{isLast ? 'Confirmar lesión' : 'Siguiente lesión'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

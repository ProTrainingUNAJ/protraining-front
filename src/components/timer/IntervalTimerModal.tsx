import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
} from 'lucide-react';
import { playWarningBeep, playTransitionBeep } from '../../utils/audioBeep';

type TimerPhase = 'setup' | 'prep' | 'work' | 'rest' | 'finished';

interface IntervalTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  defaultWorkSeconds: number;
  totalSets: number;
  onSetCompleted?: (setNumber: number) => void;
}

const REST_OPTIONS = [15, 30, 45, 60, 90];

export const IntervalTimerModal: React.FC<IntervalTimerModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  defaultWorkSeconds,
  totalSets,
  onSetCompleted,
}) => {
  const [workSeconds, setWorkSeconds] = useState(defaultWorkSeconds > 0 ? defaultWorkSeconds : 30);
  const [restSeconds, setRestSeconds] = useState(30);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<TimerPhase>('setup');
  const [timeLeft, setTimeLeft] = useState(workSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Mantener wakeLock para que no se apague la pantalla en el celular
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (isOpen && phase !== 'setup' && phase !== 'finished') {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        navigator.wakeLock
          .request('screen')
          .then((lock) => {
            wakeLockRef.current = lock;
          })
          .catch(() => {});
      }
    } else {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [isOpen, phase]);

  const handleStart = () => {
    setCurrentRound(1);
    setPhase('prep');
    setTimeLeft(3);
    setIsPaused(false);
    playTransitionBeep(isMuted);
  };

  const handleReset = () => {
    setPhase('setup');
    setCurrentRound(1);
    setTimeLeft(workSeconds);
    setIsPaused(false);
  };

  const nextPhase = useCallback(() => {
    if (phase === 'prep') {
      setPhase('work');
      setTimeLeft(workSeconds);
      playTransitionBeep(isMuted);
    } else if (phase === 'work') {
      // Notificar que se completó la serie actual
      onSetCompleted?.(currentRound);

      if (currentRound >= totalSets) {
        setPhase('finished');
        playTransitionBeep(isMuted);
      } else {
        setPhase('rest');
        setTimeLeft(restSeconds);
        playTransitionBeep(isMuted);
      }
    } else if (phase === 'rest') {
      setCurrentRound((prev) => prev + 1);
      setPhase('work');
      setTimeLeft(workSeconds);
      playTransitionBeep(isMuted);
    }
  }, [phase, workSeconds, restSeconds, currentRound, totalSets, isMuted, onSetCompleted]);

  // Loop de cuenta regresiva
  useEffect(() => {
    if (!isOpen || isPaused || phase === 'setup' || phase === 'finished') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) {
          if (prev <= 4) {
            playWarningBeep(isMuted);
          }
          return prev - 1;
        }
        clearInterval(timer);
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, phase, isMuted]);

  // Transición limpia cuando timeLeft llega a 0
  useEffect(() => {
    if (timeLeft === 0 && (phase === 'prep' || phase === 'work' || phase === 'rest')) {
      const timeout = setTimeout(() => {
        nextPhase();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [timeLeft, phase, nextPhase]);

  if (!isOpen) return null;

  const getPhaseColor = () => {
    switch (phase) {
      case 'prep':
        return 'var(--warning)';
      case 'work':
        return 'var(--secondary, #00d26a)';
      case 'rest':
        return 'var(--secondary)';
      case 'finished':
        return 'var(--success)';
      default:
        return 'var(--text-main)';
    }
  };

  const getPhaseTitle = () => {
    switch (phase) {
      case 'prep':
        return '¡PREPARATE!';
      case 'work':
        return '¡A TRABAJAR!';
      case 'rest':
        return 'DESCANSO';
      case 'finished':
        return '¡SERIES COMPLETADAS!';
      default:
        return 'Configuración';
    }
  };

  return (
    <div
      className="routine-modal-backdrop"
      style={{ zIndex: 120, background: 'rgba(0, 0, 0, 0.85)' }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="routine-modal-card"
        style={{
          maxWidth: '520px',
          border: `2px solid ${phase !== 'setup' ? getPhaseColor() : 'var(--border)'}`,
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div className="routine-modal-header">
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Temporizador de Intervalos
            </span>
            <h3 className="routine-modal-title">{exerciseName}</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="routine-modal-close-btn"
              onClick={() => setIsMuted((prev) => !prev)}
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              type="button"
              className="routine-modal-close-btn"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="routine-modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
          {phase === 'setup' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Duración de trabajo por serie
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={workSeconds}
                    onChange={(e) => setWorkSeconds(Math.max(5, parseInt(e.target.value) || 0))}
                    style={{
                      width: '100px',
                      fontSize: '1.75rem',
                      fontWeight: 900,
                      textAlign: 'center',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      color: 'var(--text-main)',
                      padding: '0.4rem',
                    }}
                  />
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                    segundos
                  </span>
                </div>
              </div>

              <div>
                <p style={{ margin: '0 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Descanso entre series
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {REST_OPTIONS.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setRestSeconds(sec)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        border:
                          restSeconds === sec
                            ? '2px solid var(--secondary)'
                            : '1px solid var(--border)',
                        background: restSeconds === sec ? 'var(--success-bg)' : 'var(--bg-subtle)',
                        color: restSeconds === sec ? 'var(--secondary)' : 'var(--text-main)',
                      }}
                    >
                      {sec} s
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{ background: 'var(--bg-subtle)', padding: '0.85rem', borderRadius: '12px' }}
              >
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>
                  {totalSets} series totales · cada serie completada se tilda automáticamente
                </span>
              </div>
            </div>
          ) : phase === 'finished' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 0',
              }}
            >
              <CheckCircle2 size={64} style={{ color: 'var(--success)' }} />
              <h2
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  margin: 0,
                  color: 'var(--text-main)',
                }}
              >
                ¡Ejercicio finalizado!
              </h2>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                Completaste las {totalSets} series de {workSeconds} s.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: getPhaseColor(),
                  textTransform: 'uppercase',
                }}
              >
                {getPhaseTitle()}
              </span>

              {/* Contador Gigante */}
              <div
                style={{
                  fontSize: '5.5rem',
                  fontWeight: 950,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                  color: getPhaseColor(),
                  margin: '0.5rem 0',
                }}
              >
                {timeLeft}
                <span style={{ fontSize: '2rem', fontWeight: 800, marginLeft: '0.25rem' }}>s</span>
              </div>

              {/* Indicador de Ronda */}
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Serie {currentRound} de {totalSets}
              </span>

              {isPaused && (
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--warning-text)',
                    background: 'var(--warning-bg)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                  }}
                >
                  En pausa
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer con Controles */}
        <div
          className="routine-modal-footer"
          style={{ justifyContent: 'center', gap: '0.75rem', padding: '1.25rem' }}
        >
          {phase === 'setup' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStart}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '1.05rem',
                fontWeight: 800,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Play size={18} />
              <span>Iniciar Temporizador</span>
            </button>
          ) : phase === 'finished' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{ width: '100%', padding: '0.8rem', fontWeight: 800 }}
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsPaused((prev) => !prev)}
                style={{
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontWeight: 800,
                }}
              >
                {isPaused ? <Play size={16} /> : <Pause size={16} />}
                <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={nextPhase}
                title="Saltear fase actual"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
              >
                <SkipForward size={16} />
                <span>Saltear</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
                title="Reiniciar temporizador"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RotateCcw size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

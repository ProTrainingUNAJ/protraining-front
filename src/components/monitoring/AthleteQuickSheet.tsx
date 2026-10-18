import React, { useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Moon,
  Activity,
  MessageSquare,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { AthleteTrafficLightItem } from './trafficLight.types';
import { AthleteBodyPainMap } from './AthleteBodyPainMap';

interface AthleteQuickSheetProps {
  athlete: AthleteTrafficLightItem | null;
  onClose: () => void;
  onAssignDifferentiated?: (athleteId: string) => void;
}

export const AthleteQuickSheet: React.FC<AthleteQuickSheetProps> = ({
  athlete,
  onClose,
  onAssignDifferentiated,
}) => {
  // Close with Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!athlete) return null;

  const initials = athlete.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isRed = athlete.status === 'red';
  const isYellow = athlete.status === 'yellow';
  const isGreen = athlete.status === 'green';

  const statusBorderColor = isRed
    ? 'var(--traffic-red-border)'
    : isYellow
      ? 'var(--traffic-yellow-border)'
      : isGreen
        ? 'var(--traffic-green-border)'
        : 'var(--traffic-gray-border)';

  const statusBgColor = isRed
    ? 'var(--traffic-red-bg)'
    : isYellow
      ? 'var(--traffic-yellow-bg)'
      : isGreen
        ? 'var(--traffic-green-bg)'
        : 'var(--traffic-gray-bg)';

  const statusTextColor = isRed
    ? 'var(--traffic-red-text)'
    : isYellow
      ? 'var(--traffic-yellow-text)'
      : isGreen
        ? 'var(--traffic-green-text)'
        : 'var(--traffic-gray-text)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--routine-modal-overlay)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-end', // Bottom sheet on mobile
        justifyContent: 'center',
        padding: 0,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-sheet-title"
    >
      <div
        className="card athlete-quick-sheet-card"
        style={{
          margin: 0,
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          overflowY: 'auto',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Sheet */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Avatar con anillo */}
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: `3px solid ${statusBorderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                background: 'var(--bg-subtle)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div>
              <h3
                id="quick-sheet-title"
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                }}
              >
                {athlete.name}
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {athlete.position} · {athlete.category}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '8px',
            }}
            aria-label="Cerrar ficha"
          >
            <X size={20} />
          </button>
        </div>

        {/* Diagnóstico del Semáforo */}
        <div
          style={{
            background: statusBgColor,
            border: `1px solid ${statusBorderColor}`,
            borderRadius: '14px',
            padding: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.4rem',
            }}
          >
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: statusTextColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {isRed && <ShieldAlert size={16} />}
              {isYellow && <AlertTriangle size={16} />}
              {isGreen && <CheckCircle2 size={16} />}
              Estado: {athlete.statusLabel}
            </span>

            {athlete.submittedAt && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Enviado {athlete.submittedAt}
              </span>
            )}
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              lineHeight: 1.35,
            }}
          >
            {athlete.recommendation}
          </p>
        </div>

        {/* Desglose de Parámetros de Check-in */}
        {athlete.status !== 'gray' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Visual Anatomical Human Body Map (inherited from athlete check-in) */}
            <AthleteBodyPainMap pains={athlete.pains} athleteName={athlete.name} />

            {/* Sueño y RPE */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-subtle)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '0.2rem',
                  }}
                >
                  <Moon size={14} style={{ color: 'var(--secondary)' }} /> Sueño y Descanso
                </div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {athlete.sleepHours ? `${athlete.sleepHours} hrs` : '—'}
                </strong>
                <small
                  style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                >
                  Calidad: {athlete.sleepQuality || 'Normal'}
                </small>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  background: 'var(--bg-subtle)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '0.2rem',
                  }}
                >
                  <Activity size={14} style={{ color: 'var(--stat-cyan)' }} /> RPE / Fatiga
                </div>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {athlete.rpe ? `${athlete.rpe} / 10` : '—'}
                </strong>
                <small
                  style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}
                >
                  {athlete.rpe && athlete.rpe >= 8 ? 'Sobrecarga alta' : 'Carga moderada'}
                </small>
              </div>
            </div>

            {/* Observaciones del Atleta */}
            {athlete.notes && (
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '0.3rem',
                  }}
                >
                  <MessageSquare size={13} /> Observación del Atleta:
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    fontStyle: 'italic',
                    lineHeight: 1.35,
                  }}
                >
                  "{athlete.notes}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              background: 'var(--bg-subtle)',
              borderRadius: '14px',
              border: '1px dashed var(--border)',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Este atleta aún no ha completado el formulario de check-in del día.
            </p>
          </div>
        )}

        {/* Acciones del Preparador Físico */}
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border)',
          }}
        >
          {isRed || isYellow ? (
            <button
              type="button"
              className="btn btn-warning"
              onClick={() => {
                onAssignDifferentiated?.(athlete.id);
                onClose();
              }}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              Asignar Plan Diferenciado
            </button>
          ) : null}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/**
 * Progreso de check-in del día (KAN-366).
 *
 * Recibe datos reales desde DashboardPage: `total` = atletas del semáforo y
 * `completed` = total menos los pendientes (estado gris "Sin Check-in").
 * Sin mocks ni hora límite fija: el conteo se recalcula con cada respuesta del
 * endpoint traffic-light-today. Estados: cargando, vacío (sin check-ins) y
 * progreso. Colores vía tokens de `tokens.css` (--stat-green, --traffic-green,
 * --stat-green-glow) con soporte claro/oscuro automático; cero literales rgba/hex.
 */
interface CheckInProgressProps {
  completed: number;
  total: number;
  loading?: boolean;
  className?: string;
}

export const CheckInProgressWidget: React.FC<CheckInProgressProps> = ({
  completed,
  total,
  loading = false,
  className = '',
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pending = total - completed;

  return (
    <div
      className={`checkin-progress-widget ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '1.15rem',
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
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <CheckCircle2 size={14} style={{ color: 'var(--stat-green)' }} />
          Check-in
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
          }}
        >
          {loading ? 'Cargando…' : 'Hoy'}
        </span>
      </div>

      {loading ? (
        <p
          style={{
            margin: '0 auto',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}
        >
          Consultando check-ins del día…
        </p>
      ) : total === 0 ? (
        <p
          style={{
            margin: '0 auto',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}
        >
          Sin check-ins registrados hoy
        </p>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '0.45rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
              <span
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                {completed}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                / {total} atletas
              </span>
            </div>

            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--stat-green)',
              }}
            >
              {percentage}%
            </span>
          </div>

          {/* Barra de progreso activa */}
          <div
            style={{
              width: '100%',
              height: '10px',
              background: 'var(--bg-subtle)',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                background:
                  'linear-gradient(90deg, var(--traffic-green) 0%, var(--stat-green) 100%)',
                borderRadius: '9999px',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: 'var(--stat-green-glow)',
              }}
            />
          </div>
        </div>
      )}

      {!loading && total > 0 && (
        <p
          style={{
            margin: '0.5rem 0 0',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
          }}
        >
          {pending > 0
            ? `${pending} atletas pendientes de check-in`
            : 'Plantel completo completó el check-in'}
        </p>
      )}
    </div>
  );
};

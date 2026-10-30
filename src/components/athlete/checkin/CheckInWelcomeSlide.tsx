import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface CheckInWelcomeSlideProps {
  onStart: () => void;
}

export const CheckInWelcomeSlide: React.FC<CheckInWelcomeSlideProps> = ({ onStart }) => {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '580px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3rem 1.5rem 2rem',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Espacio superior para balancear el contenido centrado */}
      <div style={{ height: '10px' }} aria-hidden="true" />

      {/* ── Bloque Central: Check-in diario + Botón Iniciar ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          margin: 'auto 0',
        }}
      >
        <h1
          style={{
            fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
            fontSize: '3.8rem',
            fontWeight: 900,
            color: 'var(--checkin-title-color)',
            lineHeight: 1,
            margin: 0,
            letterSpacing: '-0.035em',
          }}
        >
          Check-in
        </h1>

        <span
          style={{
            fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
            fontSize: '2.4rem',
            fontWeight: 300,
            color: 'var(--checkin-title-color)',
            lineHeight: 1.15,
            margin: '0.35rem 0 2.25rem',
            letterSpacing: '-0.02em',
          }}
        >
          diario
        </span>

        <button
          type="button"
          onClick={onStart}
          style={{
            background: 'var(--checkin-next-btn-bg)',
            color: 'var(--checkin-next-btn-color)',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.8rem 2.8rem',
            fontSize: '1.05rem',
            fontWeight: 700,
            fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.65rem',
            boxShadow: '0 8px 24px rgba(8, 37, 74, 0.25)',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(8, 37, 74, 0.32)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(8, 37, 74, 0.25)';
          }}
        >
          <span>Iniciar</span>
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Pie de tarjeta inferior ── */}
      <p
        style={{
          fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
          fontSize: '0.96rem',
          color: 'var(--checkin-subtitle-color)',
          textAlign: 'center',
          margin: 0,
          fontWeight: 500,
          letterSpacing: '-0.01em',
        }}
      >
        ¿Listo para entrenar? Completá tu registro
      </p>
    </div>
  );
};

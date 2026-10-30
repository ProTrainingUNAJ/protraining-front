import React from 'react';
import { Moon, Sparkles } from 'lucide-react';
import { SleepWheelDial } from './SleepWheelDial';

export interface CheckInSleepSlideProps {
  sleepHours: number;
  onSleepHoursChange: (val: number) => void;
  sleepQuality: number;
  onSleepQualityChange: (val: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

const QUALITY_OPTIONS = [
  { value: 1, label: 'Pésima', icon: '🌑', desc: 'Despertares continuos, sin descanso' },
  { value: 2, label: 'Mala', icon: '🌘', desc: 'Sueño ligero e incompleto' },
  { value: 3, label: 'Regular', icon: '🌗', desc: 'Descanso intermedio' },
  { value: 4, label: 'Buena', icon: '🌖', desc: 'Sueño reparador continuo' },
  { value: 5, label: 'Excelente', icon: '🌕', desc: 'Profundo y revitalizante' },
];

export const CheckInSleepSlide: React.FC<CheckInSleepSlideProps> = ({
  sleepHours,
  onSleepHoursChange,
  sleepQuality,
  onSleepQualityChange,
  onPrev,
  onNext,
}) => {
  const currentQuality =
    QUALITY_OPTIONS.find((q) => q.value === sleepQuality) || QUALITY_OPTIONS[3];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="pixel-slide-card">
        {/* Título en Montserrat negrita azul marino */}
        <h1 className="pixel-slide-title">
          ¿Cómo descansaste
          <br />
          anoche?
        </h1>

        {/* Subtítulo en Montserrat azul */}
        <p className="pixel-slide-subtitle">
          Dormiste {sleepHours} horas · Calidad {currentQuality.label.toLowerCase()}.
        </p>

        {/* Burbuja Central Flotante (76px, matching Step 1) */}
        <div
          className="pixel-bubble-hero"
          style={{
            background: '#3B49DF',
            boxShadow: '0 8px 24px rgba(59, 73, 223, 0.35)',
            color: '#FFFFFF',
          }}
          aria-hidden="true"
        >
          <Moon size={36} fill="#FFD166" color="#FFD166" />
        </div>

        {/* Trazos curvos decorativos (︵ ︵) */}
        <div className="pixel-bubble-waves" aria-hidden="true">
          <svg width="22" height="13" viewBox="0 0 22 13" fill="none">
            <path d="M 3 4 Q 11 9 19 4" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M 3 9 Q 11 14 19 9" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Sección 1: Selector y Dial de Horas de Sueño */}
        <div
          style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <SleepWheelDial
            value={sleepHours}
            onChange={onSleepHoursChange}
            showTitle={false}
            showBadge={false}
          />
        </div>

        {/* Sección 2: Selector de Calidad del Sueño */}
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            paddingTop: '1.25rem',
            marginTop: '1rem',
            borderTop: '1px solid rgba(0, 0, 0, 0.07)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#08254A',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <Sparkles size={16} style={{ color: '#F59E0B' }} />
              <span>Calidad del descanso</span>
            </label>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '0.2rem 0.75rem',
                borderRadius: '9999px',
                background: '#EEF2FF',
                color: '#3B49DF',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {currentQuality.value} · {currentQuality.label}
            </span>
          </div>

          {/* 5 Opciones de Calidad */}
          <div
            className="checkin-segmented-scale"
            role="radiogroup"
            aria-label="Calidad del descanso"
          >
            {QUALITY_OPTIONS.map((opt) => {
              const isSelected = opt.value === sleepQuality;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`checkin-scale-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSleepQualityChange(opt.value)}
                  style={{
                    borderColor: isSelected ? '#3B49DF' : 'rgba(0, 0, 0, 0.08)',
                    background: isSelected ? '#EEF2FF' : '#F8FAFC',
                    color: isSelected ? '#3B49DF' : '#08254A',
                    borderRadius: '16px',
                    fontWeight: 700,
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${opt.value} - ${opt.label}: ${opt.desc}`}
                >
                  <span
                    style={{ fontSize: '1.25rem', lineHeight: 1 }}
                    role="img"
                    aria-hidden="true"
                  >
                    {opt.icon}
                  </span>
                  <span className="checkin-scale-num" style={{ fontSize: '0.82rem' }}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '0.8rem',
              color: '#64748B',
              textAlign: 'center',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {currentQuality.desc}
          </p>
        </div>
      </div>

      {/* Barra de Navegación: Atrás y Siguiente */}
      <div className="pixel-nav-bar">
        <button type="button" className="pixel-btn-prev" onClick={onPrev}>
          <span>← Atrás</span>
        </button>
        <button type="button" className="pixel-btn-next" onClick={onNext}>
          <span>Siguiente</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};

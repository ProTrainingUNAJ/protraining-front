import React from 'react';
import { Zap, ShieldAlert } from 'lucide-react';

export interface CheckInFatigueMuscleSlideProps {
  fatigueLevel: number;
  onFatigueChange: (val: number) => void;
  muscleSoreness: number;
  onSorenessChange: (val: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

const FATIGUE_OPTIONS = [
  { value: 1, label: 'Enérgico', icon: '⚡', desc: 'Batería 100% · Al máximo', color: '#10B981' },
  { value: 2, label: 'Fresco', icon: '🔋', desc: 'Batería 80% · Óptima energía', color: '#22C55E' },
  {
    value: 3,
    label: 'Moderada',
    icon: '🔋',
    desc: 'Batería 50% · Cansancio común',
    color: '#F59E0B',
  },
  { value: 4, label: 'Alta', icon: '🪫', desc: 'Batería 25% · Fatiga pesada', color: '#F97316' },
  { value: 5, label: 'Agotado', icon: '⚠️', desc: 'Batería 5% · Sin energía', color: '#EF4444' },
];

const SORENESS_OPTIONS = [
  {
    value: 1,
    label: 'Sin dolor',
    icon: '🛡️',
    desc: 'Músculos sueltos y descansados',
    color: '#10B981',
  },
  { value: 2, label: 'Leve', icon: '🧘', desc: 'Tirantez muscular suave', color: '#22C55E' },
  { value: 3, label: 'Molestia', icon: '🏋️', desc: 'Agujetas o carga moderada', color: '#F59E0B' },
  { value: 4, label: 'Fuerte', icon: '⚡', desc: 'Músculos muy adoloridos', color: '#F97316' },
  { value: 5, label: 'Severo', icon: '🚨', desc: 'Rigidez muscular extrema', color: '#EF4444' },
];

export const CheckInFatigueMuscleSlide: React.FC<CheckInFatigueMuscleSlideProps> = ({
  fatigueLevel,
  onFatigueChange,
  muscleSoreness,
  onSorenessChange,
  onPrev,
  onNext,
}) => {
  const currentFatigue =
    FATIGUE_OPTIONS.find((f) => f.value === fatigueLevel) || FATIGUE_OPTIONS[1];
  const currentSoreness =
    SORENESS_OPTIONS.find((s) => s.value === muscleSoreness) || SORENESS_OPTIONS[0];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="pixel-slide-card">
        {/* Título en Montserrat negrita azul marino */}
        <h1 className="pixel-slide-title">
          ¿Cómo está tu energía
          <br />
          hoy?
        </h1>

        {/* Subtítulo en Montserrat azul */}
        <p className="pixel-slide-subtitle">
          Fatiga: {currentFatigue.label.toLowerCase()} · Músculos:{' '}
          {currentSoreness.label.toLowerCase()}.
        </p>

        {/* Burbuja Central Flotante (76px, matching Step 1) */}
        <div
          className="pixel-bubble-hero"
          style={{
            background: currentFatigue.color,
            boxShadow: `0 8px 24px ${currentFatigue.color}45`,
            color: '#FFFFFF',
          }}
          aria-hidden="true"
        >
          <Zap size={36} fill="#FFFFFF" color="#FFFFFF" />
        </div>

        {/* Trazos curvos decorativos (︵ ︵) */}
        <div className="pixel-bubble-waves" aria-hidden="true">
          <svg width="22" height="13" viewBox="0 0 22 13" fill="none">
            <path d="M 3 4 Q 11 9 19 4" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
            <path d="M 3 9 Q 11 14 19 9" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Sección 1: Nivel de Fatiga Física General */}
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            marginBottom: '1.25rem',
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
              <Zap size={16} style={{ color: currentFatigue.color }} />
              <span>Nivel de fatiga física general</span>
            </label>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '0.2rem 0.75rem',
                borderRadius: '9999px',
                background: `${currentFatigue.color}15`,
                color: currentFatigue.color,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {currentFatigue.value} · {currentFatigue.label}
            </span>
          </div>

          <div className="checkin-segmented-scale" role="radiogroup" aria-label="Nivel de fatiga">
            {FATIGUE_OPTIONS.map((opt) => {
              const isSelected = opt.value === fatigueLevel;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`checkin-scale-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onFatigueChange(opt.value)}
                  style={{
                    borderColor: isSelected ? opt.color : 'rgba(0, 0, 0, 0.08)',
                    background: isSelected ? `${opt.color}18` : '#F8FAFC',
                    color: isSelected ? opt.color : '#08254A',
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
                    {opt.value}
                  </span>
                  <span className="checkin-scale-tag" style={{ fontSize: '0.7rem' }}>
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
            {currentFatigue.desc}
          </p>
        </div>

        {/* Sección 2: Agujetas Musculares (DOMS) */}
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            paddingTop: '1.25rem',
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
              <ShieldAlert size={16} style={{ color: currentSoreness.color }} />
              <span>Sensación muscular (DOMS)</span>
            </label>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '0.2rem 0.75rem',
                borderRadius: '9999px',
                background: `${currentSoreness.color}15`,
                color: currentSoreness.color,
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {currentSoreness.value} · {currentSoreness.label}
            </span>
          </div>

          <div
            className="checkin-segmented-scale"
            role="radiogroup"
            aria-label="Estado muscular general"
          >
            {SORENESS_OPTIONS.map((opt) => {
              const isSelected = opt.value === muscleSoreness;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`checkin-scale-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSorenessChange(opt.value)}
                  style={{
                    borderColor: isSelected ? opt.color : 'rgba(0, 0, 0, 0.08)',
                    background: isSelected ? `${opt.color}18` : '#F8FAFC',
                    color: isSelected ? opt.color : '#08254A',
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
                    {opt.value}
                  </span>
                  <span className="checkin-scale-tag" style={{ fontSize: '0.7rem' }}>
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
            {currentSoreness.desc}
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

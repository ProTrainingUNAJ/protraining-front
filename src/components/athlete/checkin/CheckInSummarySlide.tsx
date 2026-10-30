import React from 'react';
import {
  Moon,
  Zap,
  Activity,
  HeartPulse,
  MessageSquare,
  Send,
  RefreshCw,
  Edit2,
  Check,
} from 'lucide-react';
import { PROTRAINING_MUSCLES, PAIN_LEVELS, getPainColor } from '../bodyMuscleData';
import { getFatigueLabel, getSorenessLabel, getSleepHoursLabel } from './checkInHelper';

export interface CheckInSummarySlideProps {
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigueLevel: number | null;
  muscleSoreness: number | null;
  moodRate: number;
  stressLevel: number;
  isSick: boolean;
  hasActiveInjury: boolean;
  musclePains: Record<string, number>;
  notes: string;
  onNotesChange: (val: string) => void;
  onEditStep: (step: number) => void;
  onPrev: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

// ── Paleta exacta compartida con Paso 2 (Recuperación) ──
const COLOR_SCALE = {
  brown: '#6D381E', // Peor / Crítico
  orange: '#FF6B00', // Alerta alta
  yellow: '#FFB703', // Regular / Moderado
  green: '#00A859', // Favorable / Bueno
  violet: '#8E24AA', // Óptimo / Excelente
};

const getSleepColor = (hours: number): string => {
  if (hours <= 3) return COLOR_SCALE.brown; // 0 a 3 hs: MARRON
  if (hours === 4) return COLOR_SCALE.orange; // 4 hs: NARANJA
  if (hours === 5) return COLOR_SCALE.yellow; // 5 hs: AMARILLO
  if (hours <= 7) return COLOR_SCALE.green; // 6 a 7 hs: VERDE
  return COLOR_SCALE.violet; // 8 a 12 hs: VIOLETA
};

const getFatigueColor = (fatigue: number): string => {
  switch (fatigue) {
    case 1:
      return COLOR_SCALE.violet; // Fresco / Enérgico - Mejor
    case 2:
      return COLOR_SCALE.green; // Ligera
    case 3:
      return COLOR_SCALE.yellow; // Moderada
    case 4:
      return COLOR_SCALE.orange; // Alta fatiga
    case 5:
      return COLOR_SCALE.brown; // Agotado - Peor
    default:
      return COLOR_SCALE.orange;
  }
};

const getSorenessColor = (soreness: number): string => {
  switch (soreness) {
    case 1:
      return COLOR_SCALE.violet; // Sin dolor -> Violeta
    case 2:
      return COLOR_SCALE.green; // Leve -> Verde
    case 3:
      return COLOR_SCALE.yellow; // Molestia -> Amarillo
    case 4:
      return COLOR_SCALE.orange; // Fuerte -> Naranja
    case 5:
      return COLOR_SCALE.brown; // Muy intenso -> Marrón
    default:
      return COLOR_SCALE.violet;
  }
};

// ── Configuración exacta de caras y colores del Paso 1 (Ánimo) ──
const MOOD_CONFIGS: Record<
  number,
  { color: string; label: string; eyeType: 'sad' | 'worried' | 'neutral' | 'happy' | 'star' }
> = {
  1: { color: '#5D2517', label: 'Desanimado', eyeType: 'sad' },
  2: { color: '#F05A22', label: 'Regular', eyeType: 'worried' },
  3: { color: '#FFAE19', label: 'Neutral', eyeType: 'neutral' },
  4: { color: '#2CA049', label: 'Motivado', eyeType: 'happy' },
  5: { color: '#9B26B6', label: 'Excelente', eyeType: 'star' },
};

// Renderizado vectorial de la cara exacta de ánimo seleccionada en Paso 1
const renderMoodFace = (eyeType: 'sad' | 'worried' | 'neutral' | 'happy' | 'star', size = 32) => (
  <svg
    viewBox="0 0 60 60"
    width={size}
    height={size}
    style={{ display: 'block', overflow: 'visible' }}
  >
    {eyeType === 'sad' ? (
      <>
        <path
          d="M 15 17 Q 21 21 27 21"
          stroke="#2B1408"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 45 17 Q 39 21 33 21"
          stroke="#2B1408"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="21" cy="25" r="2.8" fill="#2B1408" />
        <circle cx="39" cy="25" r="2.8" fill="#2B1408" />
        <path
          d="M 19 43 Q 30 31 41 43"
          fill="none"
          stroke="#2B1408"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
        <path
          d="M 21 27 C 19 29.5, 18.2 31.5, 18.6 33.5 C 19 35.5, 23 35.5, 23.4 33.5 C 23.8 31.5, 23 29.5, 21 27 Z"
          fill="#38BDF8"
        />
      </>
    ) : eyeType === 'worried' ? (
      <>
        <rect x="20" y="18" width="5.2" height="13" rx="2.6" fill="#2B1408" />
        <rect x="35" y="18" width="5.2" height="13" rx="2.6" fill="#2B1408" />
        <path
          d="M 19 41 Q 30 33 41 41"
          fill="none"
          stroke="#2B1408"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
      </>
    ) : eyeType === 'neutral' ? (
      <>
        <rect x="20" y="18" width="5.2" height="14" rx="2.6" fill="#2B1408" />
        <rect x="35" y="18" width="5.2" height="14" rx="2.6" fill="#2B1408" />
        <line
          x1="18"
          y1="39"
          x2="42"
          y2="39"
          stroke="#2B1408"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
      </>
    ) : eyeType === 'happy' ? (
      <>
        <path
          d="M 17 24 Q 22 15 28 24"
          stroke="#2B1408"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 32 24 Q 38 15 43 24"
          stroke="#2B1408"
          strokeWidth="3.6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 19 36 Q 30 48 41 36"
          fill="none"
          stroke="#2B1408"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
      </>
    ) : (
      <>
        <g transform="translate(21, 21)">
          <polygon
            points="0,-7.5 2.2,-2.3 7.5,-2.3 3.2,0.8 4.8,5.8 0,2.3 -4.8,5.8 -3.2,0.8 -7.5,-2.3 -2.2,-2.3"
            fill="#2B1408"
          />
        </g>
        <g transform="translate(39, 21)">
          <polygon
            points="0,-7.5 2.2,-2.3 7.5,-2.3 3.2,0.8 4.8,5.8 0,2.3 -4.8,5.8 -3.2,0.8 -7.5,-2.3 -2.2,-2.3"
            fill="#2B1408"
          />
        </g>
        <path
          d="M 18 36 Q 30 50 42 36"
          fill="none"
          stroke="#2B1408"
          strokeWidth="4.6"
          strokeLinecap="round"
        />
      </>
    )}
  </svg>
);

// Render del ícono de bíceps flexionado (Paso 2)
const renderBicepsMuscle = (size = 22, fill = '#FFFFFF') => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <path
      d="M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1"
      fill={fill}
    />
    <path d="M15 14a5 5 0 0 0-7.584 2" stroke="rgba(0,0,0,0.25)" strokeWidth="1.8" />
    <path d="M9.964 6.825C8.019 7.977 9.5 13 8 15" stroke="rgba(0,0,0,0.25)" strokeWidth="1.8" />
  </svg>
);

export const CheckInSummarySlide: React.FC<CheckInSummarySlideProps> = ({
  sleepHours,
  fatigueLevel,
  muscleSoreness,
  moodRate,
  isSick,
  hasActiveInjury,
  musclePains,
  notes,
  onNotesChange,
  onEditStep,
  onPrev,
  onSubmit,
  isSubmitting,
}) => {
  const reportedPains = Object.entries(musclePains).filter(([, lvl]) => lvl > 0);
  const reportedCount = reportedPains.length;

  const activeMood = MOOD_CONFIGS[moodRate] || MOOD_CONFIGS[3];

  const getHealthInjurySummary = () => {
    if (!isSick && !hasActiveInjury) return 'Salud normal · Sin lesión';
    if (isSick && !hasActiveInjury) return 'Con síntomas de enfermedad';
    if (!isSick && hasActiveInjury) return 'Lesión activa reportada';
    return 'Con síntomas y lesión activa';
  };

  // Colores calculados exactamente según las selecciones de Paso 2
  const sleepColor = getSleepColor(sleepHours ?? 7.5);
  const fatigueColor = getFatigueColor(fatigueLevel ?? 2);
  const sorenessColor = getSorenessColor(muscleSoreness ?? 1);
  const painZonesColor = reportedCount > 0 ? '#FF6B00' : '#00A859';
  const healthInjuryColor = isSick || hasActiveInjury ? '#DC2626' : '#00A859';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <form
        onSubmit={onSubmit}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <div
          className="pixel-slide-card"
          style={{
            width: '100%',
            maxWidth: '820px',
            height: 'auto',
            minHeight: 'auto',
            background: 'var(--checkin-card-bg)',
            borderRadius: '28px',
            border: '1.5px solid var(--checkin-card-border)',
            boxShadow: 'var(--checkin-card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'visible',
            transition: 'background-color 0.25s ease, border-color 0.25s ease',
          }}
        >
          {/* ── Cabecera Superior con Botón Circular Atrás a la altura del Título ── */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.35rem',
              position: 'relative',
            }}
          >
            {onPrev ? (
              <button
                type="button"
                onClick={onPrev}
                aria-label="Volver atrás"
                className="checkin-circular-nav-btn prev"
                title="Paso anterior"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            ) : (
              <div style={{ width: '40px', minWidth: '40px' }} />
            )}

            {/* Título en Montserrat negrita azul marino */}
            <h1 className="pixel-slide-title" style={{ margin: 0, flex: 1, textAlign: 'center' }}>
              Resumen de tu
              <br />
              Check-in
            </h1>

            {/* Botón Circular Enviar Check-in (Avioncito) */}
            <button
              type="submit"
              disabled={isSubmitting}
              aria-label="Enviar Check-in Diario"
              className="checkin-circular-nav-btn next"
              title="Enviar Check-in Diario"
            >
              {isSubmitting ? (
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send
                  size={18}
                  className="pixel-send-icon"
                  style={{ transform: 'translateX(-1px)' }}
                />
              )}
            </button>
          </div>

          {/* Subtítulo en Montserrat */}
          <p className="pixel-slide-subtitle">
            Revisá tus respuestas antes de enviar tu informe al cuerpo técnico.
          </p>

          {/* Burbuja Central Flotante (76px, matching Step 1 & Step 2) */}
          <div
            className="pixel-bubble-hero"
            style={{
              background: 'var(--checkin-next-btn-bg)',
              boxShadow: '0 8px 24px rgba(0, 119, 200, 0.35)',
              color: '#FFFFFF',
            }}
            aria-hidden="true"
          >
            <Check size={40} color="#FFFFFF" strokeWidth={3} />
          </div>

          {/* Trazos curvos decorativos (︵ ︵) */}
          <div className="pixel-bubble-waves" aria-hidden="true">
            <svg width="22" height="13" viewBox="0 0 22 13" fill="none">
              <path
                d="M 3 4 Q 11 9 19 4"
                stroke="var(--checkin-waves-stroke)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 3 9 Q 11 14 19 9"
                stroke="var(--checkin-waves-stroke)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* ── Panel Unificado de Métricas de Resumen en 2 Columnas Compactas ── */}
          <div className="checkin-summary-unified-grid">
            {/* 1. ÁNIMO — Paso 1 */}
            <div
              className="checkin-summary-item"
              onClick={() => onEditStep(1)}
              role="button"
              tabIndex={0}
              title="Editar estado de ánimo"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStep(1);
                }}
                className="checkin-summary-edit-btn"
                title="Editar estado de ánimo"
                aria-label="Editar estado de ánimo"
              >
                <Edit2 size={14} />
              </button>

              <div className="checkin-summary-item-content">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: activeMood.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 10px ${activeMood.color}40`,
                  }}
                >
                  {renderMoodFace(activeMood.eyeType, 26)}
                </div>

                <div className="checkin-summary-item-texts">
                  <span className="checkin-summary-item-label">Ánimo</span>
                  <strong className="checkin-summary-item-val">{activeMood.label}</strong>
                </div>
              </div>
            </div>

            {/* 2. DOLOR MUSCULAR — Paso 2 */}
            <div
              className="checkin-summary-item"
              onClick={() => onEditStep(2)}
              role="button"
              tabIndex={0}
              title="Editar dolor muscular"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStep(2);
                }}
                className="checkin-summary-edit-btn"
                title="Editar dolor muscular"
                aria-label="Editar dolor muscular"
              >
                <Edit2 size={14} />
              </button>

              <div className="checkin-summary-item-content">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: sorenessColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 10px ${sorenessColor}40`,
                  }}
                >
                  {renderBicepsMuscle(20, '#FFFFFF')}
                </div>

                <div className="checkin-summary-item-texts">
                  <span className="checkin-summary-item-label">Dolor muscular</span>
                  <strong className="checkin-summary-item-val">
                    {muscleSoreness !== null ? getSorenessLabel(muscleSoreness) : 'No registrado'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 3. SUEÑO — Paso 2 */}
            <div
              className="checkin-summary-item"
              onClick={() => onEditStep(2)}
              role="button"
              tabIndex={0}
              title="Editar sueño"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStep(2);
                }}
                className="checkin-summary-edit-btn"
                title="Editar sueño"
                aria-label="Editar sueño"
              >
                <Edit2 size={14} />
              </button>

              <div className="checkin-summary-item-content">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: sleepColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 10px ${sleepColor}40`,
                  }}
                >
                  <Moon size={20} color="#FFFFFF" fill="#FFFFFF" />
                </div>

                <div className="checkin-summary-item-texts">
                  <span className="checkin-summary-item-label">Sueño</span>
                  <strong className="checkin-summary-item-val">
                    {getSleepHoursLabel(sleepHours)}
                  </strong>
                </div>
              </div>
            </div>

            {/* 4. ZONAS CON DOLOR — Paso 3 */}
            <div
              className="checkin-summary-item"
              onClick={() => onEditStep(3)}
              role="button"
              tabIndex={0}
              title="Editar zonas con dolor"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStep(3);
                }}
                className="checkin-summary-edit-btn"
                title="Editar zonas con dolor"
                aria-label="Editar zonas con dolor"
              >
                <Edit2 size={14} />
              </button>

              <div className="checkin-summary-item-content">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: painZonesColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 10px ${painZonesColor}40`,
                  }}
                >
                  <Activity size={20} color="#FFFFFF" strokeWidth={2.4} />
                </div>

                <div className="checkin-summary-item-texts">
                  <span className="checkin-summary-item-label">Zonas con dolor</span>
                  <strong className="checkin-summary-item-val">
                    {reportedCount === 0
                      ? 'Sin zonas señaladas'
                      : `${reportedCount} zona(s) marcada(s)`}
                  </strong>
                </div>
              </div>
            </div>

            {/* 5. FATIGA FÍSICA — Paso 2 */}
            <div
              className="checkin-summary-item"
              onClick={() => onEditStep(2)}
              role="button"
              tabIndex={0}
              title="Editar fatiga física"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStep(2);
                }}
                className="checkin-summary-edit-btn"
                title="Editar fatiga física"
                aria-label="Editar fatiga física"
              >
                <Edit2 size={14} />
              </button>

              <div className="checkin-summary-item-content">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: fatigueColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 10px ${fatigueColor}40`,
                  }}
                >
                  <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
                </div>

                <div className="checkin-summary-item-texts">
                  <span className="checkin-summary-item-label">Fatiga física</span>
                  <strong className="checkin-summary-item-val">
                    {fatigueLevel !== null ? getFatigueLabel(fatigueLevel) : 'No registrado'}
                  </strong>
                </div>
              </div>
            </div>

            {/* 6. SALUD Y LESIÓN — Paso 3 */}
            <div
              className="checkin-summary-item"
              onClick={() => onEditStep(3)}
              role="button"
              tabIndex={0}
              title="Editar salud y lesión"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStep(3);
                }}
                className="checkin-summary-edit-btn"
                title="Editar salud y lesión"
                aria-label="Editar salud y lesión"
              >
                <Edit2 size={14} />
              </button>

              <div className="checkin-summary-item-content">
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: healthInjuryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: `0 4px 10px ${healthInjuryColor}40`,
                  }}
                >
                  <HeartPulse size={20} color="#FFFFFF" strokeWidth={2.4} />
                </div>

                <div className="checkin-summary-item-texts">
                  <span className="checkin-summary-item-label">Salud y Lesión</span>
                  <strong
                    className="checkin-summary-item-val"
                    style={{
                      color: isSick || hasActiveInjury ? '#EF4444' : '#10B981',
                    }}
                  >
                    {getHealthInjurySummary()}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle de Zonas de Dolor Reportadas (si hay) */}
          {reportedCount > 0 && (
            <div
              style={{
                width: '100%',
                maxWidth: '680px',
                marginBottom: '1.25rem',
                textAlign: 'left',
                boxSizing: 'border-box',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <div style={{ marginBottom: '0.45rem' }}>
                <span
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: 'var(--checkin-title-color)',
                  }}
                >
                  Detalle de molestias musculares ({reportedCount}):
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.84rem',
                  lineHeight: '1.5',
                  color: 'var(--checkin-title-color)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem 0.55rem',
                  alignItems: 'center',
                }}
              >
                {reportedPains.map(([mId, lvl], idx) => {
                  const m = PROTRAINING_MUSCLES.find((x) => x.id === mId);
                  const painInfo = PAIN_LEVELS.find((p) => p.level === lvl);
                  const isInjury = lvl === 6;
                  const painLabel = painInfo?.name || (isInjury ? 'Lesión' : `Nivel ${lvl}`);
                  const color = isInjury ? '#EF4444' : getPainColor(lvl);
                  return (
                    <span key={mId} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: color,
                          marginRight: '0.35rem',
                          flexShrink: 0,
                        }}
                      />
                      <strong>{m?.name || mId}:</strong>&nbsp;
                      <span style={{ color: isInjury ? '#EF4444' : color, fontWeight: 700 }}>
                        {painLabel}
                      </span>
                      {idx < reportedPains.length - 1 && <span>,</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observaciones adicionales (Opcional) */}
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <label
              htmlFor="checkin-notes-input"
              style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: 'var(--checkin-title-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <MessageSquare size={16} style={{ color: 'var(--checkin-title-color)' }} />
              <span>Observaciones adicionales para tu preparador físico (opcional):</span>
            </label>
            <textarea
              id="checkin-notes-input"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Ej: Me siento con un poco de molestia en la rodilla al subir escaleras..."
              rows={2}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '16px',
                border: '1.5px solid var(--checkin-input-border)',
                background: 'var(--checkin-input-bg)',
                fontSize: '0.88rem',
                fontFamily: 'Montserrat, sans-serif',
                color: 'var(--checkin-input-color)',
                boxSizing: 'border-box',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

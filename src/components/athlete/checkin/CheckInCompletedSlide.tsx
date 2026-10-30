import React, { useState } from 'react';
import {
  Moon,
  Zap,
  Activity,
  HeartPulse,
  MessageSquare,
  Edit2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CheckInSubmitResponse } from '../../../api/seguimientoService';
import { MuscleMapFront } from '../MuscleMapFront';
import { MuscleMapBack } from '../MuscleMapBack';
import { PROTRAINING_MUSCLES, PAIN_LEVELS, getPainColor } from '../bodyMuscleData';
import {
  getTrafficLightBadgeData,
  getFatigueLabel,
  getSorenessLabel,
  getSleepHoursLabel,
} from './checkInHelper';

export interface CheckInCompletedSlideProps {
  submissionResult: CheckInSubmitResponse;
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
  pushSupported?: boolean;
  pushSubscribed?: boolean;
  pushLoading?: boolean;
  pushFeedback?: string | null;
  onActivatePush?: () => void;
  onEditResponses: () => void;
}

// ── Paleta exacta compartida con Paso 2 (Recuperación) y Resumen ──
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

export const CheckInCompletedSlide: React.FC<CheckInCompletedSlideProps> = ({
  submissionResult,
  sleepHours,
  fatigueLevel,
  muscleSoreness,
  moodRate,
  isSick,
  hasActiveInjury,
  musclePains,
  notes,
  onEditResponses,
}) => {
  const [showBodyMap, setShowBodyMap] = useState(false);
  const badge = getTrafficLightBadgeData(submissionResult.trafficLight);

  const lightState = submissionResult.trafficLight || 'Green';
  const isRed = lightState === 'Red';
  const isYellow = lightState === 'Yellow';
  const isGreen = lightState === 'Green';

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
          padding: '2.25rem 1.75rem 2.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'visible',
          transition: 'background-color 0.25s ease, border-color 0.25s ease',
        }}
      >
        {/* ── Cabecera Superior con Botón Circular Editar Respuestas a la altura del Título ── */}
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
          {/* Botón Circular Editar Respuestas (Lápiz) */}
          <button
            type="button"
            onClick={onEditResponses}
            aria-label="Editar respuestas"
            className="checkin-circular-nav-btn prev"
            title="Editar respuestas"
          >
            <Edit2 size={18} />
          </button>

          {/* Título en Montserrat negrita azul marino */}
          <h1 className="pixel-slide-title" style={{ margin: 0, flex: 1, textAlign: 'center' }}>
            ¡Check-in
            <br />
            completado con éxito!
          </h1>

          <div style={{ width: '44px', minWidth: '44px' }} />
        </div>

        {/* Subtítulo en Montserrat */}
        <p className="pixel-slide-subtitle">
          {submissionResult.isOffline
            ? 'Tu check-in se guardó localmente. Se enviará en cuanto recuperes conexión.'
            : 'Tus sensaciones ya fueron calibradas para la planificación de tu cuerpo técnico.'}
        </p>

        {/* Semáforo Técnico Central: Luz encendida según estado */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '0.2rem auto 0.4rem',
          }}
        >
          <style>{`
            @keyframes trafficGlowRed {
              0%, 100% {
                box-shadow: 0 0 14px #EF4444, 0 0 24px rgba(239, 68, 68, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6);
              }
              50% {
                box-shadow: 0 0 20px #EF4444, 0 0 32px rgba(239, 68, 68, 0.85), inset 0 2px 4px rgba(255, 255, 255, 0.75);
              }
            }
            @keyframes trafficGlowYellow {
              0%, 100% {
                box-shadow: 0 0 14px #F59E0B, 0 0 24px rgba(245, 158, 11, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6);
              }
              50% {
                box-shadow: 0 0 20px #F59E0B, 0 0 32px rgba(245, 158, 11, 0.85), inset 0 2px 4px rgba(255, 255, 255, 0.75);
              }
            }
            @keyframes trafficGlowGreen {
              0%, 100% {
                box-shadow: 0 0 14px #10B981, 0 0 24px rgba(16, 185, 129, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6);
              }
              50% {
                box-shadow: 0 0 20px #10B981, 0 0 32px rgba(16, 185, 129, 0.85), inset 0 2px 4px rgba(255, 255, 255, 0.75);
              }
            }
          `}</style>

          {/* Carcasa del semáforo estilo cápsula moderna */}
          <div
            style={{
              width: '52px',
              height: '118px',
              borderRadius: '26px',
              background: 'linear-gradient(180deg, #1C222B 0%, #10141A 100%)',
              border: '2px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 0',
              boxSizing: 'border-box',
            }}
            role="img"
            aria-label={`Semáforo de estado: ${badge.label}`}
          >
            {/* Luz Roja (Arriba) */}
            <div
              style={{
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: isRed
                  ? '#EF4444'
                  : 'radial-gradient(circle at 35% 35%, #421414 0%, #1E0707 100%)',
                border: isRed ? '1.5px solid #FCA5A5' : '1.5px solid rgba(0, 0, 0, 0.6)',
                boxShadow: isRed
                  ? '0 0 14px #EF4444, 0 0 24px rgba(239, 68, 68, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                  : 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                opacity: isRed ? 1 : 0.35,
                animation: isRed ? 'trafficGlowRed 2.4s ease-in-out infinite' : 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
            >
              {isRed && (
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '5px',
                    width: '7px',
                    height: '3.5px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.85)',
                    transform: 'rotate(-30deg)',
                  }}
                />
              )}
            </div>

            {/* Luz Amarilla (Al medio) */}
            <div
              style={{
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: isYellow
                  ? '#F59E0B'
                  : 'radial-gradient(circle at 35% 35%, #42300B 0%, #1E1704 100%)',
                border: isYellow ? '1.5px solid #FDE68A' : '1.5px solid rgba(0, 0, 0, 0.6)',
                boxShadow: isYellow
                  ? '0 0 14px #F59E0B, 0 0 24px rgba(245, 158, 11, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                  : 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                opacity: isYellow ? 1 : 0.35,
                animation: isYellow ? 'trafficGlowYellow 2.4s ease-in-out infinite' : 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
            >
              {isYellow && (
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '5px',
                    width: '7px',
                    height: '3.5px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.85)',
                    transform: 'rotate(-30deg)',
                  }}
                />
              )}
            </div>

            {/* Luz Verde (Abajo) */}
            <div
              style={{
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: isGreen
                  ? '#10B981'
                  : 'radial-gradient(circle at 35% 35%, #0B3A23 0%, #031A0F 100%)',
                border: isGreen ? '1.5px solid #A7F3D0' : '1.5px solid rgba(0, 0, 0, 0.6)',
                boxShadow: isGreen
                  ? '0 0 14px #10B981, 0 0 24px rgba(16, 185, 129, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                  : 'inset 0 2px 4px rgba(0, 0, 0, 0.8)',
                opacity: isGreen ? 1 : 0.35,
                animation: isGreen ? 'trafficGlowGreen 2.4s ease-in-out infinite' : 'none',
                transition: 'all 0.3s ease',
                position: 'relative',
              }}
            >
              {isGreen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: '5px',
                    width: '7px',
                    height: '3.5px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.85)',
                    transform: 'rotate(-30deg)',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Trazos curvos decorativos (︵ ︵) */}
        <div className="pixel-bubble-waves" aria-hidden="true" style={{ marginBottom: '0.45rem' }}>
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

        {/* Texto Semáforo Técnico (sin burbuja) */}
        <div
          style={{
            margin: '0.15rem auto 0.85rem',
            fontWeight: 800,
            fontSize: '1.05rem',
            color: badge.color,
            fontFamily: 'Montserrat, system-ui, -apple-system, sans-serif',
            textAlign: 'center',
            letterSpacing: '-0.015em',
          }}
        >
          {badge.label}
        </div>

        {/* Diagnóstico de carga (si fue devuelto por el motor) */}
        {submissionResult.trafficLightReason && (
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              background: 'var(--checkin-subtle-box-bg)',
              border: '1.5px solid var(--checkin-subtle-box-border)',
              borderRadius: '16px',
              padding: '0.65rem 1rem',
              margin: '0 auto 0.85rem',
              textAlign: 'left',
              fontSize: '0.84rem',
              color: 'var(--checkin-title-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              boxSizing: 'border-box',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            <AlertTriangle size={17} style={{ color: badge.color, flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--checkin-title-color)', marginRight: '0.35rem' }}>
                Diagnóstico de carga:
              </strong>
              <span style={{ color: 'var(--checkin-subtitle-color)' }}>
                {submissionResult.trafficLightReason}
              </span>
            </div>
          </div>
        )}

        {/* ── Panel Unificado de Métricas de Resumen en 2 Columnas Compactas ── */}
        <div className="checkin-summary-unified-grid">
          {/* 1. ÁNIMO — Paso 1 */}
          <div className="checkin-summary-item checkin-summary-item--readonly">
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
          <div className="checkin-summary-item checkin-summary-item--readonly">
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
          <div className="checkin-summary-item checkin-summary-item--readonly">
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
          <div className="checkin-summary-item checkin-summary-item--readonly">
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
          <div className="checkin-summary-item checkin-summary-item--readonly">
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
          <div className="checkin-summary-item checkin-summary-item--readonly">
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
              marginBottom: '1.1rem',
              textAlign: 'left',
              boxSizing: 'border-box',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.45rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: 'var(--checkin-title-color)',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Detalle de molestias musculares ({reportedCount}):
              </span>
              <button
                type="button"
                onClick={() => setShowBodyMap(!showBodyMap)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: 0,
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                <span>{showBodyMap ? 'Ocultar silueta' : 'Ver en silueta'}</span>
                {showBodyMap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
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

            {/* Vista desplegable del mapa muscular anatómico */}
            {showBodyMap && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <div
                  style={{
                    flex: '1 1 200px',
                    maxWidth: '240px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <MuscleMapFront
                    selectedMuscles={[]}
                    musclePains={musclePains}
                    readOnly={true}
                    hideHeader={true}
                  />
                </div>
                <div
                  style={{
                    flex: '1 1 200px',
                    maxWidth: '240px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <MuscleMapBack
                    selectedMuscles={[]}
                    musclePains={musclePains}
                    readOnly={true}
                    hideHeader={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Observaciones adicionales (si existen) */}
        {notes && notes.trim().length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              marginBottom: '1.1rem',
              padding: '0.75rem 1.15rem',
              background: 'var(--checkin-subtle-box-bg)',
              border: '1.5px solid var(--checkin-subtle-box-border)',
              borderRadius: '16px',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                marginBottom: '0.25rem',
                color: 'var(--checkin-title-color)',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: '0.84rem' }}>Observaciones enviadas:</strong>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '0.84rem',
                color: 'var(--checkin-subtitle-color)',
                fontStyle: 'italic',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              "{notes}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

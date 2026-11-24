import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, AlertTriangle, ShieldCheck, Edit3, Scan, Activity } from 'lucide-react';
import { InteractiveMuscleMap } from '../InteractiveMuscleMap';
import {
  hasRequiredInjuryMark,
  hasUnscoredActiveInjuries,
  mapClinicalInjuriesToMusclePains,
} from './checkInHelper';
import { ActiveInjuriesModal, ActiveInjuryItem } from './ActiveInjuriesModal';
import { getMuscleSpanishName } from '../../../utils/exerciseMuscleMapper';

export interface CheckInPainSlideProps {
  musclePains: Record<string, number>;
  onPainChange: (muscleId: string, level: number) => void;
  onClearAll: () => void;
  isSick?: boolean;
  onSickChange?: (isSick: boolean) => void;
  hasActiveInjury?: boolean;
  onInjuryChange?: (hasInjury: boolean) => void;
  healthQuestionsAnswered?: boolean;
  onHealthQuestionsAnswered?: (answered: boolean) => void;
  activeInjuries?: ReadonlyArray<ActiveInjuryItem>;
  injuryScores?: Record<string, number | null>;
  onInjuryScoreChange?: (injuryId: string, score: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

type CartelStep = 'enfermo' | 'lesion' | 'desbloqueado';

export const CheckInPainSlide: React.FC<CheckInPainSlideProps> = ({
  musclePains,
  onPainChange,
  onClearAll,
  isSick = false,
  onSickChange,
  hasActiveInjury = false,
  onInjuryChange,
  healthQuestionsAnswered = false,
  onHealthQuestionsAnswered,
  activeInjuries,
  injuryScores = {},
  onInjuryScoreChange,
  onPrev,
  onNext,
}) => {
  // Estado del flujo de carteles preliminares: si ya se respondieron antes, inicia desbloqueado
  const [cartelStep, setCartelStep] = useState<CartelStep>(() => {
    return healthQuestionsAnswered ? 'desbloqueado' : 'enfermo';
  });
  const [showInjuryNotice, setShowInjuryNotice] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  // Modal de lesiones activas (Burbuja estilo Imagen 2). La apertura automática se deriva
  // en render; estos estados solo registran la apertura manual y si el usuario la cerró.
  const [showInjuriesModal, setShowInjuriesModal] = useState<boolean>(false);
  const [injuriesModalDismissed, setInjuriesModalDismissed] = useState<boolean>(false);
  const scanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  // Manejar respuesta del Cartel 1: ¿Te sentís enfermo?
  const handleAnswerSick = (value: boolean) => {
    onSickChange?.(value);
    setCartelStep('lesion');
  };

  // Manejar respuesta del Cartel 2: ¿Tenés una lesión?
  const handleAnswerInjury = (value: boolean) => {
    onInjuryChange?.(value);
    onHealthQuestionsAnswered?.(true);
    if (!value) {
      // Si el atleta indica que no tiene lesión, desmarcar cualquier músculo pintado como lesión (nivel 6)
      Object.entries(musclePains).forEach(([muscleId, lvl]) => {
        if (Number(lvl) === 6) {
          onPainChange(muscleId, 0);
        }
      });
    }
    setCartelStep('desbloqueado');
  };

  const isBlocked = cartelStep !== 'desbloqueado';
  const reportedPainsCount = Object.values(musclePains).filter((lvl) => lvl > 0).length;
  // el estado clínico se reconstruye desde la ficha, sin esperar al modal.
  const clinicalLesion = (activeInjuries?.length ?? 0) > 0;
  const lesionActive = hasActiveInjury ?? clinicalLesion;
  const missingScores = hasUnscoredActiveInjuries(activeInjuries ?? [], injuryScores);

  // KAN-660: Si hay lesiones reportadas y no están marcadas con nivel 6 en el mapa anatómico,
  // se marcan automáticamente en el cuerpo humano con negro (nivel 6).
  useEffect(() => {
    if (!activeInjuries || activeInjuries.length === 0) return;
    const hasInjuryLevel6 = Object.values(musclePains).some((lvl) => Number(lvl) === 6);
    if (!hasInjuryLevel6 && lesionActive) {
      const autoPains = mapClinicalInjuriesToMusclePains(activeInjuries);
      Object.entries(autoPains).forEach(([mId, lvl]) => {
        onPainChange(mId, lvl);
      });
    }
  }, [activeInjuries, lesionActive, musclePains, onPainChange]);

  // La ficha clínica puede llegar después del mount. Derivamos la apertura en render para
  // cubrir ese caso sin setState en un effect, y respetamos el cierre explícito del atleta.
  const openInjuriesModal = () => {
    setInjuriesModalDismissed(false);
    setShowInjuriesModal(true);
  };
  const closeInjuriesModal = () => {
    setShowInjuriesModal(false);
    setInjuriesModalDismissed(true);
  };
  const injuriesModalOpen =
    !isBlocked && !injuriesModalDismissed && (showInjuriesModal || clinicalLesion);

  const hasInjuryMark = hasRequiredInjuryMark(lesionActive, musclePains);
  const canProceed = hasInjuryMark && !missingScores;
  const nextBlockedReason = !hasInjuryMark
    ? 'Debés marcar la lesión en el cuerpo humano con color negro para poder avanzar.'
    : missingScores
      ? 'Debés puntuar el dolor (0 a 10) de cada lesión activa para continuar.'
      : 'Debés marcar la lesión para continuar.';

  const lesionChip = (
    <button
      type="button"
      onClick={() => setCartelStep('lesion')}
      className={`checkin-health-chip ${lesionActive ? 'danger' : 'healthy'}`}
      title="Modificar estado de lesión"
    >
      {lesionActive ? <AlertTriangle size={12} /> : null}
      <span>{lesionActive ? 'Lesión activa' : 'Sin lesión'}</span>
      <Edit3 size={10} style={{ opacity: 0.65, marginLeft: 2 }} />
    </button>
  );

  // mientras los carteles preliminares bloquean la tarjeta, la lesión de la ficha
  // clínica ya debe ser visible. Se muestra como datos (no como botón) para no saltear preguntas.
  const clinicalLesionChip = (
    <span
      className="checkin-health-chip danger"
      title="Lesión activa registrada en tu ficha clínica"
    >
      <AlertTriangle size={12} />
      <span>Lesión activa</span>
    </span>
  );

  // Efecto "Escáner Biométrico": barre de arriba hacia abajo sobre las siluetas
  // dejando un resplandor en los contornos por 1 segundo antes de avanzar
  const handleNextWithScan = () => {
    if (isScanning) return;
    if (!canProceed) {
      setShowInjuryNotice(true);
      setTimeout(() => setShowInjuryNotice(false), 2500);
      return;
    }

    setIsScanning(true);
    scanTimerRef.current = setTimeout(() => {
      setIsScanning(false);
      onNext();
    }, 2100);
  };

  return (
    <div
      className="checkin-slide-root"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* ── TARJETA PRINCIPAL DEL MENÚ 3 (ESTÁNDAR DE TAMAÑO) ── */}
      <div
        className="pixel-slide-card"
        style={{
          filter: isBlocked ? 'blur(4px)' : 'none',
          pointerEvents: isBlocked ? 'none' : 'auto',
          userSelect: isBlocked ? 'none' : 'auto',
        }}
      >
        {/* ── Cabecera Superior con Botones Circulares de Navegación a la altura del Título ── */}
        <div
          className="pixel-mood-nav-wrap"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.15rem',
            position: 'relative',
          }}
        >
          {/* Botón Circular Atrás (←) */}
          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              disabled={isScanning}
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

          {/* Título Central */}
          <h1
            className="pixel-slide-title"
            style={{
              fontWeight: 800,
              color: 'var(--checkin-title-color)',
              textAlign: 'center',
              letterSpacing: '-0.025em',
              flex: 1,
            }}
          >
            ¿Tenés molestias
            <br />
            musculares?
          </h1>

          {/* Botón Circular Siguiente (→) */}
          <button
            type="button"
            onClick={handleNextWithScan}
            disabled={!canProceed || isScanning}
            aria-disabled={!canProceed || isScanning}
            aria-label="Ir al siguiente paso"
            title={!canProceed ? nextBlockedReason : 'Siguiente paso'}
            className="checkin-circular-nav-btn next"
            style={{
              opacity: !canProceed || isScanning ? 0.45 : 1,
              cursor: !canProceed || isScanning ? 'not-allowed' : 'pointer',
            }}
          >
            {isScanning ? (
              <Scan size={18} className="biometric-hud-pulse" />
            ) : (
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
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        </div>

        {/* Zona scrolleable: el scroll queda acá para que los botones de la
            cabecera siempre queden visibles (KAN-595) */}
        <div className="checkin-card-scroll">
          {/* Alerta si intenta avanzar con lesión sin marcar */}
          {!canProceed && showInjuryNotice && (
            <div className="pixel-injury-alert" role="alert">
              <AlertTriangle size={15} />
              <span>{nextBlockedReason}</span>
            </div>
          )}

          {/* Barra de estado rápido ultra-compacta (1 sola línea, sin caja pesada) */}
          {!isBlocked && (
            <div className="checkin-health-bar">
              {/* Chip de Síntomas / Salud */}
              <button
                type="button"
                onClick={() => setCartelStep('enfermo')}
                className={`checkin-health-chip ${isSick ? 'danger' : 'healthy'}`}
                title="Modificar estado de salud"
              >
                {isSick ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                <span>{isSick ? 'Con síntomas' : 'Salud normal'}</span>
                <Edit3 size={10} style={{ opacity: 0.65, marginLeft: 2 }} />
              </button>

              {/* Chip de Lesión (incluye la lesión clínica activa aunque el flag local esté en false) */}
              {lesionChip}

              {/* Chip de Lesiones Activas (si hay lesiones registradas en la ficha clínica) */}
              {activeInjuries && activeInjuries.length > 0 && (
                <button
                  type="button"
                  onClick={openInjuriesModal}
                  className="checkin-health-chip warning"
                  title="Modificar puntuación de lesiones activas"
                >
                  <Activity size={12} />
                  <span>
                    Lesión: {getMuscleSpanishName(activeInjuries[0].zone) || activeInjuries[0].zone}
                    {injuryScores[activeInjuries[0].id] !== null &&
                    injuryScores[activeInjuries[0].id] !== undefined
                      ? ` (${injuryScores[activeInjuries[0].id]}/10)`
                      : ''}
                  </span>
                  <Edit3 size={10} style={{ opacity: 0.65, marginLeft: 2 }} />
                </button>
              )}

              {/* Chip de Zonas Marcadas (si hay) */}
              {reportedPainsCount > 0 && (
                <span className="checkin-health-chip warning">
                  <span>
                    {reportedPainsCount} {reportedPainsCount === 1 ? 'zona' : 'zonas'}
                  </span>
                </span>
              )}

              {/* Botón Limpiar (si hay zonas marcadas) */}
              {reportedPainsCount > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="checkin-health-chip clear-btn"
                  title="Limpiar todas las molestias marcadas"
                >
                  <RotateCcw size={11} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          )}

          {/* ── MAPA ANATÓMICO MUSCULAR Y ARTICULAR (VISTA FRONTAL Y POSTERIOR) CON ESCÁNER BIOMÉTRICO ── */}
          <div
            className={`biometric-scanner-container ${isScanning ? 'biometric-scanning-target' : ''}`}
            style={{ width: '100%', overflow: 'visible', paddingBottom: '0.15rem' }}
          >
            {isScanning && (
              <div className="biometric-scan-overlay" aria-hidden="true">
                <div className="biometric-scanner-beam" />
                <div className="biometric-scanner-line" />
              </div>
            )}

            <InteractiveMuscleMap
              musclePains={musclePains}
              onPainChange={onPainChange}
              onClearAll={onClearAll}
              hasActiveInjury={lesionActive}
              hideControls={true}
              initialView="front"
            />
          </div>
        </div>
      </div>

      {/* la lesión clínica se muestra aunque el atleta todavía no responda los carteles. */}
      {isBlocked && clinicalLesion && (
        <div className="checkin-health-bar" style={{ marginBottom: '0.75rem' }}>
          {clinicalLesionChip}
        </div>
      )}

      {/* ── OVERLAY DE BLOQUEO CON CARTELES MODALES EN ORDEN ── */}
      {isBlocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            cartelStep === 'enfermo' ? 'cartel-enfermo-title' : 'cartel-lesion-title'
          }
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--checkin-modal-backdrop)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'fadeInValidationBackdrop 0.2s ease-out forwards',
          }}
          onClick={() => {
            if (healthQuestionsAnswered) {
              setCartelStep('desbloqueado');
            }
          }}
        >
          {/* CARTEL 1: ¿Te sentís enfermo? */}
          {cartelStep === 'enfermo' && (
            <div
              key="cartel-enfermo"
              style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: 'var(--checkin-modal-bg)',
                borderRadius: '24px',
                border: '1.5px solid var(--checkin-modal-border)',
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
              {/* Ícono circular suave con termómetro médico celeste */}
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
                <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
                  {/* Cuerpo del termómetro médico */}
                  <path
                    d="M13 18.5V8a3.5 3.5 0 0 1 7 0v10.5a6 6 0 1 1-7 0Z"
                    stroke="var(--primary)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Bulbo de mercurio en la base */}
                  <circle cx="16.5" cy="23.5" r="2.8" fill="var(--primary)" />
                  {/* Mercurio en el tubo */}
                  <line
                    x1="16.5"
                    y1="14"
                    x2="16.5"
                    y2="20.7"
                    stroke="var(--primary)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  {/* Signo más (+) médico a la derecha superior */}
                  <line
                    x1="26"
                    y1="8.5"
                    x2="26"
                    y2="14.5"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="23"
                    y1="11.5"
                    x2="29"
                    y2="11.5"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* Título en Montserrat negrita */}
              <h3
                id="cartel-enfermo-title"
                style={{
                  fontFamily: 'var(--font-base)',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--checkin-title-color)',
                  margin: '0 0 0.5rem 0',
                  letterSpacing: '-0.02em',
                }}
              >
                ¿Te sentís enfermo?
              </h3>

              {/* Subtítulo explicativo */}
              <p
                style={{
                  fontFamily: 'var(--font-base)',
                  fontSize: '0.94rem',
                  fontWeight: 500,
                  color: 'var(--checkin-subtitle-color)',
                  lineHeight: 1.45,
                  margin: '0 0 1.5rem 0',
                }}
              >
                Indicá si experimentás síntomas de malestar físico o enfermedad hoy.
              </p>

              {/* Botones de acción No (izquierda) y Sí (derecha) */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleAnswerSick(false)}
                  style={{
                    flex: 1,
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--checkin-counter-bg)',
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
                  No
                </button>

                <button
                  type="button"
                  onClick={() => handleAnswerSick(true)}
                  style={{
                    flex: 1,
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--checkin-next-btn-bg)',
                    color: 'var(--checkin-next-btn-color)',
                    borderRadius: '9999px',
                    border: 'none',
                    fontFamily: 'var(--font-base)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(8, 37, 74, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sí
                </button>
              </div>
            </div>
          )}

          {/* CARTEL 2: ¿Tenés una lesión? */}
          {cartelStep === 'lesion' && (
            <div
              key="cartel-lesion"
              style={{
                width: '100%',
                maxWidth: '430px',
                backgroundColor: 'var(--checkin-modal-bg)',
                borderRadius: '24px',
                border: '1.5px solid var(--checkin-modal-border)',
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
              {/* Ícono circular suave con dos curitas cruzadas en celeste */}
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
                <svg width="32" height="32" viewBox="0 0 34 34" fill="none">
                  {/* Curita 1 rotada -45 grados */}
                  <rect
                    x="4.5"
                    y="12.5"
                    width="25"
                    height="9"
                    rx="4.5"
                    transform="rotate(-45 17 17)"
                    stroke="var(--primary)"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Curita 2 rotada +45 grados */}
                  <rect
                    x="4.5"
                    y="12.5"
                    width="25"
                    height="9"
                    rx="4.5"
                    transform="rotate(45 17 17)"
                    stroke="var(--primary)"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Pequeños orificios / textura en el centro de la curita */}
                  <circle cx="17" cy="14" r="1" fill="var(--primary)" />
                  <circle cx="17" cy="20" r="1" fill="var(--primary)" />
                  <circle cx="14" cy="17" r="1" fill="var(--primary)" />
                  <circle cx="20" cy="17" r="1" fill="var(--primary)" />
                </svg>
              </div>

              {/* Título en Montserrat negrita */}
              <h3
                id="cartel-lesion-title"
                style={{
                  fontFamily: 'var(--font-base)',
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--checkin-title-color)',
                  margin: '0 0 0.5rem 0',
                  letterSpacing: '-0.02em',
                }}
              >
                ¿Tenés una lesión?
              </h3>

              {/* Subtítulo explicativo */}
              <p
                style={{
                  fontFamily: 'var(--font-base)',
                  fontSize: '0.94rem',
                  fontWeight: 500,
                  color: 'var(--checkin-subtitle-color)',
                  lineHeight: 1.45,
                  margin: '0 0 1.5rem 0',
                }}
              >
                Indicá si contás con alguna molestia o lesión muscular activa que limite tu
                entrenamiento.
              </p>

              {/* Botones de acción No (izquierda) y Sí (derecha) */}
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleAnswerInjury(false)}
                  style={{
                    flex: 1,
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--checkin-counter-bg)',
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
                  No
                </button>

                <button
                  type="button"
                  onClick={() => handleAnswerInjury(true)}
                  style={{
                    flex: 1,
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--checkin-next-btn-bg)',
                    color: 'var(--checkin-next-btn-color)',
                    borderRadius: '9999px',
                    border: 'none',
                    fontFamily: 'var(--font-base)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(8, 37, 74, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sí
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BURBUJA MODAL DE MOLESTIAS ACTIVAS (ESTILO IMAGEN 2) CON SLIDER (IMAGEN 3) ── */}
      {activeInjuries && activeInjuries.length > 0 && (
        <ActiveInjuriesModal
          isOpen={injuriesModalOpen}
          onClose={closeInjuriesModal}
          activeInjuries={activeInjuries}
          injuryScores={injuryScores}
          onScoreChange={onInjuryScoreChange ?? (() => {})}
        />
      )}

      {/* Estilos para animación de modales */}
      <style>{`
        @keyframes fadeInValidationBackdrop {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleUpValidationBox {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

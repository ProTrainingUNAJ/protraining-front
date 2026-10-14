import React, { useState } from 'react';
import {
  Moon,
  BatteryCharging,
  ShieldAlert,
  Smile,
  CheckCircle2,
  Send,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { BodyMuscleMap } from '../../components/athlete/BodyMuscleMap';
import {
  PROTRAINING_MUSCLES,
  PAIN_LEVELS,
  getPainColor,
} from '../../components/athlete/bodyMuscleData';

export const CheckInPage: React.FC = () => {
  const [sleepScore, setSleepScore] = useState<number | null>(null);
  const [fatigueScore, setFatigueScore] = useState<number | null>(null);
  const [sorenessScore, setSorenessScore] = useState<number | null>(null);
  const [stressScore, setStressScore] = useState<number | null>(null);
  const [musclePains, setMusclePains] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const reportedPains = Object.entries(musclePains).filter(([, lvl]) => lvl > 0);
  const reportedCount = reportedPains.length;

  const isComplete =
    sleepScore !== null && fatigueScore !== null && sorenessScore !== null && stressScore !== null;

  const handlePainChange = (muscleId: string, level: number) => {
    setMusclePains((prev) => {
      const next = { ...prev };
      if (level <= 0) {
        delete next[muscleId];
      } else {
        next[muscleId] = level;
      }
      return next;
    });
  };

  const handleClearPains = () => {
    setMusclePains({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    setSubmitted(true);
  };

  const renderScaleButtons = (
    currentValue: number | null,
    setter: (val: number | null) => void,
    lowLabel: string,
    highLabel: string,
  ) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          marginTop: 'auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          {[1, 2, 3, 4, 5].map((val) => {
            const isSelected = currentValue === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setter(isSelected ? null : val)}
                className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  flex: 1,
                  padding: '0.65rem 0',
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                  border: isSelected ? undefined : '1px solid var(--border)',
                }}
              >
                {val}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            minHeight: '1.2rem',
            alignItems: 'center',
          }}
        >
          <span>1: {lowLabel}</span>
          <span style={{ textAlign: 'right' }}>5: {highLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Check-in Diario"
        description="Registro de estado físico, recuperación, sueño y nivel de energía."
        actions={
          <span className={`badge ${submitted ? 'badge-success' : 'badge-warning'}`}>
            {submitted ? 'Check-in Completado' : 'Pendiente de hoy'}
          </span>
        }
      />

      <div className="app-page-body">
        {submitted ? (
          <div
            className="card"
            style={{ margin: 0, padding: '2.5rem 1.5rem', textAlign: 'center' }}
          >
            <CheckCircle2
              size={52}
              style={{ color: 'var(--success-text)', margin: '0 auto 1.25rem' }}
            />
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                margin: '0 0 0.5rem',
                color: 'var(--text-main)',
              }}
            >
              ¡Check-in registrado con éxito!
            </h2>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                maxWidth: '520px',
                margin: '0 auto 1.5rem',
                lineHeight: 1.5,
              }}
            >
              Tus respuestas y mapa de dolor ya están disponibles para el cuerpo técnico para
              ajustar las cargas de tu entrenamiento de hoy.
            </p>

            {/* Resumen de reporte enviado */}
            <div
              style={{
                maxWidth: '620px',
                margin: '0 auto 1.75rem',
                textAlign: 'left',
                background: 'var(--bg-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Resumen de indicadores:
                </strong>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Sueño</small>
                    <strong style={{ color: 'var(--text-main)' }}>{sleepScore} / 5</strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>Fatiga</small>
                    <strong style={{ color: 'var(--text-main)' }}>{fatigueScore} / 5</strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                      Dolor Muscular
                    </small>
                    <strong style={{ color: 'var(--text-main)' }}>{sorenessScore} / 5</strong>
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                      Estado de Ánimo
                    </small>
                    <strong style={{ color: 'var(--text-main)' }}>{stressScore} / 5</strong>
                  </div>
                </div>
              </div>

              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Dolores musculares reportados al profesor ({reportedCount}):
                </strong>
                {reportedCount === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    No reportaste molestias musculares específicas.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {reportedPains.map(([mId, lvl]) => {
                      const m = PROTRAINING_MUSCLES.find((x) => x.id === mId);
                      const painInfo = PAIN_LEVELS.find((p) => p.level === lvl);
                      const color = getPainColor(lvl);

                      return (
                        <span
                          key={mId}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: 'var(--bg-card)',
                            border: `1.5px solid ${color}`,
                            color: 'var(--text-main)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: color,
                            }}
                          />
                          <strong>{m?.name || mId}:</strong>
                          <span style={{ color, fontWeight: 800 }}>
                            Nivel {lvl} ({painInfo?.name})
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {notes.trim() && (
                <div>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      color: 'var(--text-main)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Observaciones adicionales:
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      background: 'var(--bg-card)',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    "{notes}"
                  </p>
                </div>
              )}
            </div>

            <button type="button" className="btn btn-secondary" onClick={() => setSubmitted(false)}>
              Editar respuestas
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {/* 1. Calidad del Sueño */}
              <div
                className="card"
                style={{
                  margin: 0,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Moon size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                    <strong
                      style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.2 }}
                    >
                      Calidad del Sueño
                    </strong>
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      margin: 0,
                      minHeight: '2.4rem',
                      lineHeight: 1.4,
                    }}
                  >
                    ¿Cómo descansaste anoche?
                  </p>
                </div>
                {renderScaleButtons(
                  sleepScore,
                  setSleepScore,
                  'Muy mal / Insomnio',
                  'Excelente / Reparador',
                )}
              </div>

              {/* 2. Nivel de Fatiga */}
              <div
                className="card"
                style={{
                  margin: 0,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BatteryCharging
                      size={18}
                      style={{ color: 'var(--secondary)', flexShrink: 0 }}
                    />
                    <strong
                      style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.2 }}
                    >
                      Nivel de Fatiga
                    </strong>
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      margin: 0,
                      minHeight: '2.4rem',
                      lineHeight: 1.4,
                    }}
                  >
                    ¿Cuánta energía física sientes al despertar?
                  </p>
                </div>
                {renderScaleButtons(
                  fatigueScore,
                  setFatigueScore,
                  'Mucha energía',
                  'Agotamiento extremo',
                )}
              </div>

              {/* 3. Dolor Muscular */}
              <div
                className="card"
                style={{
                  margin: 0,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                    <strong
                      style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.2 }}
                    >
                      Dolor Muscular
                    </strong>
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      margin: 0,
                      minHeight: '2.4rem',
                      lineHeight: 1.4,
                    }}
                  >
                    Sensación de sobrecarga o molestias generales.
                  </p>
                </div>
                {renderScaleButtons(
                  sorenessScore,
                  setSorenessScore,
                  'Sin molestias',
                  'Dolor intenso',
                )}
              </div>

              {/* 4. Estado de Ánimo */}
              <div
                className="card"
                style={{
                  margin: 0,
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Smile size={18} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
                    <strong
                      style={{ fontSize: '1rem', color: 'var(--text-main)', lineHeight: 1.2 }}
                    >
                      Estado de Ánimo
                    </strong>
                  </div>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      margin: 0,
                      minHeight: '2.4rem',
                      lineHeight: 1.4,
                    }}
                  >
                    Nivel de concentración y tranquilidad mental.
                  </p>
                </div>
                {renderScaleButtons(
                  stressScore,
                  setStressScore,
                  'Relajado y motivado',
                  'Muy estresado',
                )}
              </div>
            </div>

            {/* Mapa Muscular Anatómico y Observaciones Unificado */}
            <div
              className="card"
              style={{
                margin: 0,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <Activity size={18} style={{ color: 'var(--secondary)' }} />
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Mapa Corporal de Dolor y Molestias Musculares
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Marca en las siluetas frontal o posterior las zonas donde sientas dolor o
                  sobrecarga para informarle al preparador físico.
                </p>
              </div>

              {/* Mapa Muscular Interactivo con Escala de Dolor y Músculos Laterales */}
              <BodyMuscleMap
                musclePains={musclePains}
                onPainChange={handlePainChange}
                onClearAll={handleClearPains}
              />

              {/* Área compacta y optimizada de comentarios adicionales */}
              <div style={{ marginTop: '0.25rem' }}>
                <label
                  htmlFor="checkin-notes"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    marginBottom: '0.25rem',
                    color: 'var(--text-main)',
                  }}
                >
                  <MessageSquare size={14} style={{ color: 'var(--secondary)' }} />
                  <span>Notas adicionales para el preparador físico (opcional)</span>
                </label>
                <textarea
                  id="checkin-notes"
                  rows={2}
                  placeholder="Ej. Siento una leve tirantez en el gemelo izquierdo al trotar..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    fontSize: '0.82rem',
                    resize: 'vertical',
                    minHeight: '44px',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '1rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border)',
                  flexWrap: 'wrap',
                }}
              >
                {!isComplete && (
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      marginRight: 'auto',
                    }}
                  >
                    * Por favor califica los 4 indicadores superiores para enviar el check-in.
                  </span>
                )}
                <button
                  type="submit"
                  disabled={!isComplete}
                  className="btn btn-primary"
                  style={{
                    gap: '0.45rem',
                    padding: '0.65rem 1.6rem',
                    fontSize: '0.92rem',
                    opacity: isComplete ? 1 : 0.5,
                    cursor: isComplete ? 'pointer' : 'not-allowed',
                  }}
                >
                  <Send size={15} />
                  <span>Enviar Check-in al Profesor</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

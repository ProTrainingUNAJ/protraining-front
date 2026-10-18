import React, { useState, useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { OFFICIAL_PALETTE_ITEMS } from '../athlete/muscleMap.config';
import { PainZoneReport } from './trafficLight.types';
import { Activity, CheckCircle2 } from 'lucide-react';

interface AthleteBodyPainMapProps {
  pains?: PainZoneReport[];
  athleteName?: string;
}

// Helper to resolve muscleId from zone name if not explicitly provided
const resolveMuscleId = (zone: string, providedId?: string): string => {
  if (providedId) return providedId;
  const s = zone.toLowerCase();
  if (s.includes('isquio')) return s.includes('izq') ? 'isquiotibial_izquierdo' : 'isquiotibial_derecho';
  if (s.includes('cuad') || s.includes('cuád')) return s.includes('izq') ? 'cuadriceps_izquierdo' : 'cuadriceps_derecho';
  if (s.includes('gemelo') || s.includes('pantorr')) return s.includes('izq') ? 'gemelo_izquierdo' : 'gemelo_derecho';
  if (s.includes('lumbar') || s.includes('erector')) return 'espalda_baja';
  if (s.includes('dorsal') || s.includes('espalda media')) return 'espalda_media';
  if (s.includes('espalda alta') || s.includes('trapecio')) return s.includes('der') ? 'cuello_trapecio_derecho' : 'cuello_trapecio_izquierdo';
  if (s.includes('aductor') || s.includes('ingle')) return s.includes('der') ? 'aductor_derecho' : 'aductor_izquierdo';
  if (s.includes('rodilla')) return s.includes('der') ? 'rodilla_derecha' : 'rodilla_izquierda';
  if (s.includes('tobillo')) return s.includes('der') ? 'tobillo_derecho' : 'tobillo_izquierdo';
  if (s.includes('hombro')) return s.includes('der') ? 'hombro_derecho' : 'hombro_izquierdo';
  if (s.includes('bicep') || s.includes('bícep')) return s.includes('der') ? 'biceps_derecho' : 'biceps_izquierdo';
  if (s.includes('tricep') || s.includes('trícep')) return s.includes('der') ? 'triceps_derecho' : 'triceps_izquierdo';
  if (s.includes('gluteo') || s.includes('glúteo')) return s.includes('der') ? 'gluteo_derecho' : 'gluteo_izquierdo';
  if (s.includes('abdom')) return 'abdominales';
  return '';
};

// Check if a muscle belongs primarily to the back view
const isBackMuscle = (id: string): boolean => {
  return [
    'isquiotibial_derecho',
    'isquiotibial_izquierdo',
    'gemelo_derecho',
    'gemelo_izquierdo',
    'gluteo_derecho',
    'gluteo_izquierdo',
    'espalda_baja',
    'espalda_media',
    'espalda_alta',
    'triceps_derecho',
    'triceps_izquierdo',
  ].includes(id);
};

export const AthleteBodyPainMap: React.FC<AthleteBodyPainMapProps> = ({
  pains = [],
  athleteName = 'Atleta',
}) => {
  // Compute muscle pains dictionary for the SVG renderer
  const musclePains = useMemo(() => {
    const map: Record<string, number> = {};
    pains.forEach((p) => {
      const id = resolveMuscleId(p.zone, p.muscleId);
      if (id) {
        map[id] = p.level;
      }
    });
    return map;
  }, [pains]);

  // Determine smart initial view based on pain locations
  const smartInitialView = useMemo<'front' | 'back' | 'both'>(() => {
    if (pains.length === 0) return 'both';
    const keys = Object.keys(musclePains);
    const hasBack = keys.some((k) => isBackMuscle(k));
    const hasFront = keys.some((k) => !isBackMuscle(k));

    if (hasBack && !hasFront) return 'back';
    if (hasFront && !hasBack) return 'front';
    return 'both';
  }, [pains, musclePains]);

  const [activeView, setActiveView] = useState<'front' | 'back' | 'both'>(smartInitialView);

  const maxPainLevel = pains.length > 0 ? Math.max(...pains.map((p) => p.level)) : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        background: 'var(--bg-subtle)',
        borderRadius: '16px',
        padding: '0.85rem',
        border: '1px solid var(--border)',
      }}
    >
      {/* Header with perspective toggles */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Activity size={15} style={{ color: maxPainLevel >= 4 ? 'var(--traffic-red)' : 'var(--traffic-yellow)' }} />
          <strong
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-main)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            Mapa Anatómico del Check-in
          </strong>
        </div>

        {/* View Toggle Buttons */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-card)',
            padding: '0.15rem',
            borderRadius: '9999px',
            border: '1px solid var(--border)',
            gap: '0.2rem',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveView('front')}
            style={{
              border: 'none',
              background: activeView === 'front' ? 'var(--primary)' : 'transparent',
              color: activeView === 'front' ? '#ffffff' : 'var(--text-muted)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Frente
          </button>
          <button
            type="button"
            onClick={() => setActiveView('back')}
            style={{
              border: 'none',
              background: activeView === 'back' ? 'var(--primary)' : 'transparent',
              color: activeView === 'back' ? '#ffffff' : 'var(--text-muted)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Dorso
          </button>
          <button
            type="button"
            onClick={() => setActiveView('both')}
            style={{
              border: 'none',
              background: activeView === 'both' ? 'var(--primary)' : 'transparent',
              color: activeView === 'both' ? '#ffffff' : 'var(--text-muted)',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Ambos
          </button>
        </div>
      </div>

      {/* Anatomical Silhouettes Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0.5rem 0',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          minHeight: '260px',
        }}
      >
        {(activeView === 'front' || activeView === 'both') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: activeView === 'both' ? '150px' : '220px',
              maxWidth: '100%',
              transition: 'width 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
              }}
            >
              Vista Frontal
            </span>
            <div style={{ width: '100%', maxHeight: '250px', display: 'flex', justifyContent: 'center' }}>
              <MuscleMapFront
                musclePains={musclePains}
                readOnly={true}
                hideHeader={true}
              />
            </div>
          </div>
        )}

        {(activeView === 'back' || activeView === 'both') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: activeView === 'both' ? '150px' : '220px',
              maxWidth: '100%',
              transition: 'width 0.2s ease',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
              }}
            >
              Vista Dorsal
            </span>
            <div style={{ width: '100%', maxHeight: '250px', display: 'flex', justifyContent: 'center' }}>
              <MuscleMapBack
                musclePains={musclePains}
                readOnly={true}
                hideHeader={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* EVA Color Scale Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.35rem',
          padding: '0.4rem 0.6rem',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-muted)',
        }}
      >
        <span style={{ color: 'var(--text-main)', fontSize: '0.7rem' }}>Escala EVA:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {OFFICIAL_PALETTE_ITEMS.filter((i) => i.level > 0).map((item) => (
            <div key={item.level} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: item.hex,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
              <span>
                {item.level}: {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reported zones details list */}
      {pains.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.15rem' }}>
          {pains.map((p, idx) => {
            const paletteItem = OFFICIAL_PALETTE_ITEMS.find((it) => it.level === p.level);
            const color = paletteItem ? paletteItem.hex : 'var(--traffic-red)';
            const desc = paletteItem ? paletteItem.name : '';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.75rem',
                  background: 'var(--bg-card)',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: color,
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {p.zone}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      background: `${color}20`,
                      color: color,
                      border: `1px solid ${color}60`,
                    }}
                  >
                    Nivel {p.level}/5 · {desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 0.85rem',
            background: 'var(--traffic-green-bg)',
            border: '1px solid var(--traffic-green-border)',
            borderRadius: '10px',
            color: 'var(--traffic-green-text)',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{athleteName} no reportó dolores musculares hoy. Plantel en condición óptima.</span>
        </div>
      )}
    </div>
  );
};

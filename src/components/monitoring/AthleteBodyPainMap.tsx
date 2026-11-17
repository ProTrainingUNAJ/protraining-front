import React, { useState, useMemo } from 'react';
import { MuscleMapFront } from '../athlete/MuscleMapFront';
import { MuscleMapBack } from '../athlete/MuscleMapBack';
import { OFFICIAL_PALETTE_ITEMS } from '../athlete/muscleMap.config';
import { PainZoneReport } from './trafficLight.types';
import { Activity, CheckCircle2 } from 'lucide-react';
import { resolveMuscleId, isBackMuscle } from '../../utils/painMuscleResolver';

interface AthleteBodyPainMapProps {
  pains?: PainZoneReport[];
  athleteName?: string;
}

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
          <Activity
            size={15}
            style={{ color: maxPainLevel >= 4 ? 'var(--traffic-red)' : 'var(--traffic-yellow)' }}
          />
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
              color: activeView === 'front' ? 'var(--white)' : 'var(--text-muted)',
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
              color: activeView === 'back' ? 'var(--white)' : 'var(--text-muted)',
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
              color: activeView === 'both' ? 'var(--white)' : 'var(--text-muted)',
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

      {/* Anatomical Silhouettes Display (Full body from head to feet) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: '1rem',
          padding: '1rem 0.5rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          flexWrap: activeView === 'both' ? 'nowrap' : 'wrap',
        }}
      >
        {(activeView === 'front' || activeView === 'both') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: '1 1 0',
              maxWidth: activeView === 'both' ? '240px' : '300px',
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '0.2rem 0.65rem',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              Vista Frontal (Anterior)
            </span>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <MuscleMapFront musclePains={musclePains} readOnly={true} hideHeader={true} />
            </div>
          </div>
        )}

        {(activeView === 'back' || activeView === 'both') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: '1 1 0',
              maxWidth: activeView === 'both' ? '240px' : '300px',
              width: '100%',
            }}
          >
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--text-main)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '0.2rem 0.65rem',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              Vista Dorsal (Posterior)
            </span>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <MuscleMapBack musclePains={musclePains} readOnly={true} hideHeader={true} />
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
            <div
              key={item.level}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: item.level === 6 ? '#000000' : item.hex,
                  border: item.level === 6 ? '1px solid #000000' : '1px solid var(--border)',
                }}
              />
              <span style={{ color: item.level === 6 ? 'var(--text-main)' : undefined }}>
                {item.level === 6 ? '6: Lesión Activa' : `${item.level}: ${item.name}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reported zones details list */}
      {pains.length > 0 ? (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.15rem' }}
        >
          {pains.map((p, idx) => {
            const isInjury = p.level === 6;
            const paletteItem = OFFICIAL_PALETTE_ITEMS.find((it) => it.level === p.level);
            const color = isInjury
              ? '#000000'
              : paletteItem
                ? paletteItem.hex
                : 'var(--traffic-red)';
            const desc = isInjury ? 'Lesión Activa' : paletteItem ? paletteItem.name : '';

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
                  border: isInjury ? '1.5px solid #111827' : '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: color,
                      boxShadow: isInjury ? '0 0 4px rgba(0,0,0,0.5)' : undefined,
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
                      background: isInjury ? '#111827' : `${color}20`,
                      color: isInjury ? '#ffffff' : color,
                      border: isInjury ? '1px solid #000000' : `1px solid ${color}60`,
                    }}
                  >
                    {isInjury ? 'Lesión Activa' : `Nivel ${p.level}/5 · ${desc}`}
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

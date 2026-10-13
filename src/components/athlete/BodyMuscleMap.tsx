import React, { useState } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { PROTRAINING_MUSCLES, PAIN_LEVELS, getPainColor } from './bodyMuscleData';

export interface BodyMuscleMapProps {
  musclePains: Record<string, number>;
  onPainChange: (muscleId: string, level: number) => void;
  onClearAll?: () => void;
}

export const BodyMuscleMap: React.FC<BodyMuscleMapProps> = ({
  musclePains,
  onPainChange,
  onClearAll,
}) => {
  const [activeBrushLevel, setActiveBrushLevel] = useState<number>(3); // Nivel predeterminado para marcar
  const [selectedMuscleId, setSelectedMuscleId] = useState<string | null>(null);
  const [hoveredMuscleId, setHoveredMuscleId] = useState<string | null>(null);

  const registeredPains = Object.entries(musclePains).filter(([, lvl]) => lvl > 0);
  const totalMarked = registeredPains.length;

  // Separar los 12 grupos simétricamente (6 de vista frontal a la izquierda, 6 de vista posterior a la derecha)
  const frontMuscles = PROTRAINING_MUSCLES.filter(
    (m) => m.view === 'front' || m.id === 'hombros' || m.id === 'gemelos',
  );
  const backMuscles = PROTRAINING_MUSCLES.filter(
    (m) => m.view === 'back' && m.id !== 'gemelos' && m.id !== 'hombros',
  );

  // Manejar clic en un músculo
  const handleMuscleClick = (id: string) => {
    const currentLevel = musclePains[id] || 0;
    setSelectedMuscleId(id);

    // Si ya tenía el mismo nivel de dolor que el pincel activo, toggle a 0 (desmarcar)
    if (currentLevel === activeBrushLevel) {
      onPainChange(id, 0);
    } else {
      // Asignar el nivel de dolor activo
      onPainChange(id, activeBrushLevel);
    }
  };

  const renderMuscleButton = (muscle: (typeof PROTRAINING_MUSCLES)[0]) => {
    const level = musclePains[muscle.id] || 0;
    const hasPain = level > 0;
    const painColor = getPainColor(level);
    const isHovered = hoveredMuscleId === muscle.id;
    const isSelected = selectedMuscleId === muscle.id;

    return (
      <button
        key={muscle.id}
        type="button"
        onClick={() => handleMuscleClick(muscle.id)}
        onMouseEnter={() => setHoveredMuscleId(muscle.id)}
        onMouseLeave={() => setHoveredMuscleId(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.45rem 0.65rem',
          borderRadius: '8px',
          border: hasPain
            ? `1.5px solid ${painColor}`
            : isSelected || isHovered
              ? '1.5px solid var(--secondary)'
              : '1px solid var(--border)',
          background: hasPain ? painColor : isHovered ? 'var(--bg-subtle)' : '#023050',
          color: '#ffffff',
          fontSize: '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: hasPain ? `0 2px 6px ${painColor}44` : 'none',
          textAlign: 'left',
        }}
        title={`Toca para asignar Nivel ${activeBrushLevel} o desmarcar ${muscle.name}`}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {muscle.name}
        </span>
        {hasPain ? (
          <span
            style={{
              background: 'rgba(255,255,255,0.3)',
              padding: '0.1rem 0.45rem',
              borderRadius: '10px',
              fontSize: '0.72rem',
              fontWeight: 900,
              color: '#ffffff',
              marginLeft: '0.35rem',
              flexShrink: 0,
            }}
          >
            {level}
          </span>
        ) : (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              marginLeft: '0.35rem',
              flexShrink: 0,
            }}
          />
        )}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
      {/* 1. SELECTOR ÚNICO DE INTENSIDAD DE DOLOR (5 NIVELES CON CÍRCULOS DE COLOR) */}
      <div
        style={{
          padding: '0.75rem 1rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Intensidad del dolor a asignar:
            </span>
            {totalMarked > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '10px',
                  background: getPainColor(activeBrushLevel),
                  color: '#ffffff',
                }}
              >
                {totalMarked} {totalMarked === 1 ? 'zona marcada' : 'zonas marcadas'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {totalMarked > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', gap: '0.25rem' }}
                title="Limpiar todas las molestias registradas"
              >
                <RotateCcw size={12} />
                <span>Limpiar todo</span>
              </button>
            )}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Elige nivel y toca el músculo en el mapa o en los laterales
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: '0.4rem',
          }}
        >
          {PAIN_LEVELS.map((item) => {
            const isSelectedBrush = activeBrushLevel === item.level;

            return (
              <button
                key={item.level}
                type="button"
                onClick={() => setActiveBrushLevel(item.level)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: isSelectedBrush ? `2px solid ${item.color}` : '1px solid var(--border)',
                  background: isSelectedBrush ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelectedBrush ? `0 2px 6px ${item.color}33` : 'none',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: item.color,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {item.level}
                </span>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: isSelectedBrush ? item.color : 'var(--text-main)',
                  }}
                >
                  {item.name}
                </span>
                {isSelectedBrush && (
                  <Check
                    size={13}
                    style={{ color: item.color, marginLeft: 'auto' }}
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CUERPO EN 3 COLUMNAS: LATERAL IZQUIERDO (FRONTAL) - MAPA CENTRAL - LATERAL DERECHO (POSTERIOR) */}
      <div className="muscle-interactive-container">
        {/* Columna Izquierda: Vista Frontal */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            background: 'var(--bg-card)',
            padding: '0.75rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '0.2rem',
              letterSpacing: '0.5px',
              textAlign: 'center',
            }}
          >
            Vista Frontal
          </div>
          {frontMuscles.map(renderMuscleButton)}
        </div>

        {/* Columna Central: Lienzo Anatómico de Ambas Vistas */}
        <div
          className="muscle-interactive-center"
          style={{
            position: 'relative',
            background: 'var(--bg-card)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            padding: '0.75rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* Rótulos de Vistas Anatómicas */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              width: '100%',
              maxWidth: '750px',
              marginBottom: '0.5rem',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-main)',
                background: 'var(--bg-subtle)',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}
            >
              Vista Frontal (Anterior)
            </span>
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--text-main)',
                background: 'var(--bg-subtle)',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}
            >
              Vista Posterior (Trasera)
            </span>
          </div>

          {/* Lámina de contraste anatómico */}
          <div
            style={{
              width: '100%',
              maxWidth: '820px',
              background: '#ffffff',
              borderRadius: '10px',
              padding: '0.35rem',
              border: '1px solid var(--border)',
            }}
          >
            <svg
              viewBox="0 0 1024 682"
              style={{
                width: '100%',
                maxHeight: '440px',
                userSelect: 'none',
                display: 'block',
              }}
              aria-label="Mapa muscular anatómico de ProTraining con escala de dolor"
            >
              {/* 1. IMAGEN BASE AZUL (#023050) */}
              <image
                href="/assets/body-muscles-base.png"
                x="0"
                y="0"
                width="1024"
                height="682"
                preserveAspectRatio="xMidYMid meet"
              />

              {/* 2. CAPAS DE DOLOR POR MÚSCULO: Teñidas con el nivel exacto (1 a 5) */}
              {PROTRAINING_MUSCLES.map((muscle) => {
                const level = musclePains[muscle.id];
                if (!level || level < 1 || level > 5) return null;

                return (
                  <image
                    key={`pain-layer-${muscle.id}-${level}`}
                    href={`/assets/muscles/levels/${level}/${muscle.id}.png`}
                    x="0"
                    y="0"
                    width="1024"
                    height="682"
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.25))',
                    }}
                  />
                );
              })}

              {/* 3. CAPA INTERACTIVA: Polígonos de clic y badges numéricos */}
              {PROTRAINING_MUSCLES.map((muscle) => {
                const level = musclePains[muscle.id] || 0;
                const hasPain = level > 0;
                const painColor = getPainColor(level);
                const isHovered = hoveredMuscleId === muscle.id;
                const isSelected = selectedMuscleId === muscle.id;

                return (
                  <g
                    key={`interactive-${muscle.id}`}
                    id={`muscle-target-${muscle.id}`}
                    onClick={() => handleMuscleClick(muscle.id)}
                    onMouseEnter={() => setHoveredMuscleId(muscle.id)}
                    onMouseLeave={() => setHoveredMuscleId(null)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-pressed={hasPain}
                    aria-label={`${muscle.name}${hasPain ? `, dolor nivel ${level}` : ', sin dolor'}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMuscleClick(muscle.id);
                      }
                    }}
                  >
                    {muscle.polygons.map((pts, idx) => (
                      <polygon
                        key={idx}
                        points={pts}
                        fill={isHovered ? 'rgba(0, 112, 192, 0.22)' : 'transparent'}
                        stroke={isSelected ? '#0070c0' : isHovered ? '#0070c0' : 'transparent'}
                        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
                        style={{ transition: 'fill 0.15s ease, stroke 0.15s ease' }}
                      />
                    ))}

                    {hasPain && (
                      <>
                        {muscle.frontCenter && (
                          <g
                            transform={`translate(${muscle.frontCenter.x}, ${muscle.frontCenter.y})`}
                          >
                            <circle
                              r="11"
                              fill={painColor}
                              stroke="#ffffff"
                              strokeWidth="2"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="11"
                              fontWeight="900"
                              fill="#ffffff"
                            >
                              {level}
                            </text>
                          </g>
                        )}
                        {muscle.backCenter && (
                          <g
                            transform={`translate(${muscle.backCenter.x}, ${muscle.backCenter.y})`}
                          >
                            <circle
                              r="11"
                              fill={painColor}
                              stroke="#ffffff"
                              strokeWidth="2"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="11"
                              fontWeight="900"
                              fill="#ffffff"
                            >
                              {level}
                            </text>
                          </g>
                        )}
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '0.45rem',
              textAlign: 'center',
            }}
          >
            Toca cualquier músculo para aplicar el nivel {activeBrushLevel} (
            {PAIN_LEVELS.find((p) => p.level === activeBrushLevel)?.name}). Toca nuevamente para
            desmarcarlo.
          </span>
        </div>

        {/* Columna Derecha: Vista Posterior */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            background: 'var(--bg-card)',
            padding: '0.75rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '0.2rem',
              letterSpacing: '0.5px',
              textAlign: 'center',
            }}
          >
            Vista Posterior
          </div>
          {backMuscles.map(renderMuscleButton)}
        </div>
      </div>
    </div>
  );
};

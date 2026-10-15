import React, { useState } from 'react';
import { RotateCcw, Trash2, Check, Sparkles, Activity } from 'lucide-react';
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
  const selectedMuscle = PROTRAINING_MUSCLES.find((m) => m.id === selectedMuscleId);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {/* 1. Barra de Controles Superiores: Título, Contador y Limpiar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: 'var(--bg-subtle)',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Activity size={18} style={{ color: 'var(--secondary)' }} />
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
            Mapa Corporal de Dolor Muscular
          </strong>
          {totalMarked > 0 && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '12px',
                background: getPainColor(activeBrushLevel),
                color: 'var(--on-primary)',
                transition: 'background 0.2s ease',
              }}
            >
              {totalMarked} {totalMarked === 1 ? 'zona marcada' : 'zonas marcadas'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Botón de limpiar selección */}
          {totalMarked > 0 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: '0.3rem' }}
              title="Limpiar todas las molestias registradas"
            >
              <RotateCcw size={13} />
              <span>Limpiar todo</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SELECTOR DE INTENSIDAD DE DOLOR (5 NIVELES CON CÍRCULOS DE COLOR) */}
      {/* Siguiendo exactamente la escala de colores y nombres de referencia */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: '1rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
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
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Selecciona la intensidad del dolor a asignar:
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Haz clic en un nivel y luego toca el músculo para aplicarlo
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.5rem',
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
                  gap: '0.5rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  border: isSelectedBrush ? `2.5px solid ${item.color}` : '1px solid var(--border)',
                  background: isSelectedBrush ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelectedBrush ? `0 2px 8px ${item.color}33` : 'none',
                }}
              >
                {/* Círculo de color exacto con el número dentro */}
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: item.color,
                    color: 'var(--on-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                  }}
                >
                  {item.level}
                </span>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    textAlign: 'left',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: isSelectedBrush ? item.color : 'var(--text-main)',
                    }}
                  >
                    {item.name}
                  </span>
                </div>

                {isSelectedBrush && (
                  <Check
                    size={14}
                    style={{ color: item.color, marginLeft: 'auto' }}
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Panel contextual de ajuste si se hizo clic en un músculo específico */}
      {selectedMuscle && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-subtle)',
            borderRadius: '10px',
            border: '1.5px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getPainColor(musclePains[selectedMuscle.id]),
              }}
            />
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              {selectedMuscle.name}:
            </strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {musclePains[selectedMuscle.id]
                ? `Nivel ${musclePains[selectedMuscle.id]} (${PAIN_LEVELS.find((p) => p.level === musclePains[selectedMuscle.id])?.name})`
                : 'Sin dolor registrado'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {PAIN_LEVELS.map((p) => (
              <button
                key={p.level}
                type="button"
                onClick={() => onPainChange(selectedMuscle.id, p.level)}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: p.color,
                  color: 'var(--on-primary)',
                  border:
                    musclePains[selectedMuscle.id] === p.level
                      ? '2.5px solid var(--text-main)'
                      : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={`Asignar Nivel ${p.level} (${p.name}) a ${selectedMuscle.name}`}
              >
                {p.level}
              </button>
            ))}

            {musclePains[selectedMuscle.id] > 0 && (
              <button
                type="button"
                onClick={() => onPainChange(selectedMuscle.id, 0)}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.55rem',
                  marginLeft: '0.25rem',
                  color: 'var(--danger)',
                  gap: '0.25rem',
                }}
                title="Quitar dolor de este músculo"
              >
                <Trash2 size={13} />
                <span>Quitar</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. CONTENEDOR DEL LIENZO ANATÓMICO (OPTIMIZADO PARA MODO OSCURO Y MODO CLARO) */}
      <div
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          padding: '1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Rótulos de Vistas Anatómicas con alto contraste adaptable */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            width: '100%',
            maxWidth: '900px',
            marginBottom: '0.75rem',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-main)',
              background: 'var(--bg-subtle)',
              padding: '0.35rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            Vista Frontal (Anterior)
          </span>
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--text-main)',
              background: 'var(--bg-subtle)',
              padding: '0.35rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            Vista Posterior (Trasera)
          </span>
        </div>

        {/* Lámina de contraste anatómico: Fondo limpio claro que garantiza visualización médica perfecta tanto en claro como en oscuro */}
        <div
          style={{
            width: '100%',
            maxWidth: '960px',
            background: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '0.5rem',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 0 8px rgba(2, 48, 80, 0.04)',
          }}
        >
          <svg
            viewBox="0 0 1024 682"
            style={{
              width: '100%',
              maxHeight: '560px',
              userSelect: 'none',
              display: 'block',
            }}
            aria-label="Mapa muscular anatómico de ProTraining con escala de dolor"
          >
            {/* 1. IMAGEN BASE AZUL - Permanece en azul para zonas no marcadas y no seleccionables */}
            <image
              href="/assets/body-muscles-base.png"
              x="0"
              y="0"
              width="1024"
              height="682"
              preserveAspectRatio="xMidYMid meet"
            />

            {/* 2. CAPAS DE DOLOR POR MÚSCULO: Se tiñen exactamente con el color correspondiente (1 a 5) */}
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

            {/* 3. CAPA INTERACTIVA: Polígonos de clic, hover y badges de dolor */}
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
                  {/* Polígonos de detección táctil / cursor */}
                  {muscle.polygons.map((pts, idx) => (
                    <polygon
                      key={idx}
                      points={pts}
                      fill={isHovered ? 'rgba(0, 112, 192, 0.22)' : 'transparent'}
                      stroke={isSelected || isHovered ? 'var(--brand-blue)' : 'transparent'}
                      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
                      style={{ transition: 'fill 0.15s ease, stroke 0.15s ease' }}
                    />
                  ))}

                  {/* Badges circulares con el número de dolor asignado (1 a 5) */}
                  {hasPain && (
                    <>
                      {muscle.frontCenter && (
                        <g
                          transform={`translate(${muscle.frontCenter.x}, ${muscle.frontCenter.y})`}
                        >
                          <circle
                            r="11"
                            fill={painColor}
                            stroke="var(--on-primary)"
                            strokeWidth="2"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="11"
                            fontWeight="900"
                            fill="var(--on-primary)"
                          >
                            {level}
                          </text>
                        </g>
                      )}
                      {muscle.backCenter && (
                        <g transform={`translate(${muscle.backCenter.x}, ${muscle.backCenter.y})`}>
                          <circle
                            r="11"
                            fill={painColor}
                            stroke="var(--on-primary)"
                            strokeWidth="2"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
                          />
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="11"
                            fontWeight="900"
                            fill="var(--on-primary)"
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
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: '0.65rem',
            textAlign: 'center',
          }}
        >
          Toca cualquier músculo para aplicar el nivel de dolor activo ({activeBrushLevel} -{' '}
          {PAIN_LEVELS.find((p) => p.level === activeBrushLevel)?.name}). Toca nuevamente para
          desmarcarlo.
        </span>
      </div>

      {/* 5. Selector de Chips de Acceso Rápido (12 Músculos) con colores sincronizados */}
      <div
        className="card"
        style={{
          margin: 0,
          padding: '1rem',
          background: 'var(--bg-subtle)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem' }}
        >
          <Sparkles size={16} style={{ color: 'var(--secondary)' }} />
          <strong style={{ fontSize: '0.86rem', color: 'var(--text-main)' }}>
            Listado de Grupos Musculares (12 Zonas)
          </strong>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {PROTRAINING_MUSCLES.map((muscle) => {
            const level = musclePains[muscle.id] || 0;
            const hasPain = level > 0;
            const painColor = getPainColor(level);

            return (
              <button
                key={muscle.id}
                type="button"
                onClick={() => handleMuscleClick(muscle.id)}
                onMouseEnter={() => setHoveredMuscleId(muscle.id)}
                onMouseLeave={() => setHoveredMuscleId(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: hasPain ? `1.5px solid ${painColor}` : '1px solid var(--border)',
                  background: hasPain ? painColor : 'var(--brand-navy)',
                  color: 'var(--on-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: hasPain ? `0 2px 8px ${painColor}44` : 'none',
                }}
              >
                <span>{muscle.name}</span>
                {hasPain ? (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.25)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                    }}
                  >
                    Nivel {level}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                    (
                    {muscle.view === 'front'
                      ? 'Frente'
                      : muscle.view === 'back'
                        ? 'Espalda'
                        : 'Ambos'}
                    )
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

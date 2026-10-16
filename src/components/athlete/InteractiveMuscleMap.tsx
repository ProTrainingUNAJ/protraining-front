import React, { useState } from 'react';
import { RotateCcw, Eye, Info, Sliders } from 'lucide-react';
import { MuscleMapFront } from './MuscleMapFront';
import { MuscleMapBack } from './MuscleMapBack';
import {
  OFFICIAL_MUSCLE_GROUPS,
  OFFICIAL_JOINTS,
  OFFICIAL_PALETTE_ITEMS,
} from './muscleMap.config';
import { InteractiveMuscleMapProps, OfficialMuscleGroup, ViewMode } from './muscleMap.types';

export const InteractiveMuscleMap: React.FC<InteractiveMuscleMapProps> = ({
  musclePains = {},
  muscleColors = {},
  selectedMuscles: controlledSelected,
  onSelectionChange,
  onPainChange,
  onBatchPainChange,
  onColorChange,
  onClearAll,
  onClearSelection,
  initialView = 'both',
  readOnly = false,
  className = '',
}) => {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selectedList = controlledSelected !== undefined ? controlledSelected : internalSelected;

  const [activeView, setActiveView] = useState<ViewMode>(initialView);
  const [hoveredRegion, setHoveredRegion] = useState<{
    name: string;
    category?: string;
    view: string;
  } | null>(null);
  const [showPerspectiveGuide, setShowPerspectiveGuide] = useState(false);

  const ALL_ANATOMICAL_ITEMS = [...OFFICIAL_MUSCLE_GROUPS, ...OFFICIAL_JOINTS];

  const updateSelection = (newSelection: string[]) => {
    if (controlledSelected === undefined) {
      setInternalSelected(newSelection);
    }
    onSelectionChange?.(newSelection);
  };

  const handleMuscleClick = (muscleId: string) => {
    if (readOnly) return;
    if (selectedList.includes(muscleId)) {
      updateSelection(selectedList.filter((id) => id !== muscleId));
    } else {
      updateSelection([...selectedList, muscleId]);
    }
  };

  const handleSelectCategory = (
    category: 'Tren Superior' | 'Tren Inferior' | 'Zona Media' | 'Articulaciones' | 'all',
  ) => {
    if (readOnly) return;
    if (category === 'all') {
      updateSelection(OFFICIAL_MUSCLE_GROUPS.map((m) => m.id));
    } else if (category === 'Articulaciones') {
      updateSelection(OFFICIAL_JOINTS.map((j) => j.id));
    } else {
      updateSelection(
        OFFICIAL_MUSCLE_GROUPS.filter((m) => m.category === category).map((m) => m.id),
      );
    }
  };

  const handleClearSelectionClick = () => {
    updateSelection([]);
    onClearSelection?.();
  };

  const handleApplyColorOrPain = (level: number, hex: string) => {
    if (readOnly || selectedList.length === 0) return;

    if (onBatchPainChange) {
      onBatchPainChange(selectedList, level);
    } else if (onPainChange) {
      selectedList.forEach((id) => onPainChange(id, level));
    }

    if (onColorChange) {
      selectedList.forEach((id) => onColorChange(id, hex));
    }

    // Automatically deselect region after marking color/pain
    updateSelection([]);
    onClearSelection?.();
  };

  const activePainsCount = Object.values(musclePains).filter((lvl) => lvl > 0).length;
  const selectedMuscleObjects = ALL_ANATOMICAL_ITEMS.filter((m) => selectedList.includes(m.id));

  return (
    <div
      className={`interactive-muscle-map-root ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        width: '100%',
        color: 'var(--text-main)',
      }}
    >
      {/* ── TOOLBAR: View Selector and Quick Selection ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          background: 'var(--bg-subtle)',
          padding: '0.65rem 1rem',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}
      >
        {/* View mode switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Eye size={16} style={{ color: 'var(--secondary)' }} aria-hidden="true" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Vista:</span>
          <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => setActiveView('front')}
              className={`btn ${activeView === 'front' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              Frontal
            </button>
            <button
              type="button"
              onClick={() => setActiveView('back')}
              className={`btn ${activeView === 'back' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              Posterior
            </button>
            <button
              type="button"
              onClick={() => setActiveView('both')}
              className={`btn ${activeView === 'both' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
            >
              Ambas
            </button>
          </div>
        </div>

        {/* Quick selection by muscle group category */}
        {!readOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Seleccionar:
            </span>
            <button
              type="button"
              onClick={() => handleSelectCategory('Tren Superior')}
              className="btn btn-secondary"
              style={{ padding: '0.28rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Tren Superior
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory('Zona Media')}
              className="btn btn-secondary"
              style={{ padding: '0.28rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Zona Media
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory('Tren Inferior')}
              className="btn btn-secondary"
              style={{ padding: '0.28rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Tren Inferior
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory('Articulaciones')}
              className="btn btn-secondary"
              style={{ padding: '0.28rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Articulaciones
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory('all')}
              className="btn btn-secondary"
              style={{ padding: '0.28rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              Todos
            </button>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelectionClick}
                className="btn btn-secondary"
                style={{
                  padding: '0.28rem 0.6rem',
                  fontSize: '0.75rem',
                  borderRadius: '6px',
                  color: 'var(--danger)',
                }}
              >
                Deseleccionar ({selectedList.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── COLOR AND PAIN ASSIGNMENT PANEL (6 OFFICIAL PALETTE COLORS) ── */}
      {!readOnly && (
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: 'var(--text-main)',
                }}
              >
                <Sliders size={16} style={{ color: 'var(--secondary)' }} />
                <span>Colorear / Asignar Nivel de Dolor</span>
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'block',
                  marginTop: '0.15rem',
                }}
              >
                {selectedList.length === 0 ? (
                  'Toca o haz clic en uno o más músculos o articulaciones en el mapa anatómico y luego presiona un color.'
                ) : (
                  <>
                    <strong>{selectedList.length} región(es) seleccionada(s):</strong>{' '}
                    {selectedMuscleObjects.map((m) => m.name).join(', ')}
                  </>
                )}
              </span>
            </div>

            {activePainsCount > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  color: 'var(--danger)',
                  gap: '0.35rem',
                }}
                title="Limpiar todos los dolores y colores asignados"
              >
                <RotateCcw size={13} />
                <span>Limpiar todo ({activePainsCount})</span>
              </button>
            )}
          </div>

          {/* Official palette buttons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: '0.5rem',
            }}
          >
            {OFFICIAL_PALETTE_ITEMS.map((item) => {
              const isDisabled = selectedList.length === 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleApplyColorOrPain(item.level, item.hex)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg-subtle)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.45 : 1,
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  title={item.description}
                >
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: item.colorVar,
                      border: '1.5px solid var(--border)',
                      flexShrink: 0,
                      display: 'inline-block',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <strong
                      style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.2 }}
                    >
                      {item.level === 0 ? 'Blanco (Base)' : `Nivel ${item.level}`}
                    </strong>
                    <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {item.name}
                    </small>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ANATOMICAL VECTOR MAPS CONTAINER (FRONT AND BACK) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            activeView === 'both' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
          gap: '1.5rem',
          background: 'var(--bg-card)',
          padding: '1.5rem 1rem',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
          alignItems: 'start',
          justifyContent: 'center',
        }}
      >
        {/* Frontal view */}
        {(activeView === 'front' || activeView === 'both') && (
          <MuscleMapFront
            selectedMuscles={selectedList}
            musclePains={musclePains}
            muscleColors={muscleColors}
            onMuscleClick={handleMuscleClick}
            onMuscleHover={setHoveredRegion}
            readOnly={readOnly}
          />
        )}

        {/* Posterior view */}
        {(activeView === 'back' || activeView === 'both') && (
          <MuscleMapBack
            selectedMuscles={selectedList}
            musclePains={musclePains}
            muscleColors={muscleColors}
            onMuscleClick={handleMuscleClick}
            onMuscleHover={setHoveredRegion}
            readOnly={readOnly}
          />
        )}
      </div>

      {/* ── ANATOMICAL ORIENTATION AND INFORMATION FOOTER ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          fontSize: '0.82rem',
          color: 'var(--text-muted)',
          padding: '0.5rem 0.75rem',
          background: 'var(--bg-subtle)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Info size={15} style={{ color: 'var(--secondary)', flexShrink: 0 }} />
          <span>
            {hoveredRegion ? (
              <>
                <strong style={{ color: 'var(--text-main)' }}>{hoveredRegion.name}:</strong>{' '}
                {'category' in hoveredRegion
                  ? `Grupo ${(hoveredRegion as OfficialMuscleGroup).category}.`
                  : 'Región articular.'}{' '}
                Visible en vista{' '}
                {hoveredRegion.view === 'both' ? 'frontal y posterior' : hoveredRegion.view}.
              </>
            ) : (
              'Haz clic o toca cualquier músculo anatómico o articulación para seleccionarlo. Puedes pintar varios a la vez.'
            )}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowPerspectiveGuide(!showPerspectiveGuide)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--secondary)',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 700,
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {showPerspectiveGuide ? 'Ocultar guía' : '¿Cómo leer la perspectiva?'}
        </button>
      </div>

      {showPerspectiveGuide && (
        <div
          style={{
            background: 'var(--bg-card)',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            fontSize: '0.82rem',
            lineHeight: 1.55,
            color: 'var(--text-muted)',
          }}
        >
          <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
            Correspondencia Anatómica y Perspectiva:
          </strong>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li>
              <strong>Vista Frontal:</strong> Ves al atleta de frente. Su brazo y pierna derecha
              corresponden al lado izquierdo visual de tu pantalla, y su lado izquierdo al lado
              derecho visual.
            </li>
            <li>
              <strong>Vista Posterior:</strong> Ves al atleta desde atrás. Su lado izquierdo está a
              la izquierda visual de la pantalla, y su lado derecho a la derecha visual.
            </li>
            <li>
              <strong>Los 12 Grupos Oficiales:</strong> Pecho, Hombros, Bíceps, Abdominales,
              Cuádriceps, Gemelos, Espalda Alta, Espalda Media, Espalda Baja, Tríceps, Glúteos e
              Isquiotibiales.
            </li>
            <li>
              <strong>Aislamiento Total:</strong> Cada músculo es una región SVG independiente que
              cambia de color sin afectar a los músculos vecinos.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

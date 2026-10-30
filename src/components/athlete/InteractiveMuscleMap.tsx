import React, { useState } from 'react';
import { RotateCcw, Eye, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { MuscleMapFront } from './MuscleMapFront';
import { MuscleMapBack } from './MuscleMapBack';
import { PainColorSelector } from './PainColorSelector';
import {
  OFFICIAL_MUSCLE_GROUPS,
  OFFICIAL_JOINTS,
  FRONT_OFFICIAL_MUSCLES,
  BACK_OFFICIAL_MUSCLES,
  FRONT_JOINTS,
  BACK_JOINTS,
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
  hasActiveInjury = false,
  hideControls = false,
  className = '',
}) => {
  const [internalSelected, setInternalSelected] = useState<string[]>([]);
  const selectedList = controlledSelected !== undefined ? controlledSelected : internalSelected;

  const [activeView, setActiveView] = useState<ViewMode>(initialView);
  const [lastInteractionView, setLastInteractionView] = useState<'front' | 'back'>('front');
  const [hoveredRegion, setHoveredRegion] = useState<{
    name: string;
    category?: string;
    view: string;
  } | null>(null);
  const [showPerspectiveGuide, setShowPerspectiveGuide] = useState(false);

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

  const handleFrontMuscleClick = (muscleId: string) => {
    setLastInteractionView('front');
    handleMuscleClick(muscleId);
  };

  const handleBackMuscleClick = (muscleId: string) => {
    setLastInteractionView('back');
    handleMuscleClick(muscleId);
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

    // Deseleccionar automáticamente para ocultar el selector
    updateSelection([]);
    onClearSelection?.();
  };

  const activePainsCount = Object.values(musclePains).filter((lvl) => lvl > 0).length;

  const frontMuscleIds = new Set<string>([
    ...FRONT_OFFICIAL_MUSCLES.map((m) => m.id),
    ...FRONT_JOINTS.map((j) => j.id),
  ]);
  const backMuscleIds = new Set<string>([
    ...BACK_OFFICIAL_MUSCLES.map((m) => m.id),
    ...BACK_JOINTS.map((j) => j.id),
  ]);

  const frontPainsCount = Object.keys(musclePains).filter(
    (id) => frontMuscleIds.has(id) && (musclePains[id] ?? 0) > 0,
  ).length;

  const backPainsCount = Object.keys(musclePains).filter(
    (id) => backMuscleIds.has(id) && (musclePains[id] ?? 0) > 0,
  ).length;

  const hasSelection = !readOnly && selectedList.length > 0;
  const showFrontSelector =
    hasSelection && (lastInteractionView === 'front' || activeView === 'front');
  const showBackSelector =
    hasSelection && (lastInteractionView === 'back' || activeView === 'back') && !showFrontSelector;

  const colorSelectorElement = (
    <PainColorSelector onSelectColor={handleApplyColorOrPain} hasActiveInjury={hasActiveInjury} />
  );

  return (
    <div
      className={`interactive-muscle-map-root ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        width: '100%',
        color: 'var(--text-main)',
      }}
    >
      {/* ── TOOLBAR: View Selector and Quick Selection (cuando no está en modo limpio) ── */}
      {!hideControls && (
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
                Trasera
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

          {/* Quick selection and global actions */}
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
              {activePainsCount > 0 && onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.28rem 0.6rem',
                    borderRadius: '6px',
                    color: 'var(--danger)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title="Limpiar todos los dolores y colores asignados"
                >
                  <RotateCcw size={12} />
                  <span>Limpiar todo ({activePainsCount})</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ANATOMICAL VECTOR MAPS CONTAINER (FRONT AND BACK) ── */}
      <div
        className="muscle-map-views-container"
        style={
          hideControls
            ? {
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                position: 'relative',
              }
            : undefined
        }
      >
        {/* Pastillas sutiles a los costados del cuerpo humano para alternar Frente / Trasero sin ocupar espacio vertical */}
        {hideControls && (
          <>
            <button
              type="button"
              className={`muscle-side-nav-pill left ${activeView === 'front' ? 'active' : ''}`}
              onClick={() => setActiveView('front')}
              aria-label="Ver vista frontal"
              title="Ver vista frontal"
            >
              <ChevronLeft size={15} />
              <span>Frente</span>
              {frontPainsCount > 0 && (
                <span className="muscle-side-nav-counter">{frontPainsCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`muscle-side-nav-pill right ${activeView === 'back' ? 'active' : ''}`}
              onClick={() => setActiveView('back')}
              aria-label="Ver vista trasera"
              title="Ver vista trasera"
            >
              <span>Trasero</span>
              {backPainsCount > 0 && (
                <span className="muscle-side-nav-counter">{backPainsCount}</span>
              )}
              <ChevronRight size={15} />
            </button>
          </>
        )}

        {/* Frontal view */}
        {(activeView === 'front' || activeView === 'both') && (
          <MuscleMapFront
            selectedMuscles={selectedList}
            musclePains={musclePains}
            muscleColors={muscleColors}
            onMuscleClick={handleFrontMuscleClick}
            onMuscleHover={setHoveredRegion}
            readOnly={readOnly}
            hideHeader={hideControls}
            sideContent={!hideControls && showFrontSelector ? colorSelectorElement : undefined}
          />
        )}

        {/* Trasera view */}
        {(activeView === 'back' || activeView === 'both') && (
          <MuscleMapBack
            selectedMuscles={selectedList}
            musclePains={musclePains}
            muscleColors={muscleColors}
            onMuscleClick={handleBackMuscleClick}
            onMuscleHover={setHoveredRegion}
            readOnly={readOnly}
            hideHeader={hideControls}
            sideContent={!hideControls && showBackSelector ? colorSelectorElement : undefined}
          />
        )}

        {/* Floating Centered Selector when in clean hideControls mode */}
        {hideControls && hasSelection && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 40,
              background: 'var(--checkin-card-bg)',
              borderRadius: '20px',
              padding: '1rem 1.15rem',
              boxShadow: 'var(--checkin-card-shadow)',
              border: '2px solid var(--checkin-card-border)',
              maxWidth: '225px',
              width: '90%',
              transition: 'background-color 0.25s ease, border-color 0.25s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.85rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--checkin-card-border)',
              }}
            >
              <span
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  color: 'var(--checkin-title-color)',
                  fontFamily: 'Montserrat, sans-serif',
                }}
              >
                Asignar intensidad:
              </span>
              <button
                type="button"
                onClick={handleClearSelectionClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: '0.1rem 0.35rem',
                  lineHeight: 1,
                  fontWeight: 700,
                }}
                title="Cerrar selector"
              >
                ✕
              </button>
            </div>
            <PainColorSelector
              onSelectColor={handleApplyColorOrPain}
              hasActiveInjury={hasActiveInjury}
            />
          </div>
        )}
      </div>

      {/* ── ANATOMICAL ORIENTATION AND INFORMATION FOOTER ── */}
      {!hideControls && (
        <>
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
              <strong
                style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}
              >
                Correspondencia Anatómica y Perspectiva:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                <li>
                  <strong>Vista Frontal:</strong> Ves al atleta de frente. Su brazo y pierna derecha
                  corresponden al lado izquierdo visual de tu pantalla, y su lado izquierdo al lado
                  derecho visual.
                </li>
                <li>
                  <strong>Vista Trasera:</strong> Ves al atleta desde atrás. Su lado izquierdo está
                  a la izquierda visual de la pantalla, y su lado derecho a la derecha visual.
                </li>
                <li>
                  <strong>Los 12 Grupos Oficiales:</strong> Pecho, Hombros, Bíceps, Abdominales,
                  Cuádriceps, Gemelos, Espalda Alta, Espalda Media, Espalda Baja, Tríceps, Glúteos e
                  Isquiotibiales.
                </li>
                <li>
                  <strong>Aislamiento Total:</strong> Cada músculo es una región SVG independiente
                  que cambia de color sin afectar a los músculos vecinos.
                </li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

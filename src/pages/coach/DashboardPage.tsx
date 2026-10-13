import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GripVertical, ChevronLeft, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react';
import runnerImg from '../../assets/protraining-3d-runner.jpg';
import { PageHeader } from '../../components/shell/PageHeader';

interface WireframeCardItem {
  id: string;
  name: string;
  colSpan: number; // 1 o 2 columnas en grid de 4
  type: 'empty' | 'suite';
}

const DEFAULT_ROW_1: WireframeCardItem[] = [
  { id: 'r1-c1', name: 'Módulo 1-A', colSpan: 1, type: 'empty' },
  { id: 'r1-c2', name: 'Módulo 1-B', colSpan: 1, type: 'empty' },
  { id: 'r1-c3', name: 'Módulo 1-C', colSpan: 1, type: 'empty' },
  { id: 'r1-c4', name: 'Módulo 1-D', colSpan: 1, type: 'empty' },
];

const DEFAULT_ROW_2: WireframeCardItem[] = [
  { id: 'r2-c1', name: 'Módulo 2-A', colSpan: 1, type: 'empty' },
  { id: 'r2-c2', name: 'Módulo 2-B', colSpan: 1, type: 'empty' },
  { id: 'r2-c3', name: 'Módulo 2-C', colSpan: 1, type: 'empty' },
  { id: 'r2-c4', name: 'Módulo 2-D', colSpan: 1, type: 'empty' },
  { id: 'r2-c5', name: 'Módulo 2-E', colSpan: 1, type: 'empty' },
];

const DEFAULT_ROW_3: WireframeCardItem[] = [
  { id: 'r3-suite', name: 'ProTraining Suite', colSpan: 2, type: 'suite' },
  { id: 'r3-empty-1', name: 'Módulo 3-B', colSpan: 1, type: 'empty' },
  { id: 'r3-empty-2', name: 'Módulo 3-C', colSpan: 1, type: 'empty' },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAthlete = location.pathname.startsWith('/athlete');
  const storageKey = isAthlete
    ? 'protraining_wireframe_bento_athlete_v3'
    : 'protraining_wireframe_bento_coach_v3';

  // Estados de cada fila por separado para aislamiento estricto
  const [row1, setRow1] = useState<WireframeCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.row1) && parsed.row1.length === 4) return parsed.row1;
      }
    } catch {
      // Ignorar fallback
    }
    return DEFAULT_ROW_1;
  });

  const [row2, setRow2] = useState<WireframeCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.row2) && parsed.row2.length === 5) return parsed.row2;
      }
    } catch {
      // Ignorar fallback
    }
    return DEFAULT_ROW_2;
  });

  const [row3, setRow3] = useState<WireframeCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.row3) && parsed.row3.length === 3) return parsed.row3;
      }
    } catch {
      // Ignorar fallback
    }
    return DEFAULT_ROW_3;
  });

  // Guardar en localStorage cada vez que cambien las filas
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ row1, row2, row3 }));
    } catch {
      // Ignorar quota errors
    }
  }, [row1, row2, row3, storageKey]);

  // Estado del Drag & Drop
  const [dragSource, setDragSource] = useState<{
    rowId: number;
    index: number;
    cardId: string;
  } | null>(null);

  const [dragOverTarget, setDragOverTarget] = useState<{
    rowId: number;
    index: number;
  } | null>(null);

  const [recentlySwappedId, setRecentlySwappedId] = useState<string | null>(null);

  // Función utilitaria para intercambiar elementos dentro de un array
  const swapElements = <T,>(arr: T[], idxA: number, idxB: number): T[] => {
    if (idxA === idxB || idxA < 0 || idxB < 0 || idxA >= arr.length || idxB >= arr.length) {
      return arr;
    }
    const copy = [...arr];
    const temp = copy[idxA];
    copy[idxA] = copy[idxB];
    copy[idxB] = temp;
    return copy;
  };

  // Intercambio por fila (aislamiento estricto)
  const swapInRow = (rowId: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;

    if (rowId === 1) {
      setRow1((prev) => {
        const updated = swapElements(prev, fromIdx, toIdx);
        setRecentlySwappedId(updated[toIdx].id);
        return updated;
      });
    } else if (rowId === 2) {
      setRow2((prev) => {
        const updated = swapElements(prev, fromIdx, toIdx);
        setRecentlySwappedId(updated[toIdx].id);
        return updated;
      });
    } else if (rowId === 3) {
      setRow3((prev) => {
        const updated = swapElements(prev, fromIdx, toIdx);
        setRecentlySwappedId(updated[toIdx].id);
        return updated;
      });
    }

    setTimeout(() => {
      setRecentlySwappedId(null);
    }, 900);
  };

  // Mover a la izquierda con un click
  const moveLeft = (rowId: number, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) {
      swapInRow(rowId, index, index - 1);
    }
  };

  // Mover a la derecha con un click
  const moveRight = (rowId: number, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const maxIndex =
      rowId === 1 ? row1.length - 1 : rowId === 2 ? row2.length - 1 : row3.length - 1;
    if (index < maxIndex) {
      swapInRow(rowId, index, index + 1);
    }
  };

  // Restablecer el orden original
  const resetLayout = () => {
    setRow1(DEFAULT_ROW_1);
    setRow2(DEFAULT_ROW_2);
    setRow3(DEFAULT_ROW_3);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignorar
    }
  };

  // Manejo de eventos de Drag & Drop
  const handleDragStart = (rowId: number, index: number, cardId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ rowId, index, cardId }));
    e.dataTransfer.effectAllowed = 'move';
    setDragSource({ rowId, index, cardId });
  };

  const handleDragOver = (rowId: number, index: number, e: React.DragEvent) => {
    e.preventDefault();
    // REGLA ESTRICTA: Solo permitir drop si pertenece a la misma fila
    if (dragSource && dragSource.rowId === rowId) {
      e.dataTransfer.dropEffect = 'move';
      if (!dragOverTarget || dragOverTarget.rowId !== rowId || dragOverTarget.index !== index) {
        setDragOverTarget({ rowId, index });
      }
    } else {
      // Bloquear drop entre filas distintas
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (rowId: number, index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverTarget && dragOverTarget.rowId === rowId && dragOverTarget.index === index) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (rowId: number, targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();

    // Validar que provenga de la misma fila
    if (!dragSource || dragSource.rowId !== rowId) {
      setDragSource(null);
      setDragOverTarget(null);
      return;
    }

    if (dragSource.index !== targetIndex) {
      swapInRow(rowId, dragSource.index, targetIndex);
    }

    setDragSource(null);
    setDragOverTarget(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOverTarget(null);
  };

  // Renderizador de una tarjeta individual
  const renderCard = (
    card: WireframeCardItem,
    rowId: number,
    index: number,
    totalInRow: number,
  ) => {
    const isDragging = dragSource?.cardId === card.id;
    const isDragOver =
      dragOverTarget?.rowId === rowId &&
      dragOverTarget?.index === index &&
      dragSource?.cardId !== card.id;
    const isRecentlyMoved = recentlySwappedId === card.id;
    const isForbidden = dragSource !== null && dragSource.rowId !== rowId;

    const spanClass = card.colSpan === 2 ? 'wireframe-col-2' : 'wireframe-col-1';

    // ── Caso A: Tarjeta PROTRAINING SUITE (Fila 3) ──
    if (card.type === 'suite') {
      return (
        <div
          key={card.id}
          draggable
          onDragStart={(e) => handleDragStart(rowId, index, card.id, e)}
          onDragOver={(e) => handleDragOver(rowId, index, e)}
          onDragLeave={(e) => handleDragLeave(rowId, index, e)}
          onDrop={(e) => handleDrop(rowId, index, e)}
          onDragEnd={handleDragEnd}
          className={`wireframe-card wireframe-suite-card ${spanClass} ${
            isDragging ? 'is-dragging' : ''
          } ${isDragOver ? 'is-drag-over' : ''} ${isRecentlyMoved ? 'is-recently-moved' : ''} ${
            isForbidden ? 'is-forbidden' : ''
          }`}
          title="Arrastrá para intercambiar posición en esta fila"
        >
          {/* Imagen de fondo del corredor 3D */}
          <img
            src={runnerImg}
            alt="Corredor 3D ProTraining"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.32,
              pointerEvents: 'none',
            }}
          />

          {/* Barra de herramientas para mover en hover / drag */}
          <div className="wireframe-card-toolbar">
            {index > 0 && (
              <button
                type="button"
                className="wireframe-control-btn"
                onClick={(e) => moveLeft(rowId, index, e)}
                title="Mover a la izquierda"
                aria-label="Mover a la izquierda"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            {index < totalInRow - 1 && (
              <button
                type="button"
                className="wireframe-control-btn"
                onClick={(e) => moveRight(rowId, index, e)}
                title="Mover a la derecha"
                aria-label="Mover a la derecha"
              >
                <ChevronRight size={16} />
              </button>
            )}
            <span className="wireframe-drag-handle" title="Arrastrar para mover por fila">
              <GripVertical size={18} />
            </span>
          </div>

          {/* Contenido textual del banner */}
          <div
            style={{
              position: 'relative',
              padding: '1.75rem',
              zIndex: 2,
              background:
                'linear-gradient(to top, rgba(2, 48, 80, 0.95) 0%, rgba(2, 48, 80, 0.4) 100%)',
            }}
          >
            <div style={{ marginBottom: '0.65rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.28rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {isAthlete ? 'PROTRAINING ATLETA' : 'PROTRAINING SUITE'}
              </span>
            </div>

            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                margin: '0 0 0.4rem',
                color: '#ffffff',
                lineHeight: 1.25,
              }}
            >
              {isAthlete ? 'Mi Planificación y Rendimiento Físico' : 'Gestión Integral de Atletas y Clubes'}
            </h3>

            <p
              style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.78)',
                margin: '0 0 1.15rem',
                maxWidth: '480px',
                lineHeight: 1.4,
              }}
            >
              {isAthlete
                ? 'Accedé a tus rutinas asignadas, calendario de entrenamientos y evolución física.'
                : 'Administrá tus organizaciones, categorías y fichas médicas con precisión científica.'}
            </p>

            <div>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: 'var(--secondary)',
                  borderRadius: '9999px',
                  padding: '0.5rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                }}
                onClick={() => navigate(isAthlete ? '/athlete/routine' : '/pf/athletes')}
              >
                <span>{isAthlete ? 'Ver Rutina' : 'Ver Atletas'}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Caso B: Tarjeta Vacía Limpia (Fila 1, Fila 2, Fila 3 derecha) ──
    return (
      <div
        key={card.id}
        draggable
        onDragStart={(e) => handleDragStart(rowId, index, card.id, e)}
        onDragOver={(e) => handleDragOver(rowId, index, e)}
        onDragLeave={(e) => handleDragLeave(rowId, index, e)}
        onDrop={(e) => handleDrop(rowId, index, e)}
        onDragEnd={handleDragEnd}
        className={`wireframe-card ${spanClass} ${isDragging ? 'is-dragging' : ''} ${
          isDragOver ? 'is-drag-over' : ''
        } ${isRecentlyMoved ? 'is-recently-moved' : ''} ${isForbidden ? 'is-forbidden' : ''}`}
        title="Arrastrá para intercambiar posición en esta fila"
      >
        {/* Barra de herramientas que aparece al hover para reordenar */}
        <div className="wireframe-card-toolbar">
          {index > 0 && (
            <button
              type="button"
              className="wireframe-control-btn"
              onClick={(e) => moveLeft(rowId, index, e)}
              title="Mover a la izquierda"
              aria-label="Mover a la izquierda"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {index < totalInRow - 1 && (
            <button
              type="button"
              className="wireframe-control-btn"
              onClick={(e) => moveRight(rowId, index, e)}
              title="Mover a la derecha"
              aria-label="Mover a la derecha"
            >
              <ChevronRight size={16} />
            </button>
          )}
          <span className="wireframe-drag-handle" title="Arrastrar para mover por fila">
            <GripVertical size={18} />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-page-container">
      {/* Encabezado estandarizado con título Inicio y botón de restablecer diseño */}
      <PageHeader
        title="Inicio"
        description={
          isAthlete
            ? 'Panel principal y seguimiento de entrenamiento.'
            : 'Panel general de control y gestión deportiva.'
        }
        actions={
          <button
            type="button"
            onClick={resetLayout}
            className="btn btn-secondary"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              opacity: 0.85,
              transition: 'opacity 0.15s ease',
            }}
            title="Restablecer orden predeterminado de los módulos"
          >
            <RotateCcw size={13} />
            <span>Restablecer orden</span>
          </button>
        }
      />

      <div className="app-page-body wireframe-dashboard-container">
        {/* ── Fila 1: 4 campos vacíos (span 1 cada uno) ── */}
        <div className="wireframe-row wireframe-row-1" aria-label="Fila 1 de módulos">
          {row1.map((card, idx) => renderCard(card, 1, idx, row1.length))}
        </div>

        {/* ── Fila 2: 3 campos vacíos (1 col, 2 cols, 1 col) ── */}
        <div className="wireframe-row wireframe-row-2" aria-label="Fila 2 de módulos">
          {row2.map((card, idx) => renderCard(card, 2, idx, row2.length))}
        </div>

        {/* ── Fila 3: Tarjeta Suite (2 cols) y Campo vacío (2 cols) ── */}
        <div className="wireframe-row wireframe-row-3" aria-label="Fila 3 de módulos">
          {row3.map((card, idx) => renderCard(card, 3, idx, row3.length))}
        </div>
      </div>
    </div>
  );
};

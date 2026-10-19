import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dumbbell,
  Sparkles,
  AlertCircle,
  Calendar,
  RotateCcw,
  MessageSquare,
  Award,
  Check,
  CheckCircle2,
  X,
  Activity,
  Trophy,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ExerciseMuscleMap } from '../../components/exercises/ExerciseMuscleMap';
import {
  getMyTodayRoutine,
  type TodayRoutineResponse,
  type TodayRoutineExercise,
} from '../../api/generated/entrenamiento';

// Rutina fallback realista en caso de que el backend esté desconectado o en desarrollo sin Docker
const FALLBACK_TODAY_ROUTINE: TodayRoutineResponse = {
  athleteId: '00000000-0000-0000-0000-000000000001',
  athleteName: 'Lucas Fernández',
  date: new Date().toISOString().split('T')[0],
  hasActiveInjuries: false,
  routineAdapted: false,
  coachNotes:
    'Controlar técnica en descenso y mantener pausa de 1 segundo en la máxima flexión. No arquear la zona lumbar.',
  exercises: [
    {
      exerciseId: 'b501d51c-4b53-4dc9-985f-8646f9037cfa',
      name: 'Back Squat (Sentadilla Trasera)',
      muscleGroup: 'Piernas',
      videoUrl: 'https://www.youtube.com/watch?v=aclHkVaku9U',
      sets: 4,
      reps: 6,
      percentage: 80,
      weightKg: 82.5,
      current1RmKg: 102.5,
      isReference: false,
    },
    {
      exerciseId: 'b501d51c-4b53-4dc9-985f-8646f9037cfb',
      name: 'Press Militar con Barra',
      muscleGroup: 'Hombros',
      videoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
      sets: 3,
      reps: 8,
      percentage: 75,
      weightKg: 52.5,
      current1RmKg: 70.0,
      isReference: false,
    },
    {
      exerciseId: 'b501d51c-4b53-4dc9-985f-8646f9037cfc',
      name: 'Peso Muerto Rumano Unilateral',
      muscleGroup: 'Cadena Posterior',
      videoUrl: null,
      sets: 3,
      reps: 8,
      percentage: 70,
      weightKg: 32.5,
      current1RmKg: 47.5,
      isReference: false,
    },
    {
      exerciseId: 'b501d51c-4b53-4dc9-985f-8646f9037cfd',
      name: 'Pallof Press con Banda',
      muscleGroup: 'Core',
      videoUrl: null,
      sets: 3,
      reps: 12,
      percentage: 0,
      weightKg: null,
      current1RmKg: null,
      isReference: true,
    },
  ],
};

function formatSpanishDate(dateString: string): string {
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
    const d = new Date(dateString);
    return d.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateString;
  }
}

function getStorageKey(date?: string, athleteId?: string): string {
  const safeDate = date || new Date().toISOString().split('T')[0];
  const safeAthlete = athleteId || 'current';
  return `protraining_sets_${safeDate}_${safeAthlete}`;
}

export const RoutinePage: React.FC = () => {
  const [routine, setRoutine] = useState<TodayRoutineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExerciseForModal, setSelectedExerciseForModal] =
    useState<TodayRoutineExercise | null>(null);

  // Estado de series completadas (almacenado en localStorage para persistencia en el gimnasio)
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`protraining_sets_${today}_current`);
      if (saved) {
        return JSON.parse(saved) as Record<string, boolean>;
      }
      const generic = localStorage.getItem(`protraining_sets_${today}`);
      return generic ? (JSON.parse(generic) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  // Carga de la rutina del atleta autenticado
  const fetchRoutine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyTodayRoutine();
      const loadedRoutine = response.data || FALLBACK_TODAY_ROUTINE;
      setRoutine(loadedRoutine);

      // Cargar series guardadas para esta rutina específica
      try {
        const key = getStorageKey(loadedRoutine.date, loadedRoutine.athleteId);
        const saved = localStorage.getItem(key);
        if (saved) {
          setCompletedSets(JSON.parse(saved));
        }
      } catch {
        // Ignorar error de acceso a localStorage
      }
    } catch (err) {
      console.warn('Aviso: usando rutina de demostración offline para la sesión de hoy.', err);
      setRoutine(FALLBACK_TODAY_ROUTINE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getMyTodayRoutine();
        if (!isMounted) return;
        const loadedRoutine = response.data || FALLBACK_TODAY_ROUTINE;
        setRoutine(loadedRoutine);

        try {
          const key = getStorageKey(loadedRoutine.date, loadedRoutine.athleteId);
          const saved = localStorage.getItem(key);
          if (saved && isMounted) {
            setCompletedSets(JSON.parse(saved));
          }
        } catch {
          // Ignorar error de acceso a localStorage
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Aviso: usando rutina de demostración offline para la sesión de hoy.', err);
        setRoutine(FALLBACK_TODAY_ROUTINE);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedExerciseForModal) {
        setSelectedExerciseForModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedExerciseForModal]);

  const exercises = useMemo(() => routine?.exercises ?? [], [routine]);

  // Alternar completitud de una serie individual (Touch target accesible)
  const toggleSet = useCallback(
    (exerciseKey: string, setIndex: number) => {
      setCompletedSets((prev) => {
        const key = `${exerciseKey}_set_${setIndex}`;
        const next = { ...prev, [key]: !prev[key] };
        try {
          const storageKey = getStorageKey(routine?.date, routine?.athleteId);
          localStorage.setItem(storageKey, JSON.stringify(next));
          if (routine?.date) {
            localStorage.setItem(`protraining_sets_${routine.date}`, JSON.stringify(next));
          }
        } catch {
          // Ignorar errores de guardado local
        }
        return next;
      });
    },
    [routine],
  );

  // Métricas globales de la sesión (Progreso global de series)
  const sessionStats = useMemo(() => {
    if (exercises.length === 0) {
      return { totalSets: 0, completedCount: 0, percent: 0, isAllCompleted: false };
    }

    let totalSets = 0;
    let completedCount = 0;

    exercises.forEach((ex, exIdx) => {
      const exKey = ex.exerciseId || `ex-${exIdx}`;
      const count = ex.sets || 0;
      totalSets += count;
      for (let s = 1; s <= count; s++) {
        if (completedSets[`${exKey}_set_${s}`]) {
          completedCount++;
        }
      }
    });

    const percent = totalSets > 0 ? Math.round((completedCount / totalSets) * 100) : 0;
    const isAllCompleted = totalSets > 0 && completedCount === totalSets;

    return { totalSets, completedCount, percent, isAllCompleted };
  }, [exercises, completedSets]);

  return (
    <div className="app-page-container">
      {/* ── Encabezado Estándar ── */}
      <PageHeader
        title="Mi Rutina"
        description="Planificación de hoy con pesos calculados en barra e indicaciones técnicas del PF."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', gap: '0.4rem' }}
              onClick={fetchRoutine}
              title="Actualizar rutina"
            >
              <RotateCcw size={15} />
              <span>Actualizar</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {/* ── Estado de Carga ── */}
        {isLoading && (
          <div
            className="card"
            style={{
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '3px solid var(--border)',
                borderTopColor: 'var(--secondary)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Cargando tu planificación del día y pesos en barra...
            </span>
          </div>
        )}

        {/* ── Error al Cargar ── */}
        {!isLoading && error && (
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: 'var(--danger-bg)',
              borderColor: 'var(--danger-border)',
            }}
          >
            <AlertCircle size={28} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--danger-text)', display: 'block' }}>
                Error al consultar la rutina
              </strong>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'var(--danger-text)' }}>
                {error}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={fetchRoutine}
              style={{ marginLeft: 'auto' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Contenido Principal de la Rutina ── */}
        {!isLoading && routine && (
          <>
            {/* 1. Tarjeta Resumen de la Sesión */}
            <div
              className="card"
              style={{
                margin: 0,
                padding: '1.25rem 1.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span className="badge badge-info" style={{ gap: '0.35rem' }}>
                      <Calendar size={13} />
                      <span style={{ textTransform: 'capitalize' }}>
                        {formatSpanishDate(routine.date)}
                      </span>
                    </span>

                    {routine.routineAdapted && (
                      <span className="badge badge-warning" style={{ gap: '0.35rem' }}>
                        <Sparkles size={13} />
                        <span>Rutina adaptada por check-in</span>
                      </span>
                    )}
                  </div>

                  <h2
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      margin: '0.2rem 0 0.2rem',
                      color: 'var(--text-main)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Sesión del Día
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                    {exercises.length > 0
                      ? `${exercises.length} ejercicios prescritos (${sessionStats.totalSets} series totales)`
                      : 'Día de descanso o sin sesión activa'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Barra Ergonómica de Progreso de la Sesión */}
            {exercises.length > 0 && (
              <div className="routine-session-progress">
                <div className="routine-progress-header">
                  <span className="routine-progress-title">
                    <Activity size={17} style={{ color: 'var(--secondary)' }} />
                    <span>Progreso de Series de Hoy</span>
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: sessionStats.isAllCompleted ? 'var(--stat-green)' : 'var(--text-main)',
                    }}
                  >
                    {sessionStats.completedCount} de {sessionStats.totalSets} completadas (
                    {sessionStats.percent}%)
                  </span>
                </div>

                <div className="routine-progress-track">
                  <div
                    className="routine-progress-bar-fill"
                    style={{ width: `${sessionStats.percent}%` }}
                  />
                </div>

                {sessionStats.isAllCompleted && (
                  <div className="routine-progress-celebration">
                    <Trophy size={20} style={{ color: 'var(--stat-green)', flexShrink: 0 }} />
                    <span>
                      ¡Excelente trabajo! Has completado todas las series planificadas para hoy.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 3. Cabecera con Nota del Preparador Físico (Pizarra táctica) */}
            {routine.coachNotes && (
              <div className="routine-coach-note-card">
                <div className="routine-coach-note-header">
                  <div className="routine-coach-note-title-wrap">
                    <MessageSquare size={17} />
                    <span>Indicación del Preparador Físico</span>
                  </div>
                  <span className="badge badge-info">Nota técnica de la sesión</span>
                </div>
                <p className="routine-coach-note-text">"{routine.coachNotes}"</p>
              </div>
            )}

            {/* 4. Caso Día de Descanso o Sin Ejercicios Prescritos */}
            {exercises.length === 0 && (
              <div className="card routine-rest-card">
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--info-bg)',
                    color: 'var(--secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Award size={32} />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      color: 'var(--text-main)',
                      margin: '0 0 0.35rem',
                    }}
                  >
                    Día de Descanso o Recuperación
                  </h3>
                  <p
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.9rem',
                      maxWidth: '460px',
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    Hoy no tenés ejercicios prescritos en tu planificación activa. Aprovechá para
                    descansar, mantener una buena nutrición e hidratación y recargar energías.
                  </p>
                </div>
              </div>
            )}

            {/* 5. Lista Ergonómica Móvil de Ejercicios con Series, Reps, Peso y Marcado de Series */}
            {exercises.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                {exercises.map((exercise, exIdx) => {
                  const exKey = exercise.exerciseId || `ex-${exIdx}`;

                  // Contabilizar series completadas para este ejercicio
                  let completedForEx = 0;
                  for (let s = 1; s <= exercise.sets; s++) {
                    if (completedSets[`${exKey}_set_${s}`]) {
                      completedForEx++;
                    }
                  }
                  const isExerciseComplete = exercise.sets > 0 && completedForEx === exercise.sets;

                  return (
                    <div
                      key={exKey}
                      className={`routine-exercise-card ${
                        isExerciseComplete ? 'all-completed' : ''
                      }`}
                    >
                      {/* Icono del Ejercicio */}
                      <button
                        type="button"
                        className="routine-exercise-icon-badge"
                        onClick={() => setSelectedExerciseForModal(exercise)}
                        title="Ver técnica del ejercicio"
                        style={{ cursor: 'pointer' }}
                      >
                        <Dumbbell size={22} />
                      </button>

                      {/* Nombre, Grupo Muscular y Datos de Prescripción */}
                      <div className="routine-exercise-info">
                        <div className="routine-exercise-name-row">
                          <h4
                            className="routine-exercise-name"
                            onClick={() => setSelectedExerciseForModal(exercise)}
                            title="Ver técnica del ejercicio"
                          >
                            {exercise.name}
                          </h4>
                          {exercise.muscleGroup && (
                            <span className="routine-tag-pill">{exercise.muscleGroup}</span>
                          )}
                          {isExerciseComplete && (
                            <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                              <CheckCircle2 size={13} />
                              <span>Completado</span>
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            flexWrap: 'wrap',
                            marginTop: '0.2rem',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: 'var(--text-main)',
                            }}
                          >
                            {exercise.sets} series × {exercise.reps} reps
                          </span>

                          {exercise.percentage !== undefined && exercise.percentage > 0 && (
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: 'var(--text-muted)',
                              }}
                            >
                              ({exercise.percentage}% 1RM)
                            </span>
                          )}

                          {exercise.current1RmKg !== undefined &&
                            exercise.current1RmKg !== null && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                }}
                              >
                                · 1RM ref: {exercise.current1RmKg} kg
                              </span>
                            )}

                          <button
                            type="button"
                            className="routine-tech-btn"
                            onClick={() => setSelectedExerciseForModal(exercise)}
                          >
                            <Activity size={13} />
                            <span>Ver técnica</span>
                          </button>
                        </div>
                      </div>

                      {/* PESO EXACTO A COLOCAR EN BARRA (Destacado para el gimnasio) */}
                      <div
                        className={`routine-weight-callout ${
                          exercise.isReference ? 'reference' : 'highlight'
                        }`}
                        title={
                          exercise.isReference
                            ? 'Serie de referencia sin récord previo'
                            : 'Peso exacto a colocar en la barra'
                        }
                      >
                        {exercise.weightKg !== null && exercise.weightKg !== undefined ? (
                          <>
                            <span className="routine-weight-number">
                              {exercise.weightKg}{' '}
                              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>kg</span>
                            </span>
                            <span className="routine-weight-label">En Barra</span>
                          </>
                        ) : (
                          <>
                            <span className="routine-weight-number warning">Carga Libre</span>
                            <span className="routine-weight-label">Calibración</span>
                          </>
                        )}
                      </div>

                      {/* TRACKER DE SERIES DEL EJERCICIO (KAN-066 - Touch Targets Ergonómicos) */}
                      <div className="routine-sets-tracker">
                        <div className="routine-sets-header">
                          <span>Series a registrar:</span>
                          <span>
                            {completedForEx} de {exercise.sets} completadas
                          </span>
                        </div>

                        <div className="routine-sets-grid">
                          {Array.from({ length: exercise.sets }, (_, i) => i + 1).map((sNum) => {
                            const isDone = !!completedSets[`${exKey}_set_${sNum}`];
                            return (
                              <button
                                key={sNum}
                                type="button"
                                className={`routine-set-chip ${isDone ? 'completed' : ''}`}
                                onClick={() => toggleSet(exKey, sNum)}
                                aria-label={`Serie ${sNum} de ${exercise.name}: ${
                                  isDone ? 'completada' : 'pendiente'
                                }`}
                              >
                                {isDone ? (
                                  <Check size={16} />
                                ) : (
                                  <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>●</span>
                                )}
                                <span>Serie {sNum}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal de Técnica, Video y Mapa Anatómico del Ejercicio ── */}
      {selectedExerciseForModal && (
        <div
          className="routine-modal-backdrop"
          onClick={() => setSelectedExerciseForModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="routine-modal-title"
        >
          <div className="routine-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Encabezado del Modal */}
            <div className="routine-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 id="routine-modal-title" className="routine-modal-title">
                    {selectedExerciseForModal.name}
                  </h3>
                  {selectedExerciseForModal.muscleGroup && (
                    <span className="routine-tag-pill">{selectedExerciseForModal.muscleGroup}</span>
                  )}
                </div>
                <p
                  style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}
                >
                  Guía técnica de ejecución y prescripción para hoy
                </p>
              </div>

              <button
                type="button"
                className="routine-modal-close-btn"
                onClick={() => setSelectedExerciseForModal(null)}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="routine-modal-body">
              {/* Prescripción Resumida */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.65rem',
                  flexWrap: 'wrap',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}
                  >
                    CARGA OBJETIVO
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--secondary)' }}>
                    {selectedExerciseForModal.weightKg !== null &&
                    selectedExerciseForModal.weightKg !== undefined
                      ? `${selectedExerciseForModal.weightKg} kg en barra`
                      : 'Carga Libre / Calibración'}
                  </span>
                </div>

                <div
                  style={{
                    width: '1px',
                    background: 'var(--border)',
                    margin: '0 0.5rem',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}
                  >
                    VOLUMEN
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {selectedExerciseForModal.sets} series × {selectedExerciseForModal.reps} reps
                  </span>
                </div>

                {selectedExerciseForModal.percentage !== undefined &&
                  selectedExerciseForModal.percentage > 0 && (
                    <>
                      <div
                        style={{
                          width: '1px',
                          background: 'var(--border)',
                          margin: '0 0.5rem',
                        }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                          }}
                        >
                          INTENSIDAD
                        </span>
                        <span
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: 'var(--text-main)',
                          }}
                        >
                          {selectedExerciseForModal.percentage}% 1RM
                        </span>
                      </div>
                    </>
                  )}
              </div>

              {/* Mapa Anatómico de Activación Muscular */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Activity size={17} style={{ color: 'var(--secondary)' }} />
                  <h4
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      margin: 0,
                    }}
                  >
                    Activación Muscular Anatómica
                  </h4>
                </div>

                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '1rem',
                  }}
                >
                  <ExerciseMuscleMap
                    primaryMuscles={
                      selectedExerciseForModal.muscleGroup
                        ? [selectedExerciseForModal.muscleGroup]
                        : []
                    }
                    showLegend={true}
                    showViewToggle={true}
                  />
                </div>
              </div>

              {/* Indicación Técnica del Preparador Físico para la Sesión */}
              {routine?.coachNotes && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    padding: '0.95rem 1.15rem',
                    borderRadius: '12px',
                    background: 'var(--info-bg)',
                    border: '1px solid var(--info-border)',
                  }}
                >
                  <strong
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <MessageSquare size={15} />
                    <span>Indicación del Preparador Físico:</span>
                  </strong>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.86rem',
                      color: 'var(--text-main)',
                      lineHeight: 1.5,
                      fontStyle: 'italic',
                    }}
                  >
                    "{routine.coachNotes}"
                  </p>
                </div>
              )}
            </div>

            {/* Pie del Modal con Botón Ergonómico de Cierre */}
            <div className="routine-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedExerciseForModal(null)}
              >
                Cerrar
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedExerciseForModal(null)}
                style={{ gap: '0.4rem' }}
              >
                <Check size={16} />
                <span>Entendido, volver a entrenar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

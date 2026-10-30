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
import { useSearchParams } from 'react-router-dom';
import { todayInArgentina } from '../../utils/argentinaDate';
import { ExerciseMuscleMap } from '../../components/exercises/ExerciseMuscleMap';
import { ExerciseGifImage } from '../../components/exercises/ExerciseGifImage';
import {
  getMyTodayRoutine,
  type TodayRoutineResponse,
  type TodayRoutineExercise,
} from '../../api/generated/entrenamiento';
import { extractErrorMessage } from '../../api/axiosClient';

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

function getStorageKey(date?: string, athleteId?: string): string | null {
  if (date === undefined || athleteId === undefined) {
    return null;
  }
  return `protraining_sets_${date}_${athleteId}`;
}

export const RoutinePage: React.FC = () => {
  const [routine, setRoutine] = useState<TodayRoutineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExerciseForModal, setSelectedExerciseForModal] =
    useState<TodayRoutineExercise | null>(null);

  // Día pedido desde el calendario (?date=AAAA-MM-DD). Sin parámetro, o si es hoy, la rutina de hoy.
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const selectedDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam !== todayInArgentina()
      ? dateParam
      : null;

  // Estado de series completadas (almacenado en localStorage para persistencia en el gimnasio)
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});

  // Carga de la rutina del atleta autenticado
  const fetchRoutine = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyTodayRoutine({
        query: selectedDate ? { date: selectedDate } : undefined,
        throwOnError: true,
      });
      const loadedRoutine = response.data ?? null;
      setRoutine(loadedRoutine);

      // Cargar series guardadas si tenemos atletas y fecha identificados
      if (loadedRoutine?.date && loadedRoutine?.athleteId) {
        try {
          const key = getStorageKey(loadedRoutine.date, loadedRoutine.athleteId);
          if (key) {
            const saved = localStorage.getItem(key);
            setCompletedSets(saved ? JSON.parse(saved) : {});
          }
        } catch {
          // Ignorar error de acceso a localStorage
        }
      } else {
        setCompletedSets({});
      }
    } catch (err) {
      setError(extractErrorMessage(err));
      setRoutine(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  // Carga inicial al montar la pagina
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void fetchRoutine();
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchRoutine]);

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
          if (storageKey) {
            localStorage.setItem(storageKey, JSON.stringify(next));
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

  function getBarbellSideText(exercise: TodayRoutineExercise): string | null {
    if (exercise.barWeight == null || exercise.weightPerSide == null) {
      return null;
    }
    if (exercise.weightPerSide === 0) {
      return 'Solo la barra';
    }
    return `${exercise.weightPerSide} kg por lado (barra de ${exercise.barWeight} kg)`;
  }

  return (
    <div className="app-page-container">
      {/* ── Encabezado Estándar ── */}
      <PageHeader
        title={selectedDate ? `Rutina del ${formatSpanishDate(selectedDate)}` : 'Mi Rutina'}
        description={
          selectedDate
            ? 'Planificación de ese día, con los pesos calculados según tus récords actuales.'
            : 'Planificación de hoy con pesos calculados en barra e indicaciones técnicas del PF.'
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {selectedDate && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', gap: '0.4rem' }}
                onClick={() => setSearchParams({})}
              >
                <Calendar size={15} />
                <span>Volver a hoy</span>
              </button>
            )}
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
                      ¡Excelente trabajo! Completaste todas las series planificadas para hoy.
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
                            {getBarbellSideText(exercise) ? (
                              <span className="routine-weight-side">
                                {getBarbellSideText(exercise)}
                              </span>
                            ) : (
                              <span className="routine-weight-label">Objetivo</span>
                            )}
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
                      ? getBarbellSideText(selectedExerciseForModal)
                        ? `${selectedExerciseForModal.weightKg} kg · ${getBarbellSideText(selectedExerciseForModal)}`
                        : `${selectedExerciseForModal.weightKg} kg`
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

              {/* Fotos del ejercicio (inicio y fin del movimiento), como en la biblioteca */}
              <ExerciseGifImage
                images={selectedExerciseForModal.images}
                name={selectedExerciseForModal.name}
              />

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
                      (selectedExerciseForModal as unknown as { primaryMuscles?: string[] })
                        .primaryMuscles ?? []
                    }
                    secondaryMuscles={
                      (selectedExerciseForModal as unknown as { secondaryMuscles?: string[] })
                        .secondaryMuscles ?? []
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

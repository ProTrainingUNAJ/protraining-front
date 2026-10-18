import React, { useState } from 'react';
import {
  Dumbbell,
  Clock,
  Flame,
  CheckCircle2,
  ArrowRight,
  Play,
  Film,
  Sparkles,
  Info,
  X,
  Target,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { ExerciseMuscleMap } from '../../components/exercises/ExerciseMuscleMap';

export interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  gifUrl?: string; // Campo listo para conectar con tu librería de GIFs
  muscles: string[];
  sets: string;
  reps: string;
  rest: string;
  rpe?: string;
  tempo?: string;
  notes?: string;
  description: string;
  instructions: string[];
  tips: string;
}

export interface WorkoutBlock {
  id: string;
  name: string;
  categoryTag: string;
  exercises: ExerciseItem[];
}

const ROUTINE_DATA: Record<
  'hoy' | 'manana' | 'viernes',
  {
    title: string;
    focus: string;
    microcycle: string;
    coach: string;
    duration: string;
    targetRpe: string;
    blocks: WorkoutBlock[];
  }
> = {
  hoy: {
    title: 'Sesión 2: Fuerza Máxima y Estabilidad',
    focus: 'Fuerza & Potencia',
    microcycle: 'Microciclo 42',
    coach: 'Julián Pérez — Club Atlético Quilmes',
    duration: '65 min',
    targetRpe: 'RPE 7-8',
    blocks: [
      {
        id: 'b-1',
        name: 'Bloque A — Activación y Movilidad Articular',
        categoryTag: 'Movilidad & Entrada en Calor',
        exercises: [
          {
            id: 'ex-1',
            name: 'Cat-Cow y Movilidad Torácica',
            category: 'Movilidad',
            muscles: ['Columna Torácica', 'Dorsales', 'Core'],
            sets: '2',
            reps: '10 repeticiones',
            rest: '30 seg',
            tempo: 'Fluido y controlado',
            notes: 'Coordinar respiración profunda con la flexión y extensión',
            description:
              'Ejercicio fundamental de movilidad espinal que descomprime las vértebras dorsales y lumbares, preparando la columna para soportar cargas axiales pesadas.',
            instructions: [
              'Colócate en cuadrupedia: muñecas debajo de hombros y rodillas debajo de caderas.',
              'Inhala mientras dejas caer el abdomen hacia el suelo, elevando el pecho y la mirada (fase Vaca).',
              'Exhala empujando el suelo con las palmas, redondeando la columna hacia el techo y llevando la barbilla al pecho (fase Gato).',
              'Mantén un ritmo fluido sin forzar los extremos de movimiento.',
            ],
            tips: 'El movimiento debe generarse en la pelvis y zona dorsal media; evita comprimir el cuello al mirar hacia arriba.',
          },
          {
            id: 'ex-2',
            name: 'Rotaciones de Cadera 90/90',
            category: 'Movilidad',
            muscles: ['Caderas', 'Glúteo Medio', 'Rotadores Profundos'],
            sets: '2',
            reps: '8 por lado',
            rest: '30 seg',
            tempo: '2s por transición',
            description:
              'Aumenta la movilidad en rotación interna y externa de la cadera, clave para lograr profundidad en sentadillas y reducir sobrecarga en la zona lumbar.',
            instructions: [
              'Siéntate en el suelo con una pierna flexionada a 90° al frente y la otra a 90° hacia el lateral.',
              'Mantén el torso erguido activando la musculatura abdominal.',
              'Sin despegar los talones del suelo, rota suavemente ambas rodillas hacia el lateral contrario.',
              'Controla la transición sintiendo el trabajo en la cápsula articular de la cadera.',
            ],
            tips: 'Si sientes excesiva rigidez, apoya ligeramente las yemas de los dedos detrás del torso como soporte.',
          },
          {
            id: 'ex-3',
            name: 'Puente Glúteo Unilateral',
            category: 'Activación',
            muscles: ['Glúteo Mayor', 'Isquiotibiales', 'Core'],
            sets: '2',
            reps: '10 por lado',
            rest: '45 seg',
            rpe: 'RPE 6',
            notes: 'Pausa de 1 segundo en la contracción máxima',
            description:
              'Activa selectivamente el glúteo mayor y enseña a extender la cadera sin involucrar la columna lumbar mediante compensaciones.',
            instructions: [
              'Túmbate boca arriba con rodillas flexionadas y talones apoyados en el piso.',
              'Eleva una pierna en flexión de 90° abrazándola suavemente o dejándola suspendida.',
              'Empuja el suelo clavando el talón de la pierna de apoyo hasta alinear rodilla, cadera y hombros.',
              'Aprieta fuerte el glúteo en la cima durante 1 segundo antes de descender con control.',
            ],
            tips: 'Asegúrate de que la fuerza provenga del glúteo y no del arco lumbar ni de la punta del pie.',
          },
        ],
      },
      {
        id: 'b-2',
        name: 'Bloque B — Trabajo Principal de Fuerza',
        categoryTag: 'Fuerza Máxima',
        exercises: [
          {
            id: 'ex-4',
            name: 'Back Squat (Sentadilla Trasera)',
            category: 'Fuerza',
            muscles: ['Cuádriceps', 'Glúteos', 'Erectores Espinales', 'Core'],
            sets: '4',
            reps: '6 repeticiones',
            rest: '120 seg',
            rpe: 'RPE 8',
            tempo: '3-0-1-0 (3s bajada)',
            notes: 'Descenso controlado en 3 segundos',
            description:
              'El ejercicio rey para el desarrollo de fuerza y potencia del tren inferior, reclutando casi la totalidad de la musculatura de piernas y tronco.',
            instructions: [
              'Coloca la barra apoyada sobre los trapecios con agarre firme y codos ligeramente apuntando hacia abajo.',
              'Pies al ancho de hombros con las puntas rotadas unos 15° hacia afuera.',
              'Inhala profundamente inflando el diafragma (maniobra de Valsalva) y bloquea el abdomen.',
              'Inicia el descenso empujando la cadera hacia atrás y abriendo las rodillas en la misma dirección que las puntas de los pies.',
              'Alcanza al menos el paralelo con control en 3 segundos y sube explosivamente empujando el suelo.',
            ],
            tips: 'Mantén el pecho alto y la mirada al frente. No permitas que las rodillas colapsen hacia adentro (valgo).',
          },
          {
            id: 'ex-5',
            name: 'Press Militar con Mancuernas',
            category: 'Fuerza',
            muscles: ['Deltoides', 'Tríceps', 'Trapecio Superior', 'Core'],
            sets: '3',
            reps: '8 repeticiones',
            rest: '90 seg',
            rpe: 'RPE 7.5',
            description:
              'Desarrollo de fuerza vertical de empuje para tren superior con alta demanda de estabilidad glenohumeral y de la zona media.',
            instructions: [
              'Sostén las mancuernas al nivel de los hombros con agarre semipronado y los codos adelantados a unos 45° del torso.',
              'Aprieta los glúteos y el abdomen para fijar la pelvis sin arquear la espalda baja.',
              'Empuja las mancuernas verticalmente hacia arriba hasta extender los brazos casi por completo.',
              'Desciende de forma controlada hasta la altura de la clavícula.',
            ],
            tips: 'Evita empujar hacia adelante o reclinar excesivamente el torso hacia atrás.',
          },
          {
            id: 'ex-6',
            name: 'Peso Muerto Rumano Unilateral',
            category: 'Cadena Posterior',
            muscles: ['Isquiotibiales', 'Glúteo Mayor', 'Estabilizadores del Tobillo'],
            sets: '3',
            reps: '8 por pierna',
            rest: '90 seg',
            rpe: 'RPE 7',
            notes: 'Mancuerna en mano contraria a la pierna de apoyo',
            description:
              'Patrón de bisagra de cadera a una pierna que corrige asimetrías de fuerza en isquiotibiales y previene desgarros musculares en carreras a máxima velocidad.',
            instructions: [
              'Párate sobre una pierna con una leve flexión en la rodilla (no bloqueada).',
              'Sostén la mancuerna en la mano contraria al pie de apoyo.',
              'Envía la cadera hacia atrás manteniendo la espalda completamente recta, permitiendo que la pierna libre se eleve en línea con el torso.',
              'Baja la mancuerna hasta media tibia sintiendo la tensión en los isquiotibiales.',
              'Empuja la cadera hacia adelante contrayendo el glúteo para regresar erguido.',
            ],
            tips: 'Las dos crestas ilíacas deben mirar al frente durante todo el recorrido; no dejes que la cadera se abra hacia afuera.',
          },
        ],
      },
      {
        id: 'b-3',
        name: 'Bloque C — Core y Prevención de Lesiones',
        categoryTag: 'Anti-Rotación & Estabilidad',
        exercises: [
          {
            id: 'ex-7',
            name: 'Pallof Press con Banda',
            category: 'Core',
            muscles: ['Oblicuos', 'Transverso Abdominal', 'Glúteo Medio'],
            sets: '3',
            reps: '12 por lado',
            rest: '45 seg',
            rpe: 'RPE 6',
            notes: 'Mantener 1 segundo en extensión completa',
            description:
              'Ejercicio de anti-rotación que entrena al tronco para transferir potencia y soportar fuerzas de torsión bruscas en choques y cambios de dirección.',
            instructions: [
              'Párate de perfil al anclaje de la banda elástica con los pies al ancho de hombros.',
              'Sostén el agarre con ambas manos pegado al esternón con los codos flexionados.',
              'Extiende los brazos hacia el frente en línea recta resistiendo la fuerza elástica que intenta girar tu cuerpo.',
              'Sostén 1 segundo con los brazos extendidos y regresa con control al pecho.',
            ],
            tips: 'El tronco y las caderas deben mantenerse completamente inmóviles; el único movimiento es el de los brazos.',
          },
          {
            id: 'ex-8',
            name: 'Plancha Lateral con Elevación de Pierna',
            category: 'Core',
            muscles: ['Oblicuos', 'Cuadrado Lumbar', 'Glúteo Medio'],
            sets: '3',
            reps: '30 seg por lado',
            rest: '45 seg',
            rpe: 'RPE 7',
            description:
              'Estabilidad lateral y fortalecimiento del pilar de cadera y columna, reduciendo el riesgo de pubalgias y sobrecargas en aductores.',
            instructions: [
              'Apóyate sobre el antebrazo con el codo justo debajo del hombro.',
              'Eleva la pelvis del suelo formando una línea recta continua desde la cabeza hasta los tobillos.',
              'Con calma, levanta la pierna superior unos 20-30 cm manteniendo el pie paralelo al suelo.',
              'Sostén la postura respirando con normalidad y apretando el glúteo y abdomen.',
            ],
            tips: 'No dejes que la cadera se hunda hacia el piso ni rote hacia adelante.',
          },
        ],
      },
    ],
  },
  manana: {
    title: 'Sesión 3: Potencia Metabólica y Velocidad',
    focus: 'Aceleración & RSA',
    microcycle: 'Microciclo 42',
    coach: 'Julián Pérez — Club Atlético Quilmes',
    duration: '50 min',
    targetRpe: 'RPE 8.5',
    blocks: [
      {
        id: 'b-m1',
        name: 'Bloque A — Activación Pliométrica',
        categoryTag: 'Pliometría & Reactividad',
        exercises: [
          {
            id: 'ex-m1',
            name: 'Pogo Jumps y Reactividad de Tobillo',
            category: 'Pliometría',
            muscles: ['Gemelos', 'Tendón de Aquiles', 'Planta del Pie'],
            sets: '3',
            reps: '15 saltos elásticos',
            rest: '45 seg',
            notes: 'Mínimo tiempo de contacto en suelo',
            description:
              'Prepara el tendón de Aquiles y el complejo articular del tobillo para aplicar fuerzas reactivas elásticas en aceleraciones y sprints.',
            instructions: [
              'De pie con rodillas casi extendidas y torso erguido.',
              'Rebota de manera elástica utilizando casi exclusivamente los tobillos y gemelos.',
              'Busca despegar rápidamente minimizando el tiempo que tocas el suelo.',
            ],
            tips: 'Mantén los tobillos en dorsiflexión activa (puntas hacia arriba) en el aire.',
          },
          {
            id: 'ex-m2',
            name: 'Aceleraciones de 10m con Salida Estática',
            category: 'Velocidad',
            muscles: ['Cuádriceps', 'Glúteos', 'Isquiotibiales'],
            sets: '4',
            reps: '1 repetición',
            rest: '90 seg',
            notes: '100% de intensidad',
            description:
              'Entrenamiento específico de la fase de aceleración inicial y producción de fuerza horizontal.',
            instructions: [
              'Adopta postura de 2 o 3 apoyos con inclinación de 45° del torso.',
              'Empuja el suelo hacia atrás agresivamente en los primeros 3 pasos.',
              'Acelera con zancadas potentes y brazos coordinados.',
            ],
            tips: 'No te levantes de golpe en el primer paso; mantén la línea de empuje diagonal.',
          },
        ],
      },
    ],
  },
  viernes: {
    title: 'Sesión 4: Fuerza Hipertrofia y Transferencia',
    focus: 'Fuerza Funcional',
    microcycle: 'Microciclo 42',
    coach: 'Julián Pérez — Club Atlético Quilmes',
    duration: '60 min',
    targetRpe: 'RPE 7.5',
    blocks: [
      {
        id: 'b-v1',
        name: 'Bloque A — Empujes y Tracciones',
        categoryTag: 'Fuerza Estructural',
        exercises: [
          {
            id: 'ex-v1',
            name: 'Dominadas con Agarre Neutro',
            category: 'Tracción',
            muscles: ['Dorsal Ancho', 'Bíceps', 'Braquiorradial', 'Core'],
            sets: '4',
            reps: '6 a 8 repeticiones',
            rest: '90 seg',
            notes: 'Rango de movimiento completo',
            description:
              'Patrón de tracción vertical superior con alta demanda de fuerza relativa corporal.',
            instructions: [
              'Cuélgate de la barra con agarre neutro (palmas enfrentadas).',
              'Inicia tirando los codos hacia abajo y atrás, elevando el pecho hacia la barra.',
              'Supera la barra con la barbilla y desciende controlando la fase excéntrica.',
            ],
            tips: 'No te balancees ni uses patadas para impulsarte.',
          },
          {
            id: 'ex-v2',
            name: 'Hip Thrust con Barra',
            category: 'Cadena Posterior',
            muscles: ['Glúteo Mayor', 'Isquiotibiales', 'Erectores'],
            sets: '4',
            reps: '10 repeticiones',
            rest: '90 seg',
            notes: 'Pausa de 2s arriba',
            description:
              'El mayor productor de fuerza de extensión de cadera horizontal para optimizar el sprint y saltos.',
            instructions: [
              'Apoya la espalda media contra el banco y sitúa la barra acolchada sobre las caderas.',
              'Pies bien plantados al ancho de caderas.',
              'Empuja con los talones hasta alcanzar extensión completa de cadera en 90° con las rodillas.',
              'Aprieta los glúteos fuertemente y desciende sin perder la alineación neutral de la pelvis.',
            ],
            tips: 'Mantén la mirada al frente en el banco y no hiperextiendas el cuello.',
          },
        ],
      },
    ],
  },
};

export const RoutinePage: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<'hoy' | 'manana' | 'viernes'>('hoy');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [modalExercise, setModalExercise] = useState<ExerciseItem | null>(null);

  const currentRoutine = ROUTINE_DATA[selectedDay];

  // Count total exercises for the selected day
  const allExercises = currentRoutine.blocks.flatMap((b) => b.exercises);
  const totalCount = allExercises.length;
  const completedCount = allExercises.filter((ex) => completedExercises[ex.id]).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const toggleExerciseCheck = (exerciseId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedExercises((prev) => {
      const next = { ...prev, [exerciseId]: !prev[exerciseId] };
      // If all exercises are checked as completed, suggest full session completion
      const isAllDone = allExercises.every((ex) =>
        ex.id === exerciseId ? !prev[ex.id] : prev[ex.id],
      );
      if (isAllDone) {
        setSessionCompleted(true);
      }
      return next;
    });
  };

  const handleOpenDetail = (exercise: ExerciseItem) => {
    setModalExercise(exercise);
  };

  const handleCloseModal = () => {
    setModalExercise(null);
  };

  return (
    <div className="app-page-container">
      {/* ── Encabezado Estandarizado ── */}
      <PageHeader
        title="Mi Rutina"
        description="Planificación de ejercicios, técnicas deportivas y sesiones activas."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className={`btn ${selectedDay === 'hoy' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay('hoy')}
            >
              Hoy (Martes)
            </button>
            <button
              type="button"
              className={`btn ${selectedDay === 'manana' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay('manana')}
            >
              Miércoles
            </button>
            <button
              type="button"
              className={`btn ${selectedDay === 'viernes' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setSelectedDay('viernes')}
            >
              Viernes
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {/* ── Tarjeta Resumen y Progreso de la Sesión ── */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.35rem',
                }}
              >
                <span className="badge badge-info">{currentRoutine.focus}</span>
                <span className="badge badge-warning">{currentRoutine.microcycle}</span>
              </div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 900,
                  margin: '0 0 0.25rem',
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                {currentRoutine.title}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
                Preparador asignado: {currentRoutine.coach}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: 'var(--bg-subtle)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <Clock size={16} style={{ color: 'var(--stat-cyan)' }} />
                <span>{currentRoutine.duration}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: 'var(--bg-subtle)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                }}
              >
                <Flame size={16} style={{ color: 'var(--warning)' }} />
                <span>{currentRoutine.targetRpe}</span>
              </div>

              <button
                type="button"
                className={`btn ${sessionCompleted ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => setSessionCompleted(!sessionCompleted)}
                style={{ gap: '0.45rem', padding: '0.5rem 1rem' }}
              >
                {sessionCompleted ? (
                  <>
                    <CheckCircle2 size={16} style={{ color: 'var(--stat-green)' }} />
                    <span>Sesión Completada</span>
                  </>
                ) : (
                  <>
                    <span>Marcar Todo Hecho</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Barra de progreso de ejercicios */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
              }}
            >
              <span>Progreso de la sesión</span>
              <span
                style={{
                  color: progressPercent === 100 ? 'var(--stat-green)' : 'var(--text-main)',
                }}
              >
                {completedCount} de {totalCount} ejercicios ({progressPercent}%)
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '9999px',
                background: 'var(--bg-subtle)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background:
                    progressPercent === 100
                      ? 'var(--stat-green)'
                      : 'linear-gradient(90deg, var(--secondary) 0%, var(--stat-cyan) 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Bloques Organizados de Ejercicios ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {currentRoutine.blocks.map((block) => {
            const blockCompletedCount = block.exercises.filter(
              (ex) => completedExercises[ex.id],
            ).length;

            return (
              <div key={block.id} className="routine-block-card">
                {/* Cabecera del Bloque */}
                <div className="routine-block-header">
                  <div className="routine-block-title-wrap">
                    <div className="routine-block-icon-badge">
                      <Dumbbell size={18} />
                    </div>
                    <div>
                      <h3 className="routine-block-title">{block.name}</h3>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        {block.categoryTag}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="routine-block-meta">
                      {blockCompletedCount}/{block.exercises.length} completados
                    </span>
                  </div>
                </div>

                {/* Lista de Tarjetas de Ejercicios */}
                <div className="routine-exercises-list">
                  {block.exercises.map((exercise) => {
                    const isDone = !!completedExercises[exercise.id];

                    return (
                      <div
                        key={exercise.id}
                        className={`routine-exercise-card ${isDone ? 'completed' : ''}`}
                      >
                        {/* 1. Checkbox interactivo de realizado */}
                        <button
                          type="button"
                          className={`routine-check-btn ${isDone ? 'completed' : ''}`}
                          onClick={(e) => toggleExerciseCheck(exercise.id, e)}
                          title={isDone ? 'Marcar como pendiente' : 'Marcar como completado'}
                          aria-label={`Completar ${exercise.name}`}
                        >
                          <CheckCircle2 size={18} strokeWidth={2.8} />
                        </button>

                        {/* 2. Cuadrado dedicado para GIF (listo para conectar con la librería) */}
                        <div
                          className="routine-gif-thumb"
                          onClick={() => handleOpenDetail(exercise)}
                          title="Toca para ver animación GIF y técnica detallada"
                        >
                          <span className="routine-gif-badge">GIF</span>
                          {exercise.gifUrl ? (
                            <img
                              src={exercise.gifUrl}
                              alt={exercise.name}
                              className="routine-gif-thumb-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="routine-gif-placeholder">
                              <Film size={22} strokeWidth={2.2} />
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  lineHeight: 1,
                                  color: 'var(--secondary)',
                                }}
                              >
                                Preview
                              </span>
                            </div>
                          )}

                          {/* Overlay de hover con icono de reproducción */}
                          <div className="routine-gif-play-hint">
                            <Play size={22} fill="var(--white)" color="var(--white)" />
                          </div>
                        </div>

                        {/* 3. Info del ejercicio */}
                        <div className="routine-exercise-info">
                          <div className="routine-exercise-name-row">
                            <h4
                              className="routine-exercise-name"
                              onClick={() => handleOpenDetail(exercise)}
                            >
                              {exercise.name}
                            </h4>
                            <span className="routine-tag-pill">{exercise.category}</span>
                          </div>

                          <div className="routine-exercise-tags">
                            {exercise.muscles.map((muscle, mIdx) => (
                              <span
                                key={mIdx}
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                }}
                              >
                                {muscle}
                                {mIdx < exercise.muscles.length - 1 ? ' · ' : ''}
                              </span>
                            ))}
                          </div>

                          {exercise.notes && (
                            <div className="routine-exercise-note">
                              <Sparkles
                                size={12}
                                style={{ color: 'var(--warning)', flexShrink: 0 }}
                              />
                              <span>{exercise.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* 4. Métricas y botón de detalle */}
                        <div className="routine-exercise-metrics">
                          <div className="routine-metric-chip" title="Series y Repeticiones">
                            <Dumbbell size={14} style={{ color: 'var(--secondary)' }} />
                            <span>
                              {exercise.sets} series × {exercise.reps}
                            </span>
                          </div>

                          <div className="routine-metric-chip" title="Tiempo de descanso">
                            <Clock size={14} style={{ color: 'var(--stat-cyan)' }} />
                            <span>{exercise.rest}</span>
                          </div>

                          {exercise.rpe && (
                            <div className="routine-metric-chip" title="Intensidad">
                              <Flame size={14} style={{ color: 'var(--pain-level-4)' }} />
                              <span>{exercise.rpe}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            className="routine-detail-trigger-btn"
                            onClick={() => handleOpenDetail(exercise)}
                          >
                            <Info size={14} />
                            <span>Ver técnica</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal de Detalle de Ejercicio y Visor de GIF ── */}
      {modalExercise && (
        <div className="routine-modal-backdrop" onClick={handleCloseModal}>
          <div
            className="routine-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-exercise-title"
          >
            {/* Header del Modal */}
            <div className="routine-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--stat-cyan-bg)',
                    color: 'var(--stat-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Dumbbell size={20} />
                </div>
                <div>
                  <h3 id="modal-exercise-title" className="routine-modal-title">
                    {modalExercise.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.15rem' }}>
                    <span className="badge badge-info">{modalExercise.category}</span>
                    {modalExercise.tempo && (
                      <span className="badge badge-warning">Tempo: {modalExercise.tempo}</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="routine-modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Cerrar ventana"
                title="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="routine-modal-body">
              {/* Visor Grande para GIF del Ejercicio */}
              <div className="routine-modal-gif-showcase">
                <span className="routine-gif-badge" style={{ top: '10px', left: '10px' }}>
                  Librería de GIFs ProTraining
                </span>

                {modalExercise.gifUrl ? (
                  <img
                    src={modalExercise.gifUrl}
                    alt={modalExercise.name}
                    className="routine-modal-gif-content"
                  />
                ) : (
                  <div className="routine-modal-gif-placeholder">
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        background: 'var(--bg-card)',
                        color: 'var(--secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow)',
                      }}
                    >
                      <Film size={34} strokeWidth={2} />
                    </div>
                    <div>
                      <strong
                        style={{
                          fontSize: '1rem',
                          color: 'var(--text-main)',
                          display: 'block',
                          marginBottom: '0.2rem',
                        }}
                      >
                        Espacio de Visualización GIF
                      </strong>
                      <p
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '0.82rem',
                          margin: 0,
                          maxWidth: '420px',
                        }}
                      >
                        Este cuadro está listo para vincular el archivo o URL animada de tu librería
                        de ejercicios ({modalExercise.id}.gif).
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid de Métricas Principales */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Series
                  </span>
                  <strong
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--text-main)',
                      display: 'block',
                      marginTop: '0.15rem',
                    }}
                  >
                    {modalExercise.sets}
                  </strong>
                </div>

                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Repeticiones
                  </span>
                  <strong
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--text-main)',
                      display: 'block',
                      marginTop: '0.15rem',
                    }}
                  >
                    {modalExercise.reps}
                  </strong>
                </div>

                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Descanso
                  </span>
                  <strong
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--text-main)',
                      display: 'block',
                      marginTop: '0.15rem',
                    }}
                  >
                    {modalExercise.rest}
                  </strong>
                </div>

                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    textAlign: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Intensidad
                  </span>
                  <strong
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--pain-level-4)',
                      display: 'block',
                      marginTop: '0.15rem',
                    }}
                  >
                    {modalExercise.rpe || 'Moderada'}
                  </strong>
                </div>
              </div>

              {/* ¿Qué hace este ejercicio? */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    marginBottom: '0.45rem',
                  }}
                >
                  <Target size={18} style={{ color: 'var(--secondary)' }} />
                  <h4
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      margin: 0,
                    }}
                  >
                    Objetivo y Biomecánica
                  </h4>
                </div>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {modalExercise.description}
                </p>
              </div>

              {/* Músculos Involucrados con Silueta Anatómica (KAN-320) */}
              <div>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: 'var(--text-main)',
                    marginBottom: '0.45rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Músculos Involucrados:
                </strong>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.85rem',
                  }}
                >
                  {modalExercise.muscles.map((muscle, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '9999px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        border: '1px solid var(--info-border)',
                      }}
                    >
                      {muscle}
                    </span>
                  ))}
                </div>

                {/* Silueta anatómica interactiva destacando los músculos trabajados */}
                <ExerciseMuscleMap
                  primaryMuscles={modalExercise.muscles}
                  showLegend={true}
                  showViewToggle={true}
                />
              </div>

              {/* Pasos de Ejecución Técnica */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  <TrendingUp size={18} style={{ color: 'var(--stat-green)' }} />
                  <h4
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      margin: 0,
                    }}
                  >
                    Guía de Ejecución Técnica Paso a Paso
                  </h4>
                </div>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                    fontSize: '0.88rem',
                    color: 'var(--text-main)',
                    lineHeight: 1.5,
                  }}
                >
                  {modalExercise.instructions.map((step, sIdx) => (
                    <li key={sIdx} style={{ paddingLeft: '0.25rem' }}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Consejo del Preparador Físico */}
              {modalExercise.tips && (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    background: 'var(--stat-amber-bg)',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '12px',
                    border: '1.5px solid var(--stat-amber)',
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertCircle
                    size={20}
                    style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <strong
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--warning-text)',
                        display: 'block',
                        marginBottom: '0.2rem',
                      }}
                    >
                      Clave Técnica del Preparador Físico:
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.84rem',
                        color: 'var(--text-main)',
                        lineHeight: 1.5,
                      }}
                    >
                      {modalExercise.tips}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal con botón de acción */}
            <div className="routine-modal-footer">
              <button
                type="button"
                className={`btn ${completedExercises[modalExercise.id] ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => toggleExerciseCheck(modalExercise.id)}
                style={{ gap: '0.45rem' }}
              >
                <CheckCircle2 size={16} />
                <span>
                  {completedExercises[modalExercise.id]
                    ? 'Completado (Desmarcar)'
                    : 'Marcar como Completado'}
                </span>
              </button>

              <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

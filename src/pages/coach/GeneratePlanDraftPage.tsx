import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { structureService } from '../../api/structureService';
import { isPlanDraftCanceled, planDraftsService } from '../../api/planDrafts';
import { PlanAssignmentTarget } from '../../types/trainingPlans';
import { nextMondayInArgentina } from '../../utils/argentinaDate';

interface TargetOption {
  id: string;
  label: string;
}

interface DayChipOption {
  code: string;
  value: string;
  label: string;
}

interface FormErrors {
  target?: string;
  goal?: string;
  weeks?: string;
  daysPerWeek?: string;
  trainingDays?: string;
  startDate?: string;
}

const TRAINING_DAY_CHIPS: DayChipOption[] = [
  { code: 'L', value: 'Lunes', label: 'Lunes' },
  { code: 'M', value: 'Martes', label: 'Martes' },
  { code: 'X', value: 'Miércoles', label: 'Miércoles' },
  { code: 'J', value: 'Jueves', label: 'Jueves' },
  { code: 'V', value: 'Viernes', label: 'Viernes' },
  { code: 'S', value: 'Sábado', label: 'Sábado' },
  { code: 'D', value: 'Domingo', label: 'Domingo' },
];

const GOAL_MAX_LENGTH = 500;
const WEEKS_MIN = 1;
const WEEKS_MAX = 8;
const DAYS_MIN = 1;
const DAYS_MAX = 6;

function defaultDaysForCount(count: number): string[] {
  switch (count) {
    case 1:
      return ['Lunes'];
    case 2:
      return ['Martes', 'Jueves'];
    case 3:
      return ['Lunes', 'Miércoles', 'Viernes'];
    case 4:
      return ['Lunes', 'Martes', 'Jueves', 'Viernes'];
    case 5:
      return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    case 6:
      return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    default:
      return ['Lunes', 'Miércoles', 'Viernes'];
  }
}

export function GeneratePlanDraftPage() {
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [categories, setCategories] = useState<TargetOption[]>([]);
  const [athletes, setAthletes] = useState<TargetOption[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [targetsError, setTargetsError] = useState<string | null>(null);

  // Estado del Paso 1
  const [targetType, setTargetType] = useState<PlanAssignmentTarget['type']>('category');
  const [targetId, setTargetId] = useState('');
  const [goal, setGoal] = useState('');
  const [weeks, setWeeks] = useState<number>(4);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [trainingDays, setTrainingDays] = useState<string[]>(() => defaultDaysForCount(3));
  const [startDate, setStartDate] = useState<string>(() => nextMondayInArgentina());
  const [errors, setErrors] = useState<FormErrors>({});

  // Estado del Paso 2
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Carga de categorías y atletas igual que en el modal Asignar (KAN-536).
  useEffect(() => {
    let active = true;
    async function loadTargets() {
      const organizations = await structureService.getOrganizations();
      const [categoriesByOrg, athleteList] = await Promise.all([
        Promise.all(organizations.map((org) => structureService.getCategories(org.id))),
        structureService.getAthletes(),
      ]);
      const showOrganization = organizations.length > 1;
      const categoryOptions = categoriesByOrg.flatMap((orgCategories, index) =>
        orgCategories.map((category) => ({
          id: category.id,
          label: showOrganization
            ? `${organizations[index].name} · ${category.name}`
            : category.name,
        })),
      );
      const athleteOptions = athleteList
        .map((athlete) => ({
          id: athlete.id,
          label: athlete.fullName || `${athlete.firstName} ${athlete.lastName}`.trim(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'));
      return { categoryOptions, athleteOptions };
    }

    loadTargets()
      .then(({ categoryOptions, athleteOptions }) => {
        if (!active) return;
        setCategories(categoryOptions);
        setAthletes(athleteOptions);
        if (categoryOptions.length > 0) {
          setTargetType('category');
          setTargetId(categoryOptions[0].id);
        } else if (athleteOptions.length > 0) {
          setTargetType('athlete');
          setTargetId(athleteOptions[0].id);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setTargetsError(
            err instanceof Error ? err.message : 'No se pudieron cargar las categorías y atletas.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadingTargets(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Si se desmonta la pantalla en medio de la generación, se cancela el pedido en curso.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const options = targetType === 'category' ? categories : athletes;

  const changeTargetType = (type: PlanAssignmentTarget['type']) => {
    setTargetType(type);
    const nextOptions = type === 'category' ? categories : athletes;
    setTargetId(nextOptions[0]?.id ?? '');
    setErrors((prev) => ({ ...prev, target: undefined }));
  };

  const handleDaysPerWeekChange = (value: number) => {
    setDaysPerWeek(value);
    if (Number.isInteger(value) && value >= DAYS_MIN && value <= DAYS_MAX) {
      setTrainingDays(defaultDaysForCount(value));
      setErrors((prev) => ({ ...prev, daysPerWeek: undefined, trainingDays: undefined }));
    } else {
      setErrors((prev) => ({ ...prev, daysPerWeek: undefined }));
    }
  };

  const toggleTrainingDay = (dayValue: string) => {
    setTrainingDays((prev) => {
      const exists = prev.includes(dayValue);
      const next = exists ? prev.filter((d) => d !== dayValue) : [...prev, dayValue];
      return TRAINING_DAY_CHIPS.map((chip) => chip.value).filter((val) => next.includes(val));
    });
    setErrors((prev) => ({ ...prev, trainingDays: undefined }));
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    const trimmedGoal = goal.trim();

    if (!targetId) {
      nextErrors.target = targetType === 'category' ? 'Elegí una categoría.' : 'Elegí un atleta.';
    }

    if (!trimmedGoal) {
      nextErrors.goal = 'El objetivo es obligatorio.';
    } else if (trimmedGoal.length > GOAL_MAX_LENGTH) {
      nextErrors.goal = `El objetivo no puede superar los ${GOAL_MAX_LENGTH} caracteres.`;
    }

    if (!Number.isInteger(weeks) || weeks < WEEKS_MIN || weeks > WEEKS_MAX) {
      nextErrors.weeks = `Indicá entre ${WEEKS_MIN} y ${WEEKS_MAX} semanas.`;
    }

    if (!Number.isInteger(daysPerWeek) || daysPerWeek < DAYS_MIN || daysPerWeek > DAYS_MAX) {
      nextErrors.daysPerWeek = `Indicá entre ${DAYS_MIN} y ${DAYS_MAX} días por semana.`;
    }

    if (trainingDays.length === 0) {
      nextErrors.trainingDays = 'Elegí al menos un día de entrenamiento.';
    } else if (
      Number.isInteger(daysPerWeek) &&
      daysPerWeek >= DAYS_MIN &&
      daysPerWeek <= DAYS_MAX &&
      trainingDays.length !== daysPerWeek
    ) {
      nextErrors.trainingDays = `Elegí ${daysPerWeek} ${
        daysPerWeek === 1 ? 'día' : 'días'
      } de la semana (tenés ${trainingDays.length} ${
        trainingDays.length === 1 ? 'marcado' : 'marcados'
      }).`;
    }

    if (!startDate) {
      nextErrors.startDate = 'Elegí la fecha de inicio.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitGeneration = async () => {
    if (!validateForm()) {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setGenerating(true);
    setGenerationError(null);

    try {
      const draft = await planDraftsService.create(
        {
          categoryId: targetType === 'category' ? targetId : null,
          athleteId: targetType === 'athlete' ? targetId : null,
          goal: goal.trim(),
          weeks,
          daysPerWeek,
          trainingDays,
          startDate,
        },
        controller.signal,
      );

      navigate(`/pf/assistant/drafts/${draft.id}`, { state: { draft } });
    } catch (err: unknown) {
      if (isPlanDraftCanceled(err)) {
        setGenerating(false);
        return;
      }
      setGenerationError(
        err instanceof Error ? err.message : 'No se pudo generar el borrador con IA.',
      );
      setGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitGeneration();
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setGenerating(false);
  };

  return (
    <div className="app-page-container">
      <PageHeader
        title="Generar con IA"
        description="Pedile al asistente un borrador de planificación según el objetivo, las semanas y los días de entrenamiento."
        actions={
          <Link to="/pf/planning" className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Volver a planificaciones</span>
          </Link>
        }
      />

      <div className="app-page-body">
        {targetsError && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {targetsError}
            </span>
          </div>
        )}

        {generationError && !generating && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {generationError}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void submitGeneration()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Reintentar</span>
            </button>
          </div>
        )}

        {generating ? (
          <div className="card card-static plan-generating-card" role="status" aria-live="polite">
            <Loader2 size={36} className="plan-spin" aria-hidden="true" />
            <h2 className="plan-generating-title">Generando la planificación con IA…</h2>
            <p className="plan-generating-text">
              El asistente está armando las semanas y validando los ejercicios del catálogo. Con
              Ollama puede tardar entre 30 y 60 segundos.
            </p>
            <button type="button" className="btn btn-secondary" onClick={handleCancelGeneration}>
              <X size={16} aria-hidden="true" />
              <span>Cancelar</span>
            </button>
          </div>
        ) : (
          <form className="card card-static plan-wizard-card" onSubmit={handleSubmit} noValidate>
            {loadingTargets ? (
              <p className="plan-empty plan-inline">
                <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                Cargando categorías y atletas…
              </p>
            ) : (
              <>
                <fieldset className="plan-assign-type">
                  <legend>¿Para quién?</legend>
                  <label>
                    <input
                      type="radio"
                      name="wizard-target"
                      checked={targetType === 'category'}
                      onChange={() => changeTargetType('category')}
                    />
                    Una categoría
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="wizard-target"
                      checked={targetType === 'athlete'}
                      onChange={() => changeTargetType('athlete')}
                    />
                    Un atleta
                  </label>
                </fieldset>

                <label className="plan-field">
                  <span>{targetType === 'category' ? 'Categoría *' : 'Atleta *'}</span>
                  {options.length === 0 ? (
                    <span className="plan-empty">
                      {targetType === 'category'
                        ? 'Todavía no tenés categorías.'
                        : 'Todavía no tenés atletas.'}
                    </span>
                  ) : (
                    <select
                      className={errors.target ? 'plan-input-invalid' : ''}
                      value={targetId}
                      onChange={(e) => {
                        setTargetId(e.target.value);
                        setErrors((prev) => ({ ...prev, target: undefined }));
                      }}
                      aria-invalid={Boolean(errors.target)}
                    >
                      {options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.target && (
                    <span className="plan-field-error" role="alert">
                      {errors.target}
                    </span>
                  )}
                </label>
              </>
            )}

            <label className="plan-field">
              <div className="plan-field-header">
                <span>Objetivo *</span>
                <span className="plan-field-hint">
                  {goal.length}/{GOAL_MAX_LENGTH}
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={GOAL_MAX_LENGTH}
                className={errors.goal ? 'plan-input-invalid' : ''}
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value);
                  if (errors.goal) {
                    setErrors((prev) => ({ ...prev, goal: undefined }));
                  }
                }}
                placeholder="Fuerza de piernas para pretemporada, 3 días"
                aria-invalid={Boolean(errors.goal)}
              />
              <span className="plan-field-hint">
                Ejemplo: «Fuerza de piernas para pretemporada, 3 días».
              </span>
              {errors.goal && (
                <span className="plan-field-error" role="alert">
                  {errors.goal}
                </span>
              )}
            </label>

            <div className="plan-wizard-row">
              <label className="plan-field">
                <span>Semanas *</span>
                <input
                  type="number"
                  min={WEEKS_MIN}
                  max={WEEKS_MAX}
                  className={errors.weeks ? 'plan-input-invalid' : ''}
                  value={Number.isNaN(weeks) ? '' : weeks}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setWeeks(parsed);
                    setErrors((prev) => ({ ...prev, weeks: undefined }));
                  }}
                  aria-invalid={Boolean(errors.weeks)}
                />
                {errors.weeks && (
                  <span className="plan-field-error" role="alert">
                    {errors.weeks}
                  </span>
                )}
              </label>

              <label className="plan-field">
                <span>Días por semana *</span>
                <input
                  type="number"
                  min={DAYS_MIN}
                  max={DAYS_MAX}
                  className={errors.daysPerWeek ? 'plan-input-invalid' : ''}
                  value={Number.isNaN(daysPerWeek) ? '' : daysPerWeek}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    handleDaysPerWeekChange(parsed);
                  }}
                  aria-invalid={Boolean(errors.daysPerWeek)}
                />
                {errors.daysPerWeek && (
                  <span className="plan-field-error" role="alert">
                    {errors.daysPerWeek}
                  </span>
                )}
              </label>

              <label className="plan-field">
                <span>Fecha de inicio *</span>
                <input
                  type="date"
                  className={errors.startDate ? 'plan-input-invalid' : ''}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setErrors((prev) => ({ ...prev, startDate: undefined }));
                  }}
                  aria-invalid={Boolean(errors.startDate)}
                />
                {errors.startDate && (
                  <span className="plan-field-error" role="alert">
                    {errors.startDate}
                  </span>
                )}
              </label>
            </div>

            <div className="plan-field">
              <span>¿Qué días se entrena? *</span>
              <div className="plan-day-chips" role="group" aria-label="Días de entrenamiento">
                {TRAINING_DAY_CHIPS.map((chip) => {
                  const isSelected = trainingDays.includes(chip.value);
                  return (
                    <button
                      key={chip.code}
                      type="button"
                      className={`plan-day-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleTrainingDay(chip.value)}
                      aria-label={chip.label}
                      aria-pressed={isSelected}
                      title={chip.label}
                    >
                      {chip.code}
                    </button>
                  );
                })}
              </div>
              {errors.trainingDays && (
                <span className="plan-field-error" role="alert">
                  {errors.trainingDays}
                </span>
              )}
            </div>

            <div className="plan-wizard-actions">
              <Link to="/pf/planning" className="btn btn-secondary">
                Cancelar
              </Link>
              <button type="submit" className="btn btn-primary" disabled={loadingTargets}>
                <Sparkles size={16} aria-hidden="true" />
                <span>Generar borrador</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

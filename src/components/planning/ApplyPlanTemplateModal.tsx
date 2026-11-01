import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, Loader2, X } from 'lucide-react';
import { structureService } from '../../api/structureService';
import { trainingPlansService } from '../../api/trainingPlans';
import { PlanAssignmentTarget, PlanTemplateItem } from '../../types/trainingPlans';
import { formatIsoDate, todayInArgentina } from '../../utils/argentinaDate';

interface ApplyPlanTemplateModalProps {
  template: PlanTemplateItem;
  onClose: () => void;
  onApplied: (message: string) => void;
}

interface TargetOption {
  id: string;
  label: string;
}

export function ApplyPlanTemplateModal({
  template,
  onClose,
  onApplied,
}: ApplyPlanTemplateModalProps) {
  const [categories, setCategories] = useState<TargetOption[]>([]);
  const [athletes, setAthletes] = useState<TargetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<PlanAssignmentTarget['type']>('category');
  const [targetId, setTargetId] = useState('');
  const [startDate, setStartDate] = useState(todayInArgentina());

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
            ? `${organizations[index].name} — ${category.name}`
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
        setTargetId(categoryOptions[0]?.id ?? '');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : 'No se pudieron cargar las categorías y atletas.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, saving]);

  const options = targetType === 'category' ? categories : athletes;

  const changeTargetType = (type: PlanAssignmentTarget['type']) => {
    setTargetType(type);
    const nextOptions = type === 'category' ? categories : athletes;
    setTargetId(nextOptions[0]?.id ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) {
      setError(targetType === 'category' ? 'Elegí una categoría.' : 'Elegí un atleta.');
      return;
    }
    if (!startDate) {
      setError('Elegí la fecha de inicio.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await trainingPlansService.applyTemplate(template.id, {
        startDate,
        categoryId: targetType === 'category' ? targetId : null,
        athleteId: targetType === 'athlete' ? targetId : null,
      });

      const targetLabel = options.find((option) => option.id === targetId)?.label ?? '';
      onApplied(
        `«${template.name}» se asignó de inmediato a ${targetLabel} desde el ${formatIsoDate(startDate)} y ya está disponible para el plantel.`,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo aplicar la plantilla.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <form
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-apply-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="plan-picker-header">
          <div>
            <h2 id="template-apply-title">Aplicar plantilla</h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Plantilla: <strong>{template.name}</strong>
              {template.objective ? ` — ${template.objective}` : ''}
            </span>
          </div>
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="plan-empty">
          Al aplicar la plantilla se creará una planificación lista para el plantel. Todas las
          semanas y sesiones se desplazarán automáticamente a partir de la fecha de inicio elegida.
        </p>

        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {loading ? (
          <p className="plan-empty plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Cargando categorías y atletas…
          </p>
        ) : (
          <>
            <fieldset className="plan-assign-type" disabled={saving}>
              <legend>¿A quién?</legend>
              <label>
                <input
                  type="radio"
                  name="apply-target"
                  checked={targetType === 'category'}
                  onChange={() => changeTargetType('category')}
                />
                Una categoría
              </label>
              <label>
                <input
                  type="radio"
                  name="apply-target"
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
                    ? 'Todavía no tenés categorías cargadas.'
                    : 'Todavía no tenés atletas cargados.'}
                </span>
              ) : (
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={saving}
                  aria-label={targetType === 'category' ? 'Categoría' : 'Atleta'}
                >
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="plan-field">
              <span className="plan-inline">
                <Calendar size={15} aria-hidden="true" />
                <span>Fecha de inicio (desplazamiento de calendario) *</span>
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={saving}
                required
                aria-label="Fecha de inicio"
              />
            </label>
          </>
        )}

        <div className="plan-picker-pager">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || saving || options.length === 0}
          >
            {saving && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
            <span>{saving ? 'Asignando…' : 'Aplicar y asignar'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ClipboardList, Loader2, Plus } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { trainingPlansService } from '../../api/trainingPlans';
import { PlanListItem } from '../../types/trainingPlans';

export function PlanningPage() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');

  useEffect(() => {
    let active = true;
    trainingPlansService
      .list()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'No se pudieron cargar las planificaciones.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('La planificación necesita un nombre.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const plan = await trainingPlansService.create(cleanName, objective.trim() || null);
      // Se abre directo en el editor para cargar las semanas.
      navigate(`/pf/planning/${plan.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la planificación.');
      setCreating(false);
    }
  };

  return (
    <div className="app-page-container">
      <PageHeader
        title="Planificación"
        description="Tus planificaciones de entrenamiento. Abrí una para editar sus semanas y sesiones."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowForm((open) => !open);
              setError(null);
            }}
            disabled={creating}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{showForm ? 'Cancelar' : 'Nueva planificación'}</span>
          </button>
        }
      />

      <div className="app-page-body">
        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {showForm && (
          <form className="card card-static plan-details" onSubmit={handleCreate}>
            <label className="plan-field">
              <span>Nombre *</span>
              <input
                type="text"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={creating}
                placeholder="Ej. Fuerza base, Primera división"
                autoFocus
              />
            </label>
            <label className="plan-field">
              <span>Objetivo (opcional)</span>
              <input
                type="text"
                maxLength={500}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                disabled={creating}
                placeholder="Ej. Pretemporada"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
              <span>{creating ? 'Creando…' : 'Crear y editar'}</span>
            </button>
          </form>
        )}

        {loading ? (
          <p className="plan-empty plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Cargando planificaciones…
          </p>
        ) : plans.length === 0 && !error ? (
          <p className="plan-empty">
            Todavía no tenés planificaciones. Creá la primera con «Nueva planificación».
          </p>
        ) : (
          <ul className="plan-list">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link to={`/pf/planning/${plan.id}`} className="card plan-list-item">
                  <ClipboardList size={20} aria-hidden="true" />
                  <span className="plan-list-info">
                    <strong>{plan.name}</strong>
                    {plan.objective && <span>{plan.objective}</span>}
                  </span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

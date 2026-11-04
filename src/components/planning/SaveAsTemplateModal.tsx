import { useEffect, useState } from 'react';
import { AlertCircle, Bookmark, Loader2, X } from 'lucide-react';
import { trainingPlansService } from '../../api/trainingPlans';

interface SaveAsTemplateModalProps {
  planId: string;
  defaultName: string;
  onClose: () => void;
  onSaved: (templateName: string) => void;
}

export function SaveAsTemplateModal({
  planId,
  defaultName,
  onClose,
  onSaved,
}: SaveAsTemplateModalProps) {
  const [name, setName] = useState(defaultName ? `${defaultName} (Plantilla)` : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, saving]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Ingresá un nombre para la plantilla.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await trainingPlansService.saveAsTemplate(planId, cleanName);
      onSaved(cleanName);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la plantilla.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <form
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-template-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="plan-picker-header">
          <div className="plan-inline">
            <Bookmark size={20} color="var(--primary)" aria-hidden="true" />
            <h2 id="save-template-title">Guardar como plantilla</h2>
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
          Se creará una copia reutilizable de esta planificación (con todas sus semanas y sesiones)
          que podrás encontrar y asignar rápidamente desde el Catálogo de plantillas.
        </p>

        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        <label className="plan-field">
          <span>Nombre de la plantilla *</span>
          <input
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="Ej. Pretemporada Fuerza 2026"
            autoFocus
          />
        </label>

        <div className="plan-picker-pager">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
            <span>{saving ? 'Guardando…' : 'Guardar plantilla'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

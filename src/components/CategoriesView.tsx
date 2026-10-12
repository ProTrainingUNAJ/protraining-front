import React, { useState, useEffect } from 'react';
import { apiRequest, ApiError } from '../api/client';
import { Category, Organization } from '../types';
import { Plus, RefreshCw, FolderPlus, Check, AlertCircle, Layers } from 'lucide-react';

interface CategoriesViewProps {
  currentOrg: Organization | null;
  organizations: Organization[];
  onSelectOrg: (org: Organization) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  currentOrg,
  organizations,
  onSelectOrg,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formulario nueva categoría
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchCategories = async (orgId?: string) => {
    const targetOrgId = orgId || currentOrg?.id;
    if (!targetOrgId) {
      setCategories([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Category[]>(
        `/estructura/api/categories?organizationId=${targetOrgId}`
      );
      setCategories(data || []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudieron cargar las categorías de la organización.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg?.id) {
      fetchCategories(currentOrg.id);
    } else {
      setCategories([]);
    }
  }, [currentOrg?.id]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id) {
      setError('Debes seleccionar una organización para crear una categoría.');
      return;
    }

    const cleanName = name.trim();
    if (!cleanName) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newCategory = await apiRequest<Category>(
        `/estructura/api/categories?organizationId=${currentOrg.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: cleanName,
            description: description.trim() || null,
          }),
        }
      );

      setSuccessMessage('La categoría se creó correctamente.');
      setName('');
      setDescription('');
      setShowForm(false);
      // Actualización inmediata del listado local y persistencia real comprobada
      setCategories((prev) => [newCategory, ...prev]);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al registrar la categoría.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Categorías</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Gestiona las divisiones y planteles deportivos por organización.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {organizations.length > 0 && (
            <select
              style={{ width: 'auto', minWidth: '200px', margin: 0 }}
              value={currentOrg?.id || ''}
              onChange={(e) => {
                const found = organizations.find((o) => o.id === e.target.value);
                if (found) onSelectOrg(found);
              }}
              disabled={loading || saving}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}

          <button
            className="btn btn-secondary"
            onClick={() => fetchCategories()}
            disabled={loading || saving || !currentOrg}
            title="Recargar listado"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
            disabled={saving || !currentOrg}
          >
            <Plus size={16} />
            {showForm ? 'Cerrar formulario' : 'Nueva categoría'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="alert-banner success" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={18} />
            <span>{successMessage}</span>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'inherit' }}
            onClick={() => setSuccessMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert-banner danger" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'inherit' }}
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {!currentOrg && (
        <div className="alert-banner warning" role="alert">
          <span>Para ver o crear categorías, selecciona o crea primero una organización.</span>
        </div>
      )}

      {/* Formulario de Alta de Categoría (CA-01) */}
      {showForm && currentOrg && (
        <div className="card" style={{ background: '#fcfdfe', borderColor: '#bfdbfe', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--primary)' }}>
            Nueva Categoría
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Organización: <strong>{currentOrg.name}</strong>
          </p>

          <form onSubmit={handleCreateCategory}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="cat-name" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Nombre de la Categoría *
              </label>
              <input
                id="cat-name"
                type="text"
                required
                maxLength={100}
                placeholder="Ej. Primera División, Juveniles M19, Reserva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="cat-desc" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Descripción (opcional)
              </label>
              <textarea
                id="cat-desc"
                rows={2}
                maxLength={250}
                placeholder="Ej. Plantel de alta competencia o formativo"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !name.trim()}
              >
                {saving ? 'Guardando…' : 'Crear Categoría'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estados de Carga y Vacío */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Cargando categorías…
        </div>
      ) : !currentOrg ? null : categories.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Layers size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            No hay categorías registradas en {currentOrg.name}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Crea tu primera categoría para organizar a tus atletas.
          </p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <FolderPlus size={16} />
            Nueva Categoría
          </button>
        </div>
      ) : (
        <div className="grid-3">
          {categories.map((cat) => (
            <div key={cat.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      {cat.description}
                    </p>
                  )}
                </div>
                <span className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>
                  Disponible
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

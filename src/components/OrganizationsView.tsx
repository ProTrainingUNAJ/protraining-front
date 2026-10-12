import React, { useState, useEffect } from 'react';
import { apiRequest, ApiError } from '../api/client';
import { Organization } from '../types';
import { Plus, RefreshCw, Building2, Check, AlertCircle } from 'lucide-react';

interface OrganizationsViewProps {
  selectedOrgId?: string;
  onSelectOrg: (org: Organization) => void;
}

export const OrganizationsView: React.FC<OrganizationsViewProps> = ({
  selectedOrgId,
  onSelectOrg,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formulario nueva organización
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Organization[]>('/estructura/api/organizations');
      setOrganizations(data || []);
      if (data && data.length > 0 && !selectedOrgId) {
        onSelectOrg(data[0]);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudieron cargar las organizaciones.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('El nombre de la organización es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newOrg = await apiRequest<Organization>('/estructura/api/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanName,
          description: description.trim() || null,
        }),
      });

      setSuccessMessage('La organización se creó correctamente.');
      setName('');
      setDescription('');
      setShowForm(false);
      setOrganizations((prev) => [newOrg, ...prev]);
      onSelectOrg(newOrg);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al registrar la organización.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Organizaciones</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Gestiona los clubes o entidades deportivas a tu cargo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchOrganizations}
            disabled={loading || saving}
            title="Recargar listado"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
            disabled={saving}
          >
            <Plus size={16} />
            {showForm ? 'Cerrar formulario' : 'Nueva organización'}
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

      {/* Formulario de Alta */}
      {showForm && (
        <div className="card" style={{ background: '#fcfdfe', borderColor: '#bfdbfe', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>
            Crear Nueva Organización
          </h3>
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label htmlFor="org-name" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Nombre de la Organización *
              </label>
              <input
                id="org-name"
                type="text"
                required
                maxLength={100}
                placeholder="Ej. Club Atlético San Martín"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="org-desc" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                Descripción (opcional)
              </label>
              <textarea
                id="org-desc"
                rows={2}
                maxLength={250}
                placeholder="Ej. Sede principal o divisiones formativas"
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
                {saving ? 'Guardando…' : 'Crear Organización'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estados de Carga y Vacío */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Cargando organizaciones…
        </div>
      ) : organizations.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            No hay organizaciones registradas
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Comienza registrando tu primera organización o club deportivo.
          </p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Crear Organización
          </button>
        </div>
      ) : (
        <div className="grid-2">
          {organizations.map((org) => {
            const isSelected = org.id === selectedOrgId;
            return (
              <div
                key={org.id}
                className="card"
                style={{
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
                onClick={() => onSelectOrg(org)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {org.name}
                    </h3>
                    {org.description && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {org.description}
                      </p>
                    )}
                  </div>
                  {isSelected ? (
                    <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                      <Check size={12} /> Activa
                    </span>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrg(org);
                      }}
                    >
                      Seleccionar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

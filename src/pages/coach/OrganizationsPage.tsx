import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, RefreshCw, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { structureService } from '../../api/structureService';
import { Organization } from '../../types/structure';
import { PageHeader } from '../../components/shell/PageHeader';

export const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Campos del formulario
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let isMounted = true;

    structureService
      .getOrganizations()
      .then((data) => {
        if (!isMounted) return;
        setOrganizations(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await structureService.getOrganizations();
      setOrganizations(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.');
    } finally {
      setLoading(false);
    }
  };

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
      const newOrg = await structureService.createOrganization({
        name: cleanName,
        description: description.trim() || null,
      });

      setSuccessMessage('La organización se creó exitosamente.');
      setName('');
      setDescription('');
      setShowForm(false);
      setOrganizations((prev) => [newOrg, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar la organización.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Organizaciones"
        description="Clubes y entidades deportivas bajo tu supervisión."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={loading || saving}
              title="Actualizar listado"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm);
                setError(null);
              }}
              disabled={saving}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{showForm ? 'Cancelar' : 'Nueva Organización'}</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {/* Alertas informativas */}
        {successMessage && (
          <div className="alert-banner success" role="alert" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={18} aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'inherit',
              }}
              onClick={() => setSuccessMessage(null)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="alert-banner danger" role="alert" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                color: 'inherit',
              }}
              onClick={() => setError(null)}
              aria-label="Cerrar error"
            >
              ×
            </button>
          </div>
        )}

        {/* Formulario de Alta de Organización */}
        {showForm && (
          <div
            className="card"
            style={{
              marginBottom: '1.5rem',
              border: '1.5px solid var(--secondary)',
              background: 'var(--bg-card)',
            }}
          >
            <h2
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                color: 'var(--primary)',
              }}
            >
              Nueva Organización Deportiva
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Completa los datos del club para administrar sus categorías y atletas.
            </p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label
                  htmlFor="org-name"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  Nombre del Club u Organización *
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="org-desc"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  Descripción o Sede (opcional)
                </label>
                <textarea
                  id="org-desc"
                  rows={2}
                  maxLength={250}
                  placeholder="Ej. Sede central - Divisiones formativas y primera"
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
                <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
                  {saving ? 'Guardando…' : 'Crear Organización'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Estados de Carga y Vacío */}
        {loading ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
          >
            <p style={{ margin: 0, fontWeight: 500 }}>Cargando organizaciones…</p>
          </div>
        ) : organizations.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
          >
            <Building2
              size={44}
              style={{ margin: '0 auto 1rem', opacity: 0.35 }}
              aria-hidden="true"
            />
            <h2
              style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                color: 'var(--text-main)',
              }}
            >
              No hay organizaciones registradas
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                maxWidth: '420px',
                marginInline: 'auto',
              }}
            >
              Comienza dando de alta tu primera organización deportiva para luego gestionar sus
              categorías y atletas.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} aria-hidden="true" />
              <span>Crear Organización</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1rem',
            }}
          >
            {organizations.map((org) => (
              <div
                key={org.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  margin: 0,
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        margin: 0,
                      }}
                    >
                      {org.name}
                    </h2>
                    <span className="badge badge-info">
                      {org.categoriesCount} {org.categoriesCount === 1 ? 'categoría' : 'categorías'}
                    </span>
                  </div>

                  {org.description ? (
                    <p
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        margin: '0 0 1rem',
                      }}
                    >
                      {org.description}
                    </p>
                  ) : (
                    <p
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        fontStyle: 'italic',
                        margin: '0 0 1rem',
                      }}
                    >
                      Sin descripción especificada.
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => navigate(`/pf/categories?orgId=${org.id}`)}
                  >
                    <span>Ver Categorías</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

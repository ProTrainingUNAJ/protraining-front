import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layers, Plus, RefreshCw, Check, AlertCircle, Users, QrCode } from 'lucide-react';
import { structureService } from '../../api/structureService';
import { Organization, Category } from '../../types/structure';
import { PageHeader } from '../../components/shell/PageHeader';
import { CategoryInvitationModal } from '../../components/categories/CategoryInvitationModal';

export const CategoriesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [invitingCategory, setInvitingCategory] = useState<Category | null>(null);

  // Campos de creación
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // 1. Cargar organizaciones
  useEffect(() => {
    let mounted = true;
    async function loadOrgs() {
      setLoadingOrgs(true);
      setError(null);
      try {
        const orgs = await structureService.getOrganizations();
        if (!mounted) return;
        setOrganizations(orgs);

        const urlOrgId = searchParams.get('orgId');
        if (urlOrgId && orgs.some((o) => o.id === urlOrgId)) {
          setSelectedOrgId(urlOrgId);
        } else if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.');
      } finally {
        if (mounted) setLoadingOrgs(false);
      }
    }
    loadOrgs();
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  // 2. Cargar categorías de la organización seleccionada
  useEffect(() => {
    if (!selectedOrgId) {
      return;
    }

    let mounted = true;

    structureService
      .getCategories(selectedOrgId)
      .then((categories) => structureService.withAthleteCounts(categories))
      .then((data) => {
        if (!mounted) return;
        setCategories(data);
        setLoadingCategories(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Error al consultar las categorías de la organización.',
        );
        setLoadingCategories(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedOrgId]);

  const handleRefreshCategories = async (orgId: string) => {
    if (!orgId) {
      setCategories([]);
      return;
    }
    setLoadingCategories(true);
    setError(null);
    try {
      const data = await structureService.withAthleteCounts(
        await structureService.getCategories(orgId),
      );
      setCategories(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al consultar las categorías de la organización.',
      );
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleOrgChange = (newOrgId: string) => {
    setSelectedOrgId(newOrgId);
    setSearchParams({ orgId: newOrgId });
    setError(null);
    setSuccessMessage(null);
    setShowForm(false);
  };

  // 3. Crear nueva categoría (CA2)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setError('Debes seleccionar una organización deportiva.');
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
      const newCategory = await structureService.createCategory(selectedOrgId, {
        name: cleanName,
        description: description.trim() || null,
      });

      setSuccessMessage('La categoría fue creada con éxito.');
      setName('');
      setDescription('');
      setShowForm(false);
      // Actualización inmediata del listado local sin elementos ficticios
      setCategories((prev) => [newCategory, ...prev]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al registrar la categoría en el servidor.',
      );
    } finally {
      setSaving(false);
    }
  };

  const currentOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Categorías"
        description="Divisiones competitivas y planteles por club u organización."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {organizations.length > 0 && (
              <select
                style={{
                  width: 'auto',
                  minWidth: '220px',
                  margin: 0,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                }}
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                disabled={loadingOrgs || loadingCategories || saving}
                aria-label="Seleccionar organización"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleRefreshCategories(selectedOrgId)}
              disabled={loadingCategories || saving || !selectedOrgId}
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
              disabled={saving || !selectedOrgId}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{showForm ? 'Cancelar' : 'Nueva Categoría'}</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body">
        {/* Alertas */}
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

        {/* Formulario de Alta de Categoría */}
        {showForm && currentOrg && (
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
                marginBottom: '0.25rem',
                color: 'var(--primary)',
              }}
            >
              Nueva Categoría Deportiva
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Club: <strong>{currentOrg.name}</strong>
            </p>

            <form onSubmit={handleCreateCategory}>
              <div style={{ marginBottom: '0.9rem' }}>
                <label
                  htmlFor="cat-name"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  Nombre de la División o Categoría *
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="cat-desc"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  Descripción o Nivel Competitivo (opcional)
                </label>
                <textarea
                  id="cat-desc"
                  rows={2}
                  maxLength={250}
                  placeholder="Ej. Plantel superior competitivo del torneo oficial"
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
                  {saving ? 'Guardando…' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Estados según Organizaciones y Categorías */}
        {loadingOrgs ? (
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
            <Layers size={44} style={{ margin: '0 auto 1rem', opacity: 0.35 }} aria-hidden="true" />
            <h2
              style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                color: 'var(--text-main)',
              }}
            >
              Se requiere una organización
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                maxWidth: '420px',
                marginInline: 'auto',
              }}
            >
              Para gestionar o crear categorías, primero debes registrar una organización deportiva.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/pf/organizations')}
            >
              <span>Ir a Organizaciones</span>
            </button>
          </div>
        ) : loadingCategories ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
          >
            <p style={{ margin: 0, fontWeight: 500 }}>Cargando categorías de {currentOrg?.name}…</p>
          </div>
        ) : categories.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
          >
            <Layers size={44} style={{ margin: '0 auto 1rem', opacity: 0.35 }} aria-hidden="true" />
            <h2
              style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                color: 'var(--text-main)',
              }}
            >
              No hay categorías registradas en {currentOrg?.name}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                maxWidth: '420px',
                marginInline: 'auto',
              }}
            >
              Crea la primera categoría para organizar las divisiones y asociar a tus atletas.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} aria-hidden="true" />
              <span>Crear Primera Categoría</span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1rem',
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  margin: 0,
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
                      {cat.name}
                    </h2>
                    <span className="badge badge-info">
                      {cat.athletesCount} {cat.athletesCount === 1 ? 'atleta' : 'atletas'}
                    </span>
                  </div>

                  {cat.description ? (
                    <p
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        margin: '0 0 1rem',
                      }}
                    >
                      {cat.description}
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
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setInvitingCategory(cat)}
                    aria-label={`Invitar atletas a ${cat.name}`}
                  >
                    <QrCode size={14} aria-hidden="true" />
                    <span>Invitar Atletas</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => navigate(`/pf/athletes?catId=${cat.id}`)}
                  >
                    <Users size={14} aria-hidden="true" />
                    <span>Ver Atletas</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {invitingCategory && (
        <CategoryInvitationModal
          categoryId={invitingCategory.id}
          categoryName={invitingCategory.name}
          onClose={() => setInvitingCategory(null)}
        />
      )}
    </div>
  );
};

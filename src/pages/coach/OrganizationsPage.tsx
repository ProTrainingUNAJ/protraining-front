import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Layers,
  Plus,
  Check,
  AlertCircle,
  Search,
  X,
  Pencil,
  Trash2,
  Camera,
  Users,
  QrCode,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';
import { structureService } from '../../api/structureService';
import { Organization, Category } from '../../types/structure';
import { PageHeader } from '../../components/shell/PageHeader';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { PhotoUploadControl } from '../../components/common/PhotoUploadControl';
import { CategoryInvitationModal } from '../../components/categories/CategoryInvitationModal';

export const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Datos principales
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Estados de carga y feedback
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Buscadores independientes
  const [orgSearch, setOrgSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');

  // Modales
  const [orgModal, setOrgModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    org?: Organization;
  }>({ isOpen: false, mode: 'create' });

  const [catModal, setCatModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    category?: Category;
  }>({ isOpen: false, mode: 'create' });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'org' | 'cat';
    id: string;
    name: string;
  }>({ isOpen: false, type: 'org', id: '', name: '' });

  const [photoOrg, setPhotoOrg] = useState<Organization | null>(null);
  const [invitingCategory, setInvitingCategory] = useState<Category | null>(null);

  // Campos de formulario para Organización
  const [orgFormName, setOrgFormName] = useState('');
  const [orgFormDesc, setOrgFormDesc] = useState('');

  // Campos de formulario para Categoría
  const [catFormName, setCatFormName] = useState('');
  const [catFormDesc, setCatFormDesc] = useState('');

  // Vista mobile
  const [mobileView, setMobileView] = useState<'organizations' | 'categories'>('organizations');

  // 1. Cargar organizaciones al montar (una sola vez)
  useEffect(() => {
    let isMounted = true;

    async function fetchOrgs() {
      try {
        const rawOrgs = await structureService.getOrganizations();
        let fullOrgs: Organization[] = rawOrgs;
        if (typeof structureService.withStructureCounts === 'function') {
          fullOrgs = await structureService.withStructureCounts(rawOrgs);
        } else if (typeof structureService.withCategoryCounts === 'function') {
          fullOrgs = await structureService.withCategoryCounts(rawOrgs);
        }

        if (!isMounted) return;
        setOrganizations(fullOrgs);

        if (fullOrgs.length > 0) {
          const initialTargetId = new URLSearchParams(window.location.search).get('orgId');
          if (initialTargetId && fullOrgs.some((o) => o.id === initialTargetId)) {
            setSelectedOrgId(initialTargetId);
          } else {
            setSelectedOrgId(fullOrgs[0].id);
          }
          if (window.location.search.includes('orgId=')) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.');
      } finally {
        if (isMounted) setLoadingOrgs(false);
      }
    }

    fetchOrgs();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Cargar categorías al cambiar la organización seleccionada
  useEffect(() => {
    if (!selectedOrgId) {
      return;
    }

    let isMounted = true;

    structureService
      .getCategories(selectedOrgId)
      .then((rawCategories) => structureService.withAthleteCounts(rawCategories))
      .then((data) => {
        if (!isMounted) return;
        setCategories(data);
        const totalAthletes = data.reduce((sum, c) => sum + (c.athletesCount || 0), 0);
        setOrganizations((prev) =>
          prev.map((o) =>
            o.id === selectedOrgId
              ? {
                  ...o,
                  categoriesCount: data.length,
                  athletesCount: totalAthletes,
                }
              : o,
          ),
        );
        setLoadingCategories(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Error al consultar las categorías de la organización.',
        );
        setLoadingCategories(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedOrgId]);

  // Selección de organización
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    setError(null);
    setSuccessMessage(null);
    setMobileView('categories');
  };

  // Organización actualmente seleccionada
  const selectedOrg = useMemo(
    () => organizations.find((o) => o.id === selectedOrgId),
    [organizations, selectedOrgId],
  );

  // Conteo total de atletas de la organización seleccionada
  const selectedOrgAthletesCount = useMemo(() => {
    if (categories.length > 0) {
      return categories.reduce((sum, c) => sum + (c.athletesCount || 0), 0);
    }
    return selectedOrg?.athletesCount ?? 0;
  }, [categories, selectedOrg]);

  // Filtrado de organizaciones
  const filteredOrganizations = useMemo(() => {
    const q = orgSearch.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q)),
    );
  }, [organizations, orgSearch]);

  // Filtrado de categorías
  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)),
    );
  }, [categories, catSearch]);

  // =========================================================================
  // Manejo de Organizaciones (CRUD)
  // =========================================================================
  const openCreateOrgModal = () => {
    setOrgFormName('');
    setOrgFormDesc('');
    setOrgModal({ isOpen: true, mode: 'create' });
    setError(null);
  };

  const openEditOrgModal = (org: Organization) => {
    setOrgFormName(org.name);
    setOrgFormDesc(org.description || '');
    setOrgModal({ isOpen: true, mode: 'edit', org });
    setError(null);
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = orgFormName.trim();
    if (!cleanName) {
      setError('El nombre de la organización es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (orgModal.mode === 'create') {
        const created = await structureService.createOrganization({
          name: cleanName,
          description: orgFormDesc.trim() || null,
        });

        const newOrgWithCounts: Organization = {
          ...created,
          categoriesCount: 0,
          athletesCount: 0,
        };

        setOrganizations((prev) => [newOrgWithCounts, ...prev]);
        setSelectedOrgId(created.id);
        setCategories([]);
        setSuccessMessage('La organización se creó exitosamente.');
      } else if (orgModal.org) {
        const updated = await structureService.updateOrganization(orgModal.org.id, {
          name: cleanName,
          description: orgFormDesc.trim() || null,
        });

        setOrganizations((prev) =>
          prev.map((o) =>
            o.id === updated.id
              ? {
                  ...o,
                  name: updated.name,
                  description: updated.description,
                }
              : o,
          ),
        );
        setSuccessMessage('La organización se actualizó exitosamente.');
      }
      setOrgModal({ isOpen: false, mode: 'create' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la organización.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteOrganization = (org: Organization) => {
    setDeleteModal({
      isOpen: true,
      type: 'org',
      id: org.id,
      name: org.name,
    });
  };

  const handleDeleteOrganization = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await structureService.deleteOrganization(deleteModal.id);

      const nextOrgs = organizations.filter((o) => o.id !== deleteModal.id);
      setOrganizations(nextOrgs);
      setSuccessMessage(`La organización "${deleteModal.name}" fue eliminada correctamente.`);

      if (selectedOrgId === deleteModal.id) {
        if (nextOrgs.length > 0) {
          const nextId = nextOrgs[0].id;
          setSelectedOrgId(nextId);
        } else {
          setSelectedOrgId('');
          setCategories([]);
        }
      }
      setDeleteModal({ isOpen: false, type: 'org', id: '', name: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la organización.');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // Manejo de Categorías (CRUD)
  // =========================================================================
  const openCreateCategoryModal = () => {
    if (!selectedOrgId) {
      setError('Elegí una organización deportiva.');
      return;
    }
    setCatFormName('');
    setCatFormDesc('');
    setCatModal({ isOpen: true, mode: 'create' });
    setError(null);
  };

  const openEditCategoryModal = (cat: Category) => {
    setCatFormName(cat.name);
    setCatFormDesc(cat.description || '');
    setCatModal({ isOpen: true, mode: 'edit', category: cat });
    setError(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId) {
      setError('Elegí una organización deportiva.');
      return;
    }

    const cleanName = catFormName.trim();
    if (!cleanName) {
      setError('El nombre de la categoría es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (catModal.mode === 'create') {
        const created = await structureService.createCategory(selectedOrgId, {
          name: cleanName,
          description: catFormDesc.trim() || null,
        });

        const newCatWithCounts: Category = {
          ...created,
          athletesCount: 0,
        };

        setCategories((prev) => [newCatWithCounts, ...prev]);

        // Actualizar contador en la organización seleccionada
        setOrganizations((prev) =>
          prev.map((o) =>
            o.id === selectedOrgId ? { ...o, categoriesCount: o.categoriesCount + 1 } : o,
          ),
        );

        setSuccessMessage('La categoría fue creada con éxito.');
      } else if (catModal.category) {
        const updated = await structureService.updateCategory(catModal.category.id, {
          name: cleanName,
          description: catFormDesc.trim() || null,
        });

        setCategories((prev) =>
          prev.map((c) =>
            c.id === updated.id
              ? {
                  ...c,
                  name: updated.name,
                  description: updated.description,
                }
              : c,
          ),
        );
        setSuccessMessage('La categoría fue actualizada con éxito.');
      }
      setCatModal({ isOpen: false, mode: 'create' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteCategory = (cat: Category) => {
    setDeleteModal({
      isOpen: true,
      type: 'cat',
      id: cat.id,
      name: cat.name,
    });
  };

  const handleDeleteCategory = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await structureService.deleteCategory(deleteModal.id);

      const targetCat = categories.find((c) => c.id === deleteModal.id);
      const athletesDeduction = targetCat?.athletesCount || 0;

      setCategories((prev) => prev.filter((c) => c.id !== deleteModal.id));

      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === selectedOrgId
            ? {
                ...o,
                categoriesCount: Math.max(0, o.categoriesCount - 1),
                athletesCount: Math.max(0, (o.athletesCount || 0) - athletesDeduction),
              }
            : o,
        ),
      );

      setSuccessMessage(`La categoría "${deleteModal.name}" fue eliminada correctamente.`);
      setDeleteModal({ isOpen: false, type: 'cat', id: '', name: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la categoría.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Principal Limpio */}
      <PageHeader
        title="Organizaciones"
        description="Administrá tus clubes y planteles deportivos."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateOrgModal}
            disabled={saving}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Nueva Organización</span>
          </button>
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

        {/* Layout Master-Detail */}
        <div className="structure-layout">
          {/* ===============================================================
              PANEL MASTER: ORGANIZACIONES
              =============================================================== */}
          <aside
            className={`structure-master-panel ${
              mobileView === 'categories' ? 'structure-mobile-hidden' : ''
            }`}
            aria-label="Listado de organizaciones"
          >
            <div className="structure-master-header">
              <h2 className="structure-master-title">
                <Building2 size={16} color="var(--primary)" aria-hidden="true" />
                <span>Organizaciones</span>
              </h2>
              <span className="structure-count-bubble">{organizations.length}</span>
            </div>

            {/* Buscador de organizaciones */}
            <div className="structure-search-wrap">
              <div className="structure-search-box">
                <Search size={14} className="structure-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="structure-search-input"
                  placeholder="Buscar organización…"
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  aria-label="Buscar organización"
                />
                {orgSearch && (
                  <button
                    type="button"
                    className="structure-search-clear"
                    onClick={() => setOrgSearch('')}
                    aria-label="Limpiar búsqueda de organización"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Listado de organizaciones estilo lista limpia */}
            {loadingOrgs ? (
              <div className="structure-empty-state" style={{ padding: '2rem 1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Cargando organizaciones…</p>
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="structure-empty-state" style={{ padding: '2.5rem 1rem' }}>
                <Building2 size={28} className="structure-empty-icon" aria-hidden="true" />
                <h3 className="structure-empty-title" style={{ fontSize: '0.95rem' }}>
                  {orgSearch ? 'Sin coincidencias' : 'Sin organizaciones'}
                </h3>
                <p
                  className="structure-empty-desc"
                  style={{ fontSize: '0.8rem', marginBottom: '1rem' }}
                >
                  {orgSearch
                    ? 'Probá con otro nombre de club.'
                    : 'Comenzá creando tu primera organización deportiva.'}
                </p>
                {!orgSearch && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                    onClick={openCreateOrgModal}
                  >
                    <Plus size={13} aria-hidden="true" />
                    <span>Crear Organización</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="structure-org-list" role="list">
                {filteredOrganizations.map((org) => {
                  const isSelected = org.id === selectedOrgId;
                  const catCountText = `${org.categoriesCount} ${
                    org.categoriesCount === 1 ? 'categoría' : 'categorías'
                  }`;
                  const athleteCountText =
                    org.athletesCount !== undefined && org.athletesCount > 0
                      ? ` · ${org.athletesCount} ${org.athletesCount === 1 ? 'atleta' : 'atletas'}`
                      : '';

                  return (
                    <div
                      key={org.id}
                      role="button"
                      tabIndex={0}
                      className={`structure-org-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectOrg(org.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectOrg(org.id);
                        }
                      }}
                      aria-label={`Seleccionar ${org.name}`}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <div className="structure-org-avatar">
                        <ProfileAvatar
                          src={
                            org.hasPhoto
                              ? structureService.getOrganizationPhotoUrl(org.id, org.photoUpdatedAt)
                              : null
                          }
                          name={org.name}
                          size={36}
                          shape="rounded"
                        />
                      </div>

                      <div className="structure-org-details">
                        <h3 className="structure-org-name">{org.name}</h3>
                        <div className="structure-org-bubbles-row">
                          <span className="structure-meta-bubble">
                            <Layers size={11} aria-hidden="true" />
                            <span>{catCountText}</span>
                          </span>
                          {athleteCountText && (
                            <span className="structure-meta-bubble">
                              <Users size={11} aria-hidden="true" />
                              <span>{athleteCountText.replace(/^ · /, '')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          {/* ===============================================================
              PANEL DETALLE: CATEGORÍAS DE LA ORGANIZACIÓN SELECCIONADA
              =============================================================== */}
          <main
            className={`structure-detail-panel ${
              mobileView === 'organizations' ? 'structure-mobile-hidden' : ''
            }`}
            aria-label="Detalle de categorías"
          >
            {/* Navegación Mobile */}
            <div className="structure-mobile-back">
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}
                onClick={() => setMobileView('organizations')}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                <span>Volver a organizaciones</span>
              </button>
            </div>

            {selectedOrg ? (
              <div className="structure-detail-card">
                {/* Cabecera limpia y elegante de la Organización */}
                <div className="structure-detail-header">
                  <div className="structure-detail-header-top">
                    <div className="structure-club-profile">
                      <div
                        className="structure-avatar-trigger"
                        onClick={() => setPhotoOrg(selectedOrg)}
                        role="button"
                        tabIndex={0}
                        title="Hacé clic para cambiar el logo del club"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPhotoOrg(selectedOrg);
                          }
                        }}
                      >
                        <ProfileAvatar
                          src={
                            selectedOrg.hasPhoto
                              ? structureService.getOrganizationPhotoUrl(
                                  selectedOrg.id,
                                  selectedOrg.photoUpdatedAt,
                                )
                              : null
                          }
                          name={selectedOrg.name}
                          size={52}
                          shape="rounded"
                        />
                        <div className="structure-avatar-overlay">
                          <Camera size={18} aria-hidden="true" />
                        </div>
                      </div>

                      <div className="structure-club-info">
                        <h2 className="structure-club-title">{selectedOrg.name}</h2>
                        <div className="structure-bubble-row">
                          <span className="structure-stat-bubble info">
                            <Layers size={13} aria-hidden="true" />
                            <span>
                              {categories.length}{' '}
                              {categories.length === 1 ? 'categoría' : 'categorías'}
                            </span>
                          </span>
                          <span className="structure-stat-bubble">
                            <Users size={13} aria-hidden="true" />
                            <span>
                              {selectedOrgAthletesCount}{' '}
                              {selectedOrgAthletesCount === 1 ? 'atleta total' : 'atletas totales'}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="structure-header-actions">
                      <div className="structure-actions-bubble-group">
                        <button
                          type="button"
                          className="structure-bubble-btn"
                          onClick={() => openEditOrgModal(selectedOrg)}
                          title="Editar nombre o descripción"
                          aria-label={`Editar ${selectedOrg.name}`}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          className="structure-bubble-btn danger"
                          onClick={() => confirmDeleteOrganization(selectedOrg)}
                          title="Eliminar club"
                          aria-label={`Eliminar ${selectedOrg.name}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
                        onClick={openCreateCategoryModal}
                      >
                        <Plus size={15} aria-hidden="true" />
                        <span>Nueva Categoría</span>
                      </button>
                    </div>
                  </div>

                  {selectedOrg.description && (
                    <p className="structure-club-desc">{selectedOrg.description}</p>
                  )}
                </div>

                {/* Cuerpo del detalle: Categorías y planteles pertenecientes a la organización */}
                <div className="structure-detail-body">
                  {/* Barra de Categorías */}
                  <div className="structure-categories-bar">
                    <div className="structure-categories-title-wrap">
                      <h3 className="structure-categories-title">Categorías y Planteles</h3>
                      <span className="structure-count-bubble">{filteredCategories.length}</span>
                    </div>
                    {(categories.length > 0 || catSearch) && (
                      <div className="structure-search-box structure-categories-search">
                        <Search size={14} className="structure-search-icon" aria-hidden="true" />
                        <input
                          type="text"
                          className="structure-search-input"
                          placeholder="Buscar categoría…"
                          value={catSearch}
                          onChange={(e) => setCatSearch(e.target.value)}
                          aria-label="Buscar categoría"
                        />
                        {catSearch && (
                          <button
                            type="button"
                            className="structure-search-clear"
                            onClick={() => setCatSearch('')}
                            aria-label="Limpiar búsqueda de categoría"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grilla de Categorías */}
                  {loadingCategories ? (
                    <div className="structure-empty-state">
                      <p style={{ margin: 0 }}>Cargando categorías de {selectedOrg.name}…</p>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="structure-empty-state">
                      <Layers size={36} className="structure-empty-icon" aria-hidden="true" />
                      <h4 className="structure-empty-title">
                        {catSearch
                          ? 'Sin coincidencias'
                          : `No hay categorías en ${selectedOrg.name}`}
                      </h4>
                      <p className="structure-empty-desc">
                        {catSearch
                          ? 'Probá con otro término de búsqueda.'
                          : 'Creá la primera categoría para organizar planteles y asociar atletas.'}
                      </p>
                      {!catSearch && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={openCreateCategoryModal}
                        >
                          <Plus size={15} aria-hidden="true" />
                          <span>Crear Primera Categoría</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="structure-categories-grid">
                      {filteredCategories.map((cat) => (
                        <div key={cat.id} className="structure-category-card">
                          <div>
                            <div className="structure-category-top">
                              <div className="structure-category-name-wrap">
                                <h3 className="structure-category-name">{cat.name}</h3>
                                <span className="structure-category-badge">
                                  <Users size={12} aria-hidden="true" />
                                  <span>
                                    {cat.athletesCount}{' '}
                                    {cat.athletesCount === 1 ? 'atleta' : 'atletas'}
                                  </span>
                                </span>
                              </div>

                              <div className="structure-category-menu-actions">
                                <button
                                  type="button"
                                  className="structure-icon-btn"
                                  title="Editar categoría"
                                  onClick={() => openEditCategoryModal(cat)}
                                  aria-label={`Editar ${cat.name}`}
                                >
                                  <Pencil size={13} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  className="structure-icon-btn danger"
                                  title="Eliminar categoría"
                                  onClick={() => confirmDeleteCategory(cat)}
                                  aria-label={`Eliminar ${cat.name}`}
                                >
                                  <Trash2 size={13} aria-hidden="true" />
                                </button>
                              </div>
                            </div>

                            {cat.description ? (
                              <p className="structure-category-desc">{cat.description}</p>
                            ) : (
                              <p className="structure-category-desc empty">
                                Sin descripción adicional.
                              </p>
                            )}
                          </div>

                          <div className="structure-category-footer">
                            <button
                              type="button"
                              className="structure-btn-pill"
                              onClick={() => setInvitingCategory(cat)}
                              aria-label={`Invitar atletas a ${cat.name}`}
                              title="Generar enlace o QR de invitación"
                            >
                              <QrCode size={14} aria-hidden="true" />
                              <span>Invitar Atletas</span>
                            </button>
                            <button
                              type="button"
                              className="structure-btn-pill"
                              onClick={() => navigate('/pf/athletes', { state: { catId: cat.id } })}
                              title="Ver listado de atletas de esta división"
                            >
                              <Users size={14} aria-hidden="true" />
                              <span>Ver Atletas</span>
                            </button>
                            <button
                              type="button"
                              className="structure-btn-pill statistics"
                              onClick={() => navigate(`/pf/statistics?catId=${cat.id}`)}
                              title="Ver presentismo, lesiones y carga de esta categoría"
                              aria-label={`Estadísticas de ${cat.name}`}
                            >
                              <BarChart3 size={14} aria-hidden="true" />
                              <span>Estadísticas</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="structure-detail-card">
                <div
                  className="structure-empty-state"
                  style={{ padding: '4rem 1.5rem', border: 'none' }}
                >
                  <Building2 size={40} className="structure-empty-icon" aria-hidden="true" />
                  <h2 className="structure-empty-title">Elegí una organización</h2>
                  <p className="structure-empty-desc">
                    Seleccioná una organización del panel lateral para ver y administrar sus
                    categorías, o creá una nueva.
                  </p>
                  <button type="button" className="btn btn-primary" onClick={openCreateOrgModal}>
                    <Plus size={15} aria-hidden="true" />
                    <span>Crear Organización</span>
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* =====================================================================
          MODAL: CREAR / EDITAR ORGANIZACIÓN
          ===================================================================== */}
      {orgModal.isOpen && (
        <div
          className="structure-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="org-modal-title"
        >
          <div className="structure-modal-box">
            <div className="structure-modal-header">
              <div>
                <h3 id="org-modal-title" className="structure-modal-title">
                  {orgModal.mode === 'create' ? 'Nueva Organización' : 'Editar Organización'}
                </h3>
                <p className="structure-modal-subtitle">
                  {orgModal.mode === 'create'
                    ? 'Completá los datos del club para administrar sus categorías y atletas.'
                    : 'Modificá los datos generales del club.'}
                </p>
              </div>
              <button
                type="button"
                className="structure-modal-close"
                onClick={() => setOrgModal({ isOpen: false, mode: 'create' })}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrganization}>
              <div className="structure-form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="org-name-input" className="structure-form-label">
                  Nombre del Club u Organización *
                </label>
                <input
                  id="org-name-input"
                  type="text"
                  className="structure-form-input"
                  required
                  maxLength={100}
                  placeholder="Ej. Club Atlético San Martín"
                  value={orgFormName}
                  onChange={(e) => setOrgFormName(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="structure-form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="org-desc-input" className="structure-form-label">
                  Descripción o Sede (opcional)
                </label>
                <textarea
                  id="org-desc-input"
                  className="structure-form-textarea"
                  rows={3}
                  maxLength={250}
                  placeholder="Ej. Sede central - Divisiones formativas y primera"
                  value={orgFormDesc}
                  onChange={(e) => setOrgFormDesc(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="structure-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOrgModal({ isOpen: false, mode: 'create' })}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !orgFormName.trim()}
                >
                  {saving
                    ? 'Guardando…'
                    : orgModal.mode === 'create'
                      ? 'Crear Organización'
                      : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREAR / EDITAR CATEGORÍA
          ===================================================================== */}
      {catModal.isOpen && selectedOrg && (
        <div
          className="structure-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cat-modal-title"
        >
          <div className="structure-modal-box">
            <div className="structure-modal-header">
              <div>
                <h3 id="cat-modal-title" className="structure-modal-title">
                  {catModal.mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}
                </h3>
                <p className="structure-modal-subtitle">
                  Club: <strong>{selectedOrg.name}</strong>
                </p>
              </div>
              <button
                type="button"
                className="structure-modal-close"
                onClick={() => setCatModal({ isOpen: false, mode: 'create' })}
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="structure-form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="cat-name-input" className="structure-form-label">
                  Nombre de la División o Categoría *
                </label>
                <input
                  id="cat-name-input"
                  type="text"
                  className="structure-form-input"
                  required
                  maxLength={100}
                  placeholder="Ej. Primera División, Juveniles M19, Reserva"
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="structure-form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="cat-desc-input" className="structure-form-label">
                  Descripción o Nivel Competitivo (opcional)
                </label>
                <textarea
                  id="cat-desc-input"
                  className="structure-form-textarea"
                  rows={3}
                  maxLength={250}
                  placeholder="Ej. Plantel superior competitivo del torneo oficial"
                  value={catFormDesc}
                  onChange={(e) => setCatFormDesc(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="structure-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCatModal({ isOpen: false, mode: 'create' })}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !catFormName.trim()}
                >
                  {saving
                    ? 'Guardando…'
                    : catModal.mode === 'create'
                      ? 'Crear Categoría'
                      : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRMACIÓN DE BORRADO (ORGANIZACIÓN O CATEGORÍA)
          ===================================================================== */}
      {deleteModal.isOpen && (
        <div
          className="structure-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="structure-modal-box">
            <div className="structure-modal-header">
              <h3 id="delete-modal-title" className="structure-modal-title">
                {deleteModal.type === 'org' ? 'Eliminar Organización' : 'Eliminar Categoría'}
              </h3>
              <button
                type="button"
                className="structure-modal-close"
                onClick={() => setDeleteModal({ isOpen: false, type: 'org', id: '', name: '' })}
                aria-label="Cerrar confirmación"
              >
                <X size={18} />
              </button>
            </div>

            <div className="structure-danger-box">
              <AlertCircle size={22} className="structure-danger-icon" aria-hidden="true" />
              <p className="structure-danger-text">
                {deleteModal.type === 'org'
                  ? `¿Estás seguro de que deseás eliminar la organización "${deleteModal.name}"? Esta acción dará de baja la organización y sus categorías asociadas.`
                  : `¿Estás seguro de que deseás eliminar la categoría "${deleteModal.name}"?`}
              </p>
            </div>

            <div className="structure-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModal({ isOpen: false, type: 'org', id: '', name: '' })}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  background: 'var(--danger)',
                  color: 'var(--on-primary)',
                  borderColor: 'var(--danger)',
                }}
                onClick={
                  deleteModal.type === 'org' ? handleDeleteOrganization : handleDeleteCategory
                }
                disabled={saving}
              >
                {saving ? 'Eliminando…' : 'Eliminar Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: LOGO DE ORGANIZACIÓN (WebP, KAN-512)
          ===================================================================== */}
      {photoOrg && (
        <div
          className="structure-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logo-modal-title"
        >
          <div className="structure-modal-box" style={{ maxWidth: '420px' }}>
            <div className="structure-modal-header">
              <div>
                <h3 id="logo-modal-title" className="structure-modal-title">
                  Logo del Club
                </h3>
                <p className="structure-modal-subtitle">{photoOrg.name}</p>
              </div>
              <button
                type="button"
                className="structure-modal-close"
                onClick={() => setPhotoOrg(null)}
                aria-label="Cerrar modal de logo"
              >
                <X size={18} />
              </button>
            </div>

            <PhotoUploadControl
              currentPhotoUrl={
                photoOrg.hasPhoto
                  ? structureService.getOrganizationPhotoUrl(photoOrg.id, photoOrg.photoUpdatedAt)
                  : null
              }
              name={photoOrg.name}
              shape="rounded"
              size={112}
              uploadButtonLabel="Cambiar logo"
              onUpload={async (file) => {
                await structureService.uploadOrganizationPhoto(photoOrg.id, file);
                const updatedAt = new Date().toISOString();
                setOrganizations((prev) =>
                  prev.map((o) =>
                    o.id === photoOrg.id ? { ...o, hasPhoto: true, photoUpdatedAt: updatedAt } : o,
                  ),
                );
                setPhotoOrg((prev) =>
                  prev ? { ...prev, hasPhoto: true, photoUpdatedAt: updatedAt } : null,
                );
              }}
              onDelete={async () => {
                await structureService.deleteOrganizationPhoto(photoOrg.id);
                setOrganizations((prev) =>
                  prev.map((o) =>
                    o.id === photoOrg.id ? { ...o, hasPhoto: false, photoUpdatedAt: null } : o,
                  ),
                );
                setPhotoOrg((prev) =>
                  prev ? { ...prev, hasPhoto: false, photoUpdatedAt: null } : null,
                );
              }}
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INVITACIÓN DE ATLETAS POR QR (KAN-400)
          ===================================================================== */}
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

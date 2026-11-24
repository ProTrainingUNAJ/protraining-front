import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import {
  Users,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  Tag,
  X,
  Search,
  HeartPulse,
  Upload,
  QrCode,
  TrendingUp,
  Settings,
  UserX,
} from 'lucide-react';
import { structureService } from '../../api/structureService';
import { Athlete, Category, Organization } from '../../types/structure';
import { PageHeader } from '../../components/shell/PageHeader';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import { AthleteRecordsModal } from '../../components/athletes/AthleteRecordsModal';
import { AthleteInjuriesModal } from '../../components/athletes/AthleteInjuriesModal';
import { RecordsImportModal } from '../../components/athletes/RecordsImportModal';
import { AthleteBenchmarkModal } from '../../components/athletes/AthleteBenchmarkModal';
import { CategoryInvitationModal } from '../../components/categories/CategoryInvitationModal';
import { MedicalRecordJustificationModal } from '../../components/athletes/MedicalRecordJustificationModal';
import { MedicalRecordDetailModal } from '../../components/athletes/MedicalRecordDetailModal';
import { ResetAthletePasswordModal } from '../../components/athletes/ResetAthletePasswordModal';
import { AthleteMetricsModal } from '../../components/athletes/AthleteMetricsModal';
import { AthleteHealthModal } from '../../components/athletes/AthleteHealthModal';
import { AthleteSettingsModal } from '../../components/athletes/AthleteSettingsModal';
import { MedicalRecord } from '../../types/medicalRecord';
import './AthletesPage.css';

export const AthletesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const stateCatId = (location.state as { catId?: string } | null)?.catId;

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Error del correo en el alta (409: ya existe un atleta con ese correo), junto al campo (KAN-660)
  const [emailError, setEmailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    stateCatId || searchParams.get('catId') || '',
  );
  const [prevLocationCatId, setPrevLocationCatId] = useState<string | undefined>(stateCatId);
  const [searchTerm, setSearchTerm] = useState('');
  // Por defecto se ven todos (como hasta ahora); el PF puede ocultar los dados de baja (KAN-660)
  const [onlyActive, setOnlyActive] = useState(false);

  if (stateCatId && stateCatId !== prevLocationCatId) {
    setPrevLocationCatId(stateCatId);
    setSelectedCategoryId(stateCatId);
  }

  useEffect(() => {
    if (searchParams.has('catId')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  // Formulario de nuevo atleta
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedNewAthleteCategories, setSelectedNewAthleteCategories] = useState<string[]>([]);

  const [managingAthlete, setManagingAthlete] = useState<Athlete | null>(null);
  const [metricsAthlete, setMetricsAthlete] = useState<Athlete | null>(null);
  const [healthAthlete, setHealthAthlete] = useState<Athlete | null>(null);
  const [settingsAthlete, setSettingsAthlete] = useState<Athlete | null>(null);

  const [recordsAthlete, setRecordsAthlete] = useState<Athlete | null>(null);
  const [recordsInitialTab, setRecordsInitialTab] = useState<'records' | 'evolution'>('records');
  const [injuriesAthlete, setInjuriesAthlete] = useState<Athlete | null>(null);
  const [showImportRecords, setShowImportRecords] = useState(false);
  const [benchmarkAthlete, setBenchmarkAthlete] = useState<Athlete | null>(null);
  const [resetAthlete, setResetAthlete] = useState<Athlete | null>(null);
  const [invitingCategory, setInvitingCategory] = useState<Category | null>(null);
  const [justifyingAthlete, setJustifyingAthlete] = useState<Athlete | null>(null);
  const [viewingMedicalRecord, setViewingMedicalRecord] = useState<{
    athlete: Athlete;
    record: MedicalRecord;
    justification: string;
  } | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);

  // 1. Cargar atletas y categorías
  useEffect(() => {
    let mounted = true;

    Promise.all([
      structureService.getAthletes(),
      structureService.getOrganizations().catch(() => [] as Organization[]),
    ])
      .then(async ([athletesData, orgsData]) => {
        if (!mounted) return;

        const categoriesNested = await Promise.all(
          orgsData.map((o) => structureService.getCategories(o.id).catch(() => [] as Category[])),
        );
        const allCategories = categoriesNested.flat();
        // El listado no trae las categorías de cada atleta: se cruzan con los atletas de cada categoría
        const athletesWithCategories = await structureService.withCategories(
          athletesData,
          allCategories,
          orgsData,
        );
        if (!mounted) return;
        setOrganizations(orgsData);
        setCategories(allCategories);
        setAthletes(athletesWithCategories);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Error al consultar el plantel de atletas.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleRefreshData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [athletesData, orgsData] = await Promise.all([
        structureService.getAthletes(),
        structureService.getOrganizations().catch(() => [] as Organization[]),
      ]);

      const categoriesNested = await Promise.all(
        orgsData.map((o) => structureService.getCategories(o.id).catch(() => [] as Category[])),
      );
      const allCategories = categoriesNested.flat();
      setOrganizations(orgsData);
      setCategories(allCategories);
      setAthletes(await structureService.withCategories(athletesData, allCategories, orgsData));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al consultar el plantel de atletas.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Dar de alta nuevo atleta
  const handleCreateAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanEmail = email.trim();

    if (!cleanFirst || !cleanLast) {
      setError('Nombre y apellido del atleta son obligatorios.');
      return;
    }
    if (!cleanEmail) {
      setError('El correo electrónico es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);
    setEmailError(null);
    setSuccessMessage(null);

    try {
      const created = await structureService.createAthlete({
        firstName: cleanFirst,
        lastName: cleanLast,
        email: cleanEmail,
        phone: phone.trim(),
        categoryIds: selectedNewAthleteCategories,
        emergencyContact: emergencyContact.trim() || null,
      });

      setSuccessMessage('El atleta fue registrado exitosamente.');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setEmergencyContact('');
      setSelectedNewAthleteCategories([]);
      setShowForm(false);
      setAthletes((prev) => [created, ...prev]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al dar de alta el atleta.';
      const status = (err as { cause?: { response?: { status?: number } } })?.cause?.response
        ?.status;
      if (status === 409) setEmailError(message);
      else setError(message);
    } finally {
      setSaving(false);
    }
  };

  // 3. Manejo de asociación de categoría N:N (CA3)
  const toggleCategoryAssignment = async (cat: Category) => {
    if (!managingAthlete) return;
    setUpdatingCategory(true);
    setError(null);

    const isCurrentlyAssigned = managingAthlete.categories?.some((c) => c.id === cat.id);

    try {
      if (isCurrentlyAssigned) {
        await structureService.unassignAthleteCategory(managingAthlete.id, cat.id);
        const updatedCategories = (managingAthlete.categories || []).filter((c) => c.id !== cat.id);
        const updatedCategoryNames = updatedCategories.map((c) => c.name);

        const updatedAthlete: Athlete = {
          ...managingAthlete,
          categories: updatedCategories,
          categoryNames: updatedCategoryNames,
        };

        setManagingAthlete(updatedAthlete);
        setAthletes((prev) => prev.map((a) => (a.id === updatedAthlete.id ? updatedAthlete : a)));
      } else {
        await structureService.assignAthleteCategory(managingAthlete.id, cat.id);
        const updatedCategories = [
          ...(managingAthlete.categories || []),
          { id: cat.id, name: cat.name },
        ];
        const updatedCategoryNames = updatedCategories.map((c) => c.name);

        const updatedAthlete: Athlete = {
          ...managingAthlete,
          categories: updatedCategories,
          categoryNames: updatedCategoryNames,
        };

        setManagingAthlete(updatedAthlete);
        setAthletes((prev) => prev.map((a) => (a.id === updatedAthlete.id ? updatedAthlete : a)));
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Error al actualizar las categorías del atleta.',
      );
    } finally {
      setUpdatingCategory(false);
    }
  };

  // 4. Filtrado en memoria
  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      if (onlyActive && !athlete.active) return false;

      // Filtro por categoría
      if (selectedCategoryId) {
        const inCategory =
          athlete.categories?.some((c) => c.id === selectedCategoryId) ||
          athlete.categoryNames?.some((name) => {
            const cat = categories.find((c) => c.id === selectedCategoryId);
            return cat && cat.name === name;
          });
        if (!inCategory) return false;
      }

      // Filtro por término de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = athlete.fullName?.toLowerCase().includes(term);
        const matchesEmail = athlete.email?.toLowerCase().includes(term);
        const matchesPhone = athlete.phone?.includes(term);
        return matchesName || matchesEmail || matchesPhone;
      }

      return true;
    });
  }, [athletes, selectedCategoryId, searchTerm, categories, onlyActive]);

  const getAthleteOrganizations = (athlete: Athlete): Organization[] => {
    if (!athlete.categories || athlete.categories.length === 0) return [];
    const orgMap = new Map<string, Organization>();
    athlete.categories.forEach((cat) => {
      const orgId = cat.organizationId || cat.organizationName;
      if (orgId && !orgMap.has(orgId)) {
        const found = organizations.find((o) => o.id === cat.organizationId);
        if (found) {
          orgMap.set(orgId, found);
        } else if (cat.organizationName) {
          orgMap.set(orgId, {
            id: cat.organizationId || cat.organizationName,
            name: cat.organizationName,
            categoriesCount: 0,
            hasPhoto: false,
          });
        }
      }
    });
    return Array.from(orgMap.values());
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Atletas"
        description="Plantel deportivo, métricas, salud y otras configuraciones."
        actions={
          <>
            {selectedCategoryId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const cat = categories.find((c) => c.id === selectedCategoryId);
                  if (cat) setInvitingCategory(cat);
                }}
                title="Invitar atletas a la categoría seleccionada"
              >
                <QrCode size={16} aria-hidden="true" />
                <span>Invitar Atletas</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowImportRecords(true)}
              disabled={loading || saving}
              title="Importar récords desde un CSV"
            >
              <Upload size={16} aria-hidden="true" />
              <span>Importar récords</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRefreshData}
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
                setShowForm(true);
                setError(null);
                setEmailError(null);
              }}
              disabled={saving}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Nuevo Atleta</span>
            </button>
          </>
        }
      />

      <div className="app-page-body">
        {/* Alertas */}
        {successMessage && (
          <div className="alert-banner success athletes-error-banner" role="alert">
            <div className="athletes-error-content">
              <Check size={18} aria-hidden="true" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              className="athletes-error-close-btn"
              onClick={() => setSuccessMessage(null)}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="alert-banner danger athletes-error-banner" role="alert">
            <div className="athletes-error-content">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              className="athletes-error-close-btn"
              onClick={() => setError(null)}
              aria-label="Cerrar error"
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Emergente de Alta de Atleta (KAN-660) */}
        {showForm && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-create-athlete-title"
            className="athletes-modal-backdrop"
            onClick={() => !saving && setShowForm(false)}
          >
            <div
              className="card athletes-modal-content athletes-create-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="athletes-modal-header">
                <h2 id="modal-create-athlete-title" className="athletes-modal-title">
                  Alta de Atleta en el Plantel
                </h2>
                <button
                  type="button"
                  className="coach-icon-btn"
                  onClick={() => !saving && setShowForm(false)}
                  aria-label="Cerrar modal"
                  disabled={saving}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <p className="athletes-modal-desc">
                Ingresá los datos personales y asigná las divisiones iniciales del deportista.
              </p>

              <form onSubmit={handleCreateAthlete}>
                <div className="athletes-form-grid">
                  <div>
                    <label htmlFor="ath-first" className="athletes-form-label">
                      Nombre *
                    </label>
                    <input
                      id="ath-first"
                      type="text"
                      required
                      maxLength={60}
                      placeholder="Ej. Lucas"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label htmlFor="ath-last" className="athletes-form-label">
                      Apellido *
                    </label>
                    <input
                      id="ath-last"
                      type="text"
                      required
                      maxLength={60}
                      placeholder="Ej. Fernández"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label htmlFor="ath-email" className="athletes-form-label">
                      Correo Electrónico *
                    </label>
                    <input
                      id="ath-email"
                      type="email"
                      required
                      placeholder="atleta@correo.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                      }}
                      disabled={saving}
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? 'ath-email-error' : undefined}
                    />
                    {emailError && (
                      <p id="ath-email-error" className="athletes-field-error" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="ath-phone" className="athletes-form-label">
                      Teléfono
                    </label>
                    <input
                      id="ath-phone"
                      type="tel"
                      placeholder="+54 11 1234-5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="athletes-form-group">
                  <label htmlFor="ath-emergency" className="athletes-form-label">
                    Contacto de Emergencia
                  </label>
                  <input
                    id="ath-emergency"
                    type="text"
                    placeholder="Ej. Madre: 11-9876-5432"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    disabled={saving}
                  />
                </div>

                {categories.length > 0 && (
                  <div className="athletes-form-group">
                    <span className="athletes-form-label">Asignar a Categorías Iniciales</span>
                    <div className="athletes-chips-row">
                      {categories.map((cat) => {
                        const isSelected = selectedNewAthleteCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            className={`athletes-category-chip${isSelected ? ' is-selected' : ''}`}
                            onClick={() => {
                              setSelectedNewAthleteCategories((prev) =>
                                isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id],
                              );
                            }}
                          >
                            {isSelected ? (
                              <Check size={13} aria-hidden="true" />
                            ) : (
                              <Plus size={13} aria-hidden="true" />
                            )}
                            {cat.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="athletes-form-actions">
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
                    disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()}
                  >
                    {saving ? 'Guardando…' : 'Registrar Atleta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="athletes-filter-bar">
          <div className="athletes-search-wrapper">
            <Search size={16} className="athletes-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar por nombre, email o teléfono…"
              aria-label="Buscar atleta"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="athletes-search-input"
            />
          </div>

          {categories.length > 0 && (
            <select
              className="athletes-category-select select-field"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              aria-label="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          <label className="athletes-only-active">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
            />
            <span>Solo activos</span>
          </label>

          {!loading && athletes.length > 0 && (
            <p className="athletes-count" aria-live="polite" data-testid="athletes-count">
              {filteredAthletes.length === athletes.length
                ? `${athletes.length} ${athletes.length === 1 ? 'atleta' : 'atletas'}`
                : `${filteredAthletes.length} de ${athletes.length} atletas`}
            </p>
          )}
        </div>

        {/* Estados de Carga y Vacío */}
        {loading ? (
          <div className="card athletes-empty-card">
            <p className="athletes-loading-text">Cargando atletas del plantel…</p>
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="card athletes-empty-card">
            <Users size={44} className="athletes-empty-icon" aria-hidden="true" />
            <h2 className="athletes-empty-title">
              {searchTerm || selectedCategoryId || onlyActive
                ? 'No se encontraron atletas con los filtros aplicados'
                : 'No hay atletas registrados en el plantel'}
            </h2>
            <p className="athletes-empty-desc">
              {searchTerm || selectedCategoryId || onlyActive
                ? 'Prueba modificando el término de búsqueda o seleccionando otra división.'
                : 'Empezá dando de alta a los deportistas para realizar el seguimiento físico y rutinas.'}
            </p>
            {!searchTerm && !selectedCategoryId && !onlyActive && (
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} aria-hidden="true" />
                <span>Registrar Primer Atleta</span>
              </button>
            )}
          </div>
        ) : (
          <div className="athletes-list">
            {filteredAthletes.map((athlete) => (
              <div
                key={athlete.id}
                className={`card athletes-card${athlete.active ? '' : ' athletes-card--inactive'}`}
                data-testid={`athlete-card-${athlete.id}`}
              >
                <div className="athletes-card-info-wrap">
                  <ProfileAvatar
                    src={
                      athlete.hasPhoto
                        ? structureService.getAthletePhotoUrl(athlete.id, athlete.photoUpdatedAt)
                        : null
                    }
                    name={athlete.fullName || `${athlete.firstName} ${athlete.lastName}`}
                    size={44}
                  />

                  <div>
                    <div className="athletes-card-header-row">
                      <h2 className="athletes-card-name">{athlete.fullName}</h2>
                      {athlete.isMinor && <span className="badge badge-warning">Menor</span>}
                      {athlete.active ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge athletes-badge-inactive">
                          <UserX size={12} aria-hidden="true" />
                          Inactivo
                        </span>
                      )}
                      {getAthleteOrganizations(athlete).map((org) => (
                        <div key={org.id} title={org.name} className="athletes-card-org-icon">
                          <ProfileAvatar
                            src={
                              org.hasPhoto
                                ? structureService.getOrganizationPhotoUrl(
                                  org.id,
                                  org.photoUpdatedAt,
                                )
                                : null
                            }
                            name={org.name}
                            size={22}
                            shape="rounded"
                            alt={`Logo de ${org.name}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="athletes-card-meta-row">
                      <span>{athlete.email}</span>
                      {athlete.phone && <span>Tel: {athlete.phone}</span>}
                      {athlete.emergencyContact && (
                        <span>Emergencia: {athlete.emergencyContact}</span>
                      )}
                    </div>

                    {/* Categorías asignadas */}
                    <div className="athletes-card-categories-row">
                      {athlete.categories && athlete.categories.length > 0 ? (
                        athlete.categories.map((c) => (
                          <span key={c.id} className="badge badge-info athletes-category-badge">
                            <span>{c.name}</span>
                          </span>
                        ))
                      ) : athlete.categoryNames && athlete.categoryNames.length > 0 ? (
                        athlete.categoryNames.map((name, i) => (
                          <span key={i} className="badge badge-info">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="athletes-no-categories-text">
                          Sin categorías asignadas
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4 Acciones con Jerarquía Visual (KAN-596) */}
                {(() => {
                  const hasActiveInjury = (athlete.activeInjuriesCount ?? 0) > 0;
                  return (
                    <div className="athletes-card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary athletes-action-btn athlete-action--secondary"
                        onClick={() => setManagingAthlete(athlete)}
                        title="Gestionar categorías asignadas (N:N)"
                      >
                        <Tag size={15} aria-hidden="true" />
                        <span>Categorías</span>
                      </button>
                      <button
                        type="button"
                        className="btn athletes-action-btn athlete-action--evolution"
                        onClick={() => setMetricsAthlete(athlete)}
                        title="Consultar Récords, Evolución y Benchmark del atleta"
                        data-testid={`metrics-btn-${athlete.id}`}
                      >
                        <TrendingUp size={15} aria-hidden="true" />
                        <span>Métricas</span>
                      </button>
                      <button
                        type="button"
                        className={`btn athletes-action-btn athlete-action--injuries${hasActiveInjury ? ' athlete-action--active-injury' : ''
                          }`}
                        onClick={() => setHealthAthlete(athlete)}
                        title="Consultar Historial de Lesiones y Ficha Médica"
                        aria-label={
                          hasActiveInjury
                            ? `Salud: lesión activa (${athlete.activeInjuriesCount})`
                            : undefined
                        }
                        data-testid={`health-btn-${athlete.id}`}
                      >
                        <HeartPulse size={15} aria-hidden="true" />
                        <span>Salud</span>
                        {hasActiveInjury && <span className="athlete-action-badge">Activa</span>}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary athletes-action-btn athlete-action--secondary"
                        onClick={() => setSettingsAthlete(athlete)}
                        title="Foto de perfil, cambiar clave, cambiar mail y deshabilitar usuario"
                        data-testid={`settings-btn-${athlete.id}`}
                      >
                        <Settings size={15} aria-hidden="true" />
                        <span>Configuración</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modales Unificados (KAN-609) */}
      {metricsAthlete && (
        <AthleteMetricsModal
          athlete={metricsAthlete}
          categories={categories}
          onClose={() => setMetricsAthlete(null)}
        />
      )}

      {healthAthlete && (
        <AthleteHealthModal athlete={healthAthlete} onClose={() => setHealthAthlete(null)} />
      )}

      {settingsAthlete && (
        <AthleteSettingsModal
          athlete={settingsAthlete}
          onAthleteUpdated={(updated) => {
            setAthletes((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            setSettingsAthlete(updated);
          }}
          onClose={() => setSettingsAthlete(null)}
        />
      )}

      {recordsAthlete && (
        <AthleteRecordsModal
          athleteId={recordsAthlete.id}
          athleteName={
            recordsAthlete.fullName || `${recordsAthlete.firstName} ${recordsAthlete.lastName}`
          }
          initialTab={recordsInitialTab}
          onClose={() => {
            setRecordsAthlete(null);
            setRecordsInitialTab('records');
          }}
        />
      )}

      {injuriesAthlete && (
        <AthleteInjuriesModal
          athleteId={injuriesAthlete.id}
          athleteName={
            injuriesAthlete.fullName || `${injuriesAthlete.firstName} ${injuriesAthlete.lastName}`
          }
          onClose={() => setInjuriesAthlete(null)}
        />
      )}

      {showImportRecords && <RecordsImportModal onClose={() => setShowImportRecords(false)} />}

      {benchmarkAthlete && (
        <AthleteBenchmarkModal
          athleteId={benchmarkAthlete.id}
          athleteName={
            benchmarkAthlete.fullName ||
            `${benchmarkAthlete.firstName} ${benchmarkAthlete.lastName}`
          }
          categories={
            benchmarkAthlete.categories && benchmarkAthlete.categories.length > 0
              ? benchmarkAthlete.categories
              : categories
          }
          initialCategoryId={selectedCategoryId || undefined}
          onClose={() => setBenchmarkAthlete(null)}
        />
      )}

      {resetAthlete && (
        <ResetAthletePasswordModal athlete={resetAthlete} onClose={() => setResetAthlete(null)} />
      )}

      {/* Modal de Asociación N:N de Categorías (CA3) */}
      {managingAthlete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-categories-title"
          className="athletes-modal-backdrop"
          onClick={() => setManagingAthlete(null)}
        >
          <div className="card athletes-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="athletes-modal-header">
              <h2 id="modal-categories-title" className="athletes-modal-title">
                Categorías de {managingAthlete.fullName}
              </h2>
              <button
                type="button"
                className="coach-icon-btn"
                onClick={() => setManagingAthlete(null)}
                aria-label="Cerrar modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <p className="athletes-modal-desc">
              Un atleta puede competir en múltiples divisiones simultáneamente. Tocá para asociar o
              desvincular.
            </p>

            {categories.length === 0 ? (
              <div className="athletes-modal-empty">
                No hay categorías disponibles registradas en el sistema.
              </div>
            ) : (
              <div className="athletes-modal-categories-list">
                {categories.map((cat) => {
                  const isAssigned = managingAthlete.categories?.some((c) => c.id === cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={updatingCategory}
                      className={`athletes-modal-category-btn${isAssigned ? ' is-assigned' : ''}`}
                      onClick={() => toggleCategoryAssignment(cat)}
                    >
                      <span className="athletes-modal-category-name">{cat.name}</span>
                      {isAssigned ? (
                        <span className="badge badge-success athletes-modal-category-badge">
                          <Check size={12} aria-hidden="true" /> Asignada
                        </span>
                      ) : (
                        <span className="badge badge-info">No asignada</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="athletes-modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setManagingAthlete(null)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {invitingCategory && (
        <CategoryInvitationModal
          categoryId={invitingCategory.id}
          categoryName={invitingCategory.name}
          onClose={() => setInvitingCategory(null)}
        />
      )}

      {justifyingAthlete && (
        <MedicalRecordJustificationModal
          athleteId={justifyingAthlete.id}
          athleteName={
            justifyingAthlete.fullName ||
            `${justifyingAthlete.firstName} ${justifyingAthlete.lastName}`
          }
          isOpen={true}
          onClose={() => setJustifyingAthlete(null)}
          onSuccess={(record, justification) => {
            setViewingMedicalRecord({
              athlete: justifyingAthlete,
              record,
              justification,
            });
            setJustifyingAthlete(null);
          }}
        />
      )}

      {viewingMedicalRecord && (
        <MedicalRecordDetailModal
          athleteName={
            viewingMedicalRecord.athlete.fullName ||
            `${viewingMedicalRecord.athlete.firstName} ${viewingMedicalRecord.athlete.lastName}`
          }
          record={viewingMedicalRecord.record}
          justificationUsed={viewingMedicalRecord.justification}
          onClose={() => setViewingMedicalRecord(null)}
          onRecordUpdated={(updated) => {
            setViewingMedicalRecord((prev) => (prev ? { ...prev, record: updated } : null));
          }}
        />
      )}
    </div>
  );
};

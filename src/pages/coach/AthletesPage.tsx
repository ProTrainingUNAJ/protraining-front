import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  Tag,
  X,
  Search,
  Dumbbell,
  HeartPulse,
  QrCode,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { structureService } from '../../api/structureService';
import { Athlete, Category, Organization } from '../../types/structure';
import { PageHeader } from '../../components/shell/PageHeader';
import { AthleteRecordsModal } from '../../components/athletes/AthleteRecordsModal';
import { AthleteInjuriesModal } from '../../components/athletes/AthleteInjuriesModal';
import { AthleteBenchmarkModal } from '../../components/athletes/AthleteBenchmarkModal';
import { CategoryInvitationModal } from '../../components/categories/CategoryInvitationModal';
import { MedicalRecordJustificationModal } from '../../components/athletes/MedicalRecordJustificationModal';
import { MedicalRecordDetailModal } from '../../components/athletes/MedicalRecordDetailModal';
import { MedicalRecord } from '../../types/medicalRecord';

export const AthletesPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtros
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    searchParams.get('catId') || '',
  );
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario de nuevo atleta
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedNewAthleteCategories, setSelectedNewAthleteCategories] = useState<string[]>([]);

  const [managingAthlete, setManagingAthlete] = useState<Athlete | null>(null);
  const [recordsAthlete, setRecordsAthlete] = useState<Athlete | null>(null);
  const [injuriesAthlete, setInjuriesAthlete] = useState<Athlete | null>(null);
  const [benchmarkAthlete, setBenchmarkAthlete] = useState<Athlete | null>(null);
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
        );
        if (!mounted) return;
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
      setCategories(allCategories);
      setAthletes(await structureService.withCategories(athletesData, allCategories));
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
      setError(err instanceof Error ? err.message : 'Error al dar de alta el atleta.');
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
  }, [athletes, selectedCategoryId, searchTerm, categories]);

  return (
    <div className="app-page-container">
      {/* Encabezado Estandarizado */}
      <PageHeader
        title="Atletas"
        description="Plantel deportivo, fichas médicas y asignación de divisiones."
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
                setShowForm(!showForm);
                setError(null);
              }}
              disabled={saving}
            >
              <Plus size={16} aria-hidden="true" />
              <span>{showForm ? 'Cancelar' : 'Nuevo Atleta'}</span>
            </button>
          </>
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

        {/* Formulario de Alta de Atleta */}
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
                marginBottom: '0.25rem',
                color: 'var(--primary)',
              }}
            >
              Alta de Atleta en el Plantel
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Ingresa los datos personales y asigna las divisiones iniciales del deportista.
            </p>

            <form onSubmit={handleCreateAthlete}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    htmlFor="ath-first"
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.35rem',
                    }}
                  >
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
                  <label
                    htmlFor="ath-last"
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.35rem',
                    }}
                  >
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
                  <label
                    htmlFor="ath-email"
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.35rem',
                    }}
                  >
                    Correo Electrónico *
                  </label>
                  <input
                    id="ath-email"
                    type="email"
                    required
                    placeholder="atleta@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ath-phone"
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.35rem',
                    }}
                  >
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="ath-emergency"
                  style={{
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
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
                <div style={{ marginBottom: '1.25rem' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      display: 'block',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Asignar a Categorías Iniciales
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {categories.map((cat) => {
                      const isSelected = selectedNewAthleteCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            border: isSelected
                              ? '1.5px solid var(--secondary)'
                              : '1px solid var(--border)',
                            background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                            color: isSelected ? 'var(--secondary)' : 'var(--text-main)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setSelectedNewAthleteCategories((prev) =>
                              isSelected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id],
                            );
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()}
                >
                  {saving ? 'Guardando…' : 'Registrar Atleta'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Buscar por nombre, email o teléfono…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', margin: 0, paddingLeft: '2.25rem' }}
            />
          </div>

          {categories.length > 0 && (
            <select
              style={{
                width: 'auto',
                minWidth: '200px',
                margin: 0,
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontWeight: 500,
              }}
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
        </div>

        {/* Estados de Carga y Vacío */}
        {loading ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
          >
            <p style={{ margin: 0, fontWeight: 500 }}>Cargando atletas del plantel…</p>
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}
          >
            <Users size={44} style={{ margin: '0 auto 1rem', opacity: 0.35 }} aria-hidden="true" />
            <h2
              style={{
                fontWeight: 700,
                fontSize: '1.2rem',
                marginBottom: '0.5rem',
                color: 'var(--text-main)',
              }}
            >
              {searchTerm || selectedCategoryId
                ? 'No se encontraron atletas con los filtros aplicados'
                : 'No hay atletas registrados en el plantel'}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                maxWidth: '420px',
                marginInline: 'auto',
              }}
            >
              {searchTerm || selectedCategoryId
                ? 'Prueba modificando el término de búsqueda o seleccionando otra división.'
                : 'Comienza dando de alta a los deportistas para realizar el seguimiento físico y rutinas.'}
            </p>
            {!searchTerm && !selectedCategoryId && (
              <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
                <Plus size={16} aria-hidden="true" />
                <span>Registrar Primer Atleta</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredAthletes.map((athlete) => (
              <div
                key={athlete.id}
                className="card"
                style={{
                  margin: 0,
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        margin: 0,
                      }}
                    >
                      {athlete.fullName}
                    </h2>
                    {athlete.isMinor && <span className="badge badge-warning">Menor</span>}
                    {athlete.active && <span className="badge badge-success">Activo</span>}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      marginTop: '0.35rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span>{athlete.email}</span>
                    {athlete.phone && <span>Tel: {athlete.phone}</span>}
                    {athlete.emergencyContact && (
                      <span>Emergencia: {athlete.emergencyContact}</span>
                    )}
                  </div>

                  {/* Categorías asignadas */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.4rem',
                      marginTop: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {athlete.categories && athlete.categories.length > 0 ? (
                      athlete.categories.map((c) => (
                        <span key={c.id} className="badge badge-info">
                          {c.name}
                        </span>
                      ))
                    ) : athlete.categoryNames && athlete.categoryNames.length > 0 ? (
                      athlete.categoryNames.map((name, i) => (
                        <span key={i} className="badge badge-info">
                          {name}
                        </span>
                      ))
                    ) : (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                        }}
                      >
                        Sin categorías asignadas
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setManagingAthlete(athlete)}
                    title="Gestionar categorías asignadas (N:N)"
                  >
                    <Tag size={15} aria-hidden="true" />
                    <span>Categorías</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setRecordsAthlete(athlete)}
                    title="Ver y cargar sus récords (1RM)"
                  >
                    <Dumbbell size={15} aria-hidden="true" />
                    <span>Récords</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setBenchmarkAthlete(athlete)}
                    title="Comparar rendimiento individual frente al promedio del grupo (KAN-448)"
                    data-testid={`benchmark-btn-${athlete.id}`}
                  >
                    <TrendingUp size={15} aria-hidden="true" />
                    <span>Benchmark</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setInjuriesAthlete(athlete)}
                    title="Ver sus lesiones y avanzar el stepper (KAN-421)"
                  >
                    <HeartPulse size={15} aria-hidden="true" />
                    <span>Lesiones</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    onClick={() => setJustifyingAthlete(athlete)}
                    title="Ver Ficha Médica del atleta con justificación obligatoria"
                  >
                    <FileText size={15} aria-hidden="true" />
                    <span>Ver Ficha Médica</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {recordsAthlete && (
        <AthleteRecordsModal
          athleteId={recordsAthlete.id}
          athleteName={
            recordsAthlete.fullName || `${recordsAthlete.firstName} ${recordsAthlete.lastName}`
          }
          onClose={() => setRecordsAthlete(null)}
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

      {/* Modal de Asociación N:N de Categorías (CA3) */}
      {managingAthlete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-categories-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'var(--overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setManagingAthlete(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: 0,
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <h2
                id="modal-categories-title"
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-main)',
                }}
              >
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

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Un atleta puede competir en múltiples divisiones simultáneamente. Pulsa para asociar o
              desvincular.
            </p>

            {categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                No hay categorías disponibles registradas en el sistema.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categories.map((cat) => {
                  const isAssigned = managingAthlete.categories?.some((c) => c.id === cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={updatingCategory}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: isAssigned
                          ? '1.5px solid var(--secondary)'
                          : '1px solid var(--border)',
                        background: isAssigned ? 'var(--primary-light)' : 'var(--bg-card)',
                        color: 'var(--text-main)',
                        cursor: updatingCategory ? 'wait' : 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => toggleCategoryAssignment(cat)}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cat.name}</span>
                      {isAssigned ? (
                        <span className="badge badge-success" style={{ gap: '0.25rem' }}>
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

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
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
        />
      )}
    </div>
  );
};

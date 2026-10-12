import React, { useState, useEffect } from 'react';
import { apiRequest, ApiError } from '../api/client';
import { Athlete, Category, Organization } from '../types';
import { Plus, RefreshCw, UserCheck, AlertCircle, Check, Users, Tag, X } from 'lucide-react';

interface AthletesViewProps {
  currentOrg: Organization | null;
  organizations: Organization[];
}

export const AthletesView: React.FC<AthletesViewProps> = ({ currentOrg }) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtro
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario alta atleta
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');

  // Modal para asociación N:N de categorías
  const [selectedAthleteForCategories, setSelectedAthleteForCategories] = useState<Athlete | null>(null);
  const [athleteCategories, setAthleteCategories] = useState<Category[]>([]);
  const [loadingAthleteCategories, setLoadingAthleteCategories] = useState(false);

  const fetchAthletesAndCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const athletesData = await apiRequest<Athlete[]>('/estructura/api/athletes');
      setAthletes(athletesData || []);

      if (currentOrg?.id) {
        const categoriesData = await apiRequest<Category[]>(
          `/estructura/api/categories?organizationId=${currentOrg.id}`
        );
        setCategories(categoriesData || []);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudieron cargar los datos de atletas y categorías.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletesAndCategories();
  }, [currentOrg?.id]);

  const handleCreateAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      setError('Por favor complete todos los datos obligatorios del atleta.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const newAthlete = await apiRequest<Athlete>('/estructura/api/athletes', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          isMinor,
          emergencyContact: emergencyContact.trim() || null,
          medicalConditions: medicalConditions.trim() || null,
        }),
      });

      setSuccessMessage('El atleta se registró correctamente.');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setIsMinor(false);
      setEmergencyContact('');
      setMedicalConditions('');
      setShowForm(false);
      setAthletes((prev) => [newAthlete, ...prev]);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al registrar el atleta.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Abrir modal de categorías N:N
  const openCategoriesModal = async (athlete: Athlete) => {
    setSelectedAthleteForCategories(athlete);
    setLoadingAthleteCategories(true);
    try {
      const assigned = await apiRequest<Category[]>(
        `/estructura/api/athletes/${athlete.id}/categories`
      );
      setAthleteCategories(assigned || []);
    } catch (err: any) {
      setError('Error al obtener las categorías asignadas al atleta.');
    } finally {
      setLoadingAthleteCategories(false);
    }
  };

  // Asignar o desasignar atleta de una categoría
  const toggleCategoryAssignment = async (categoryId: string) => {
    if (!selectedAthleteForCategories) return;
    const isAssigned = athleteCategories.some((c) => c.id === categoryId);

    try {
      if (isAssigned) {
        await apiRequest(
          `/estructura/api/athletes/${selectedAthleteForCategories.id}/categories/${categoryId}`,
          { method: 'DELETE' }
        );
        setAthleteCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } else {
        const assignedCat = await apiRequest<Category>(
          `/estructura/api/athletes/${selectedAthleteForCategories.id}/categories/${categoryId}`,
          { method: 'POST' }
        );
        setAthleteCategories((prev) => [...prev, assignedCat]);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al actualizar las categorías del atleta.');
      }
    }
  };

  const filteredAthletes = athletes.filter((a) => {
    const fullName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(searchTerm.toLowerCase()) ||
      (a.email && a.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div>
      <div className="card-header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Padrón de Atletas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Administra los deportistas y sus categorías asignadas (relación muchos a muchos).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchAthletesAndCategories}
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
            {showForm ? 'Cerrar formulario' : 'Nuevo atleta'}
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

      {/* Formulario de Alta de Atleta */}
      {showForm && (
        <div className="card" style={{ background: '#fcfdfe', borderColor: '#bfdbfe', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)' }}>
            Registrar Nuevo Atleta
          </h3>

          <form onSubmit={handleCreateAthlete}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label htmlFor="athlete-firstname" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Nombre *
                </label>
                <input
                  id="athlete-firstname"
                  type="text"
                  required
                  placeholder="Ej. Lucas"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="athlete-lastname" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Apellido *
                </label>
                <input
                  id="athlete-lastname"
                  type="text"
                  required
                  placeholder="Ej. Fernández"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="athlete-email" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Correo Electrónico *
                </label>
                <input
                  id="athlete-email"
                  type="email"
                  required
                  placeholder="lucas@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="athlete-phone" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Teléfono *
                </label>
                <input
                  id="athlete-phone"
                  type="tel"
                  required
                  placeholder="+54 11 5555-1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto', margin: 0 }}
                  checked={isMinor}
                  onChange={(e) => setIsMinor(e.target.checked)}
                  disabled={saving}
                />
                  Es menor de edad (requerirá tutor legal)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div>
                <label htmlFor="athlete-emergency" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Contacto de Emergencia (opcional)
                </label>
                <input
                  id="athlete-emergency"
                  type="text"
                  placeholder="Ej. Madre: +54 11 4444-9876"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label htmlFor="athlete-medical" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Condiciones Médicas / Ficha (opcional)
                </label>
                <input
                  id="athlete-medical"
                  type="text"
                  placeholder="Ej. Apto médico 2026 presentado"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
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
                disabled={saving || !firstName.trim() || !lastName.trim()}
              >
                {saving ? 'Guardando…' : 'Registrar Atleta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador de Atletas */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Buscar atleta por nombre o correo…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '400px', margin: 0 }}
        />
      </div>

      {/* Estados de Carga y Vacío */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Cargando atletas…
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <p style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            No se encontraron atletas
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {searchTerm ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no registraste deportistas en tu plantel.'}
          </p>
          {!searchTerm && (
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} />
              Registrar Atleta
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
                marginBottom: 0,
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {athlete.fullName || `${athlete.firstName} ${athlete.lastName}`}
                  </h3>
                  {athlete.isMinor && (
                    <span className="badge badge-warning">Menor</span>
                  )}
                  {athlete.active && (
                    <span className="badge badge-success">Activo</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span>{athlete.email}</span>
                  <span>{athlete.phone}</span>
                  {athlete.emergencyContact && <span>Emergencias: {athlete.emergencyContact}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => openCategoriesModal(athlete)}
                  title="Gestionar categorías asignadas (N:N)"
                >
                  <Tag size={16} />
                  Gestionar Categorías
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Asociación N:N de Categorías */}
      {selectedAthleteForCategories && (
        <div className="modal-overlay" onClick={() => setSelectedAthleteForCategories(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Categorías de {selectedAthleteForCategories.fullName || selectedAthleteForCategories.firstName}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                onClick={() => setSelectedAthleteForCategories(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Un atleta puede pertenecer a múltiples categorías simultáneamente. Haz clic para asociar o desasociar.
            </p>

            {loadingAthleteCategories ? (
              <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                Cargando categorías asignadas…
              </p>
            ) : categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                No hay categorías disponibles en la organización activa para asociar.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {categories.map((cat) => {
                  const isAssigned = athleteCategories.some((ac) => ac.id === cat.id);
                  return (
                    <div
                      key={cat.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: isAssigned ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isAssigned ? 'var(--primary-light)' : '#fff',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleCategoryAssignment(cat.id)}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{cat.name}</span>
                      {isAssigned ? (
                        <span className="badge badge-success" style={{ gap: '0.25rem' }}>
                          <Check size={12} /> Asignado
                        </span>
                      ) : (
                        <span className="badge badge-info">No asignado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                onClick={() => setSelectedAthleteForCategories(null)}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

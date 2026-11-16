import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Loader2,
  Search,
  Shield,
  User,
  Users,
  X,
} from 'lucide-react';
import { structureService } from '../../api/structureService';
import { trainingPlansService } from '../../api/trainingPlans';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { PlanAssignmentTarget } from '../../types/trainingPlans';
import { formatIsoDate, todayInArgentina } from '../../utils/argentinaDate';

interface AssignPlanModalProps {
  planId: string;
  planName: string;
  onClose: () => void;
  onAssigned: (message: string) => void;
}

export interface AthleteTargetOption {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  hasPhoto: boolean;
  photoUpdatedAt?: string | null;
  photoUrl?: string | null;
  categoryNames: string[];
  isMinor?: boolean;
  active?: boolean;
}

export interface CategoryTargetOption {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  hasOrgPhoto: boolean;
  orgPhotoUpdatedAt?: string | null;
  photoUrl?: string | null;
  athletesCount: number;
}

export function AssignPlanModal({ planId, planName, onClose, onAssigned }: AssignPlanModalProps) {
  const [categories, setCategories] = useState<CategoryTargetOption[]>([]);
  const [athletes, setAthletes] = useState<AthleteTargetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<PlanAssignmentTarget['type']>('athlete');
  const [targetId, setTargetId] = useState('');
  const [startDate, setStartDate] = useState(todayInArgentina());

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carga de categorías y atletas con sus fotos e información completa
  useEffect(() => {
    let active = true;
    async function loadTargets() {
      const organizations = await structureService.getOrganizations();
      const [categoriesByOrg, athleteList] = await Promise.all([
        Promise.all(organizations.map((org) => structureService.getCategories(org.id))),
        structureService.getAthletes(),
      ]);

      const loadedCategories: CategoryTargetOption[] = categoriesByOrg.flatMap((orgCats, index) => {
        const org = organizations[index];
        return orgCats.map((cat) => ({
          id: cat.id,
          name: cat.name,
          organizationId: org.id,
          organizationName: org.name,
          hasOrgPhoto: Boolean(org.hasPhoto),
          orgPhotoUpdatedAt: org.photoUpdatedAt,
          photoUrl: org.hasPhoto
            ? structureService.getOrganizationPhotoUrl(org.id, org.photoUpdatedAt)
            : null,
          athletesCount: cat.athletesCount,
        }));
      });

      const loadedAthletes: AthleteTargetOption[] = athleteList
        .map((ath) => ({
          id: ath.id,
          fullName: ath.fullName || `${ath.firstName} ${ath.lastName}`.trim(),
          firstName: ath.firstName,
          lastName: ath.lastName,
          hasPhoto: Boolean(ath.hasPhoto),
          photoUpdatedAt: ath.photoUpdatedAt,
          photoUrl: ath.hasPhoto
            ? structureService.getAthletePhotoUrl(ath.id, ath.photoUpdatedAt)
            : null,
          categoryNames: ath.categoryNames || [],
          isMinor: Boolean(ath.isMinor),
          active: ath.active ?? true,
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));

      return { loadedCategories, loadedAthletes };
    }

    loadTargets()
      .then(({ loadedCategories, loadedAthletes }) => {
        if (!active) return;
        setCategories(loadedCategories);
        setAthletes(loadedAthletes);
        // Si hay atletas, inicializa con el primer atleta; de lo contrario primera categoría
        if (loadedAthletes.length > 0) {
          setTargetType('athlete');
          setTargetId(loadedAthletes[0].id);
        } else if (loadedCategories.length > 0) {
          setTargetType('category');
          setTargetId(loadedCategories[0].id);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'No se pudieron cargar las categorías y atletas.',
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

  // Cierre con Escape y clic fuera del dropdown
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, saving, isDropdownOpen]);

  // Cambiar tipo de destinatario (Atleta o Categoría)
  const changeTargetType = (type: PlanAssignmentTarget['type']) => {
    setTargetType(type);
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (type === 'athlete') {
      setTargetId(athletes[0]?.id ?? '');
    } else {
      setTargetId(categories[0]?.id ?? '');
    }
  };

  // Elementos filtrados según buscador del dropdown
  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) return athletes;
    const q = searchQuery.toLowerCase();
    return athletes.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.categoryNames.some((cat) => cat.toLowerCase().includes(q)),
    );
  }, [athletes, searchQuery]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.organizationName.toLowerCase().includes(q),
    );
  }, [categories, searchQuery]);

  // Objeto seleccionado actualmente para la tarjeta de preview con foto
  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === targetId) ?? athletes[0],
    [athletes, targetId],
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === targetId) ?? categories[0],
    [categories, targetId],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) {
      setError(targetType === 'category' ? 'Elegí una categoría.' : 'Elegí un atleta.');
      return;
    }
    if (!startDate) {
      setError('Elegí la fecha de inicio.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await trainingPlansService.assign(planId, startDate, {
        type: targetType,
        id: targetId,
      });

      const targetLabel =
        targetType === 'athlete'
          ? (selectedAthlete?.fullName ?? 'el atleta')
          : (selectedCategory?.name ?? 'la categoría');

      const finishText = res?.endDate ? ` Termina el ${formatIsoDate(res.endDate)}.` : '';
      const rangeText =
        res?.startDate && res?.endDate
          ? ` (Del ${formatIsoDate(res.startDate)} al ${formatIsoDate(res.endDate)})`
          : ` desde el ${formatIsoDate(startDate)}`;

      onAssigned(`«${planName}» quedó asignada a ${targetLabel}${rangeText}.${finishText}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo asignar la planificación.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <form
        className="modal-content plan-assign-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-assign-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        {/* Encabezado del modal */}
        <div className="plan-assign-header">
          <div className="plan-assign-header-titles">
            <h2 id="plan-assign-title" className="plan-assign-title">
              Asignar planificación
            </h2>
            <span className="plan-assign-badge-target" title={planName}>
              «{planName}»
            </span>
          </div>
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {loading ? (
          <div className="plan-assign-loading">
            <Loader2 size={24} className="plan-spin" aria-hidden="true" />
            <p>Cargando atletas y categorías…</p>
          </div>
        ) : (
          <div className="plan-assign-body">
            {/* 1. Selector de modo: Atleta o Categoría (Pills modernas) */}
            <div className="plan-assign-section">
              <span className="plan-assign-section-label">¿A quién querés asignarle el plan?</span>
              <div
                className="plan-assign-type-pills"
                role="radiogroup"
                aria-label="Tipo de destinatario"
              >
                <button
                  type="button"
                  className={`plan-assign-pill-btn ${targetType === 'athlete' ? 'active' : ''}`}
                  onClick={() => changeTargetType('athlete')}
                  disabled={saving}
                  aria-pressed={targetType === 'athlete'}
                >
                  <User size={16} aria-hidden="true" />
                  <span>Un atleta</span>
                  {athletes.length > 0 && (
                    <span className="plan-assign-pill-count">{athletes.length}</span>
                  )}
                </button>

                <button
                  type="button"
                  className={`plan-assign-pill-btn ${targetType === 'category' ? 'active' : ''}`}
                  onClick={() => changeTargetType('category')}
                  disabled={saving}
                  aria-pressed={targetType === 'category'}
                >
                  <Users size={16} aria-hidden="true" />
                  <span>Una categoría</span>
                  {categories.length > 0 && (
                    <span className="plan-assign-pill-count">{categories.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Selector interactivo con foto y nombre */}
            <div className="plan-assign-section" ref={dropdownRef}>
              <div className="plan-assign-selector-label-row">
                <span className="plan-assign-section-label">
                  {targetType === 'athlete' ? 'Seleccionar atleta' : 'Seleccionar categoría'}
                </span>
                <span className="plan-assign-hint">Elegí el destinatario</span>
              </div>

              {targetType === 'athlete' ? (
                athletes.length === 0 ? (
                  <p className="plan-empty">Todavía no tenés atletas registrados.</p>
                ) : (
                  <div className="plan-custom-select-wrapper">
                    {/* Botón trigger del dropdown con foto del atleta seleccionado */}
                    <button
                      type="button"
                      className={`plan-custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      disabled={saving}
                      aria-haspopup="listbox"
                      aria-expanded={isDropdownOpen}
                      aria-label="Desplegar lista de atletas"
                    >
                      <div className="plan-select-selected-row">
                        <ProfileAvatar
                          src={selectedAthlete?.photoUrl}
                          name={selectedAthlete?.fullName || 'Atleta'}
                          size={30}
                        />
                        <div className="plan-select-selected-text">
                          <span className="plan-select-selected-name">
                            {selectedAthlete?.fullName || 'Elegir atleta…'}
                          </span>
                          {selectedAthlete?.categoryNames &&
                            selectedAthlete.categoryNames.length > 0 && (
                              <span className="plan-select-selected-sub">
                                {selectedAthlete.categoryNames.join(', ')}
                              </span>
                            )}
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={`plan-select-chevron ${isDropdownOpen ? 'rotated' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {/* Menú desplegable con fotos y buscador */}
                    {isDropdownOpen && (
                      <div className="plan-custom-dropdown-panel" role="listbox">
                        <div className="plan-dropdown-search-wrap">
                          <Search
                            size={14}
                            className="plan-dropdown-search-icon"
                            aria-hidden="true"
                          />
                          <input
                            type="text"
                            className="plan-dropdown-search-input"
                            placeholder="Buscar atleta por nombre o categoría…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>

                        <div className="plan-custom-dropdown-list">
                          {filteredAthletes.length === 0 ? (
                            <div className="plan-dropdown-empty">
                              No se encontraron atletas para «{searchQuery}»
                            </div>
                          ) : (
                            filteredAthletes.map((ath) => {
                              const isSelected = ath.id === targetId;
                              return (
                                <button
                                  key={ath.id}
                                  type="button"
                                  className={`plan-dropdown-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() => {
                                    setTargetId(ath.id);
                                    setIsDropdownOpen(false);
                                  }}
                                  role="option"
                                  aria-selected={isSelected}
                                >
                                  <ProfileAvatar src={ath.photoUrl} name={ath.fullName} size={32} />
                                  <div className="plan-dropdown-item-info">
                                    <span className="plan-dropdown-item-name">{ath.fullName}</span>
                                    {ath.categoryNames.length > 0 ? (
                                      <span className="plan-dropdown-item-sub">
                                        {ath.categoryNames.join(', ')}
                                      </span>
                                    ) : (
                                      <span className="plan-dropdown-item-sub text-muted">
                                        Sin categoría
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <Check
                                      size={16}
                                      className="plan-dropdown-check-icon"
                                      aria-hidden="true"
                                    />
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : categories.length === 0 ? (
                <p className="plan-empty">Todavía no tenés categorías registradas.</p>
              ) : (
                <div className="plan-custom-select-wrapper">
                  {/* Botón trigger del dropdown con foto de la categoría seleccionada */}
                  <button
                    type="button"
                    className={`plan-custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    disabled={saving}
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                    aria-label="Desplegar lista de categorías"
                  >
                    <div className="plan-select-selected-row">
                      <ProfileAvatar
                        src={selectedCategory?.photoUrl}
                        name={selectedCategory?.organizationName || 'Categoría'}
                        size={30}
                        shape="rounded"
                      />
                      <div className="plan-select-selected-text">
                        <span className="plan-select-selected-name">
                          {selectedCategory?.name || 'Elegir categoría…'}
                        </span>
                        <span className="plan-select-selected-sub">
                          {selectedCategory?.organizationName} · {selectedCategory?.athletesCount}{' '}
                          {selectedCategory?.athletesCount === 1 ? 'atleta' : 'atletas'}
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`plan-select-chevron ${isDropdownOpen ? 'rotated' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Menú desplegable con fotos de organizaciones */}
                  {isDropdownOpen && (
                    <div className="plan-custom-dropdown-panel" role="listbox">
                      <div className="plan-dropdown-search-wrap">
                        <Search
                          size={14}
                          className="plan-dropdown-search-icon"
                          aria-hidden="true"
                        />
                        <input
                          type="text"
                          className="plan-dropdown-search-input"
                          placeholder="Buscar categoría u organización…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <div className="plan-custom-dropdown-list">
                        {filteredCategories.length === 0 ? (
                          <div className="plan-dropdown-empty">
                            No se encontraron categorías para «{searchQuery}»
                          </div>
                        ) : (
                          filteredCategories.map((cat) => {
                            const isSelected = cat.id === targetId;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                className={`plan-dropdown-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  setTargetId(cat.id);
                                  setIsDropdownOpen(false);
                                }}
                                role="option"
                                aria-selected={isSelected}
                              >
                                <ProfileAvatar
                                  src={cat.photoUrl}
                                  name={cat.organizationName}
                                  size={32}
                                  shape="rounded"
                                />
                                <div className="plan-dropdown-item-info">
                                  <span className="plan-dropdown-item-name">{cat.name}</span>
                                  <span className="plan-dropdown-item-sub">
                                    {cat.organizationName} · {cat.athletesCount}{' '}
                                    {cat.athletesCount === 1 ? 'atleta' : 'atletas'}
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check
                                    size={16}
                                    className="plan-dropdown-check-icon"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Select HTML accesible para lectores de pantalla y compatibilidad con tests */}
              <select
                className="plan-accessible-hidden-select"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={saving}
                aria-label={targetType === 'category' ? 'Categoría' : 'Atleta'}
              >
                {targetType === 'athlete'
                  ? athletes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.fullName}
                      </option>
                    ))
                  : categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
              </select>
            </div>

            {/* 3. Tarjeta de previsualización destacada con la FOTO y NOMBRE (KAN-622) */}
            {targetType === 'athlete' && selectedAthlete && (
              <div
                className="plan-assign-target-preview-card"
                aria-label="Atleta seleccionado con foto"
              >
                <div className="plan-preview-avatar-wrap">
                  <ProfileAvatar
                    src={selectedAthlete.photoUrl}
                    name={selectedAthlete.fullName}
                    size={52}
                  />
                </div>
                <div className="plan-preview-details">
                  <div className="plan-preview-title-row">
                    <h3 className="plan-preview-name">{selectedAthlete.fullName}</h3>
                    {selectedAthlete.active && <span className="badge badge-success">Activo</span>}
                    {selectedAthlete.isMinor && <span className="badge badge-warning">Menor</span>}
                  </div>
                  <div className="plan-preview-tags">
                    {selectedAthlete.categoryNames && selectedAthlete.categoryNames.length > 0 ? (
                      <span className="plan-preview-category-badge">
                        <Shield size={13} aria-hidden="true" />
                        <span>{selectedAthlete.categoryNames.join(', ')}</span>
                      </span>
                    ) : (
                      <span className="plan-preview-category-badge text-muted">Sin categoría</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {targetType === 'category' && selectedCategory && (
              <div
                className="plan-assign-target-preview-card"
                aria-label="Categoría seleccionada con foto"
              >
                <div className="plan-preview-avatar-wrap">
                  <ProfileAvatar
                    src={selectedCategory.photoUrl}
                    name={selectedCategory.organizationName}
                    size={52}
                    shape="rounded"
                  />
                </div>
                <div className="plan-preview-details">
                  <div className="plan-preview-title-row">
                    <h3 className="plan-preview-name">{selectedCategory.name}</h3>
                    <span className="badge badge-info">
                      {selectedCategory.athletesCount}{' '}
                      {selectedCategory.athletesCount === 1 ? 'atleta' : 'atletas'}
                    </span>
                  </div>
                  <div className="plan-preview-tags">
                    <span className="plan-preview-category-badge">
                      <Building2 size={13} aria-hidden="true" />
                      <span>{selectedCategory.organizationName}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Bloque de fecha de inicio compacto y armónico */}
            <div className="plan-assign-schedule-card">
              <div className="plan-assign-schedule-header">
                <Calendar size={16} className="plan-assign-schedule-icon" aria-hidden="true" />
                <span className="plan-assign-schedule-label">Fecha de inicio de la rutina</span>
              </div>
              <div className="plan-assign-schedule-input-row">
                <input
                  type="date"
                  className="plan-assign-date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={saving}
                  required
                  aria-label="Fecha de inicio"
                />
                <span className="plan-assign-schedule-hint">
                  A partir del {formatIsoDate(startDate)}, cada atleta verá la sesión
                  correspondiente en «Mi rutina».
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. Pie de acciones del modal */}
        <div className="plan-assign-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              loading ||
              saving ||
              (targetType === 'athlete' && athletes.length === 0) ||
              (targetType === 'category' && categories.length === 0)
            }
          >
            {saving && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
            <span>{saving ? 'Asignando…' : 'Asignar planificación'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

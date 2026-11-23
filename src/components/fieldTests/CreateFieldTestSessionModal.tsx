import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, Check, ListChecks } from 'lucide-react';
import { createFieldTestSession } from '../../api/fieldTestSessions';
import type { FitnessTest, MotorCapacity } from '../../api/generated/seguimiento';

// Etiquetas de las capacidades motoras en el orden del enum del backend (KAN-458 / KAN-656).
const CAPACITY_LABEL: Record<MotorCapacity, string> = {
  Strength: 'Fuerza',
  Velocity: 'Velocidad',
  Endurance: 'Resistencia',
  Power: 'Potencia',
  Flexibility: 'Flexibilidad',
  Agility: 'Agilidad',
  Coordination: 'Coordinación',
};

const todayIso = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export interface CreateFieldTestSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  catalogTests: FitnessTest[];
  catalogError?: string | null;
  onSessionCreated: () => Promise<void> | void;
}

export const CreateFieldTestSessionModal: React.FC<CreateFieldTestSessionModalProps> = ({
  isOpen,
  onClose,
  categoryId,
  catalogTests,
  catalogError,
  onSessionCreated,
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayIso);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [capacityFilter, setCapacityFilter] = useState<MotorCapacity | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Cierre con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, saving, onClose]);

  const toggleTest = (testId: string): void => {
    setSelectedTestIds((current) =>
      current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId],
    );
  };

  // Solo se ofrecen los filtros de capacidades que existen en el catálogo
  const availableCapacities = useMemo(() => {
    return (Object.keys(CAPACITY_LABEL) as MotorCapacity[]).filter((capacity) =>
      catalogTests.some((test) => test.motorCapacity === capacity),
    );
  }, [catalogTests]);

  // Filtrado reactivo por categoría y búsqueda de texto
  const filteredTests = useMemo(() => {
    return catalogTests.filter((test) => {
      const matchesCapacity = !capacityFilter || test.motorCapacity === capacityFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        test.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        CAPACITY_LABEL[test.motorCapacity]
          ?.toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
      return matchesCapacity && matchesSearch;
    });
  }, [catalogTests, capacityFilter, searchQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Poné un nombre para la sesión.');
      return;
    }
    if (selectedTestIds.length === 0) {
      setFormError('Elegí al menos un test del catálogo.');
      return;
    }

    setSaving(true);
    try {
      await createFieldTestSession({
        categoryId,
        date,
        name: name.trim(),
        tests: selectedTestIds.map((catalogTestId, index) => ({
          catalogTestId,
          order: index + 1,
        })),
      });
      await onSessionCreated();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo crear la sesión.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = selectedTestIds.length;

  return (
    <div
      className="ft-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ft-modal-title"
    >
      <div className="ft-modal-container">
        {/* Encabezado */}
        <div className="ft-modal-header">
          <div className="ft-modal-header-titles">
            <h2 id="ft-modal-title" className="ft-modal-title">
              Nueva sesión de evaluación
            </h2>
            <p className="ft-modal-subtitle">
              Configurá los datos generales y seleccioná las pruebas que realizarán los atletas
            </p>
          </div>
          <button
            type="button"
            className="ft-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
            disabled={saving}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Formulario con scroll interno */}
        <form onSubmit={handleSubmit} className="ft-modal-form" noValidate>
          <div className="ft-modal-body">
            {formError && (
              <div className="alert-banner danger" role="alert">
                {formError}
              </div>
            )}
            {catalogError && (
              <div className="alert-banner danger" role="alert">
                {catalogError}
              </div>
            )}

            {/* Sección B: Información general (Nombre y Fecha en 1 fila) */}
            <div className="ft-modal-section">
              <div className="ft-modal-grid-2">
                <label className="ft-field">
                  <span>Nombre de la sesión *</span>
                  <input
                    type="text"
                    maxLength={150}
                    value={name}
                    placeholder="Evaluación de pretemporada"
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                    autoFocus
                  />
                </label>

                <label className="ft-field">
                  <span>Fecha de evaluación *</span>
                  <div className="ft-input-icon-wrap">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Sección C: Selección de tests y orden */}
            <div className="ft-modal-section">
              <div className="ft-modal-section-header">
                <div>
                  <h3 className="ft-modal-section-title">Seleccioná los tests</h3>
                  <p className="ft-modal-section-desc">
                    Elegí las pruebas y organizá el orden de evaluación
                  </p>
                </div>
              </div>

              {/* Filtros por capacidad motora y buscador */}
              <div className="ft-modal-filter-toolbar">
                {catalogTests.length > 0 && (
                  <div
                    className="ft-test-filters"
                    role="group"
                    aria-label="Filtrar por capacidad motora"
                  >
                    <button
                      type="button"
                      className={`ft-test-filter${capacityFilter === '' ? ' ft-test-filter--active' : ''}`}
                      aria-pressed={capacityFilter === ''}
                      onClick={() => setCapacityFilter('')}
                    >
                      Todos
                    </button>
                    {availableCapacities.map((capacity) => (
                      <button
                        key={capacity}
                        type="button"
                        className={`ft-test-filter${capacityFilter === capacity ? ' ft-test-filter--active' : ''}`}
                        aria-pressed={capacityFilter === capacity}
                        onClick={() => setCapacityFilter(capacity)}
                      >
                        {CAPACITY_LABEL[capacity]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Buscador de tests */}
                <div className="ft-modal-search-box">
                  <Search size={16} className="ft-modal-search-icon" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Buscar test por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ft-modal-search-input"
                    aria-label="Buscar test por nombre"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="ft-modal-search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grilla de tarjetas de tests seleccionables */}
              {filteredTests.length === 0 ? (
                <div className="ft-modal-empty-tests">
                  <p>No se encontraron tests que coincidan con la búsqueda o filtro.</p>
                </div>
              ) : (
                <div className="ft-modal-test-grid">
                  {filteredTests.map((test) => {
                    const orderIndex = selectedTestIds.indexOf(test.id);
                    const isSelected = orderIndex >= 0;
                    return (
                      <button
                        key={test.id}
                        type="button"
                        className={`ft-test-card${isSelected ? ' ft-test-card--selected' : ''}`}
                        onClick={() => toggleTest(test.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="ft-test-card__header">
                          <span className="ft-test-card__category">
                            {CAPACITY_LABEL[test.motorCapacity]}
                          </span>
                          <span
                            className={`ft-test-card__order-badge${
                              isSelected ? ' ft-test-card__order-badge--selected' : ''
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check
                                  size={12}
                                  className="ft-test-card__check-icon"
                                  aria-hidden="true"
                                />
                                <span>{orderIndex + 1}</span>
                              </>
                            ) : (
                              <span>·</span>
                            )}
                          </span>
                        </div>

                        <div className="ft-test-card__body">
                          <span className="ft-test-card__name">{test.name}</span>
                        </div>

                        <div className="ft-test-card__footer">
                          <span className="ft-test-card__unit-label">Unidad: </span>
                          <span className="ft-test-option__unit">{test.measurementUnit}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sección F: Pie de acciones fijo */}
          <div className="ft-modal-footer">
            <div className="ft-modal-summary" aria-live="polite">
              <ListChecks size={18} className="ft-modal-summary-icon" aria-hidden="true" />
              <span>
                {selectedCount === 0
                  ? 'Sin pruebas seleccionadas'
                  : `${selectedCount} ${
                      selectedCount === 1 ? 'test seleccionado' : 'tests seleccionados'
                    }`}
              </span>
            </div>

            <div className="ft-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creando…' : 'Crear sesión'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

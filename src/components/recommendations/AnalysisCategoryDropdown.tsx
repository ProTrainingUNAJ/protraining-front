import { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { structureService } from '../../api/structureService';
import { ProfileAvatar } from '../common/ProfileAvatar';
import type { Category, Organization } from '../../types/structure';

export interface AnalysisCategoryDropdownProps {
  categories: Category[];
  organizations: Organization[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  disabled?: boolean;
}

export function AnalysisCategoryDropdown({
  categories,
  organizations,
  selectedCategoryId,
  onSelectCategory,
  disabled = false,
}: AnalysisCategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mapa de organización por ID para acceso rápido
  const orgMap = useMemo(() => {
    const map = new Map<string, Organization>();
    for (const org of organizations) {
      map.set(org.id, org);
    }
    return map;
  }, [organizations]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );

  const selectedOrg = selectedCategory ? orgMap.get(selectedCategory.organizationId) : null;
  const selectedOrgPhoto =
    selectedOrg && selectedOrg.hasPhoto
      ? structureService.getOrganizationPhotoUrl(selectedOrg.id, selectedOrg.photoUpdatedAt)
      : null;

  return (
    <div className="recommendations-analysis-category-wrap" ref={containerRef}>
      {/* Select nativo accesible sincronizado para lectores de pantalla y tests (KAN-663 / KAN-660) */}
      <label htmlFor="recommendations-analysis-category-select" className="sr-only">
        Categoría para analizar
      </label>
      <select
        id="recommendations-analysis-category-select"
        aria-label="Categoría para analizar"
        className="sr-only"
        value={selectedCategoryId}
        onChange={(e) => onSelectCategory(e.target.value)}
        disabled={disabled}
      >
        <option value="">Elegí una categoría…</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Disparador visual enriquecido con logo de la organización (KAN-660, Imagen 3) */}
      <button
        type="button"
        className={`recommendations-analysis-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Desplegar categorías para análisis"
      >
        <div className="recommendations-analysis-trigger-row">
          {selectedCategory ? (
            <ProfileAvatar
              key={`cat-selected-org-${selectedCategory.id}`}
              src={selectedOrgPhoto}
              name={selectedOrg?.name || selectedCategory.name}
              size={24}
            />
          ) : (
            <div className="recommendations-analysis-avatar-placeholder" aria-hidden="true">
              <Building2 size={14} />
            </div>
          )}

          <div className="recommendations-analysis-trigger-text">
            <span className="recommendations-analysis-trigger-name">
              {selectedCategory?.name || 'Elegí una categoría…'}
            </span>
            {selectedOrg && (
              <span className="recommendations-analysis-trigger-org">{selectedOrg.name}</span>
            )}
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`recommendations-analysis-chevron ${isOpen ? 'rotated' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Panel desplegable con foto de organización y nombre de categoría */}
      {isOpen && (
        <div
          className="recommendations-analysis-dropdown-panel"
          role="listbox"
          aria-label="Categorías disponibles para analizar"
        >
          {categories.length === 0 ? (
            <div className="recommendations-analysis-empty">No hay categorías disponibles</div>
          ) : (
            categories.map((cat) => {
              const org = orgMap.get(cat.organizationId);
              const orgPhoto =
                org && org.hasPhoto
                  ? structureService.getOrganizationPhotoUrl(org.id, org.photoUpdatedAt)
                  : null;
              const isSelected = cat.id === selectedCategoryId;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`recommendations-analysis-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <ProfileAvatar
                    src={orgPhoto}
                    name={org?.name || cat.name}
                    size={26}
                    className="recommendations-analysis-item-avatar"
                  />
                  <div className="recommendations-analysis-item-info">
                    <span className="recommendations-analysis-item-title">{cat.name}</span>
                    {org && <span className="recommendations-analysis-item-sub">{org.name}</span>}
                  </div>
                  {isSelected && (
                    <Check
                      size={15}
                      className="recommendations-analysis-item-check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

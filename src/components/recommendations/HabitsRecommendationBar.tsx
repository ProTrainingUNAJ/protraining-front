import { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, Salad, Search, ChevronDown, Check } from 'lucide-react';
import { recommendationsService } from '../../api/recommendations';
import { ProfileAvatar } from '../common/ProfileAvatar';

export interface HabitsAthleteOption {
  id: string;
  name: string;
  photoUrl?: string | null;
  categoryNames?: string[];
}

interface HabitsRecommendationBarProps {
  athletes: HabitsAthleteOption[];
  onGenerated: (athleteName: string) => void | Promise<void>;
  onError: (message: string) => void;
}

// Hábitos y alimentación para un atleta (KAN-634 · KAN-654): selector interactivo con foto y buscador,
// el PF la pide, el back la arma con las reglas nutricionales y queda pendiente en la bandeja hasta que la apruebe.
export function HabitsRecommendationBar({
  athletes,
  onGenerated,
  onError,
}: HabitsRecommendationBarProps) {
  const [athleteId, setAthleteId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === athleteId) || null,
    [athletes, athleteId],
  );

  const filteredAthletes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return athletes;
    return athletes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.categoryNames && a.categoryNames.some((cat) => cat.toLowerCase().includes(q))),
    );
  }, [athletes, searchQuery]);

  const handleGenerate = async () => {
    const athlete = athletes.find((option) => option.id === athleteId);
    if (!athlete || generating) return;
    setGenerating(true);
    try {
      await recommendationsService.generateHabitsForAthlete(athlete.id);
      await onGenerated(athlete.name);
    } catch (err: unknown) {
      onError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la recomendación de hábitos y alimentación.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="recommendations-engine-section">
      <section
        className="recommendations-engine-bar"
        aria-label="Generar recomendación de hábitos y alimentación"
      >
        <Salad size={20} className="recommendations-engine-sparkle" aria-hidden="true" />
        <strong className="recommendations-engine-title">Hábitos y alimentación</strong>

        {/* Selector interactivo con foto de perfil y buscador (KAN-654) */}
        <div className="habits-select-container" ref={dropdownRef}>
          {/* Select nativo accesible sincronizado para lectores de pantalla y tests */}
          <select
            className="sr-only"
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            aria-label="Atleta para la recomendación de hábitos"
            disabled={generating}
          >
            <option value="">Elegí un atleta</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>

          {/* Botón trigger del dropdown interactivo */}
          <button
            type="button"
            className={`habits-select-trigger ${isDropdownOpen ? 'open' : ''}`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            disabled={generating}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-label="Desplegar lista de atletas para hábitos"
          >
            <div className="habits-select-selected-row">
              <ProfileAvatar
                src={selectedAthlete?.photoUrl}
                name={selectedAthlete?.name || 'Atleta'}
                size={28}
              />
              <div className="habits-select-selected-text">
                <span className="habits-select-selected-name">
                  {selectedAthlete?.name || 'Elegí un atleta…'}
                </span>
                {selectedAthlete?.categoryNames && selectedAthlete.categoryNames.length > 0 && (
                  <span className="habits-select-selected-sub">
                    {selectedAthlete.categoryNames.join(', ')}
                  </span>
                )}
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`habits-select-chevron ${isDropdownOpen ? 'rotated' : ''}`}
              aria-hidden="true"
            />
          </button>

          {/* Menú desplegable con fotos y buscador */}
          {isDropdownOpen && (
            <div className="habits-dropdown-panel" role="listbox">
              <div className="habits-dropdown-search-wrap">
                <Search size={14} className="habits-dropdown-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="habits-dropdown-search-input"
                  placeholder="Buscar atleta por nombre o categoría…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="habits-dropdown-list">
                {filteredAthletes.length === 0 ? (
                  <div className="habits-dropdown-empty">
                    No se encontraron atletas para «{searchQuery}»
                  </div>
                ) : (
                  filteredAthletes.map((ath) => {
                    const isSelected = ath.id === athleteId;
                    return (
                      <button
                        key={ath.id}
                        type="button"
                        className={`habits-dropdown-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setAthleteId(ath.id);
                          setIsDropdownOpen(false);
                          setSearchQuery('');
                        }}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <ProfileAvatar src={ath.photoUrl} name={ath.name} size={28} />
                        <div className="habits-dropdown-item-info">
                          <span className="habits-dropdown-item-name">{ath.name}</span>
                          {ath.categoryNames && ath.categoryNames.length > 0 ? (
                            <span className="habits-dropdown-item-sub">
                              {ath.categoryNames.join(', ')}
                            </span>
                          ) : (
                            <span className="habits-dropdown-item-sub">Sin categoría</span>
                          )}
                        </div>
                        {isSelected && (
                          <Check
                            size={16}
                            style={{ color: 'var(--secondary)', flexShrink: 0 }}
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

        <button
          type="button"
          className="recommendations-engine-btn"
          onClick={() => void handleGenerate()}
          disabled={!athleteId || generating}
        >
          {generating && <Loader2 size={13} className="plan-spin" aria-hidden="true" />}
          <span>{generating ? 'Generando…' : 'Generar'}</span>
        </button>
      </section>

      <p className="recommendations-engine-desc">
        Proteína según su peso y objetivo, sin suplementos ni pautas para bajar de peso, y con el
        aviso de consultar a un nutricionista. Si la ficha médica marca alguna condición, se lo
        deriva a un profesional.
      </p>
    </div>
  );
}

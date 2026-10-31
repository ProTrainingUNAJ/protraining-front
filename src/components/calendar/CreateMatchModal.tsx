import React, { useState, useEffect } from 'react';
import { X, Calendar, Shield, MapPin, Compass, AlertCircle, Loader2 } from 'lucide-react';
import { Category, HomeOrAway, Match } from '../../types/structure';
import { matchService } from '../../services/matchService';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  initialCategoryId?: string;
  initialDate?: string; // YYYY-MM-DD
  onMatchCreated?: (newMatch: Match) => void;
}

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
  isOpen,
  onClose,
  categories,
  initialCategoryId,
  initialDate,
  onMatchCreated,
}) => {
  const getUpcomingSaturdayIso = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    const y = saturday.getFullYear();
    const m = String(saturday.getMonth() + 1).padStart(2, '0');
    const d = String(saturday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [categoryId, setCategoryId] = useState(() => initialCategoryId || categories[0]?.id || '');
  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState(() => initialDate || getUpcomingSaturdayIso());
  const [matchTime, setMatchTime] = useState('15:30');
  const [homeOrAway, setHomeOrAway] = useState<HomeOrAway>('Home');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setCategoryId(initialCategoryId || (categories[0]?.id ?? ''));
      setOpponent('');
      setMatchDate(initialDate || getUpcomingSaturdayIso());
      setMatchTime('15:30');
      setHomeOrAway('Home');
      setNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!categoryId) {
      setErrorMessage('Por favor selecciona una categoría deportiva.');
      return;
    }
    if (!opponent.trim()) {
      setErrorMessage('Por favor ingresa el nombre del rival u oponente.');
      return;
    }
    if (!matchDate) {
      setErrorMessage('Por favor selecciona la fecha del encuentro.');
      return;
    }

    // Formatear startTime como HH:mm:ss preservando la hora exacta seleccionada por el PF sin conversión UTC
    const formattedStartTime = matchTime
      ? matchTime.length === 5
        ? `${matchTime}:00`
        : matchTime
      : '12:00:00';

    setIsSubmitting(true);
    try {
      const created = await matchService.createMatch(categoryId, {
        opponent: opponent.trim(),
        date: matchDate,
        startTime: formattedStartTime,
        matchDate: `${matchDate}T${formattedStartTime}`,
        homeOrAway,
        notes: notes.trim() || null,
      });

      // Enrich with category name
      const categoryObj = categories.find((c) => c.id === categoryId);
      if (categoryObj) {
        created.categoryName = categoryObj.name;
      }

      if (onMatchCreated) {
        onMatchCreated(created);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Ocurrió un error al intentar guardar el partido.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="create-match-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="create-match-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-match-title"
      >
        <div className="create-match-modal-header">
          <h2 id="create-match-title" className="create-match-modal-title">
            <Calendar size={20} aria-hidden="true" />
            <span>Programar Partido Oficial</span>
          </h2>
          <button
            type="button"
            className="create-match-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-match-form" noValidate>
          {errorMessage && (
            <div className="form-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Categoría */}
          <div className="form-group">
            <label htmlFor="match-category-select" className="form-label">
              Categoría / División <span className="required-mark">*</span>
            </label>
            <select
              id="match-category-select"
              className="form-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                -- Selecciona una categoría --
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rival / Oponente */}
          <div className="form-group">
            <label htmlFor="match-opponent-input" className="form-label">
              Rival u Oponente <span className="required-mark">*</span>
            </label>
            <input
              id="match-opponent-input"
              type="text"
              className="form-input"
              placeholder="Ej: Club San Martín, Defensores, etc."
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Fecha y Hora */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="match-date-input" className="form-label">
                Fecha del partido <span className="required-mark">*</span>
              </label>
              <input
                id="match-date-input"
                type="date"
                className="form-input"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="match-time-input" className="form-label">
                Horario estimado
              </label>
              <input
                id="match-time-input"
                type="time"
                className="form-input"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
              />
            </div>
          </div>

          {/* Condición de Localía */}
          <div className="form-group">
            <label className="form-label">Condición del encuentro</label>
            <div
              className="condition-chips-container"
              role="radiogroup"
              aria-label="Condición del partido"
            >
              <button
                type="button"
                role="radio"
                aria-checked={homeOrAway === 'Home'}
                className={`condition-chip-btn ${homeOrAway === 'Home' ? 'is-selected' : ''}`}
                onClick={() => setHomeOrAway('Home')}
              >
                <Shield size={16} />
                <span>Local</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={homeOrAway === 'Away'}
                className={`condition-chip-btn away ${homeOrAway === 'Away' ? 'is-selected away' : ''}`}
                onClick={() => setHomeOrAway('Away')}
              >
                <MapPin size={16} />
                <span>Visitante</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={homeOrAway === 'Neutral'}
                className={`condition-chip-btn neutral ${homeOrAway === 'Neutral' ? 'is-selected neutral' : ''}`}
                onClick={() => setHomeOrAway('Neutral')}
              >
                <Compass size={16} />
                <span>Neutral</span>
              </button>
            </div>
          </div>

          {/* Notas u Observaciones */}
          <div className="form-group">
            <label htmlFor="match-notes-input" className="form-label">
              Notas u Observaciones (opcional)
            </label>
            <textarea
              id="match-notes-input"
              className="form-textarea"
              rows={3}
              placeholder="Ej: Fecha 8 del torneo oficial. Convocatoria 1 hora antes en el predio."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Acciones */}
          <div className="create-match-modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Partido</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

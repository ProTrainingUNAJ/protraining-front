import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Calendar,
  Plus,
  Clock,
  Dumbbell,
  Shield,
  MapPin,
  Compass,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { Match } from '../../types/structure';
import { formatFullDate, formatTime, sortActivitiesByTime } from '../../utils/calendarUtils';
import {
  seasonPlanningService,
  PlannedSessionWithTime,
} from '../../services/seasonPlanningService';
import { matchService } from '../../services/matchService';

interface DayDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isoDate: string; // YYYY-MM-DD
  matches: Match[];
  onAddMatch: (isoDate: string) => void;
}

export const DayDetailDrawer: React.FC<DayDetailDrawerProps> = ({
  isOpen,
  onClose,
  isoDate,
  matches,
  onAddMatch,
}) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<PlannedSessionWithTime[]>([]);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);

  // Load planned training sessions for this specific date
  useEffect(() => {
    let isMounted = true;
    if (isOpen && isoDate) {
      const fetchSessions = async () => {
        try {
          const data = await seasonPlanningService.getSessionsForDate(isoDate);
          if (isMounted) {
            // Ordenar entrenamientos por horario
            const sorted = sortActivitiesByTime(
              data.map((s) => ({ ...s, time: s.sessionTime || '' })),
            );
            setSessions(sorted);
          }
        } catch {
          if (isMounted) {
            setSessions([]);
          }
        }
      };
      void fetchSessions();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, isoDate]);

  // Handle ESC key
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

  const handleDeleteMatch = async (categoryId: string, matchId: string) => {
    try {
      setDeletingMatchId(matchId);
      await matchService.deleteMatch(categoryId, matchId);
    } catch {
      // Error manejado en servicio
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleOpenPlanEditor = (planId: string) => {
    onClose();
    navigate(`/pf/planning/${planId}`);
  };

  const handleGoToPlanning = () => {
    onClose();
    navigate('/pf/planning');
  };

  const getBadgeStyle = (condition: string) => {
    switch (condition) {
      case 'Home':
        return { label: 'Local', className: 'is-match', icon: Shield };
      case 'Away':
        return { label: 'Visitante', className: 'is-match away', icon: MapPin };
      default:
        return { label: 'Neutral', className: 'is-match', icon: Compass };
    }
  };

  return (
    <div
      className="day-detail-drawer-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="day-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-detail-title"
      >
        <div className="day-detail-drawer-header">
          <div>
            <h3 id="day-detail-title" className="day-detail-drawer-date">
              {formatFullDate(isoDate)}
            </h3>
            <span className="text-xs text-muted">Agenda competitiva y de entrenamiento</span>
          </div>
          <button
            type="button"
            className="season-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar detalles del día"
          >
            <X size={18} />
          </button>
        </div>

        <div className="day-detail-drawer-content">
          {/* Quick action to add match on this day */}
          <button
            type="button"
            className="season-calendar-action-add-btn"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => onAddMatch(isoDate)}
          >
            <Plus size={16} />
            <span>Programar Partido para esta fecha</span>
          </button>

          {/* Section: Partidos oficiales */}
          <div>
            <h4 className="day-detail-section-title">
              <Calendar size={16} />
              <span>Partidos Oficiales ({matches.length})</span>
            </h4>

            {matches.length === 0 ? (
              <div className="day-detail-empty-state">
                <Calendar size={24} className="opacity-40" />
                <p>No hay partidos oficiales programados para este día.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {matches.map((m) => {
                  const badge = getBadgeStyle(m.homeOrAway);
                  const Icon = badge.icon;
                  const time = formatTime(m.matchDate);

                  return (
                    <div key={m.id} className="day-detail-match-card">
                      <div
                        className="day-detail-match-header"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          className={`season-event-block ${badge.className}`}
                          style={{
                            width: 'auto',
                            padding: '0.25rem 0.5rem',
                            display: 'inline-flex',
                          }}
                        >
                          <Icon size={12} style={{ marginRight: '4px' }} />
                          <span>{badge.label}</span>
                        </span>
                        {time && (
                          <span
                            className="text-xs text-muted"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Clock size={12} />
                            <span>{time} hs</span>
                          </span>
                        )}
                        <button
                          type="button"
                          className="season-calendar-quick-add-btn"
                          style={{ display: 'inline-flex' }}
                          title="Eliminar partido"
                          onClick={() => void handleDeleteMatch(m.categoryId, m.id)}
                          disabled={deletingMatchId === m.id}
                          aria-label="Eliminar partido"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h5 style={{ margin: '0.5rem 0 0.2rem', fontSize: '1rem', fontWeight: 700 }}>
                        VS {m.opponent}
                      </h5>

                      {m.categoryName && (
                        <span className="text-xs text-muted">
                          Categoría: <strong>{m.categoryName}</strong>
                        </span>
                      )}

                      {m.notes && (
                        <p
                          style={{
                            margin: '0.4rem 0 0',
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {m.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Sesiones de Planificación vinculadas */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <h4 className="day-detail-section-title" style={{ margin: 0 }}>
                <Dumbbell size={16} />
                <span>Entrenamientos Planificados ({sessions.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleGoToPlanning}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>Ir a Planificación</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="day-detail-empty-state">
                <Dumbbell size={24} className="opacity-40" />
                <p>No hay entrenamientos planificados para este día.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}
                  onClick={handleGoToPlanning}
                >
                  <span>Configurar rutinas en Planificación</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {sessions.map((s) => (
                  <div
                    key={s.assignmentId}
                    className="day-detail-match-card"
                    style={{ borderLeft: '3px solid var(--season-training-bg)' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        className="season-event-block is-training"
                        style={{ width: 'auto', padding: '0.25rem 0.5rem', display: 'inline-flex' }}
                      >
                        🏋️‍♂️ {s.planName}
                      </span>
                      {s.sessionTime && (
                        <span
                          className="text-xs text-muted"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Clock size={12} />
                          <span>{s.sessionTime} hs</span>
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        onClick={() => handleOpenPlanEditor(s.trainingPlanId)}
                        title="Ver rutina en el editor de planificación"
                      >
                        <span>Ver rutina</span>
                        <ArrowRight size={11} />
                      </button>
                    </div>

                    <h5 style={{ margin: '0.5rem 0 0.2rem', fontSize: '0.95rem', fontWeight: 700 }}>
                      {s.sessionName}
                    </h5>

                    <span className="text-xs text-muted">
                      {s.exerciseCount}{' '}
                      {s.exerciseCount === 1 ? 'ejercicio prescrito' : 'ejercicios prescritos'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  Columns,
} from 'lucide-react';
import { Category, Match } from '../../types/structure';
import {
  getMonthDays,
  getWeekDays,
  formatMonthYear,
  formatTime,
  toIsoDate,
  sortActivitiesByTime,
} from '../../utils/calendarUtils';
import { matchService } from '../../services/matchService';
import {
  seasonPlanningService,
  PlannedSessionWithTime,
} from '../../services/seasonPlanningService';
import { CreateMatchModal } from './CreateMatchModal';
import { DayDetailDrawer } from './DayDetailDrawer';
import '../../styles/seasonCalendar.css';

interface SeasonCalendarViewProps {
  categories: Category[];
  initialCategoryId?: string;
}

export const SeasonCalendarView: React.FC<SeasonCalendarViewProps> = ({
  categories,
  initialCategoryId,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || '');
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Matches and planned sessions state
  const [matches, setMatches] = useState<Match[]>([]);
  const [planSessionsByDate, setPlanSessionsByDate] = useState<
    Map<string, PlannedSessionWithTime[]>
  >(new Map());

  // Modals and Drawer state
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);
  const [drawerDate, setDrawerDate] = useState<string | null>(null);

  // Load matches
  const loadMatches = useCallback(async () => {
    try {
      const categoryIds = selectedCategoryId ? [selectedCategoryId] : categories.map((c) => c.id);
      const dataMatches = await matchService.getMatches(categoryIds);
      const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

      const enrichedMatches = dataMatches.map((m) => ({
        ...m,
        categoryName: categoryMap.get(m.categoryId) || m.categoryName,
      }));

      setMatches(enrichedMatches);
    } catch {
      // Handled silently
    }
  }, [selectedCategoryId, categories]);

  // Initial load and category changes for matches
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const categoryIds = selectedCategoryId ? [selectedCategoryId] : categories.map((c) => c.id);
        const dataMatches = await matchService.getMatches(categoryIds);
        if (!isMounted) return;

        const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
        const enrichedMatches = dataMatches.map((m) => ({
          ...m,
          categoryName: categoryMap.get(m.categoryId) || m.categoryName,
        }));

        setMatches(enrichedMatches);
      } catch {
        // Handled silently
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [selectedCategoryId, categories]);

  // Load planned sessions when date, category or view mode changes
  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const days = viewMode === 'month' ? getMonthDays(currentDate) : getWeekDays(currentDate);
        const isoDates = days.map((d) => d.isoDate);

        const map = await seasonPlanningService.getSessionsForDates(
          isoDates,
          selectedCategoryId,
          categories,
        );

        if (isMounted) {
          setPlanSessionsByDate(map);
        }
      } catch {
        // Handled silently
      }
    };
    void fetchPlans();
    return () => {
      isMounted = false;
    };
  }, [currentDate, viewMode, selectedCategoryId, categories]);

  // Real-time synchronization
  useEffect(() => {
    const unsubMatches = matchService.subscribe(() => {
      void loadMatches();
    });
    return () => {
      unsubMatches();
    };
  }, [loadMatches]);

  // Seed demo data once categories are available
  useEffect(() => {
    if (categories.length > 0) {
      matchService.seedDemoMatchesIfEmpty(categories);
    }
  }, [categories]);

  // Matches indexed by local YYYY-MM-DD
  const matchesByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach((m) => {
      const iso = toIsoDate(new Date(m.matchDate));
      const list = map.get(iso) || [];
      list.push(m);
      map.set(iso, list);
    });
    return map;
  }, [matches]);

  // Period label
  const periodLabel = useMemo(() => {
    if (viewMode === 'month') {
      return formatMonthYear(currentDate);
    }
    const week = getWeekDays(currentDate);
    const start = week[0];
    const end = week[6];
    return `Semana ${start.dayNumber} al ${end.dayNumber} de ${formatMonthYear(end.date)}`;
  }, [viewMode, currentDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 7);
      setCurrentDate(prev);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 7);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOpenCreateMatchModal = (targetDate?: string) => {
    setModalInitialDate(targetDate);
    setIsCreateMatchModalOpen(true);
  };

  const handleOpenDayDrawer = (isoDate: string) => {
    setDrawerDate(isoDate);
  };

  const daysOfWeek = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <div className="season-calendar-container" aria-label="Calendario de temporada deportiva">
      {/* Top Header & Controls */}
      <header className="season-calendar-header">
        <div className="season-calendar-title-group">
          <h1 className="season-calendar-main-title">
            <CalendarIcon size={24} className="text-primary" aria-hidden="true" />
            <span>Calendario de Temporada</span>
          </h1>
          <span className="season-calendar-period-label">{periodLabel}</span>
        </div>

        <div className="season-calendar-controls-group">
          {/* Category Filter */}
          <select
            className="season-calendar-select"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* View Mode Switcher */}
          <div className="season-calendar-view-switcher" role="group" aria-label="Modo de vista">
            <button
              type="button"
              className={`season-calendar-view-btn ${viewMode === 'month' ? 'is-active' : ''}`}
              onClick={() => setViewMode('month')}
              aria-pressed={viewMode === 'month'}
            >
              <LayoutGrid size={15} />
              <span>Mes</span>
            </button>
            <button
              type="button"
              className={`season-calendar-view-btn ${viewMode === 'week' ? 'is-active' : ''}`}
              onClick={() => setViewMode('week')}
              aria-pressed={viewMode === 'week'}
            >
              <Columns size={15} />
              <span>Semana</span>
            </button>
          </div>

          {/* Navigation Controls */}
          <div className="season-calendar-nav-group">
            <button type="button" className="season-calendar-today-btn" onClick={handleToday}>
              Hoy
            </button>
            <button
              type="button"
              className="season-calendar-nav-btn"
              onClick={handlePrev}
              aria-label="Período anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="season-calendar-nav-btn"
              onClick={handleNext}
              aria-label="Período siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Single Primary Action Button: Schedule Match */}
          <button
            type="button"
            className="season-calendar-action-add-btn"
            onClick={() => handleOpenCreateMatchModal()}
          >
            <Plus size={16} />
            <span>Programar Partido</span>
          </button>
        </div>
      </header>

      {/* Monthly View */}
      {viewMode === 'month' && (
        <div className="season-calendar-month-wrapper">
          <div className="season-calendar-weekdays-bar">
            {daysOfWeek.map((day, idx) => (
              <div
                key={day}
                className={`season-calendar-weekday-col ${idx >= 5 ? 'is-weekend' : ''}`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="season-calendar-month-grid">
            {getMonthDays(currentDate).map((day) => {
              const dayMatches = matchesByDate.get(day.isoDate) || [];
              const dayPlanSessions = planSessionsByDate.get(day.isoDate) || [];

              // Unificar partidos y entrenamientos en una lista ordenada por horario
              const activities = sortActivitiesByTime([
                ...dayMatches.map((m) => ({
                  kind: 'match' as const,
                  id: `match-${m.id}`,
                  time: formatTime(m.matchDate),
                  match: m,
                })),
                ...dayPlanSessions.map((s) => ({
                  kind: 'training' as const,
                  id: `plan-${s.assignmentId}`,
                  time: s.sessionTime || '',
                  session: s,
                })),
              ]);

              const totalEvents = activities.length;

              // Mostrar hasta 2 bloques sólidos completos por celda
              return (
                <div
                  key={day.isoDate}
                  className={`season-calendar-month-cell ${
                    !day.isCurrentMonth ? 'is-other-month' : ''
                  } ${day.isToday ? 'is-today' : ''}`}
                  onClick={() => handleOpenDayDrawer(day.isoDate)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenDayDrawer(day.isoDate);
                    }
                  }}
                  aria-label={`Día ${day.dayNumber}, ${activities.length} actividades programadas`}
                >
                  <div className="season-calendar-cell-header">
                    <span className="season-calendar-day-num">{day.dayNumber}</span>
                    <button
                      type="button"
                      className="season-calendar-quick-add-btn"
                      title="Agregar partido en este día"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateMatchModal(day.isoDate);
                      }}
                      aria-label={`Añadir partido el día ${day.dayNumber}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Full Solid Event Blocks ordenados por horario */}
                  <div className="season-calendar-events-stack">
                    {activities.slice(0, 2).map((act, idx) => {
                      if (act.kind === 'match') {
                        const m = act.match;
                        return (
                          <div
                            key={`${act.id}-${idx}`}
                            className={`season-event-block is-match ${
                              m.homeOrAway === 'Away' ? 'away' : ''
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDayDrawer(day.isoDate);
                            }}
                            title={`Partido vs ${m.opponent} (${
                              m.homeOrAway === 'Home' ? 'Local' : 'Visitante'
                            }) - ${act.time ? `${act.time} hs` : ''}`}
                          >
                            <span className="season-event-block-title">
                              <span>⚽</span>
                              <span>VS {m.opponent}</span>
                            </span>
                            {act.time && (
                              <span className="season-event-block-meta">{act.time} hs</span>
                            )}
                          </div>
                        );
                      }

                      const s = act.session;
                      return (
                        <div
                          key={`${act.id}-${idx}`}
                          className="season-event-block is-training"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDayDrawer(day.isoDate);
                          }}
                          title={`Planificación: ${s.planName} · ${s.sessionName}${
                            act.time ? ` (${act.time} hs)` : ''
                          }`}
                        >
                          <span className="season-event-block-title">
                            <span>🏋️‍♂️</span>
                            <span>
                              {s.planName}: {s.sessionName}
                            </span>
                          </span>
                          <span className="season-event-block-meta">
                            {act.time ? `${act.time} hs` : `${s.exerciseCount} ej.`}
                          </span>
                        </div>
                      );
                    })}

                    {/* Indicador si hay más de 2 actividades */}
                    {totalEvents > 2 && (
                      <span className="season-more-events">+{totalEvents - 2} más…</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly View */}
      {viewMode === 'week' && (
        <div className="season-calendar-week-grid">
          {getWeekDays(currentDate).map((day) => {
            const dayMatches = matchesByDate.get(day.isoDate) || [];
            const dayPlanSessions = planSessionsByDate.get(day.isoDate) || [];

            // Unificar actividades de la semana ordenadas por horario
            const activities = sortActivitiesByTime([
              ...dayMatches.map((m) => ({
                kind: 'match' as const,
                id: `week-match-${m.id}`,
                time: formatTime(m.matchDate),
                match: m,
              })),
              ...dayPlanSessions.map((s) => ({
                kind: 'training' as const,
                id: `week-plan-${s.assignmentId}`,
                time: s.sessionTime || '',
                session: s,
              })),
            ]);

            return (
              <div
                key={day.isoDate}
                className={`season-calendar-week-col ${day.isToday ? 'is-today' : ''}`}
              >
                <div className="season-calendar-week-header">
                  <span className="season-calendar-week-dayname">{day.dayName}</span>
                  <span className="season-calendar-week-daynum">{day.dayNumber}</span>
                </div>

                <div className="season-calendar-week-content">
                  <button
                    type="button"
                    className="season-calendar-week-add-btn"
                    onClick={() => handleOpenCreateMatchModal(day.isoDate)}
                    title="Programar Partido en este día"
                  >
                    <Plus size={13} />
                    <span>+ Partido</span>
                  </button>

                  {activities.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '1.5rem 0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                      }}
                    >
                      Sin actividades
                    </div>
                  ) : (
                    activities.map((act, idx) => {
                      if (act.kind === 'match') {
                        const m = act.match;
                        return (
                          <div
                            key={`${act.id}-${idx}`}
                            className={`season-event-block is-match ${
                              m.homeOrAway === 'Away' ? 'away' : ''
                            }`}
                            style={{ padding: '0.5rem 0.6rem', fontSize: '0.8rem' }}
                            onClick={() => handleOpenDayDrawer(day.isoDate)}
                            role="button"
                            tabIndex={0}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                overflow: 'hidden',
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>⚽</span>
                                <strong>VS {m.opponent}</strong>
                              </span>
                              {m.categoryName && (
                                <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                                  {m.categoryName}
                                </span>
                              )}
                            </div>
                            {act.time && (
                              <span className="season-event-block-meta">{act.time} hs</span>
                            )}
                          </div>
                        );
                      }

                      const s = act.session;
                      return (
                        <div
                          key={`${act.id}-${idx}`}
                          className="season-event-block is-training"
                          style={{ padding: '0.5rem 0.6rem', fontSize: '0.8rem' }}
                          onClick={() => handleOpenDayDrawer(day.isoDate)}
                          role="button"
                          tabIndex={0}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              overflow: 'hidden',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🏋️‍♂️</span>
                              <strong>{s.planName}</strong>
                            </span>
                            <span style={{ fontSize: '0.72rem', opacity: 0.9 }}>
                              {s.sessionName}
                            </span>
                          </div>
                          <span className="season-event-block-meta">
                            {act.time ? `${act.time} hs` : `${s.exerciseCount} ej.`}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating New Match */}
      <CreateMatchModal
        isOpen={isCreateMatchModalOpen}
        onClose={() => setIsCreateMatchModalOpen(false)}
        categories={categories}
        initialCategoryId={selectedCategoryId || categories[0]?.id}
        initialDate={modalInitialDate}
        onMatchCreated={(newMatch) => {
          setMatches((prev) => [...prev.filter((m) => m.id !== newMatch.id), newMatch]);
          void loadMatches();
          if (newMatch.matchDate) {
            setDrawerDate(toIsoDate(new Date(newMatch.matchDate)));
          }
        }}
      />

      {/* Day Details Drawer */}
      <DayDetailDrawer
        isOpen={Boolean(drawerDate)}
        onClose={() => setDrawerDate(null)}
        isoDate={drawerDate || ''}
        matches={drawerDate ? matchesByDate.get(drawerDate) || [] : []}
        onAddMatch={(date) => {
          setDrawerDate(null);
          handleOpenCreateMatchModal(date);
        }}
      />
    </div>
  );
};

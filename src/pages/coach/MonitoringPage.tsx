import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Activity, AlertTriangle, Loader2, Search, Users } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { AthleteTrafficLightCard } from '../../components/monitoring/AthleteTrafficLightCard';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import {
  AthleteTrafficLightItem,
  TrafficLightStatus,
} from '../../components/monitoring/trafficLight.types';
import { structureService } from '../../api/structureService';
import {
  ATHLETE_NAME_FALLBACK,
  CATEGORY_NAME_FALLBACK,
  getCategoryTrafficLightToday,
  getCategoryAttendanceToday,
  setAttendance,
  type CategoryAttendanceSummary,
  mapTrafficLightSummaryToItem,
} from '../../api/seguimientoService';
import { Category } from '../../types/structure';

type FilterColor = 'all' | TrafficLightStatus;

// KAN-365: orden visual del semáforo. El backend ordena por severidad
// (rojo → amarillo → verde), pero los atletas sin check-in (gris) pueden
// quedar intercalados. El frontend reordena con prioridad visual
// rojo(0) → amarillo(1) → gris(2) → verde(3). `sort` es estable (ES2019):
// preserva el orden original (apellido) dentro de cada color.
const STATUS_ORDER: Record<TrafficLightStatus, number> = {
  red: 0,
  yellow: 1,
  gray: 2,
  green: 3,
};

export const MonitoringPage: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'traffic-light' | 'attendance'>('traffic-light');

  // Plantel (categorías reales del PF) y semáforo del día cargados por API
  // (KAN-365/KAN-366). Sin mocks: el archivo trafficLightData.ts fue eliminado.
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  // Derive active color filter directly from URL query parameters or navigation state
  const queryParam = searchParams.get('filter') || searchParams.get('status');
  const stateFilter = (location.state as { filter?: FilterColor })?.filter;

  const colorFilter: FilterColor =
    queryParam === 'red' ||
    queryParam === 'yellow' ||
    queryParam === 'green' ||
    queryParam === 'gray'
      ? queryParam
      : stateFilter === 'red' ||
          stateFilter === 'yellow' ||
          stateFilter === 'green' ||
          stateFilter === 'gray'
        ? stateFilter
        : 'all';

  const setColorFilter = (filter: FilterColor) => {
    setSearchParams(
      (prev: URLSearchParams) => {
        const next = new URLSearchParams(prev);
        if (filter === 'all') {
          next.delete('filter');
          next.delete('status');
        } else {
          next.set('filter', filter);
        }
        return next;
      },
      { replace: true },
    );
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteTrafficLightItem | null>(null);

  // 1. Cargar las categorías del preparador físico (orgs → categorías)
  useEffect(() => {
    let active = true;

    structureService
      .getOrganizations()
      .catch(() => [])
      .then(async (organizations) => {
        const categoriesByOrg = await Promise.all(
          organizations.map((organization) =>
            structureService.getCategories(organization.id).catch(() => [] as Category[]),
          ),
        );
        if (!active) return;

        const allCategories = categoriesByOrg.flat();
        setCategories(allCategories);
        setSelectedCategoryId((current) => current || allCategories[0]?.id || '');
        setCategoriesLoading(false);
        if (allCategories.length === 0) {
          setCategoriesError('No se encontraron planteles disponibles para tu cuenta.');
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCategoriesError(
          err instanceof Error ? err.message : 'No se pudieron cargar las categorías.',
        );
        setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Modo degradado KAN-366: estructura caída → nombre de categoría vacío.
  const selectedCategoryName = useMemo(
    () =>
      categories.find((category) => category.id === selectedCategoryId)?.name?.trim() ||
      CATEGORY_NAME_FALLBACK,
    [categories, selectedCategoryId],
  );

  // 2. Cargar el semáforo del día de la categoría seleccionada (sin setState síncrono en el effect)
  const [athletesResult, setAthletesResult] = useState<{
    categoryId: string;
    athletes: AthleteTrafficLightItem[];
    error: string | null;
  } | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, Partial<AthleteTrafficLightItem>>
  >({});

  // Asistencia automática del día (KAN-445)
  const [attendanceResult, setAttendanceResult] = useState<{
    categoryId: string;
    summary: CategoryAttendanceSummary | null;
    error: string | null;
  } | null>(null);
  const [attendanceOverrides, setAttendanceOverrides] = useState<
    Record<string, 'Present' | 'NoRecord'>
  >({});

  const attendanceLoading =
    selectedCategoryId !== '' &&
    (attendanceResult === null || attendanceResult.categoryId !== selectedCategoryId);

  useEffect(() => {
    if (!selectedCategoryId) return;
    let active = true;

    getCategoryTrafficLightToday(selectedCategoryId)
      .then((summaries) => {
        if (!active) return;
        setAthletesResult({
          categoryId: selectedCategoryId,
          athletes: summaries.map((summary) =>
            mapTrafficLightSummaryToItem(summary, selectedCategoryName),
          ),
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAthletesResult({
          categoryId: selectedCategoryId,
          athletes: [],
          error: err instanceof Error ? err.message : 'No se pudo consultar el semáforo del día.',
        });
      });

    return () => {
      active = false;
    };
  }, [selectedCategoryId, selectedCategoryName]);

  const refreshAttendance = () => {
    if (!selectedCategoryId) return;
    getCategoryAttendanceToday(selectedCategoryId)
      .then((summary) => {
        setAttendanceResult({ categoryId: selectedCategoryId, summary, error: null });
      })
      .catch((err: unknown) => {
        setAttendanceResult({
          categoryId: selectedCategoryId,
          summary: null,
          error: err instanceof Error ? err.message : 'No se pudo consultar la asistencia.',
        });
      });
  };

  // Carga de asistencia del día cuando cambia la categoría o se abre la pestaña
  useEffect(() => {
    if (!selectedCategoryId || activeTab !== 'attendance') return;
    let active = true;
    getCategoryAttendanceToday(selectedCategoryId)
      .then((summary) => {
        if (!active) return;
        setAttendanceResult({ categoryId: selectedCategoryId, summary, error: null });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAttendanceResult({
          categoryId: selectedCategoryId,
          summary: null,
          error: err instanceof Error ? err.message : 'No se pudo consultar la asistencia.',
        });
      });
    return () => {
      active = false;
    };
  }, [selectedCategoryId, activeTab]);

  const athletesLoading =
    selectedCategoryId !== '' &&
    (athletesResult === null || athletesResult.categoryId !== selectedCategoryId);
  const currentResult = athletesResult?.categoryId === selectedCategoryId ? athletesResult : null;
  const athletes = useMemo(
    () =>
      (currentResult?.athletes ?? [])
        .map((athlete) =>
          statusOverrides[athlete.id] ? { ...athlete, ...statusOverrides[athlete.id] } : athlete,
        )
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [currentResult, statusOverrides],
  );
  const athletesError = currentResult?.error ?? null;

  // KAN-366: modo degradado — si Estructura no responde, los nombres de atleta
  // llegan vacíos y el mapper los reemplaza por ATHLETE_NAME_FALLBACK.
  const hasDegradedAthletes = athletes.some((athlete) => athlete.name === ATHLETE_NAME_FALLBACK);

  // Contadores de los chips segmentados por color (KAN-366). Colores vía
  // tokens (--traffic-*, --white, --chip-*-count-bg) con soporte claro/oscuro;
  // cero literales rgba/hex (validado con grep y stylelint).
  const counts = useMemo(() => {
    return {
      all: athletes.length,
      red: athletes.filter((a) => a.status === 'red').length,
      yellow: athletes.filter((a) => a.status === 'yellow').length,
      green: athletes.filter((a) => a.status === 'green').length,
      gray: athletes.filter((a) => a.status === 'gray').length,
    };
  }, [athletes]);

  // Reactive real-time filtering
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      // Color status filter
      if (colorFilter !== 'all' && a.status !== colorFilter) return false;

      // Text query filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          a.name.toLowerCase().includes(query) ||
          a.position.toLowerCase().includes(query) ||
          (a.notes && a.notes.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [athletes, colorFilter, searchTerm]);

  // Assign differentiated training regimen directly from quick sheet
  const handleAssignDifferentiated = (athleteId: string) => {
    setStatusOverrides((prev) => ({
      ...prev,
      [athleteId]: {
        status: 'yellow',
        statusLabel: 'Precaución',
        recommendation: 'Asignado a plan de rehabilitación y descarga muscular.',
      },
    }));
  };

  return (
    <div className="app-page-container">
      {/* Encabezado Principal */}
      <PageHeader
        title="Seguimiento & Semáforo del Día"
        description="Evaluación de readiness antes de la práctica, niveles de riesgo muscular y asistencia del plantel."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className={`btn ${activeTab === 'traffic-light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('traffic-light')}
              style={{
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Activity size={15} />
              <span>Semáforo del Día</span>
            </button>
            <button
              type="button"
              className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('attendance')}
              style={{
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Users size={15} />
              <span>Asistencia & RPE</span>
            </button>
          </div>
        }
      />

      <div
        className="app-page-body"
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Category and Search Bar */}
        <div
          className="card"
          style={{
            margin: 0,
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
          }}
        >
          {/* Division / Category Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <label
              htmlFor="category-select"
              style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}
            >
              Plantel:
            </label>
            <select
              id="category-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={categoriesLoading || categories.length === 0}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {categories.length === 0 && <option value="">Sin plantel disponible</option>}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name?.trim() || CATEGORY_NAME_FALLBACK}
                </option>
              ))}
            </select>
            {categoriesError && (
              <span style={{ fontSize: '0.78rem', color: 'var(--pain-level-5)' }}>
                {categoriesError}
              </span>
            )}
          </div>

          {/* Athlete Search Input */}
          <div
            style={{
              position: 'relative',
              maxWidth: '320px',
              width: '100%',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Buscar atleta por nombre o posición..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                borderRadius: '9999px',
                border: '1px solid var(--border)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
              }}
            />
          </div>
        </div>

        {activeTab === 'traffic-light' ? (
          <>
            {/* Segmented Color Filter Chips (KAN-366 Criterion 3) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.25rem',
              }}
              role="tablist"
              aria-label="Filtro de atletas por color del semáforo"
            >
              {/* All */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'all' ? 'active' : ''}`}
                onClick={() => setColorFilter('all')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  border: '1px solid var(--border)',
                  background: colorFilter === 'all' ? 'var(--primary)' : 'var(--bg-card)',
                  color: colorFilter === 'all' ? 'var(--on-primary)' : 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                <span>Todos</span>
                <span
                  style={{
                    background:
                      colorFilter === 'all' ? 'var(--chip-primary-count-bg)' : 'var(--bg-subtle)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                  }}
                >
                  {counts.all}
                </span>
              </button>

              {/* Red - Critical Attention */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'red' ? 'active' : ''}`}
                onClick={() => setColorFilter('red')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: `1px solid ${colorFilter === 'red' ? 'var(--traffic-red)' : 'var(--traffic-red-border)'}`,
                  background:
                    colorFilter === 'red' ? 'var(--traffic-red)' : 'var(--traffic-red-bg)',
                  color: colorFilter === 'red' ? 'var(--white)' : 'var(--traffic-red-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'red' ? 'var(--white)' : 'var(--traffic-red)',
                  }}
                />
                <span>Atención Crítica</span>
                <span
                  style={{
                    background:
                      colorFilter === 'red' ? 'var(--chip-active-count-bg)' : 'var(--bg-card)',
                    color: colorFilter === 'red' ? 'var(--white)' : 'var(--traffic-red-text)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {counts.red}
                </span>
              </button>

              {/* Yellow - Caution */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'yellow' ? 'active' : ''}`}
                onClick={() => setColorFilter('yellow')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: `1px solid ${colorFilter === 'yellow' ? 'var(--traffic-yellow)' : 'var(--traffic-yellow-border)'}`,
                  background:
                    colorFilter === 'yellow' ? 'var(--traffic-yellow)' : 'var(--traffic-yellow-bg)',
                  color: colorFilter === 'yellow' ? 'var(--white)' : 'var(--traffic-yellow-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'yellow' ? 'var(--white)' : 'var(--traffic-yellow)',
                  }}
                />
                <span>Precaución</span>
                <span
                  style={{
                    background:
                      colorFilter === 'yellow' ? 'var(--chip-active-count-bg)' : 'var(--bg-card)',
                    color: colorFilter === 'yellow' ? 'var(--white)' : 'var(--traffic-yellow-text)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {counts.yellow}
                </span>
              </button>

              {/* Green - Optimal */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'green' ? 'active' : ''}`}
                onClick={() => setColorFilter('green')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: `1px solid ${colorFilter === 'green' ? 'var(--traffic-green)' : 'var(--traffic-green-border)'}`,
                  background:
                    colorFilter === 'green' ? 'var(--traffic-green)' : 'var(--traffic-green-bg)',
                  color: colorFilter === 'green' ? 'var(--white)' : 'var(--traffic-green-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'green' ? 'var(--white)' : 'var(--traffic-green)',
                  }}
                />
                <span>Óptimos</span>
                <span
                  style={{
                    background:
                      colorFilter === 'green' ? 'var(--chip-active-count-bg)' : 'var(--bg-card)',
                    color: colorFilter === 'green' ? 'var(--white)' : 'var(--traffic-green-text)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {counts.green}
                </span>
              </button>

              {/* Gray - Pending Check-in */}
              <button
                type="button"
                className={`touch-chip ${colorFilter === 'gray' ? 'active' : ''}`}
                onClick={() => setColorFilter('gray')}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.8rem',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  border: `1px solid ${colorFilter === 'gray' ? 'var(--traffic-gray)' : 'var(--traffic-gray-border)'}`,
                  background:
                    colorFilter === 'gray' ? 'var(--traffic-gray)' : 'var(--traffic-gray-bg)',
                  color: colorFilter === 'gray' ? 'var(--white)' : 'var(--traffic-gray-text)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colorFilter === 'gray' ? 'var(--white)' : 'var(--traffic-gray)',
                  }}
                />
                <span>Sin Check-in</span>
                <span
                  style={{
                    background:
                      colorFilter === 'gray' ? 'var(--chip-active-count-bg)' : 'var(--bg-card)',
                    color: colorFilter === 'gray' ? 'var(--white)' : 'var(--traffic-gray-text)',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                  }}
                >
                  {counts.gray}
                </span>
              </button>
            </div>

            {/* KAN-366: aviso de modo degradado cuando Estructura no respondió
                y algún atleta llegó sin nombre (ATHLETE_NAME_FALLBACK). */}
            {hasDegradedAthletes && !athletesLoading && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '12px',
                  background: 'var(--warning-bg-strong)',
                  border: '1px solid var(--warning-border)',
                  color: 'var(--warning-text)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  lineHeight: 1.4,
                }}
              >
                <AlertTriangle
                  size={17}
                  style={{ flexShrink: 0, marginTop: '1px' }}
                  aria-hidden="true"
                />
                <span>
                  No se pudo cargar la lista completa de la categoría. Se muestran solo los atletas
                  que ya hicieron el check-in hoy.
                </span>
              </div>
            )}

            {/* Grilla de tarjetas del semáforo (KAN-365/KAN-366): datos reales
                del endpoint traffic-light-today; sin trafficLightData.ts. */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1rem',
                alignItems: 'stretch',
              }}
            >
              {filteredAthletes.map((athlete) => (
                <AthleteTrafficLightCard
                  key={athlete.id}
                  athlete={athlete}
                  onClick={() => setSelectedAthlete(athlete)}
                />
              ))}

              {athletesLoading && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px dashed var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Loader2
                    size={24}
                    style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}
                  />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Consultando el semáforo del día…</p>
                </div>
              )}

              {!athletesLoading && (athletesError || categoriesError) && (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    padding: '3rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--traffic-red-bg)',
                    borderRadius: '16px',
                    border: '1px solid var(--traffic-red-border)',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--traffic-red-text)' }}>
                    {athletesError || categoriesError}
                  </p>
                </div>
              )}

              {!athletesLoading &&
                !athletesError &&
                !categoriesError &&
                filteredAthletes.length === 0 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      padding: '3rem 1.5rem',
                      textAlign: 'center',
                      background: 'var(--bg-card)',
                      borderRadius: '16px',
                      border: '1px dashed var(--border)',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {selectedCategoryId
                        ? 'No se encontraron atletas con los filtros seleccionados.'
                        : 'Selecciona un plantel para ver el semáforo del día.'}
                    </p>
                  </div>
                )}
            </div>

            {/* Accessible Quick Sheet (Bottom Sheet on Mobile, Modal on Desktop) */}
            <AthleteQuickSheet
              athlete={selectedAthlete}
              onClose={() => setSelectedAthlete(null)}
              onAssignDifferentiated={handleAssignDifferentiated}
            />
          </>
        ) : (
          /* Asistencia automática del día (KAN-445) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {attendanceLoading && (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--bg-card)',
                  borderRadius: '16px',
                  border: '1px dashed var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                <Loader2
                  size={24}
                  style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }}
                />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Consultando la asistencia del día…</p>
              </div>
            )}

            {!attendanceLoading && attendanceResult?.error && (
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--traffic-red-bg)',
                  border: '1px solid var(--traffic-red-border)',
                  borderRadius: '12px',
                  color: 'var(--traffic-red-text)',
                  fontSize: '0.85rem',
                }}
              >
                {attendanceResult.error}
              </div>
            )}

            {!attendanceLoading && attendanceResult?.summary && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem 1.25rem',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                  }}
                >
                  <Users size={20} style={{ color: 'var(--primary)' }} />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                    Planilla de Asistencia Diaria
                  </strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {attendanceResult.summary.presentCount} / {attendanceResult.summary.totalRoster}{' '}
                    presentes ({attendanceResult.summary.attendancePercentage.toFixed(1)}%)
                  </span>
                  <button
                    type="button"
                    onClick={refreshAttendance}
                    style={{
                      marginLeft: 'auto',
                      padding: '0.3rem 0.7rem',
                      borderRadius: '9999px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Actualizar
                  </button>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  La asistencia se marca cuando el atleta registra la carga del día (minutos + RPE).
                  El check-in de bienestar no la marca.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {(attendanceResult.summary.athletes ?? []).map((athlete) => {
                    const status = attendanceOverrides[athlete.athleteId] ?? athlete.status;
                    const isPresent = status === 'Present';
                    return (
                      <div
                        key={athlete.athleteId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.85rem 1rem',
                          background: 'var(--bg-card)',
                          borderRadius: '12px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              color: 'var(--text-main)',
                            }}
                          >
                            {athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                          </span>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: isPresent
                                ? 'var(--traffic-green-text)'
                                : 'var(--traffic-gray-text)',
                            }}
                          >
                            {isPresent ? 'Presente' : 'Sin registro'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const next = isPresent ? 'NoRecord' : 'Present';
                            setAttendanceOverrides((prev) => ({
                              ...prev,
                              [athlete.athleteId]: next,
                            }));
                            try {
                              await setAttendance(athlete.athleteId, next === 'Present');
                            } catch {
                              setAttendanceOverrides((prev) => ({
                                ...prev,
                                [athlete.athleteId]: status,
                              }));
                            }
                          }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '9999px',
                            border: '1px solid var(--border)',
                            background: isPresent ? 'var(--traffic-green-bg)' : 'var(--bg-subtle)',
                            color: isPresent ? 'var(--traffic-green-text)' : 'var(--text-main)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {isPresent ? 'Marcar sin registro' : 'Marcar presente'}
                        </button>
                      </div>
                    );
                  })}

                  {!attendanceLoading &&
                    !attendanceResult?.error &&
                    (attendanceResult?.summary?.athletes?.length ?? 0) === 0 && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          padding: '2rem',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-card)',
                          borderRadius: '16px',
                          border: '1px dashed var(--border)',
                        }}
                      >
                        No hay atletas para mostrar.
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

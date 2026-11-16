import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Activity, AlertTriangle, Dumbbell, Loader2, Search, Trophy, Users } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { AthleteTrafficLightCard } from '../../components/monitoring/AthleteTrafficLightCard';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import { DayAdjustmentModal } from '../../components/monitoring/DayAdjustmentModal';
import { dayAdjustmentsService } from '../../api/dayAdjustments';
import {
  AthleteTrafficLightItem,
  TrafficLightStatus,
} from '../../components/monitoring/trafficLight.types';
import { structureService } from '../../api/structureService';
import { usersService } from '../../api/users';
import { ProfileAvatar } from '../../components/common/ProfileAvatar';
import {
  ATHLETE_NAME_FALLBACK,
  CATEGORY_NAME_FALLBACK,
  getCategoryTrafficLightToday,
  getCategoryAttendanceToday,
  setAttendance,
  type CategoryAttendanceSummary,
  mapTrafficLightSummaryToItem,
} from '../../api/seguimientoService';
import { Athlete, Category } from '../../types/structure';

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
  const [adjustmentAthlete, setAdjustmentAthlete] = useState<AthleteTrafficLightItem | null>(null);

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
  const [categoryAthletes, setCategoryAthletes] = useState<Athlete[]>([]);

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

    const getPhotoUrl = (id: string, updatedAt?: string | null) =>
      typeof structureService?.getAthletePhotoUrl === 'function'
        ? structureService.getAthletePhotoUrl(id, updatedAt)
        : `/api/estructura/api/v1/athletes/${id}/photo${updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : ''}`;

    const athletesPromise =
      typeof structureService?.getAthletes === 'function'
        ? structureService
            .getAthletes({ categoriaId: selectedCategoryId })
            .catch(() => [] as Athlete[])
        : Promise.resolve([] as Athlete[]);

    Promise.all([getCategoryTrafficLightToday(selectedCategoryId), athletesPromise])
      .then(async ([summaries, fetchedAthletes]) => {
        if (!active) return;
        setCategoryAthletes(fetchedAthletes);
        const athleteMap = new Map(fetchedAthletes.map((a) => [a.id.toLowerCase(), a]));

        const mapped = summaries.map((summary) => {
          const summaryId = summary.athleteId?.toLowerCase();
          const detail = athleteMap.get(summaryId);
          const photoUrl = detail
            ? detail.hasPhoto
              ? getPhotoUrl(detail.id, detail.photoUpdatedAt)
              : detail.accountId
                ? usersService.getMyPhotoUrl(detail.accountId)
                : undefined
            : getPhotoUrl(summary.athleteId);

          const item = mapTrafficLightSummaryToItem(summary, selectedCategoryName);
          return {
            ...item,
            position: item.position,
            avatarUrl: photoUrl,
          };
        });

        // Para atletas con dolor/observación hoy, chequear conflictos en segundo plano
        // para habilitar el botón "Ver ajuste sugerido" (#157 · KAN-452)
        const athletesWithConflicts = await Promise.all(
          mapped.map(async (athlete) => {
            if (athlete.pains && athlete.pains.length > 0) {
              try {
                const conf = await dayAdjustmentsService.getAthleteDayConflicts(athlete.id);
                return { ...athlete, hasDayConflict: Boolean(conf.hasConflicts) };
              } catch {
                return athlete;
              }
            }
            return athlete;
          }),
        );

        if (!active) return;
        setAthletesResult({
          categoryId: selectedCategoryId,
          athletes: athletesWithConflicts,
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
    Promise.all([
      getCategoryAttendanceToday(selectedCategoryId),
      categoryAthletes.length > 0
        ? Promise.resolve(categoryAthletes)
        : structureService
            .getAthletes({ categoriaId: selectedCategoryId })
            .catch(() => [] as Athlete[]),
    ])
      .then(([summary, athletesData]) => {
        if (athletesData.length > 0) setCategoryAthletes(athletesData);
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
    Promise.all([
      getCategoryAttendanceToday(selectedCategoryId),
      structureService
        .getAthletes({ categoriaId: selectedCategoryId })
        .catch(() => [] as Athlete[]),
    ])
      .then(([summary, athletesData]) => {
        if (!active) return;
        if (athletesData.length > 0) setCategoryAthletes(athletesData);
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
              <span style={{ fontSize: '0.78rem', color: 'var(--danger-text)' }}>
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
              role="group"
              aria-label="Filtro de atletas por color del semáforo"
            >
              {/* All */}
              <button
                type="button"
                aria-pressed={colorFilter === 'all'}
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
                aria-pressed={colorFilter === 'red'}
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
                aria-pressed={colorFilter === 'yellow'}
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
                aria-pressed={colorFilter === 'green'}
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
                aria-pressed={colorFilter === 'gray'}
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
                  onOpenAdjustment={(ath) => setAdjustmentAthlete(ath)}
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
                        ? 'No hay atletas con los filtros elegidos.'
                        : categories.length === 0
                          ? 'Todavía no tenés planteles. Creá una categoría desde Organizaciones para ver el semáforo.'
                          : 'Elegí un plantel para ver el semáforo del día.'}
                    </p>
                  </div>
                )}
            </div>

            {/* Accessible Quick Sheet (Bottom Sheet on Mobile, Modal on Desktop) */}
            <AthleteQuickSheet
              athlete={selectedAthlete}
              onClose={() => setSelectedAthlete(null)}
              onAssignDifferentiated={handleAssignDifferentiated}
              onOpenAdjustment={(ath) => setAdjustmentAthlete(ath)}
            />

            {/* Modal de Propuesta de Ajuste del Día (#157 · KAN-452) */}
            {adjustmentAthlete && (
              <DayAdjustmentModal
                athleteId={adjustmentAthlete.id}
                athleteName={adjustmentAthlete.name}
                isOpen={Boolean(adjustmentAthlete)}
                onClose={() => setAdjustmentAthlete(null)}
                onAdjustmentApplied={(adjustment) => {
                  if (adjustment.status === 'Approved') {
                    setStatusOverrides((prev) => ({
                      ...prev,
                      [adjustment.athleteId]: {
                        hasDayConflict: false,
                        recommendation: `Ajuste del día aprobado: ${adjustment.justification}`,
                      },
                    }));
                  }
                }}
              />
            )}
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
                    presentes ({(attendanceResult.summary.attendancePercentage ?? 0).toFixed(1)}%)
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
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {(attendanceResult.summary.athletes ?? []).map((athlete) => {
                    const status = attendanceOverrides[athlete.athleteId] ?? athlete.status;
                    const isPresent = status === 'Present';
                    const detail = categoryAthletes.find(
                      (a) => a.id.toLowerCase() === athlete.athleteId.toLowerCase(),
                    );
                    const photoUrl = detail?.hasPhoto
                      ? structureService.getAthletePhotoUrl(detail.id, detail.photoUpdatedAt)
                      : detail?.accountId
                        ? usersService.getMyPhotoUrl(detail.accountId)
                        : undefined;

                    const totalMinutes = athlete.totalMinutes ?? 0;
                    const totalLoad = athlete.totalLoad ?? 0;
                    const hasLoadData =
                      totalMinutes > 0 ||
                      totalLoad > 0 ||
                      (athlete.activities && athlete.activities.length > 0);

                    return (
                      <div
                        key={athlete.athleteId}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem',
                          padding: '1rem 1.15rem',
                          background: 'var(--bg-card)',
                          borderRadius: '16px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {/* Cabecera: Avatar del atleta (sin aro de color de semáforo), Nombre, Estado y Botón */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <ProfileAvatar
                              src={photoUrl}
                              name={athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                              size={42}
                              shape="circle"
                              alt={`Foto de perfil de ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.92rem',
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
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  marginTop: '0.15rem',
                                }}
                              >
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: isPresent
                                      ? 'var(--traffic-green)'
                                      : 'var(--traffic-gray)',
                                  }}
                                />
                                {isPresent ? 'Presente' : 'Sin registro'}
                              </span>
                            </div>
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
                              background: isPresent
                                ? 'var(--traffic-green-bg)'
                                : 'var(--bg-subtle)',
                              color: isPresent ? 'var(--traffic-green-text)' : 'var(--text-main)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {isPresent ? 'Marcar sin registro' : 'Marcar presente'}
                          </button>
                        </div>

                        {/* Desglose de Carga del Día (con colores y cantidad de la primera imagen) */}
                        {hasLoadData ? (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                              padding: '0.65rem 0.85rem',
                              background: 'var(--bg-subtle)',
                              borderRadius: '12px',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-around',
                                textAlign: 'center',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    color: 'var(--primary)',
                                    lineHeight: 1.1,
                                  }}
                                >
                                  {totalMinutes}{' '}
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>min</span>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginTop: '0.15rem',
                                  }}
                                >
                                  Tiempo Total
                                </div>
                              </div>

                              <div
                                style={{
                                  width: '1px',
                                  height: '24px',
                                  background: 'var(--border)',
                                }}
                              />

                              <div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    fontSize: '1.15rem',
                                    color: 'var(--primary)',
                                    lineHeight: 1.1,
                                  }}
                                >
                                  {totalLoad}{' '}
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>UA</span>
                                </div>
                                <div
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginTop: '0.15rem',
                                  }}
                                >
                                  Carga Acumulada
                                </div>
                              </div>
                            </div>

                            {/* Barra de progreso de carga horizontal (colores verde a azul/dorado como la primera imagen) */}
                            <div
                              style={{
                                width: '100%',
                                height: '6px',
                                background: 'var(--border)',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                                marginTop: '0.2rem',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(15, (totalMinutes / 90) * 100))}%`,
                                  height: '100%',
                                  background:
                                    'linear-gradient(90deg, #10b981 0%, #0284c7 50%, #f59e0b 100%)',
                                  borderRadius: '9999px',
                                }}
                              />
                            </div>

                            {/* Chips con actividades registradas */}
                            {athlete.activities && athlete.activities.length > 0 && (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '0.35rem',
                                  marginTop: '0.3rem',
                                }}
                              >
                                {athlete.activities.map((act, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '6px',
                                      background: 'var(--primary-light)',
                                      color: 'var(--secondary)',
                                      border: '1px solid rgba(2, 48, 80, 0.15)',
                                    }}
                                  >
                                    {act.type === 'Gym' && (
                                      <Dumbbell size={12} aria-hidden="true" />
                                    )}
                                    {act.type === 'SportTraining' && (
                                      <Activity size={12} aria-hidden="true" />
                                    )}
                                    {(act.type === 'Match1' || act.type === 'Match2') && (
                                      <Trophy size={12} aria-hidden="true" />
                                    )}
                                    {act.type === 'IndividualWork' && (
                                      <Users size={12} aria-hidden="true" />
                                    )}
                                    <span>
                                      {act.name}: <strong>{act.minutes}m</strong>
                                      {act.rpe !== null && act.rpe !== undefined
                                        ? ` RPE ${act.rpe}`
                                        : ''}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--text-muted)',
                              fontStyle: 'italic',
                              padding: '0.2rem 0',
                            }}
                          >
                            Sin carga registrada hoy (minutos y RPE pendientes).
                          </div>
                        )}
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

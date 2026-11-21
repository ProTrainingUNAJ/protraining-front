import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Activity, AlertTriangle, Check, Loader2, Pencil, Plus, Search, Users } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { AthleteTrafficLightCard } from '../../components/monitoring/AthleteTrafficLightCard';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import { AthleteContactActions } from '../../components/monitoring/AthleteContactActions';
import { AthleteAvatar } from '../../components/monitoring/AthleteAvatar';
import { DayAdjustmentModal } from '../../components/monitoring/DayAdjustmentModal';
import { AttendanceLoadModal } from '../../components/attendance/AttendanceLoadModal';
import { dayAdjustmentsService } from '../../api/dayAdjustments';
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

function resolveAthleteContactFields(detail?: Athlete) {
  const isMinor = Boolean(detail?.isMinor);
  return {
    phone: isMinor ? null : (detail?.phone ?? null),
    telegramUsername: isMinor ? null : (detail?.telegramUsername ?? null),
    isMinor,
    guardianPhone: detail?.guardianConsent?.guardianPhone ?? null,
    guardianName: detail?.guardianConsent?.guardianName ?? null,
  };
}

export const MonitoringPage: React.FC = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derivar la pestaña activa directamente de URL search params o navigation state (KAN-621)
  const tabParam = searchParams.get('tab');
  const stateTab = (location.state as { tab?: 'traffic-light' | 'attendance' })?.tab;
  const activeTab: 'traffic-light' | 'attendance' =
    tabParam === 'attendance' || stateTab === 'attendance' ? 'attendance' : 'traffic-light';

  const handleTabChange = (tab: 'traffic-light' | 'attendance') => {
    setSearchParams(
      (prev: URLSearchParams) => {
        const next = new URLSearchParams(prev);
        if (tab === 'attendance') {
          next.set('tab', 'attendance');
        } else {
          next.delete('tab');
        }
        return next;
      },
      { replace: true },
    );
  };

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
  const [quickSheetMode, setQuickSheetMode] = useState<'semaforo' | 'asistencia'>('semaforo');
  const [selectedAthleteAttendance, setSelectedAthleteAttendance] = useState<{
    totalMinutes?: number;
    totalLoad?: number;
    activities?: Array<{
      type: string;
      name: string;
      minutes: number;
      rpe?: number | null;
    }>;
  } | null>(null);
  const [adjustmentAthlete, setAdjustmentAthlete] = useState<AthleteTrafficLightItem | null>(null);
  const [loadModalAthlete, setLoadModalAthlete] = useState<{
    id: string;
    name: string;
    activities?: Array<{
      type: string;
      name: string;
      minutes: number;
      rpe?: number | null;
    }>;
  } | null>(null);

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
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');

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
          const photoUrl =
            detail && detail.hasPhoto ? getPhotoUrl(detail.id, detail.photoUpdatedAt) : undefined;

          const item = mapTrafficLightSummaryToItem(summary, selectedCategoryName);
          return {
            ...item,
            position: item.position,
            avatarUrl: photoUrl,
            ...resolveAthleteContactFields(detail),
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

  const refreshTrafficLight = () => {
    if (!selectedCategoryId) return;
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
        setCategoryAthletes(fetchedAthletes);
        const athleteMap = new Map(fetchedAthletes.map((a) => [a.id.toLowerCase(), a]));

        const mapped = summaries.map((summary) => {
          const summaryId = summary.athleteId?.toLowerCase();
          const detail = athleteMap.get(summaryId);
          const photoUrl =
            detail && detail.hasPhoto ? getPhotoUrl(detail.id, detail.photoUpdatedAt) : undefined;

          const item = mapTrafficLightSummaryToItem(summary, selectedCategoryName);
          return {
            ...item,
            position: item.position,
            avatarUrl: photoUrl,
            ...resolveAthleteContactFields(detail),
          };
        });

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

        setAthletesResult({
          categoryId: selectedCategoryId,
          athletes: athletesWithConflicts,
          error: null,
        });
      })
      .catch((err: unknown) => {
        setAthletesResult({
          categoryId: selectedCategoryId,
          athletes: [],
          error: err instanceof Error ? err.message : 'No se pudo consultar el semáforo del día.',
        });
      });
  };

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

  // Carga de asistencia del día cuando cambia la categoría (disponible para Semáforo y Asistencia)
  useEffect(() => {
    if (!selectedCategoryId) return;
    let active = true;

    const athletesPromise =
      typeof structureService?.getAthletes === 'function'
        ? structureService
            .getAthletes({ categoriaId: selectedCategoryId })
            .catch(() => [] as Athlete[])
        : Promise.resolve([] as Athlete[]);

    const attendancePromise =
      typeof getCategoryAttendanceToday === 'function'
        ? getCategoryAttendanceToday(selectedCategoryId).catch(() => null)
        : Promise.resolve(null);

    Promise.all([attendancePromise, athletesPromise])
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
  }, [selectedCategoryId]);

  const handleToggleAttendance = async (athleteId: string, nextPresent: boolean) => {
    const nextStatus = nextPresent ? 'Present' : 'NoRecord';
    const currentStatus =
      attendanceOverrides[athleteId] ??
      attendanceResult?.summary?.athletes?.find(
        (r) => r.athleteId.toLowerCase() === athleteId.toLowerCase(),
      )?.status ??
      'NoRecord';

    setAttendanceOverrides((prev) => ({
      ...prev,
      [athleteId]: nextStatus,
    }));

    try {
      await setAttendance(athleteId, nextPresent);
    } catch {
      setAttendanceOverrides((prev) => ({
        ...prev,
        [athleteId]: currentStatus,
      }));
    }
  };

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

  // Contadores reactivos para la pestaña de asistencia
  const attendanceCounts = useMemo(() => {
    const list = attendanceResult?.summary?.athletes ?? [];
    let present = 0;
    let absent = 0;
    list.forEach((ath) => {
      const status = attendanceOverrides[ath.athleteId] ?? ath.status;
      if (status === 'Present') {
        present++;
      } else {
        absent++;
      }
    });
    return {
      all: list.length,
      present,
      absent,
    };
  }, [attendanceResult, attendanceOverrides]);

  // Lista filtrada de atletas para la pestaña de asistencia (filtro de presencia y búsqueda)
  const filteredAttendanceAthletes = useMemo(() => {
    const list = attendanceResult?.summary?.athletes ?? [];
    return list.filter((ath) => {
      const status = attendanceOverrides[ath.athleteId] ?? ath.status;
      const isPresent = status === 'Present';
      if (attendanceFilter === 'present' && !isPresent) return false;
      if (attendanceFilter === 'absent' && isPresent) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const name = (ath.athleteName ?? '').toLowerCase();
        return name.includes(query);
      }
      return true;
    });
  }, [attendanceResult, attendanceOverrides, attendanceFilter, searchTerm]);

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
              onClick={() => handleTabChange('traffic-light')}
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
              onClick={() => handleTabChange('attendance')}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* Barra de Resumen del Semáforo y Bienestar Diario (KAN-621) */}
            <div
              style={{
                minHeight: '52px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.85rem 1.25rem',
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                flexWrap: 'wrap',
                boxSizing: 'border-box',
              }}
            >
              <Activity size={20} style={{ color: 'var(--primary)' }} />
              <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                Semáforo de Readiness y Bienestar Diario
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {counts.all - counts.gray} / {counts.all} check-ins completados (
                {(counts.all > 0 ? ((counts.all - counts.gray) / counts.all) * 100 : 0).toFixed(1)}
                %)
              </span>
              <button
                type="button"
                data-testid="refresh-traffic-light-btn"
                onClick={refreshTrafficLight}
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
            <p
              style={{
                margin: 0,
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                minHeight: '1.25rem',
              }}
            >
              El semáforo evalúa el readiness diario del atleta a través del check-in matutino de
              bienestar, dolor muscular y presencia de lesiones.
            </p>

            {/* Segmented Color Filter Chips (KAN-366 Criterion 3) */}
            <div
              style={{
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
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

            {/* Grilla de tarjetas del semáforo (KAN-365/KAN-366/KAN-639): alineación simétrica y altura uniforme */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                gap: '1rem',
                alignItems: 'stretch',
              }}
            >
              {filteredAthletes.map((athlete) => {
                const attendanceItem = attendanceResult?.summary?.athletes?.find(
                  (r) => r.athleteId.toLowerCase() === athlete.id.toLowerCase(),
                );

                return (
                  <AthleteTrafficLightCard
                    key={athlete.id}
                    athlete={athlete}
                    onClick={() => {
                      setQuickSheetMode('semaforo');
                      setSelectedAthleteAttendance(null);
                      setSelectedAthlete({
                        ...athlete,
                        activities: attendanceItem?.activities ?? athlete.activities,
                        totalMinutes: attendanceItem?.totalMinutes ?? athlete.totalMinutes,
                        totalLoad: attendanceItem?.totalLoad ?? athlete.totalLoad,
                      });
                    }}
                    onOpenAdjustment={(ath) => setAdjustmentAthlete(ath)}
                  />
                );
              })}

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
          </div>
        ) : (
          /* Asistencia automática del día (KAN-445) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                    minHeight: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.85rem 1.25rem',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    boxSizing: 'border-box',
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
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    lineHeight: 1.4,
                    minHeight: '1.25rem',
                  }}
                >
                  La asistencia se marca cuando el atleta registra la carga del día (minutos + RPE).
                  El check-in de bienestar no la marca.
                </p>

                {/* Pills de Filtro Reactivo de Asistencia (guiado por el diseño de semáforo) */}
                <div
                  style={{
                    minHeight: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                  role="group"
                  aria-label="Filtro de atletas por asistencia"
                >
                  {/* Todos */}
                  <button
                    type="button"
                    data-testid="filter-attendance-all"
                    aria-pressed={attendanceFilter === 'all'}
                    className={`touch-chip ${attendanceFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setAttendanceFilter('all')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: `1px solid ${attendanceFilter === 'all' ? 'var(--primary)' : 'var(--border)'}`,
                      background: attendanceFilter === 'all' ? 'var(--primary)' : 'var(--bg-card)',
                      color: attendanceFilter === 'all' ? 'var(--white)' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Todos</span>
                    <span
                      style={{
                        background:
                          attendanceFilter === 'all'
                            ? 'var(--chip-active-count-bg)'
                            : 'var(--bg-subtle)',
                        color: attendanceFilter === 'all' ? 'var(--white)' : 'var(--text-muted)',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {attendanceCounts.all}
                    </span>
                  </button>

                  {/* Presentes */}
                  <button
                    type="button"
                    data-testid="filter-attendance-present"
                    aria-pressed={attendanceFilter === 'present'}
                    className={`touch-chip ${attendanceFilter === 'present' ? 'active' : ''}`}
                    onClick={() => setAttendanceFilter('present')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: `1px solid ${attendanceFilter === 'present' ? 'var(--traffic-green)' : 'var(--traffic-green-border)'}`,
                      background:
                        attendanceFilter === 'present'
                          ? 'var(--traffic-green)'
                          : 'var(--traffic-green-bg)',
                      color:
                        attendanceFilter === 'present'
                          ? 'var(--white)'
                          : 'var(--traffic-green-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background:
                          attendanceFilter === 'present' ? 'var(--white)' : 'var(--traffic-green)',
                      }}
                    />
                    <span>Presentes</span>
                    <span
                      style={{
                        background:
                          attendanceFilter === 'present'
                            ? 'var(--chip-active-count-bg)'
                            : 'var(--bg-card)',
                        color:
                          attendanceFilter === 'present'
                            ? 'var(--white)'
                            : 'var(--traffic-green-text)',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {attendanceCounts.present}
                    </span>
                  </button>

                  {/* Sin registro */}
                  <button
                    type="button"
                    data-testid="filter-attendance-absent"
                    aria-pressed={attendanceFilter === 'absent'}
                    className={`touch-chip ${attendanceFilter === 'absent' ? 'active' : ''}`}
                    onClick={() => setAttendanceFilter('absent')}
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      border: `1px solid ${attendanceFilter === 'absent' ? 'var(--traffic-gray)' : 'var(--traffic-gray-border)'}`,
                      background:
                        attendanceFilter === 'absent'
                          ? 'var(--traffic-gray)'
                          : 'var(--traffic-gray-bg)',
                      color:
                        attendanceFilter === 'absent' ? 'var(--white)' : 'var(--traffic-gray-text)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background:
                          attendanceFilter === 'absent' ? 'var(--white)' : 'var(--traffic-gray)',
                      }}
                    />
                    <span>Sin registro</span>
                    <span
                      style={{
                        background:
                          attendanceFilter === 'absent'
                            ? 'var(--chip-active-count-bg)'
                            : 'var(--bg-card)',
                        color:
                          attendanceFilter === 'absent'
                            ? 'var(--white)'
                            : 'var(--traffic-gray-text)',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {attendanceCounts.absent}
                    </span>
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '1rem',
                    alignItems: 'stretch',
                  }}
                >
                  {filteredAttendanceAthletes.map((athlete) => {
                    const status = attendanceOverrides[athlete.athleteId] ?? athlete.status;
                    const isPresent = status === 'Present';
                    const detail = categoryAthletes.find(
                      (a) => a.id.toLowerCase() === athlete.athleteId.toLowerCase(),
                    );
                    const photoUrl =
                      detail && detail.hasPhoto
                        ? structureService.getAthletePhotoUrl(detail.id, detail.photoUpdatedAt)
                        : undefined;

                    const totalMinutes = athlete.totalMinutes ?? 0;
                    const totalLoad = athlete.totalLoad ?? 0;

                    const athleteTraffic = athletes.find(
                      (a) => a.id.toLowerCase() === athlete.athleteId.toLowerCase(),
                    );
                    const athleteStatus: TrafficLightStatus =
                      athleteTraffic?.status ?? (isPresent ? 'green' : 'gray');

                    const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
                    const contactFields = resolveAthleteContactFields(detail);

                    const baseAttendanceItem: AthleteTrafficLightItem = athleteTraffic ?? {
                      id: athlete.athleteId,
                      name: athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK,
                      position: '',
                      category: selectedCategory?.name ?? 'Plantel',
                      status: isPresent ? 'green' : 'gray',
                      statusLabel: isPresent ? 'Presente' : 'Sin Check-in',
                      recommendation: isPresent
                        ? 'Atleta presente con carga registrada en el día.'
                        : 'Atleta sin registro de carga ni asistencia en el día.',
                      avatarUrl: photoUrl,
                      ...contactFields,
                    };

                    const attendanceContactItem: AthleteTrafficLightItem = {
                      ...baseAttendanceItem,
                      avatarUrl: baseAttendanceItem.avatarUrl || photoUrl,
                      phone: contactFields.isMinor
                        ? null
                        : (baseAttendanceItem.phone ?? contactFields.phone),
                      telegramUsername: contactFields.isMinor
                        ? null
                        : (baseAttendanceItem.telegramUsername ?? contactFields.telegramUsername),
                      isMinor: baseAttendanceItem.isMinor ?? contactFields.isMinor,
                      guardianPhone:
                        baseAttendanceItem.guardianPhone ?? contactFields.guardianPhone,
                      guardianName: baseAttendanceItem.guardianName ?? contactFields.guardianName,
                      activities: athlete.activities,
                      totalMinutes: athlete.totalMinutes ?? totalMinutes,
                      totalLoad: athlete.totalLoad ?? totalLoad,
                      rpe: baseAttendanceItem.rpe ?? athlete.activities?.[0]?.rpe ?? undefined,
                    };

                    return (
                      <div
                        key={athlete.athleteId}
                        className="card athlete-attendance-card"
                        onClick={() => {
                          setQuickSheetMode('asistencia');
                          setSelectedAthleteAttendance({
                            totalMinutes,
                            totalLoad,
                            activities: athlete.activities ?? [],
                          });
                          setSelectedAthlete(attendanceContactItem);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setQuickSheetMode('asistencia');
                            setSelectedAthleteAttendance({
                              totalMinutes,
                              totalLoad,
                              activities: athlete.activities ?? [],
                            });
                            setSelectedAthlete(attendanceContactItem);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          padding: '1.15rem',
                          background: 'var(--bg-card)',
                          borderRadius: '24px',
                          border: '1px solid var(--border)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                          minHeight: '330px',
                          height: '100%',
                          boxSizing: 'border-box',
                          transition:
                            'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                        }}
                        aria-label={`Ver detalle de asistencia y carga de ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`}
                      >
                        {/* Cabecera idéntica a diseño: Avatar, Nombre y Botón pill */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <div
                              className="athlete-avatar-bubble-wrap"
                              onClick={() => {
                                setQuickSheetMode('asistencia');
                                setSelectedAthleteAttendance({
                                  totalMinutes,
                                  totalLoad,
                                  activities: athlete.activities ?? [],
                                });
                                setSelectedAthlete(attendanceContactItem);
                              }}
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                              title={`Ver registro de actividades y carga de ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`}
                            >
                              <AthleteAvatar
                                name={athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                                avatarUrl={photoUrl}
                                status={athleteStatus}
                                size={42}
                                showRing={true}
                                interactiveHover={true}
                              />
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                                flex: 1,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: '0.94rem',
                                  color: 'var(--text-main)',
                                  lineHeight: 1.25,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                              >
                                {athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: 'var(--text-muted)',
                                  marginTop: '2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={selectedCategoryName || 'Primera División'}
                              >
                                {selectedCategoryName || 'Primera División'}
                              </span>
                            </div>
                          </div>

                          {/* Bloque vertical de Asistencia: Círculo con tilde + Texto de estado (Imagen 2) */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              flexShrink: 0,
                              minWidth: '54px',
                            }}
                          >
                            <button
                              type="button"
                              data-testid={`btn-attendance-toggle-${athlete.athleteId}`}
                              aria-label={
                                isPresent
                                  ? `Presente registrado para ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}. Clic para quitar.`
                                  : `Marcar presente a ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`
                              }
                              title={isPresent ? 'Presente (clic para quitar)' : 'Marcar presente'}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAttendance(athlete.athleteId, !isPresent);
                              }}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '9999px',
                                border: isPresent
                                  ? '1px solid var(--traffic-green-border)'
                                  : '1px solid var(--border)',
                                background: isPresent
                                  ? 'var(--traffic-green-bg)'
                                  : 'var(--bg-subtle)',
                                color: isPresent
                                  ? 'var(--traffic-green-text)'
                                  : 'var(--text-muted)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                padding: 0,
                              }}
                            >
                              <Check size={16} strokeWidth={2.5} />
                            </button>
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: isPresent
                                  ? 'var(--traffic-green-text)'
                                  : 'var(--text-muted)',
                                lineHeight: 1,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isPresent ? 'Presente' : 'Sin registro'}
                            </span>
                          </div>
                        </div>

                        {/* Desglose central de Carga del Día */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {/* Caja de métricas Tiempo Total y Carga Acumulada */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-around',
                              textAlign: 'center',
                              padding: '0.85rem 1.25rem',
                              background: 'var(--bg-card)',
                              borderRadius: '18px',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  gap: '0.25rem',
                                  lineHeight: 1,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '1.9rem',
                                    fontWeight: 900,
                                    color: 'var(--text-main)',
                                  }}
                                >
                                  {totalMinutes}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  min
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  marginTop: '0.4rem',
                                }}
                              >
                                Tiempo Total
                              </span>
                            </div>

                            <div
                              style={{
                                width: '1px',
                                height: '42px',
                                background: 'var(--border)',
                              }}
                            />

                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  gap: '0.25rem',
                                  lineHeight: 1,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '1.9rem',
                                    fontWeight: 900,
                                    color: 'var(--text-main)',
                                  }}
                                >
                                  {totalLoad}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    color: 'var(--text-muted)',
                                  }}
                                >
                                  UA
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  color: 'var(--text-muted)',
                                  letterSpacing: '0.05em',
                                  textTransform: 'uppercase',
                                  marginTop: '0.4rem',
                                }}
                              >
                                Carga Acumulada
                              </span>
                            </div>
                          </div>

                          {/* Barra de progreso de carga horizontal (verde a azul/dorado) */}
                          <div
                            style={{
                              width: '100%',
                              height: '8px',
                              background: 'var(--border)',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width:
                                  totalLoad > 0
                                    ? `${Math.min(100, Math.max(6, Math.round((totalLoad / 900) * 100)))}%`
                                    : '0%',
                                height: '100%',
                                background:
                                  'linear-gradient(90deg, var(--traffic-green) 0%, var(--primary) 50%, var(--traffic-yellow) 100%)',
                                borderRadius: '9999px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Sección inferior simétrica alineada con la tarjeta de Semáforo (KAN-621) */}
                        <div
                          style={{
                            borderTop: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            borderRadius: '8px',
                            padding: '0.5rem 0.65rem',
                            height: '54px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div
                            style={{
                              width: '4px',
                              height: '32px',
                              borderRadius: '4px',
                              backgroundColor: isPresent
                                ? 'var(--traffic-green)'
                                : 'var(--traffic-gray)',
                              flexShrink: 0,
                            }}
                          />

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: isPresent
                                  ? 'var(--traffic-green-text)'
                                  : 'var(--text-muted)',
                                lineHeight: 1.25,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {isPresent ? 'Carga del día registrada' : 'Sin registro de carga hoy'}
                            </p>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                marginTop: '2px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Tocar tarjeta para ver detalle y actividades
                            </span>
                          </div>
                        </div>

                        {/* Botón de Carga / Edición + Contacto anclados simétricamente al pie */}
                        <div
                          style={{
                            marginTop: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.55rem',
                            width: '100%',
                          }}
                        >
                          {isPresent ? (
                            <button
                              type="button"
                              data-testid={`edit-load-btn-${athlete.athleteId}`}
                              aria-label={`Editar Carga de ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLoadModalAthlete({
                                  id: athlete.athleteId,
                                  name: athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK,
                                  activities: athlete.activities,
                                });
                              }}
                              style={{
                                width: '100%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border)',
                                color: 'var(--primary)',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '0.42rem 0.65rem',
                                borderRadius: '8px',
                                transition: 'all 0.15s ease',
                                boxSizing: 'border-box',
                              }}
                            >
                              <Pencil size={13} />
                              <span>Editar Carga</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-testid={`load-btn-${athlete.athleteId}`}
                              aria-label={`+ Cargar minutos y RPE a ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLoadModalAthlete({
                                  id: athlete.athleteId,
                                  name: athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK,
                                  activities: athlete.activities,
                                });
                              }}
                              style={{
                                width: '100%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                background: 'color-mix(in srgb, var(--primary) 8%, var(--bg-card))',
                                border:
                                  '1px solid color-mix(in srgb, var(--primary) 30%, var(--border))',
                                color: 'var(--primary)',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '0.42rem 0.65rem',
                                borderRadius: '8px',
                                transition: 'all 0.15s ease',
                                boxSizing: 'border-box',
                              }}
                            >
                              <Plus size={13} />
                              <span>Cargar minutos y RPE</span>
                            </button>
                          )}

                          <div
                            style={{
                              paddingTop: '0.55rem',
                              borderTop: '1px solid var(--border)',
                            }}
                          >
                            <AthleteContactActions
                              athlete={attendanceContactItem}
                              compact
                              context="attendance"
                              isPresent={isPresent}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {!attendanceLoading &&
                    !attendanceResult?.error &&
                    filteredAttendanceAthletes.length === 0 && (
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
                        {(attendanceResult?.summary?.athletes?.length ?? 0) === 0
                          ? 'No hay atletas para mostrar.'
                          : 'No hay atletas con los filtros de asistencia elegidos.'}
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Accessible Quick Sheet (Accesible desde Semáforo del Día y Asistencia & RPE) */}
        <AthleteQuickSheet
          athlete={selectedAthlete}
          mode={quickSheetMode}
          attendanceData={selectedAthleteAttendance ?? undefined}
          onClose={() => {
            setSelectedAthlete(null);
            setSelectedAthleteAttendance(null);
          }}
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

        {/* Modal de Carga de Asistencia y RPE (KAN-621) */}
        {loadModalAthlete && (
          <AttendanceLoadModal
            key={loadModalAthlete.id}
            isOpen={Boolean(loadModalAthlete)}
            athleteId={loadModalAthlete.id}
            athleteName={loadModalAthlete.name}
            initialActivities={loadModalAthlete.activities}
            onClose={() => setLoadModalAthlete(null)}
            onSuccess={() => {
              setLoadModalAthlete(null);
              refreshAttendance();
            }}
          />
        )}
      </div>
    </div>
  );
};

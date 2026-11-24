import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { AthleteTrafficLightCard } from '../../components/monitoring/AthleteTrafficLightCard';
import { AthleteQuickSheet } from '../../components/monitoring/AthleteQuickSheet';
import { AthleteContactActions } from '../../components/monitoring/AthleteContactActions';
import { AthleteAvatar } from '../../components/monitoring/AthleteAvatar';
import { DayAdjustmentModal } from '../../components/monitoring/DayAdjustmentModal';
import { AttendanceLoadModal } from '../../components/attendance/AttendanceLoadModal';
import { SegmentedFilterTabs } from '../../components/common/SegmentedFilterTabs';
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
  type AthleteAttendanceSummary,
  mapTrafficLightSummaryToItem,
} from '../../api/seguimientoService';
import type { AthleteTrafficLightSummary } from '../../api/generated/seguimiento';
import { Athlete, Category, Organization } from '../../types/structure';
import { todayInArgentina } from '../../utils/argentinaDate';
import './MonitoringPage.css';

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

  // Organizaciones y Categorías del PF (KAN-649)
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
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

  // 1. Cargar las organizaciones y categorías del preparador físico (KAN-649)
  useEffect(() => {
    let active = true;

    structureService
      .getOrganizations()
      .catch(() => [] as Organization[])
      .then(async (orgs) => {
        if (!active) return;
        setOrganizations(orgs);

        const categoriesByOrg = await Promise.all(
          orgs.map((org) => structureService.getCategories(org.id).catch(() => [] as Category[])),
        );
        if (!active) return;

        const allCategories = categoriesByOrg.flat();
        setCategories(allCategories);
        // Por defecto: "Todas las organizaciones" ('') y "Todas las categorías" ('')
        setSelectedOrganizationId('');
        setSelectedCategoryId('');
        setCategoriesLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setCategoriesError(
          err instanceof Error ? err.message : 'No se pudieron cargar las organizaciones.',
        );
        setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Categorías visibles según la organización seleccionada
  const visibleCategories = useMemo(() => {
    if (!selectedOrganizationId) return categories;
    return categories.filter((category) => category.organizationId === selectedOrganizationId);
  }, [categories, selectedOrganizationId]);

  // Ids de categorías sobre los cuales consultar datos (todas las visibles si no hay una categoría puntual)
  const targetCategoryIds = useMemo(() => {
    if (selectedCategoryId) return [selectedCategoryId];
    return visibleCategories.map((c) => c.id);
  }, [selectedCategoryId, visibleCategories]);

  // Modo degradado KAN-366: estructura caída → nombre de categoría vacío.
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return 'Todos los planteles';
    return (
      categories.find((category) => category.id === selectedCategoryId)?.name?.trim() ||
      CATEGORY_NAME_FALLBACK
    );
  }, [categories, selectedCategoryId]);

  // Nombre de organización y categoría real del atleta (KAN-660)
  const getAthleteDisplayCategory = useCallback(
    (athlete?: Athlete | null, fallbackCategoryName?: string): string => {
      if (athlete?.categories && athlete.categories.length > 0) {
        const primary = athlete.categories[0];
        const catName = primary.name?.trim();
        const orgName = primary.organizationName?.trim();
        if (orgName && catName) {
          return `${orgName} · ${catName}`;
        }
        if (catName) return catName;
      }
      if (athlete?.categoryNames && athlete.categoryNames.length > 0) {
        const catName = athlete.categoryNames[0];
        const matchedCategory = categories.find(
          (c) => c.name.toLowerCase() === catName.toLowerCase(),
        );
        const org = matchedCategory
          ? organizations.find((o) => o.id === matchedCategory.organizationId)
          : undefined;
        if (org?.name && catName) {
          return `${org.name} · ${catName}`;
        }
        return catName;
      }
      if (fallbackCategoryName && fallbackCategoryName !== 'Todos los planteles') {
        return fallbackCategoryName;
      }
      if (selectedCategoryId) {
        return selectedCategoryName;
      }
      return 'Sin categoría';
    },
    [categories, organizations, selectedCategoryId, selectedCategoryName],
  );

  // 2. Cargar el semáforo del día de las categorías seleccionadas
  const [athletesResult, setAthletesResult] = useState<{
    filterKey: string;
    athletes: AthleteTrafficLightItem[];
    error: string | null;
  } | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, Partial<AthleteTrafficLightItem>>
  >({});
  const [categoryAthletes, setCategoryAthletes] = useState<Athlete[]>([]);

  // Asistencia automática del día (KAN-445)
  const [attendanceResult, setAttendanceResult] = useState<{
    filterKey: string;
    summary: CategoryAttendanceSummary | null;
    error: string | null;
  } | null>(null);
  const [attendanceOverrides, setAttendanceOverrides] = useState<
    Record<string, 'Present' | 'NoRecord'>
  >({});
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');

  const currentFilterKey = `${selectedOrganizationId}:${selectedCategoryId}`;

  const athletesLoading =
    categoriesLoading || athletesResult === null || athletesResult.filterKey !== currentFilterKey;

  const attendanceLoading =
    categoriesLoading ||
    attendanceResult === null ||
    attendanceResult.filterKey !== currentFilterKey;

  const [refreshTrafficLightKey, setRefreshTrafficLightKey] = useState(0);
  const [refreshAttendanceKey, setRefreshAttendanceKey] = useState(0);
  // "Actualizar" mantiene la lista a la vista y muestra el giro en el botón hasta que llegan
  // los datos nuevos (KAN-660, hallazgo 4)
  const [refreshingTrafficLight, setRefreshingTrafficLight] = useState(false);
  const [refreshingAttendance, setRefreshingAttendance] = useState(false);

  useEffect(() => {
    let active = true;
    if (categoriesLoading) return;
    const key = `${selectedOrganizationId}:${selectedCategoryId}`;

    const getPhotoUrl = (id: string, updatedAt?: string | null) =>
      typeof structureService?.getAthletePhotoUrl === 'function'
        ? structureService.getAthletePhotoUrl(id, updatedAt)
        : `/api/estructura/api/v1/athletes/${id}/photo${updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : ''}`;

    const athletesPromise =
      typeof structureService?.getAthletes === 'function'
        ? structureService
            .getAthletes(selectedCategoryId ? { categoriaId: selectedCategoryId } : undefined)
            .then(async (fetched) => {
              if (typeof structureService?.withCategories === 'function') {
                return await structureService
                  .withCategories(fetched, categories, organizations)
                  .catch(() => fetched);
              }
              return fetched;
            })
            .catch(() => [] as Athlete[])
        : Promise.resolve([] as Athlete[]);

    const trafficLightPromises = Promise.all(
      targetCategoryIds.map((catId) =>
        getCategoryTrafficLightToday(catId).catch(() => [] as AthleteTrafficLightSummary[]),
      ),
    );

    Promise.all([trafficLightPromises, athletesPromise])
      .then(async ([summariesByCat, fetchedAthletes]) => {
        if (!active) return;
        setCategoryAthletes(fetchedAthletes);
        const athleteMap = new Map(fetchedAthletes.map((a) => [a.id.toLowerCase(), a]));

        // Mapeo de athleteId a categoría de origen para preservar organización y categoría real (KAN-660)
        const athleteOriginCatMap = new Map<string, string>();
        summariesByCat.forEach((summaries, idx) => {
          const catId = targetCategoryIds[idx];
          if (!catId) return;
          for (const s of summaries) {
            const aId = s.athleteId?.toLowerCase();
            if (aId && !athleteOriginCatMap.has(aId)) {
              athleteOriginCatMap.set(aId, catId);
            }
          }
        });

        const allSummaries = summariesByCat.flat();
        const seen = new Set<string>();
        const uniqueSummaries: AthleteTrafficLightSummary[] = [];
        for (const s of allSummaries) {
          const id = s.athleteId?.toLowerCase();
          if (id && !seen.has(id)) {
            seen.add(id);
            uniqueSummaries.push(s);
          }
        }

        const mapped = uniqueSummaries.map((summary) => {
          const summaryId = summary.athleteId?.toLowerCase();
          const detail = athleteMap.get(summaryId);
          const photoUrl =
            detail && detail.hasPhoto ? getPhotoUrl(detail.id, detail.photoUpdatedAt) : undefined;

          const originCatId = summaryId ? athleteOriginCatMap.get(summaryId) : undefined;
          const originCategory = originCatId
            ? categories.find((c) => c.id === originCatId)
            : undefined;
          const originOrg = originCategory
            ? organizations.find((o) => o.id === originCategory.organizationId)
            : undefined;
          const originFallbackName = originCategory
            ? originOrg?.name
              ? `${originOrg.name} · ${originCategory.name}`
              : originCategory.name
            : undefined;

          const catName = getAthleteDisplayCategory(detail, originFallbackName);

          const item = mapTrafficLightSummaryToItem(summary, catName);
          return {
            ...item,
            position: item.position,
            avatarUrl: photoUrl,
            ...resolveAthleteContactFields(detail),
          };
        });

        // KAN-574: consultar conflictos en una sola llamada por categoría (solo en categorías con
        // atletas que reportaron dolor hoy), evitando el N+1 por atleta.
        const categoryIdsWithPain = targetCategoryIds.filter((_, idx) =>
          (summariesByCat[idx] ?? []).some((s) => Boolean(s.indicators?.painZones?.trim())),
        );

        const conflictedAthleteIds = new Set<string>();
        const adjustedAthleteIds = new Set<string>();
        if (
          categoryIdsWithPain.length > 0 &&
          typeof dayAdjustmentsService?.getCategoryDayConflicts === 'function'
        ) {
          const conflictsByCat = await Promise.all(
            categoryIdsWithPain.map((catId) =>
              dayAdjustmentsService
                .getCategoryDayConflicts(catId)
                // Degradación intencional: si Asistente no responde, el semáforo igual debe mostrarse.
                .catch(() => null),
            ),
          );
          if (!active) return;

          for (const catConflicts of conflictsByCat) {
            for (const entry of catConflicts?.athletes ?? []) {
              if (entry.hasConflicts && entry.athleteId) {
                conflictedAthleteIds.add(entry.athleteId.toLowerCase());
              }
              if (entry.adjustedToday && entry.athleteId) {
                adjustedAthleteIds.add(entry.athleteId.toLowerCase());
              }
            }
          }
        }

        const athletesWithConflicts = mapped.map((athlete) => ({
          ...athlete,
          hasDayConflict: conflictedAthleteIds.has(athlete.id.toLowerCase()),
          adjustedToday: adjustedAthleteIds.has(athlete.id.toLowerCase()),
        }));

        if (!active) return;
        setAthletesResult({
          filterKey: key,
          athletes: athletesWithConflicts,
          error: null,
        });
        setRefreshingTrafficLight(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAthletesResult({
          filterKey: key,
          athletes: [],
          error: err instanceof Error ? err.message : 'No se pudo consultar el semáforo del día.',
        });
        setRefreshingTrafficLight(false);
      });

    return () => {
      active = false;
    };
  }, [
    categoriesLoading,
    selectedOrganizationId,
    selectedCategoryId,
    targetCategoryIds,
    categories,
    organizations,
    selectedCategoryName,
    getAthleteDisplayCategory,
    refreshTrafficLightKey,
  ]);

  useEffect(() => {
    let active = true;
    if (categoriesLoading) return;
    const key = `${selectedOrganizationId}:${selectedCategoryId}`;

    const athletesPromise =
      typeof structureService?.getAthletes === 'function'
        ? structureService
            .getAthletes(selectedCategoryId ? { categoriaId: selectedCategoryId } : undefined)
            .then(async (fetched) => {
              if (typeof structureService?.withCategories === 'function') {
                return await structureService
                  .withCategories(fetched, categories, organizations)
                  .catch(() => fetched);
              }
              return fetched;
            })
            .catch(() => [] as Athlete[])
        : Promise.resolve([] as Athlete[]);

    const attendancePromises = Promise.all(
      targetCategoryIds.map((catId) => getCategoryAttendanceToday(catId).catch(() => null)),
    );

    Promise.all([attendancePromises, athletesPromise])
      .then(([summaries, fetchedAthletes]) => {
        if (!active) return;
        if (fetchedAthletes.length > 0) setCategoryAthletes(fetchedAthletes);

        const athleteMap = new Map<string, AthleteAttendanceSummary>();
        for (const s of summaries) {
          if (!s || !s.athletes) continue;
          for (const ath of s.athletes) {
            if (!ath || !ath.athleteId) continue;
            const existing = athleteMap.get(ath.athleteId);
            if (!existing || (ath.totalLoad ?? 0) > (existing.totalLoad ?? 0)) {
              athleteMap.set(ath.athleteId, ath);
            }
          }
        }

        const combinedAthletes = Array.from(athleteMap.values());
        let presentCount = 0;
        combinedAthletes.forEach((a) => {
          if (a.status === 'Present') presentCount++;
        });

        const combinedSummary: CategoryAttendanceSummary = {
          categoryId: selectedCategoryId || 'all',
          date: todayInArgentina(),
          totalRoster: combinedAthletes.length,
          presentCount,
          attendancePercentage:
            combinedAthletes.length > 0 ? (presentCount / combinedAthletes.length) * 100 : 0,
          athletes: combinedAthletes,
        };

        setAttendanceResult({
          filterKey: key,
          summary: combinedSummary,
          error: null,
        });
        setRefreshingAttendance(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAttendanceResult({
          filterKey: key,
          summary: null,
          error: err instanceof Error ? err.message : 'No se pudo consultar la asistencia.',
        });
        setRefreshingAttendance(false);
      });

    return () => {
      active = false;
    };
  }, [
    categoriesLoading,
    selectedOrganizationId,
    selectedCategoryId,
    targetCategoryIds,
    categories,
    organizations,
    selectedCategoryName,
    getAthleteDisplayCategory,
    refreshAttendanceKey,
  ]);

  // Los cambios hechos en pantalla (ajuste aprobado, presente marcado a mano) se descartan:
  // si no, taparían los datos recién traídos del servidor.
  const refreshTrafficLight = () => {
    if (refreshingTrafficLight) return;
    setRefreshingTrafficLight(true);
    setStatusOverrides({});
    setRefreshTrafficLightKey((k) => k + 1);
  };

  const refreshAttendance = () => {
    if (refreshingAttendance) return;
    setRefreshingAttendance(true);
    setAttendanceOverrides({});
    setRefreshAttendanceKey((k) => k + 1);
  };

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

  const currentResult =
    athletesResult && athletesResult.filterKey === currentFilterKey ? athletesResult : null;
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

  return (
    <div className="app-page-container">
      {/* Encabezado Principal */}
      <PageHeader
        title="Seguimiento & Semáforo del Día"
        description="Evaluación de readiness antes de la práctica, niveles de riesgo muscular y asistencia del plantel."
        actions={
          <div className="monitoring-header-actions">
            <button
              type="button"
              className={`btn monitoring-tab-btn ${activeTab === 'traffic-light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('traffic-light')}
            >
              <Activity size={15} />
              <span>Semáforo del Día</span>
            </button>
            <button
              type="button"
              className={`btn monitoring-tab-btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => handleTabChange('attendance')}
            >
              <Users size={15} />
              <span>Asistencia & RPE</span>
            </button>
          </div>
        }
      />

      <div className="app-page-body monitoring-page-body">
        {/* Category and Search Bar */}
        <div className="card monitoring-filter-card">
          {/* Division / Category Selector */}
          <div className="monitoring-filter-fields">
            {/* Organización */}
            <div className="monitoring-filter-group">
              <label htmlFor="organization-select" className="monitoring-filter-label">
                Organización:
              </label>
              <select
                id="organization-select"
                aria-label="Filtrar por organización"
                value={selectedOrganizationId}
                onChange={(e) => {
                  const newOrgId = e.target.value;
                  setSelectedOrganizationId(newOrgId);
                  if (
                    newOrgId &&
                    selectedCategoryId &&
                    !categories.some(
                      (c) => c.id === selectedCategoryId && c.organizationId === newOrgId,
                    )
                  ) {
                    setSelectedCategoryId('');
                  }
                }}
                disabled={categoriesLoading}
                className="monitoring-filter-select"
              >
                <option value="">Todas las organizaciones</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div className="monitoring-filter-group">
              <label htmlFor="category-select" className="monitoring-filter-label">
                Categoría:
              </label>
              <select
                id="category-select"
                aria-label="Filtrar por categoría"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                disabled={categoriesLoading}
                className="monitoring-filter-select"
              >
                <option value="">Todas las categorías</option>
                {visibleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name?.trim() || CATEGORY_NAME_FALLBACK}
                  </option>
                ))}
              </select>
            </div>
            {categoriesError && <span className="monitoring-filter-error">{categoriesError}</span>}
          </div>

          {/* Athlete Search Input */}
          <div className="monitoring-search">
            <Search size={15} className="monitoring-search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Buscar atleta por nombre o posición..."
              aria-label="Buscar atleta"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="monitoring-search-input"
            />
          </div>
        </div>

        {activeTab === 'traffic-light' ? (
          <div className="monitoring-tab-panel">
            {/* Barra de Resumen del Semáforo y Bienestar Diario (KAN-621) */}
            <div className="monitoring-summary-bar">
              <Activity size={20} className="monitoring-summary-icon" />
              <strong className="monitoring-summary-title">
                Semáforo de Readiness y Bienestar Diario
              </strong>
              <span className="monitoring-summary-meta">
                {counts.all - counts.gray} / {counts.all} check-ins completados (
                {(counts.all > 0 ? ((counts.all - counts.gray) / counts.all) * 100 : 0).toFixed(1)}
                %)
              </span>
              <button
                type="button"
                data-testid="refresh-traffic-light-btn"
                onClick={refreshTrafficLight}
                className="monitoring-refresh-btn"
                disabled={refreshingTrafficLight}
                aria-busy={refreshingTrafficLight}
              >
                <RefreshCw
                  size={13}
                  aria-hidden="true"
                  className={refreshingTrafficLight ? 'monitoring-refresh-spin' : undefined}
                />
                {refreshingTrafficLight ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
            <p className="monitoring-hint">
              El semáforo evalúa el readiness diario del atleta a través del check-in matutino de
              bienestar, dolor muscular y presencia de lesiones.
            </p>

            {/* Barra Segmentada de Filtro de Semáforo (KAN-645) */}
            <SegmentedFilterTabs<FilterColor>
              ariaLabel="Filtro de atletas por color del semáforo"
              value={colorFilter}
              onChange={setColorFilter}
              options={[
                { value: 'all', label: 'Todos', count: counts.all, variant: 'all' },
                {
                  value: 'red',
                  label: 'Atención Crítica',
                  shortLabel: 'Crítica',
                  count: counts.red,
                  variant: 'red',
                  hasDot: true,
                },
                {
                  value: 'yellow',
                  label: 'Precaución',
                  count: counts.yellow,
                  variant: 'yellow',
                  hasDot: true,
                },
                {
                  value: 'green',
                  label: 'Óptimos',
                  count: counts.green,
                  variant: 'green',
                  hasDot: true,
                },
                {
                  value: 'gray',
                  label: 'Sin Check-in',
                  shortLabel: 'Sin Check',
                  count: counts.gray,
                  variant: 'gray',
                  hasDot: true,
                },
              ]}
            />

            {/* KAN-366: aviso de modo degradado cuando Estructura no respondió
                y algún atleta llegó sin nombre (ATHLETE_NAME_FALLBACK). */}
            {hasDegradedAthletes && !athletesLoading && (
              <div role="alert" className="monitoring-degraded-alert">
                <AlertTriangle size={17} className="monitoring-degraded-icon" aria-hidden="true" />
                <span>
                  No se pudo cargar la lista completa de la categoría. Se muestran solo los atletas
                  que ya hicieron el check-in hoy.
                </span>
              </div>
            )}

            {/* Grilla de tarjetas del semáforo (KAN-365/KAN-366/KAN-639): alineación simétrica y altura uniforme */}
            <div className="monitoring-grid">
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
                <div className="monitoring-state-cell monitoring-state-cell--lg monitoring-state-cell--muted">
                  <Loader2 size={24} className="monitoring-spinner" />
                  <p className="monitoring-state-text">Consultando el semáforo del día…</p>
                </div>
              )}

              {!athletesLoading && (athletesError || categoriesError) && (
                <div className="monitoring-state-cell monitoring-state-cell--error">
                  <p className="monitoring-state-text monitoring-state-text--error">
                    {athletesError || categoriesError}
                  </p>
                </div>
              )}

              {!athletesLoading &&
                !athletesError &&
                !categoriesError &&
                filteredAthletes.length === 0 && (
                  <div className="monitoring-state-cell monitoring-state-cell--lg">
                    <p className="monitoring-state-text monitoring-state-text--muted">
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
          <div className="monitoring-tab-panel">
            {attendanceLoading && (
              <div className="monitoring-state-cell monitoring-state-cell--sm monitoring-state-cell--muted">
                <Loader2 size={24} className="monitoring-spinner" />
                <p className="monitoring-state-text">Consultando la asistencia del día…</p>
              </div>
            )}

            {!attendanceLoading && attendanceResult?.error && (
              <div className="monitoring-error-box">{attendanceResult.error}</div>
            )}

            {!attendanceLoading && attendanceResult?.summary && (
              <>
                <div className="monitoring-summary-bar">
                  <Users size={20} className="monitoring-summary-icon" />
                  <strong className="monitoring-summary-title">
                    Planilla de Asistencia Diaria
                  </strong>
                  <span className="monitoring-summary-meta">
                    {attendanceResult.summary.presentCount} / {attendanceResult.summary.totalRoster}{' '}
                    presentes ({(attendanceResult.summary.attendancePercentage ?? 0).toFixed(1)}%)
                  </span>
                  <button
                    type="button"
                    data-testid="refresh-attendance-btn"
                    onClick={refreshAttendance}
                    className="monitoring-refresh-btn"
                    disabled={refreshingAttendance}
                    aria-busy={refreshingAttendance}
                  >
                    <RefreshCw
                      size={13}
                      aria-hidden="true"
                      className={refreshingAttendance ? 'monitoring-refresh-spin' : undefined}
                    />
                    {refreshingAttendance ? 'Actualizando…' : 'Actualizar'}
                  </button>
                </div>
                <p className="monitoring-hint">
                  La asistencia se marca cuando el atleta registra la carga del día (minutos + RPE).
                  El check-in de bienestar no la marca.
                </p>

                {/* Barra Segmentada de Filtro de Asistencia (KAN-645) */}
                <SegmentedFilterTabs<'all' | 'present' | 'absent'>
                  ariaLabel="Filtro de atletas por asistencia"
                  value={attendanceFilter}
                  onChange={setAttendanceFilter}
                  options={[
                    {
                      value: 'all',
                      label: 'Todos',
                      count: attendanceCounts.all,
                      variant: 'all',
                      testId: 'filter-attendance-all',
                    },
                    {
                      value: 'present',
                      label: 'Presentes',
                      count: attendanceCounts.present,
                      variant: 'green',
                      hasDot: true,
                      testId: 'filter-attendance-present',
                    },
                    {
                      value: 'absent',
                      label: 'Sin registro',
                      count: attendanceCounts.absent,
                      variant: 'gray',
                      hasDot: true,
                      testId: 'filter-attendance-absent',
                    },
                  ]}
                />

                <div className="monitoring-grid">
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
                    const hasRecordedLoad = Boolean(
                      totalLoad > 0 || (athlete.activities && athlete.activities.length > 0),
                    );

                    const athleteTraffic = athletes.find(
                      (a) => a.id.toLowerCase() === athlete.athleteId.toLowerCase(),
                    );
                    const athleteStatus: TrafficLightStatus =
                      athleteTraffic?.status ?? (isPresent ? 'green' : 'gray');

                    const contactFields = resolveAthleteContactFields(detail);

                    const baseAttendanceItem: AthleteTrafficLightItem = athleteTraffic ?? {
                      id: athlete.athleteId,
                      name: athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK,
                      position: '',
                      category: getAthleteDisplayCategory(detail),
                      status: isPresent ? 'green' : 'gray',
                      statusLabel: isPresent ? 'Presente' : 'Sin Check-in',
                      recommendation: isPresent
                        ? hasRecordedLoad
                          ? 'Atleta presente con carga registrada en el día.'
                          : 'Atleta presente sin carga registrada en el día.'
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
                        className="card athlete-attendance-card monitoring-attendance-card"
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
                        aria-label={`Ver detalle de asistencia y carga de ${athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}`}
                      >
                        {/* Cabecera idéntica a diseño: Avatar, Nombre y Botón pill */}
                        <div className="monitoring-att-card-head">
                          <div className="monitoring-att-card-id">
                            <div
                              className="athlete-avatar-bubble-wrap monitoring-att-avatar-wrap"
                              onClick={() => {
                                setQuickSheetMode('asistencia');
                                setSelectedAthleteAttendance({
                                  totalMinutes,
                                  totalLoad,
                                  activities: athlete.activities ?? [],
                                });
                                setSelectedAthlete(attendanceContactItem);
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
                            <div className="monitoring-att-names">
                              <span
                                className="monitoring-att-name"
                                title={athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                              >
                                {athlete.athleteName?.trim() || ATHLETE_NAME_FALLBACK}
                              </span>
                              <span
                                className="monitoring-att-category"
                                title={baseAttendanceItem.category}
                              >
                                {baseAttendanceItem.category}
                              </span>
                            </div>
                          </div>

                          {/* Bloque vertical de Asistencia: Círculo con tilde + Texto de estado (Imagen 2) */}
                          <div className="monitoring-att-status">
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
                              className="monitoring-att-toggle"
                              style={{
                                border: isPresent
                                  ? '1px solid var(--traffic-green-border)'
                                  : '1px solid var(--border)',
                                background: isPresent
                                  ? 'var(--traffic-green-bg)'
                                  : 'var(--bg-subtle)',
                                color: isPresent
                                  ? 'var(--traffic-green-text)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              <Check size={16} strokeWidth={2.5} />
                            </button>
                            <span
                              className="monitoring-att-toggle-label"
                              style={{
                                color: isPresent
                                  ? 'var(--traffic-green-text)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              {isPresent ? 'Presente' : 'Sin registro'}
                            </span>
                          </div>
                        </div>

                        {/* Desglose central de Carga del Día */}
                        <div className="monitoring-att-section">
                          {/* Caja de métricas Tiempo Total y Carga Acumulada */}
                          <div className="monitoring-att-metrics">
                            <div className="monitoring-att-metric">
                              <div className="monitoring-att-metric-row">
                                <span className="monitoring-att-metric-value">{totalMinutes}</span>
                                <span className="monitoring-att-metric-unit">min</span>
                              </div>
                              <span className="monitoring-att-metric-label">Tiempo Total</span>
                            </div>

                            <div className="monitoring-att-divider" />

                            <div className="monitoring-att-metric">
                              <div className="monitoring-att-metric-row">
                                <span className="monitoring-att-metric-value">{totalLoad}</span>
                                <span className="monitoring-att-metric-unit monitoring-att-metric-unit--ua">
                                  UA
                                </span>
                              </div>
                              <span className="monitoring-att-metric-label">Carga Acumulada</span>
                            </div>
                          </div>

                          {/* Barra de progreso de carga horizontal (verde a azul/dorado).
                              El ancho es dinámico (% de 900 UA): queda inline con tokens. */}
                          <div className="monitoring-progress-track">
                            <div
                              className="monitoring-progress-fill"
                              style={{
                                width:
                                  totalLoad > 0
                                    ? `${Math.min(100, Math.max(6, Math.round((totalLoad / Math.max(1000, Math.ceil((totalLoad * 1.25) / 100) * 100)) * 100)))}%`
                                    : '0%',
                              }}
                            />
                          </div>
                        </div>

                        {/* Sección inferior simétrica alineada con la tarjeta de Semáforo (KAN-621) */}
                        <div className="monitoring-att-footer">
                          <div
                            className="monitoring-att-footer-bar"
                            style={{
                              backgroundColor: isPresent
                                ? 'var(--traffic-green)'
                                : 'var(--traffic-gray)',
                            }}
                          />

                          <div className="monitoring-att-footer-text">
                            <p
                              className="monitoring-att-footer-title"
                              style={{
                                color: isPresent
                                  ? 'var(--traffic-green-text)'
                                  : 'var(--text-muted)',
                              }}
                            >
                              {isPresent ? 'Carga del día registrada' : 'Sin registro de carga hoy'}
                            </p>
                            <span className="monitoring-att-footer-hint">
                              Tocar tarjeta para ver detalle y actividades
                            </span>
                          </div>
                        </div>

                        {/* Botón de Carga / Edición + Contacto anclados simétricamente al pie */}
                        <div className="monitoring-att-actions">
                          {hasRecordedLoad ? (
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
                              className="monitoring-att-btn monitoring-att-btn--edit"
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
                              className="monitoring-att-btn monitoring-att-btn--load"
                            >
                              <Plus size={13} />
                              <span>Cargar minutos y RPE</span>
                            </button>
                          )}

                          <div className="monitoring-att-contact">
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
                      <div className="monitoring-state-cell monitoring-state-cell--sm monitoring-state-cell--muted">
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
                    adjustedToday: true,
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Salad,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { AthleteRecommendationGroupCard } from '../../components/recommendations/AthleteRecommendationGroupCard';
import {
  HabitsRecommendationBar,
  type HabitsAthleteOption,
} from '../../components/recommendations/HabitsRecommendationBar';
import {
  SegmentedFilterTabs,
  type SegmentedFilterOption,
} from '../../components/common/SegmentedFilterTabs';
import {
  recommendationsService,
  type AthleteRecommendation,
  type RecommendationStatusFilter,
} from '../../api/recommendations';
import { capitalizeFirst } from '../../utils/recommendationFormat';
import { structureService } from '../../api/structureService';
import type { Athlete, Category, Organization } from '../../types/structure';

type RecommendationsViewTab = 'analysis' | 'habits';

type FeedbackState = {
  tone: 'success' | 'info' | 'error';
  message: string;
} | null;

const STATUS_TABS: Array<{ value: RecommendationStatusFilter; label: string }> = [
  { value: 'Pending', label: 'Pendientes' },
  { value: 'Approved', label: 'Aprobadas' },
  { value: 'Discarded', label: 'Descartadas' },
];

export function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<AthleteRecommendation[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // `?view=habits` abre directo en Hábitos (lo usa la card "Recomendaciones por aprobar" del Inicio)
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<RecommendationsViewTab>(
    searchParams.get('view') === 'habits' ? 'habits' : 'analysis',
  );
  const [statusTab, setStatusTab] = useState<RecommendationStatusFilter>('Pending');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [analysisCategoryId, setAnalysisCategoryId] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      recommendationsService.listRecommendations(),
      typeof structureService?.getOrganizations === 'function'
        ? structureService.getOrganizations().catch(() => [] as Organization[])
        : Promise.resolve([] as Organization[]),
      structureService.getCategories().catch(() => [] as Category[]),
      structureService.getAthletes().catch(() => [] as Athlete[]),
    ])
      .then(async ([recsData, orgsData, catsData, athletesData]) => {
        if (!active) return;
        let finalAthletes = athletesData;
        if (typeof structureService?.withCategories === 'function') {
          finalAthletes = await structureService
            .withCategories(athletesData, catsData, orgsData)
            .catch(() => athletesData);
        }
        if (!active) return;
        setRecommendations(recsData);
        setOrganizations(orgsData);
        setCategories(catsData);
        setAthletes(finalAthletes);
        // Por defecto: "Todas las organizaciones" ('') y "Todas las categorías" ('')
        setSelectedOrganizationId('');
        setSelectedCategoryFilter('');
        setAnalysisCategoryId('');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : 'No se pudieron cargar las recomendaciones.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const visibleCategories = useMemo(() => {
    if (!selectedOrganizationId) return categories;
    return categories.filter((cat) => cat.organizationId === selectedOrganizationId);
  }, [categories, selectedOrganizationId]);

  const categoryOrgMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      if (cat.organizationId) {
        map.set(cat.id, cat.organizationId);
      }
    }
    return map;
  }, [categories]);

  const athleteNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const athlete of athletes) {
      const label = athlete.fullName?.trim() || `${athlete.firstName} ${athlete.lastName}`.trim();
      if (label) {
        map.set(athlete.id, label);
      }
    }
    return map;
  }, [athletes]);

  const athleteMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    for (const a of athletes) {
      map.set(a.id, a);
    }
    return map;
  }, [athletes]);

  const getAthleteDisplayName = useCallback(
    (athleteId: string) => athleteNamesById.get(athleteId) ?? `Atleta ${athleteId.slice(0, 8)}`,
    [athleteNamesById],
  );

  const getAthletePhotoUrl = useCallback(
    (athleteId: string) => {
      const athlete = athleteMap.get(athleteId);
      if (!athlete || !athlete.hasPhoto) return null;
      return structureService.getAthletePhotoUrl(athlete.id, athlete.photoUpdatedAt);
    },
    [athleteMap],
  );

  const countsByStatus = useMemo(() => {
    const counts: Record<RecommendationStatusFilter, number> = {
      Pending: 0,
      Approved: 0,
      Discarded: 0,
    };

    for (const rec of recommendations) {
      // Filtrar según la pestaña activa (Analizar plantel vs Hábitos y alimentación)
      if (activeTab === 'habits' && rec.type !== 'Habits') continue;
      if (activeTab === 'analysis' && rec.type === 'Habits') continue;

      if (selectedOrganizationId) {
        const orgId = rec.categoryId ? categoryOrgMap.get(rec.categoryId) : undefined;
        if (orgId !== selectedOrganizationId) continue;
      }
      if (selectedCategoryFilter && rec.categoryId !== selectedCategoryFilter) continue;
      if (rec.status in counts) {
        counts[rec.status] += 1;
      }
    }
    return counts;
  }, [recommendations, activeTab, selectedOrganizationId, selectedCategoryFilter, categoryOrgMap]);

  // Pendientes de cada vista, para el contador de los botones de arriba: la página abre en
  // "Analizar plantel" y, sin el número, las de hábitos pendientes no se ven (reporte del ensayo).
  const pendingByView = useMemo(() => {
    const counts: Record<RecommendationsViewTab, number> = { analysis: 0, habits: 0 };
    for (const rec of recommendations) {
      if (rec.status !== 'Pending') continue;
      if (selectedOrganizationId) {
        const orgId = rec.categoryId ? categoryOrgMap.get(rec.categoryId) : undefined;
        if (orgId !== selectedOrganizationId) continue;
      }
      if (selectedCategoryFilter && rec.categoryId !== selectedCategoryFilter) continue;
      counts[rec.type === 'Habits' ? 'habits' : 'analysis'] += 1;
    }
    return counts;
  }, [recommendations, selectedOrganizationId, selectedCategoryFilter, categoryOrgMap]);

  const filteredRecommendations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return recommendations.filter((rec) => {
      // Filtrar según la pestaña activa (Analizar plantel vs Hábitos y alimentación)
      if (activeTab === 'habits' && rec.type !== 'Habits') return false;
      if (activeTab === 'analysis' && rec.type === 'Habits') return false;

      if (rec.status !== statusTab) return false;
      if (selectedOrganizationId) {
        const orgId = rec.categoryId ? categoryOrgMap.get(rec.categoryId) : undefined;
        if (orgId !== selectedOrganizationId) return false;
      }
      if (selectedCategoryFilter && rec.categoryId !== selectedCategoryFilter) return false;

      if (normalizedSearch) {
        const athleteName = getAthleteDisplayName(rec.athleteId).toLowerCase();
        const matchesAthlete = athleteName.includes(normalizedSearch);
        const matchesReason = rec.reason.toLowerCase().includes(normalizedSearch);
        const matchesTitle = rec.title.toLowerCase().includes(normalizedSearch);
        if (!matchesAthlete && !matchesReason && !matchesTitle) return false;
      }

      return true;
    });
  }, [
    recommendations,
    activeTab,
    statusTab,
    selectedOrganizationId,
    selectedCategoryFilter,
    searchTerm,
    getAthleteDisplayName,
    categoryOrgMap,
  ]);

  const groupedByAthlete = useMemo(() => {
    const groups = new Map<string, AthleteRecommendation[]>();
    for (const rec of filteredRecommendations) {
      const existing = groups.get(rec.athleteId);
      if (existing) {
        existing.push(rec);
      } else {
        groups.set(rec.athleteId, [rec]);
      }
    }

    return Array.from(groups.entries()).map(([athleteId, items]) => ({
      athleteId,
      athleteName: getAthleteDisplayName(athleteId),
      athletePhotoUrl: getAthletePhotoUrl(athleteId),
      items,
    }));
  }, [filteredRecommendations, getAthleteDisplayName, getAthletePhotoUrl]);

  const targetCategoryForAnalysis = analysisCategoryId || selectedCategoryFilter;
  const selectedCategoryForAnalysis = categories.find((c) => c.id === targetCategoryForAnalysis);
  const analysisBtnText = analyzing
    ? 'Analizando…'
    : selectedCategoryForAnalysis
      ? `Analizar: ${selectedCategoryForAnalysis.name}`
      : 'Analizar plantel';

  const handleRunCategoryEngine = async () => {
    if (!targetCategoryForAnalysis || analyzing) return;
    setAnalyzing(true);
    setFeedback(null);

    try {
      const result = await recommendationsService.generateForCategory(targetCategoryForAnalysis, 4);
      const refreshed = await recommendationsService.listRecommendations();
      setRecommendations(refreshed);
      setStatusTab('Pending');

      if (result.generatedCount > 0) {
        setFeedback({
          tone: 'success',
          message: `Análisis de ${result.categoryName} completado: se generaron ${result.generatedCount} ${
            result.generatedCount === 1
              ? 'nueva recomendación pendiente'
              : 'nuevas recomendaciones pendientes'
          }.`,
        });
      } else if (result.existingPendingCount > 0) {
        setFeedback({
          tone: 'info',
          message: `Análisis de ${result.categoryName} finalizado: ya había ${result.existingPendingCount} ${
            result.existingPendingCount === 1
              ? 'recomendación pendiente'
              : 'recomendaciones pendientes'
          } sin duplicar.`,
        });
      } else {
        setFeedback({
          tone: 'info',
          message: `Análisis de ${result.categoryName} finalizado: no se detectaron brechas nuevas para recomendar.`,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        tone: 'error',
        message:
          err instanceof Error ? err.message : 'No se pudo ejecutar el motor de recomendaciones.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const replaceRecommendationInState = (updated: AthleteRecommendation) => {
    setRecommendations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  // Atletas para pedir hábitos y alimentación (KAN-634 · KAN-654), en orden alfabético con foto y categorías.
  const habitsAthleteOptions: HabitsAthleteOption[] = useMemo(
    () =>
      athletes
        .map((athlete) => ({
          id: athlete.id,
          name: getAthleteDisplayName(athlete.id),
          photoUrl: athlete.hasPhoto
            ? structureService.getAthletePhotoUrl(athlete.id, athlete.photoUpdatedAt)
            : null,
          categoryNames:
            athlete.categoryNames && athlete.categoryNames.length > 0
              ? athlete.categoryNames
              : athlete.categories?.map((c) => c.name) || [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [athletes, getAthleteDisplayName],
  );

  const handleHabitsGenerated = async (athleteName: string) => {
    const refreshed = await recommendationsService.listRecommendations();
    setRecommendations(refreshed);
    setStatusTab('Pending');
    setFeedback({
      tone: 'success',
      message: `La recomendación de hábitos de ${athleteName} quedó en Pendientes: revisala y aprobala para que le llegue.`,
    });
  };

  const handleUpdate = async (id: string, title: string, recommendationText: string) => {
    const updated = await recommendationsService.updateRecommendation(id, {
      title,
      recommendationText,
    });
    replaceRecommendationInState(updated);
    setFeedback({
      tone: 'success',
      message: 'Cambios guardados. La recomendación sigue pendiente hasta que la apruebes.',
    });
  };

  const handleApprove = async (
    id: string,
    edits?: { title: string; recommendationText: string },
  ) => {
    const updated = await recommendationsService.approveRecommendation(id, edits);
    replaceRecommendationInState(updated);
    setFeedback({
      tone: 'success',
      message: 'Recomendación aprobada y enviada al atleta. Ya está visible en su app.',
    });
  };

  const handleDiscard = async (id: string) => {
    const updated = await recommendationsService.discardRecommendation(id);
    replaceRecommendationInState(updated);
    setFeedback({
      tone: 'info',
      message: 'Recomendación descartada. No se envió al atleta.',
    });
  };

  return (
    <div className="app-page-container">
      <PageHeader
        title="Recomendaciones"
        description="Revisá, editá y aprobá las recomendaciones generadas para tus atletas antes de enviarlas a su app."
        actions={
          <div
            className="recommendations-header-actions"
            role="tablist"
            aria-label="Vistas de recomendaciones"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'analysis'}
              className={`btn recommendations-tab-btn ${activeTab === 'analysis' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('analysis')}
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>Analizar plantel</span>
              {pendingByView.analysis > 0 && (
                <span
                  className="recommendations-view-count"
                  aria-label={`${pendingByView.analysis} por revisar`}
                  data-testid="pending-count-analysis"
                >
                  {pendingByView.analysis}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'habits'}
              className={`btn recommendations-tab-btn ${activeTab === 'habits' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('habits')}
            >
              <Salad size={15} aria-hidden="true" />
              <span>Hábitos y alimentación</span>
              {pendingByView.habits > 0 && (
                <span
                  className="recommendations-view-count"
                  aria-label={`${pendingByView.habits} por revisar`}
                  data-testid="pending-count-habits"
                >
                  {pendingByView.habits}
                </span>
              )}
            </button>
          </div>
        }
      />

      <div className="app-page-body recommendations-page-body">
        {/* Barra superior de Organización, Categoría y Búsqueda (Simétrica a Monitoring) */}
        <section
          className="recommendations-top-filters"
          aria-label="Filtros de organización, categoría y búsqueda"
        >
          <div className="recommendations-plantel-group">
            {/* Organización */}
            <div className="recommendations-select-wrapper">
              <label htmlFor="recommendations-org-select" className="recommendations-plantel-label">
                Organización:
              </label>
              <select
                id="recommendations-org-select"
                aria-label="Filtrar por organización"
                className="recommendations-plantel-select"
                value={selectedOrganizationId}
                onChange={(e) => {
                  const newOrgId = e.target.value;
                  setSelectedOrganizationId(newOrgId);
                  if (
                    newOrgId &&
                    selectedCategoryFilter &&
                    !categories.some(
                      (cat) => cat.id === selectedCategoryFilter && cat.organizationId === newOrgId,
                    )
                  ) {
                    setSelectedCategoryFilter('');
                  }
                }}
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
            <div className="recommendations-select-wrapper">
              <label
                htmlFor="recommendations-plantel-select"
                className="recommendations-plantel-label"
              >
                Categoría:
              </label>
              <select
                id="recommendations-plantel-select"
                aria-label="Filtrar por categoría"
                className="recommendations-plantel-select"
                value={selectedCategoryFilter}
                onChange={(e) => {
                  setSelectedCategoryFilter(e.target.value);
                  if (e.target.value) setAnalysisCategoryId(e.target.value);
                }}
              >
                <option value="">Todas las categorías</option>
                {visibleCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="recommendations-search-box">
            <Search size={15} className="recommendations-search-icon" aria-hidden="true" />
            <input
              type="search"
              aria-label="Buscar por atleta o motivo"
              className="recommendations-search-input"
              placeholder="Buscar atleta por nombre o posición..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </section>

        {/* Bloque de Generación / Análisis de Plantel (Solo en pestaña 'analysis') */}
        {activeTab === 'analysis' && (
          <div className="recommendations-engine-section">
            <section
              className="recommendations-engine-bar"
              aria-label="Generar recomendaciones por categoría"
            >
              <Sparkles size={20} className="recommendations-engine-sparkle" aria-hidden="true" />
              <strong className="recommendations-engine-title">
                Analizar plantel y generar propuestas
              </strong>

              {/* Selector para marcar en qué categoría analizar (KAN-663) */}
              <div className="recommendations-analysis-category-wrap">
                <label htmlFor="recommendations-analysis-category-select" className="sr-only">
                  Categoría para analizar
                </label>
                <select
                  id="recommendations-analysis-category-select"
                  aria-label="Categoría para analizar"
                  className="recommendations-select recommendations-analysis-select"
                  value={targetCategoryForAnalysis}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setAnalysisCategoryId(catId);
                  }}
                  disabled={analyzing}
                >
                  <option value="">Elegí una categoría…</option>
                  {visibleCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="recommendations-engine-btn"
                onClick={() => void handleRunCategoryEngine()}
                disabled={analyzing || !targetCategoryForAnalysis}
                aria-label={analysisBtnText}
              >
                {analyzing && <Loader2 size={13} className="plan-spin" aria-hidden="true" />}
                <span>{analysisBtnText}</span>
              </button>
            </section>

            <p className="recommendations-engine-desc">
              Compara tests físicos frente al promedio grupal y tendencias semanales. Todas las
              propuestas nacen pendientes hasta tu aprobación.
            </p>
          </div>
        )}

        {/* Bloque de Hábitos y Alimentación (Solo en pestaña 'habits') */}
        {activeTab === 'habits' && (
          <HabitsRecommendationBar
            athletes={habitsAthleteOptions}
            onGenerated={handleHabitsGenerated}
            onError={(message) => setFeedback({ tone: 'error', message })}
          />
        )}

        {/* Notificación de feedback flotante: no altera ni desplaza la estructura */}
        {feedback && (
          <div
            className={`recommendations-feedback ${feedback.tone}`}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            <div className="recommendations-feedback-inner">
              {feedback.tone === 'error' ? (
                <AlertCircle size={17} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={17} aria-hidden="true" />
              )}
              <span>{capitalizeFirst(feedback.message)}</span>
            </div>
            <button
              type="button"
              className="recommendations-feedback-close"
              onClick={() => setFeedback(null)}
              aria-label="Cerrar aviso"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* SegmentedFilterTabs de Estado */}
        <div className="recommendations-toolbar">
          <SegmentedFilterTabs<RecommendationStatusFilter>
            ariaLabel="Estado de recomendaciones"
            value={statusTab}
            onChange={setStatusTab}
            options={STATUS_TABS.map((tab) => ({
              value: tab.value,
              label: tab.label,
              count: countsByStatus[tab.value],
              variant: tab.value.toLowerCase() as SegmentedFilterOption['variant'],
            }))}
          />
        </div>

        {loading ? (
          <EmptyState
            icon={Loader2}
            title="Cargando recomendaciones…"
            description="Consultando las propuestas generadas para tu plantel."
          />
        ) : loadError ? (
          <EmptyState
            icon={AlertCircle}
            title="No se pudieron cargar las recomendaciones"
            description={loadError}
            action={
              <button type="button" className="btn btn-secondary" onClick={handleRefresh}>
                <RefreshCw size={14} aria-hidden="true" />
                <span>Reintentar</span>
              </button>
            }
          />
        ) : groupedByAthlete.length === 0 ? (
          <EmptyState
            icon={activeTab === 'habits' ? Salad : Sparkles}
            title={
              activeTab === 'habits'
                ? statusTab === 'Pending'
                  ? 'No hay recomendaciones de hábitos pendientes'
                  : statusTab === 'Approved'
                    ? 'Todavía no aprobaste recomendaciones de hábitos'
                    : 'No hay recomendaciones de hábitos descartadas'
                : statusTab === 'Pending'
                  ? 'No hay recomendaciones pendientes'
                  : statusTab === 'Approved'
                    ? 'Todavía no aprobaste recomendaciones'
                    : 'No hay recomendaciones descartadas'
            }
            description={
              activeTab === 'habits'
                ? statusTab === 'Pending'
                  ? 'Elegí un atleta en el selector superior para generar pautas de hábitos y alimentación personalizadas.'
                  : statusTab === 'Approved'
                    ? 'Las recomendaciones de hábitos que apruebes se muestran automáticamente al atleta en su Inicio con el aviso del nutricionista.'
                    : 'Las recomendaciones de hábitos que descartes se archivan acá y nunca llegan al atleta.'
                : statusTab === 'Pending'
                  ? 'Cuando el motor detecte brechas de rendimiento o tendencias relevantes en una categoría, vas a verlas acá para revisarlas y aprobarlas.'
                  : statusTab === 'Approved'
                    ? 'Las recomendaciones que apruebes quedan registradas acá y se muestran automáticamente al atleta en su Inicio.'
                    : 'Las recomendaciones que descartes se archivan acá y nunca llegan al atleta.'
            }
          />
        ) : (
          <section
            className="recommendations-grouped-list"
            aria-label="Recomendaciones agrupadas por atleta"
          >
            {groupedByAthlete.map((group) => (
              <AthleteRecommendationGroupCard
                key={group.athleteId}
                athleteId={group.athleteId}
                athleteName={group.athleteName}
                athletePhotoUrl={group.athletePhotoUrl}
                recommendations={group.items}
                statusTab={statusTab}
                onUpdate={handleUpdate}
                onApprove={handleApprove}
                onDiscard={handleDiscard}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Search, Sparkles, X } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { AthleteRecommendationGroupCard } from '../../components/recommendations/AthleteRecommendationGroupCard';
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
import type { Athlete, Category } from '../../types/structure';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      structureService.getCategories().catch(() => [] as Category[]),
      structureService.getAthletes().catch(() => [] as Athlete[]),
    ])
      .then(([recsData, catsData, athletesData]) => {
        if (!active) return;
        setRecommendations(recsData);
        setCategories(catsData);
        setAthletes(athletesData);
        setAnalysisCategoryId((prev) => prev || catsData[0]?.id || '');
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

  const getAthleteDisplayName = useCallback(
    (athleteId: string) => athleteNamesById.get(athleteId) ?? `Atleta ${athleteId.slice(0, 8)}`,
    [athleteNamesById],
  );

  const countsByStatus = useMemo(() => {
    const counts: Record<RecommendationStatusFilter, number> = {
      Pending: 0,
      Approved: 0,
      Discarded: 0,
    };

    for (const rec of recommendations) {
      if (selectedCategoryFilter && rec.categoryId !== selectedCategoryFilter) continue;
      if (rec.status in counts) {
        counts[rec.status] += 1;
      }
    }
    return counts;
  }, [recommendations, selectedCategoryFilter]);

  const filteredRecommendations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return recommendations.filter((rec) => {
      if (rec.status !== statusTab) return false;
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
  }, [recommendations, statusTab, selectedCategoryFilter, searchTerm, getAthleteDisplayName]);

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
      items,
    }));
  }, [filteredRecommendations, getAthleteDisplayName]);

  const handleRunCategoryEngine = async () => {
    if (!analysisCategoryId || analyzing) return;
    setAnalyzing(true);
    setFeedback(null);

    try {
      const result = await recommendationsService.generateForCategory(analysisCategoryId, 4);
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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRefresh}
            disabled={loading || analyzing}
          >
            <RefreshCw size={15} className={loading ? 'plan-spin' : undefined} aria-hidden="true" />
            <span>Actualizar</span>
          </button>
        }
      />

      <div className="app-page-body recommendations-page-body">
        <section
          className="recommendations-engine-bar"
          aria-label="Generar recomendaciones por categoría"
        >
          <div className="recommendations-engine-copy">
            <span className="recommendations-engine-icon" aria-hidden="true">
              <Sparkles size={18} />
            </span>
            <div>
              <h3>Analizar plantel y generar propuestas</h3>
              <p>
                Compara tests físicos frente al promedio grupal y tendencias semanales. Todas las
                propuestas nacen pendientes hasta tu aprobación.
              </p>
            </div>
          </div>

          <div className="recommendations-engine-controls">
            <select
              aria-label="Categoría a analizar"
              className="recommendations-select"
              value={analysisCategoryId}
              onChange={(e) => setAnalysisCategoryId(e.target.value)}
              disabled={analyzing || categories.length === 0}
            >
              {categories.length === 0 ? (
                <option value="">Sin categorías disponibles</option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleRunCategoryEngine()}
              disabled={analyzing || !analysisCategoryId}
            >
              {analyzing ? (
                <Loader2 size={15} className="plan-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={15} aria-hidden="true" />
              )}
              <span>{analyzing ? 'Analizando categoría…' : 'Analizar categoría'}</span>
            </button>
          </div>
        </section>

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

          <div className="recommendations-filters">
            <select
              aria-label="Filtrar por categoría"
              className="recommendations-select"
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <div className="recommendations-search-box">
              <Search size={15} className="recommendations-search-icon" aria-hidden="true" />
              <input
                type="search"
                aria-label="Buscar por atleta o motivo"
                className="recommendations-search-input"
                placeholder="Buscar atleta o motivo…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
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
          />
        ) : groupedByAthlete.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={
              statusTab === 'Pending'
                ? 'No hay recomendaciones pendientes'
                : statusTab === 'Approved'
                  ? 'Todavía no aprobaste recomendaciones'
                  : 'No hay recomendaciones descartadas'
            }
            description={
              statusTab === 'Pending'
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

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
        const defaultCatId = catsData[0]?.id || '';
        setAnalysisCategoryId((prev) => prev || defaultCatId);
        setSelectedCategoryFilter((prev) => prev || defaultCatId);
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

  const targetCategoryForAnalysis = analysisCategoryId || selectedCategoryFilter;

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
      />

      <div className="app-page-body recommendations-page-body">
        {/* Barra superior de Plantel y Búsqueda (Simétrica a Monitoring) */}
        <section className="recommendations-top-filters" aria-label="Filtros de plantel y búsqueda">
          <div className="recommendations-plantel-group">
            <label
              htmlFor="recommendations-plantel-select"
              className="recommendations-plantel-label"
            >
              Plantel:
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
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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

        {/* Bloque de Generación / Análisis de Plantel (Simétrico a la barra de Semáforo) */}
        <div className="recommendations-engine-section">
          <section
            className="recommendations-engine-bar"
            aria-label="Generar recomendaciones por categoría"
          >
            <Sparkles size={20} className="recommendations-engine-sparkle" aria-hidden="true" />
            <strong className="recommendations-engine-title">
              Analizar plantel y generar propuestas
            </strong>

            <button
              type="button"
              className="recommendations-engine-btn"
              onClick={() => void handleRunCategoryEngine()}
              disabled={analyzing || (!targetCategoryForAnalysis && categories.length > 0)}
              aria-label="Analizar categoría"
            >
              {analyzing ? (
                <Loader2 size={13} className="plan-spin" aria-hidden="true" />
              ) : (
                <RefreshCw size={13} aria-hidden="true" />
              )}
              <span>{analyzing ? 'Analizando…' : 'Actualizar'}</span>
            </button>
          </section>

          <p className="recommendations-engine-desc">
            Compara tests físicos frente al promedio grupal y tendencias semanales. Todas las
            propuestas nacen pendientes hasta tu aprobación.
          </p>
        </div>

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

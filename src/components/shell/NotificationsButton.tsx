import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Zap, CheckCircle2, AlertTriangle, Loader2, Info, ArrowRight } from 'lucide-react';
import { ALERTS_CHANGED_EVENT, alertsService } from '../../api/alertsService';
import { recommendationsService, type MyRecommendation } from '../../api/recommendations';
import { NoticeItem } from '../../types/alerts';
import { useAuth } from '../../context/AuthContext';
import { formatAlertReason } from '../../utils/painZoneReasonFormatter';
import { capitalizeFirst, previewRecommendationText } from '../../utils/recommendationFormat';
import { DayAdjustmentModal } from '../monitoring/DayAdjustmentModal';

export const NotificationsButton: React.FC = () => {
  const { user } = useAuth();
  const isPF = user?.role === 'PreparadorFisico';
  const isAthlete = user?.role === 'Atleta';

  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // La campanita muestra solo un adelanto: el texto completo está en el Inicio del atleta.
  // Si ya estaba en el Inicio no hay cambio de página, así que se espera a que la sección exista.
  const openFullRecommendations = () => {
    setOpen(false);
    navigate('/athlete#recomendaciones');
    let tries = 0;
    const scrollWhenReady = () => {
      const section = document.getElementById('recomendaciones');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tries++ < 20) {
        window.setTimeout(scrollWhenReady, 100);
      }
    };
    window.setTimeout(scrollWhenReady, 0);
  };
  const [alerts, setAlerts] = useState<NoticeItem[]>([]);
  const [athleteRecommendations, setAthleteRecommendations] = useState<MyRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmedInfo, setConfirmedInfo] = useState<{ id: string; message: string } | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  // Aviso de ajuste de rutina abierto en la propuesta del día (KAN-594)
  const [adjustmentNotice, setAdjustmentNotice] = useState<NoticeItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Cargar avisos del PF o recomendaciones aprobadas del atleta según el rol autenticado
  useEffect(() => {
    if (!isPF && !isAthlete) {
      return;
    }

    let isMounted = true;
    const load = () => {
      const request = isPF
        ? alertsService.getPendingAlerts().then((data) => {
            if (isMounted) {
              setAlerts(data);
              setLoadError(false);
              setLoading(false);
            }
          })
        : recommendationsService.listMyRecommendations().then((data) => {
            if (isMounted) {
              setAthleteRecommendations(data);
              setLoadError(false);
              setLoading(false);
            }
          });

      request.catch(() => {
        if (isMounted) {
          setLoadError(true);
          setLoading(false);
        }
      });
    };

    load();
    // Si un aviso se aplica desde el Inicio, la campana se actualiza (KAN-594)
    if (isPF) {
      window.addEventListener(ALERTS_CHANGED_EVENT, load);
    }

    return () => {
      isMounted = false;
      if (isPF) {
        window.removeEventListener(ALERTS_CHANGED_EVENT, load);
      }
    };
  }, [isPF, isAthlete]);

  // Cerrar al hacer clic fuera del componente o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Si no está autenticado como PF o Atleta, no renderiza nada (aislamiento total en UI)
  if (!isPF && !isAthlete) {
    return null;
  }

  // Manejo de la acción «Aplicar con 1 Clic» con háptica, confirmación visual verde y archivado persistente
  const handleApplyOneClick = async (notice: NoticeItem) => {
    if (processingId || confirmedInfo) return;

    // El ajuste de rutina no se aplica a ciegas: se abre la propuesta del día para revisarla
    // y aprobarla (mismo modal que en Seguimiento y en el Inicio, KAN-452 / KAN-594).
    if (notice.actionType === 'routine_adjustment') {
      setAdjustmentNotice(notice);
      return;
    }

    setProcessingId(notice.id);
    setErrorMap((prev) => {
      const copy = { ...prev };
      delete copy[notice.id];
      return copy;
    });

    // Feedback háptico (50 ms) en dispositivos táctiles / móviles compatibles
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Ignorar de forma segura si el navegador restringe permisos de vibración
      }
    }

    try {
      const result = await alertsService.applyNoticeAction(notice);

      // Activar estado de confirmación visual verde únicamente tras éxito comprobado
      setProcessingId(null);
      setConfirmedInfo({ id: notice.id, message: result.message });

      // Mantener la confirmación visual durante 1.5s antes de archivar de la vista
      setTimeout(() => {
        setAlerts((prev) => prev.filter((item) => item.id !== notice.id));
        setConfirmedInfo((curr) => (curr?.id === notice.id ? null : curr));
        // El Inicio muestra la misma sugerencia: que se entere (después de la confirmación verde)
        window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
      }, 1500);
    } catch (err: unknown) {
      // Ante error del backend: NO confirmación verde, NO archivar, NO eliminar de la lista
      setProcessingId(null);
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo aplicar el ajuste. Verificá la conexión y reintentá.';
      setErrorMap((prev) => ({ ...prev, [notice.id]: message }));
    }
  };

  const pendingCount = isPF ? alerts.length : athleteRecommendations.length;
  const panelTitle = isPF ? 'Centro de Avisos' : 'Notificaciones';
  const buttonAriaLabel = isPF
    ? pendingCount > 0
      ? `Centro de Avisos (${pendingCount} pendientes)`
      : 'Centro de Avisos'
    : pendingCount > 0
      ? `Notificaciones (${pendingCount} disponibles)`
      : 'Notificaciones';

  return (
    <div className="shell-notifications-wrap" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="shell-icon-btn"
        onClick={() => setOpen(!open)}
        aria-label={buttonAriaLabel}
        title={panelTitle}
        aria-expanded={open}
      >
        <Bell size={20} aria-hidden="true" />
        {pendingCount > 0 && (
          <span className="shell-badge-count" aria-hidden="true">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="shell-popover notice-center-popover" role="region" aria-label={panelTitle}>
          <div className="notice-center-header">
            <div className="notice-center-title-wrap">
              <h3 className="notice-center-title">{panelTitle}</h3>
              {pendingCount > 0 && <span className="notice-center-count-pill">{pendingCount}</span>}
            </div>
          </div>

          <div className="notice-center-body">
            {loading ? (
              <div className="notice-center-empty">
                <Loader2 size={24} className="notice-spin" aria-hidden="true" />
                <p className="notice-empty-desc">
                  {isPF ? 'Cargando avisos...' : 'Cargando notificaciones...'}
                </p>
              </div>
            ) : loadError ? (
              // Fallo del back: estado vacío amigable (sin datos de ejemplo)
              <div className="notice-center-empty">
                <CheckCircle2 size={32} className="notice-center-empty-icon" aria-hidden="true" />
                <p className="notice-center-empty-title">
                  {isPF
                    ? 'Sin avisos pendientes por el momento'
                    : 'Sin notificaciones por el momento'}
                </p>
                <p className="notice-empty-desc">
                  {isPF
                    ? 'Cuando haya alertas preventivas para revisar, las vas a ver acá.'
                    : 'Cuando tu preparador físico apruebe recomendaciones para vos, las vas a ver acá.'}
                </p>
              </div>
            ) : pendingCount === 0 ? (
              <div className="notice-center-empty">
                <CheckCircle2 size={32} className="notice-center-empty-icon" aria-hidden="true" />
                <p className="notice-center-empty-title">Todo al día</p>
                <p className="notice-empty-desc">
                  {isPF
                    ? 'No hay alertas de sobrecarga o dolor pendientes de revisión.'
                    : 'No tenés recomendaciones o avisos pendientes de tu preparador físico.'}
                </p>
              </div>
            ) : isAthlete ? (
              athleteRecommendations.map((rec) => (
                <article
                  key={rec.id}
                  className="notice-card"
                  aria-label={`Notificación: ${rec.title}`}
                >
                  <header className="notice-card-header">
                    <div className="notice-card-athlete-wrap">
                      <span className="notice-card-athlete-name">{rec.title}</span>
                      {rec.categoryName && (
                        <span className="notice-card-time">{rec.categoryName}</span>
                      )}
                    </div>
                    <span className="notice-severity-badge notice-severity-low">
                      {rec.type === 'Habits' ? 'Hábitos' : 'Entrenamiento'}
                    </span>
                  </header>

                  <div className="notice-card-body">
                    {rec.reason && (
                      <div>
                        <span className="notice-card-label">Motivo</span>
                        <span>{capitalizeFirst(rec.reason)}</span>
                      </div>
                    )}
                    <div>
                      <span className="notice-card-label">Recomendación de tu PF</span>
                      <span>{previewRecommendationText(rec.recommendationText)}</span>
                    </div>
                    {rec.legalDisclaimer && (
                      <div role="note">
                        <Info size={13} aria-hidden="true" /> <span>{rec.legalDisclaimer}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      className="notice-card-link"
                      onClick={openFullRecommendations}
                      aria-label={`Ver recomendación completa: ${rec.title}`}
                    >
                      Ver recomendación completa
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              alerts.map((notice) => {
                const isProcessing = processingId === notice.id;
                const isConfirmed = confirmedInfo?.id === notice.id;
                const noticeError = errorMap[notice.id];

                return (
                  <article
                    key={notice.id}
                    className="notice-card"
                    aria-label={`Aviso de ${notice.athleteName}`}
                  >
                    <header className="notice-card-header">
                      <div className="notice-card-athlete-wrap">
                        <span className="notice-card-athlete-name">{notice.athleteName}</span>
                        <span className="notice-card-time">{notice.generatedAt}</span>
                      </div>
                      <span
                        className={`notice-severity-badge notice-severity-${notice.severity.toLowerCase()}`}
                      >
                        {notice.severity === 'High' && (
                          <AlertTriangle size={12} aria-hidden="true" />
                        )}
                        {notice.severity === 'High'
                          ? 'Alta prioridad'
                          : notice.severity === 'Medium'
                            ? 'Media prioridad'
                            : 'Baja prioridad'}
                      </span>
                    </header>

                    <div className="notice-card-body">
                      <div>
                        <span className="notice-card-label">Motivo reportado</span>
                        <span>{formatAlertReason(notice.reason)}</span>
                      </div>
                      <div>
                        <span className="notice-card-label">Sugerencia recomendada</span>
                        <span>{notice.suggestion}</span>
                      </div>
                    </div>

                    <div className="notice-card-action-wrap">
                      {isConfirmed ? (
                        <button
                          type="button"
                          className="btn-one-click confirmed"
                          disabled
                          aria-live="polite"
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                          <span>{confirmedInfo?.message}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={`btn-one-click${isProcessing ? ' loading' : ''}`}
                            onClick={() => handleApplyOneClick(notice)}
                            disabled={
                              isProcessing || Boolean(processingId) || Boolean(confirmedInfo)
                            }
                            aria-label={`${notice.actionLabel || 'Aplicar con 1 clic'}: ${notice.athleteName}`}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={15} className="notice-spin" aria-hidden="true" />
                                <span>Aplicando…</span>
                              </>
                            ) : (
                              <>
                                <Zap size={15} aria-hidden="true" />
                                <span>{notice.actionLabel || 'Aplicar con 1 clic'}</span>
                              </>
                            )}
                          </button>
                          {noticeError && (
                            <div
                              className="notice-card-error-msg"
                              role="alert"
                              style={{
                                color: 'var(--danger)',
                                fontSize: '0.75rem',
                                marginTop: '0.35rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <AlertTriangle size={13} aria-hidden="true" />
                              <span>{noticeError}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
      {adjustmentNotice && (
        <DayAdjustmentModal
          athleteId={adjustmentNotice.athleteId}
          athleteName={adjustmentNotice.athleteName}
          isOpen
          onClose={() => setAdjustmentNotice(null)}
          onAdjustmentApplied={(adjustment) => {
            if (adjustment.status !== 'Approved') return;
            const noticeId = adjustmentNotice.id;
            setAlerts((prev) => prev.filter((item) => item.id !== noticeId));
            // Si el archivado falla, el aviso vuelve a aparecer en la próxima carga
            alertsService.archiveAlert(noticeId).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
};

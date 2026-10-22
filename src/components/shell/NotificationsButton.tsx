import React, { useState, useEffect, useRef } from 'react';
import { Bell, Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { alertsService } from '../../api/alertsService';
import { NoticeItem } from '../../types/alerts';
import { useAuth } from '../../context/AuthContext';

export const NotificationsButton: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmedInfo, setConfirmedInfo] = useState<{ id: string; message: string } | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar avisos iniciales desde alertsService solo si el rol es PreparadorFisico
  useEffect(() => {
    if (user?.role !== 'PreparadorFisico') {
      return;
    }

    let isMounted = true;
    alertsService
      .getPendingAlerts()
      .then((data) => {
        if (isMounted) {
          setAlerts(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Si no está autenticado como PF, no renderiza nada (aislamiento total en UI)
  if (user?.role !== 'PreparadorFisico') {
    return null;
  }

  // Manejo de la acción «Aplicar con 1 Clic» con háptica, confirmación visual verde y archivado persistente
  const handleApplyOneClick = async (notice: NoticeItem) => {
    if (processingId || confirmedInfo) return;

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
      const message = notice.isDemo
        ? 'Ajuste simulado (Demo)'
        : result.pendingArchiving
          ? 'Ajuste aplicado (archivado pendiente)'
          : 'Ajuste aplicado correctamente';

      setConfirmedInfo({ id: notice.id, message });

      // Mantener la confirmación visual durante 1.5s antes de archivar de la vista
      setTimeout(() => {
        setAlerts((prev) => prev.filter((item) => item.id !== notice.id));
        setConfirmedInfo((curr) => (curr?.id === notice.id ? null : curr));
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

  const pendingCount = alerts.length;
  const hasDemoNotices = alerts.some((a) => a.isDemo);

  return (
    <div className="shell-notifications-wrap" ref={containerRef}>
      <button
        type="button"
        className="shell-icon-btn"
        onClick={() => setOpen(!open)}
        aria-label={
          pendingCount > 0 ? `Centro de Avisos (${pendingCount} pendientes)` : 'Centro de Avisos'
        }
        title="Centro de Avisos"
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
        <div
          className="shell-popover notice-center-popover"
          role="region"
          aria-label="Centro de Avisos"
        >
          <div className="notice-center-header">
            <div className="notice-center-title-wrap">
              <h3 className="notice-center-title">Centro de Avisos</h3>
              {pendingCount > 0 && <span className="notice-center-count-pill">{pendingCount}</span>}
            </div>
            {hasDemoNotices && (
              <span
                className="notice-severity-badge notice-severity-low"
                title="Avisos de demostración visual (no impactan persistencia real)"
              >
                Avisos de ejemplo
              </span>
            )}
          </div>

          <div className="notice-center-body">
            {loading ? (
              <div className="notice-center-empty">
                <Loader2 size={24} className="notice-spin" aria-hidden="true" />
                <p className="notice-empty-desc">Cargando avisos...</p>
              </div>
            ) : pendingCount === 0 ? (
              <div className="notice-center-empty">
                <CheckCircle2 size={32} className="notice-center-empty-icon" aria-hidden="true" />
                <p className="notice-center-empty-title">Todo al día</p>
                <p className="notice-empty-desc">
                  No hay alertas de sobrecarga o dolor pendientes de revisión.
                </p>
              </div>
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
                        <span>{notice.reason}</span>
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
                            aria-label={`Aplicar con 1 Clic para ${notice.athleteName}`}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 size={15} className="notice-spin" aria-hidden="true" />
                                <span>
                                  {notice.isDemo ? 'Simulando ajuste...' : 'Aplicando ajuste...'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Zap size={15} aria-hidden="true" />
                                <span>
                                  {notice.isDemo
                                    ? notice.actionLabel || 'Simular ajuste (Demo)'
                                    : notice.actionLabel || 'Aplicar con 1 Clic'}
                                </span>
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
    </div>
  );
};

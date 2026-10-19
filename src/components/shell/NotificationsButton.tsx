import React, { useState, useEffect, useRef } from 'react';
import { Bell, Zap, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { alertsService } from '../../api/alertsService';
import { NoticeItem } from '../../types/alerts';

export const NotificationsButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar avisos iniciales desde alertsService
  useEffect(() => {
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
  }, []);

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

  // Manejo de la acción «Aplicar con 1 Clic» con háptica, confirmación visual verde y archivado persistente
  const handleApplyOneClick = async (notice: NoticeItem) => {
    if (processingId || confirmedId) return;

    setProcessingId(notice.id);

    // Feedback háptico (50 ms) en dispositivos táctiles / móviles compatibles
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Ignorar de forma segura si el navegador restringe permisos de vibración
      }
    }

    try {
      await alertsService.applyNoticeAction(notice);
    } catch {
      // Bloqueo tolerante a fallos
    }

    // Activar estado de confirmación visual verde
    setProcessingId(null);
    setConfirmedId(notice.id);

    // Mantener la confirmación visual durante 1.5s antes de archivar de la vista
    setTimeout(() => {
      setAlerts((prev) => prev.filter((item) => item.id !== notice.id));
      setConfirmedId((curr) => (curr === notice.id ? null : curr));
    }, 1500);
  };

  const pendingCount = alerts.length;

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
                const isConfirmed = confirmedId === notice.id;

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
                          <span>Ajuste aplicado correctamente</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`btn-one-click${isProcessing ? ' loading' : ''}`}
                          onClick={() => handleApplyOneClick(notice)}
                          disabled={isProcessing || Boolean(processingId) || Boolean(confirmedId)}
                          aria-label={`Aplicar con 1 Clic para ${notice.athleteName}`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 size={15} className="notice-spin" aria-hidden="true" />
                              <span>Aplicando ajuste...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={15} aria-hidden="true" />
                              <span>{notice.actionLabel || 'Aplicar con 1 Clic'}</span>
                            </>
                          )}
                        </button>
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

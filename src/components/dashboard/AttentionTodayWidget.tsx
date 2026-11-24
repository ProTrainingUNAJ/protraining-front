import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Check,
  ClipboardCheck,
  Lightbulb,
  UserRound,
  Wrench,
} from 'lucide-react';
import { ProfileAvatar } from '../common/ProfileAvatar';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import type { AthleteTrafficLightItem } from '../monitoring/trafficLight.types';
import { TelegramIcon, WhatsAppIcon } from '../common/BrandIcons';
import { buildWhatsAppLink } from '../../utils/whatsapp';
import { buildTelegramLink } from '../../utils/telegram';
import { buildPfToAthleteMessage } from '../../utils/contactTemplates';
import { buildAttentionReasons, sortByAttention, summarizeNames } from '../../utils/attentionToday';
import { ALERTS_CHANGED_EVENT, alertsService } from '../../api/alertsService';
import type { NoticeItem } from '../../types/alerts';
import { WidgetErrorState } from './WidgetErrorState';
import './dashboardWidgets.css';

interface AttentionTodayWidgetProps {
  athletes: AthleteTrafficLightItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onViewProfile: (athlete: AthleteTrafficLightItem) => void;
  onAdjustRoutine: (athlete: AthleteTrafficLightItem) => void;
}

const STATUS_LABEL = { red: 'Rojo', yellow: 'Amarillo' } as const;

// Los primeros (rojos antes que amarillos) se ven siempre; el resto, con "Ver N más". Con 8 atletas
// marcados la tarjeta medía ~1400 px y estiraba toda la fila 1 (KAN-594).
const VISIBLE_ATHLETES = 3;

const SEVERITY_WEIGHT = { High: 0, Medium: 1, Low: 2 } as const;

// Botón de la sugerencia según lo que el back propone hacer con el aviso
// La propuesta de ajuste de rutina solo existe si la rutina de HOY carga la zona con dolor
// (hasDayConflict). Si no, abrirla da "no tiene conflictos": no hay nada que ajustar hoy.
function hasRoutineProposalToday(notice: NoticeItem, athlete: AthleteTrafficLightItem): boolean {
  return notice.actionType === 'routine_adjustment' && Boolean(athlete.hasDayConflict);
}

function noticeActionLabel(notice: NoticeItem, athlete: AthleteTrafficLightItem): string {
  if (notice.actionType === 'load_reduction') return 'Aplicar ajuste';
  if (hasRoutineProposalToday(notice, athlete)) return 'Ver propuesta';
  return 'Marcar revisado';
}

// WhatsApp y Telegram con el mismo botón que "Ver ficha". A un menor se le escribe al tutor, y
// nunca por Telegram (misma regla que Seguimiento, KAN-503).
const ContactButtons: React.FC<{ athlete: AthleteTrafficLightItem }> = ({ athlete }) => {
  const isMinor = Boolean(athlete.isMinor);
  const whatsapp = buildWhatsAppLink(
    isMinor ? athlete.guardianPhone : athlete.phone,
    buildPfToAthleteMessage(athlete),
  );
  const telegram = isMinor ? null : buildTelegramLink(athlete.telegramUsername);
  return (
    <>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="dash-w__btn"
          aria-label={
            isMinor
              ? `Escribirle al tutor de ${athlete.name} por WhatsApp`
              : `Escribirle a ${athlete.name} por WhatsApp`
          }
        >
          <WhatsAppIcon size={14} aria-hidden="true" />
          WhatsApp
        </a>
      )}
      {telegram && (
        <a
          href={telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="dash-w__btn"
          aria-label={`Escribirle a ${athlete.name} por Telegram`}
        >
          <TelegramIcon size={14} aria-hidden="true" />
          Telegram
        </a>
      )}
    </>
  );
};

type NoticeState =
  | { status: 'working' }
  | { status: 'later' }
  | { status: 'done'; message: string; sessionDate?: string }
  | { status: 'error'; message: string };

/**
 * Panel "Requieren atención hoy" del Inicio del PF (KAN-594): los atletas en rojo o amarillo con
 * el motivo y QUÉ HACER: la sugerencia del aviso pendiente del Centro de Avisos con su acción
 * ("Aplicar ajuste", "Ver propuesta" o "Marcar revisado"), "Ajustar rutina" si la rutina de hoy
 * carga una zona con dolor, "Ver ficha" y el contacto por WhatsApp o Telegram (a un menor, al
 * tutor). Los que no hicieron el check-in van contados en una línea.
 */
/** "jue 26/11" a partir de "2026-11-26", sin pasar por UTC (que corre el día). */
const formatSessionDay = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(year, month - 1, day);
  const weekday = date.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '');
  return `${weekday} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
};

export const AttentionTodayWidget: React.FC<AttentionTodayWidgetProps> = ({
  athletes,
  loading = false,
  error = null,
  onRetry,
  onViewProfile,
  onAdjustRoutine,
}) => {
  const navigate = useNavigate();
  const showSkeleton = useDelayedLoading(loading);

  const flagged = useMemo(
    () => sortByAttention(athletes.filter((a) => a.status === 'red' || a.status === 'yellow')),
    [athletes],
  );
  const missing = useMemo(() => athletes.filter((a) => a.status === 'gray'), [athletes]);
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, flagged.length - VISIBLE_ATHLETES);
  const visible = expanded ? flagged : flagged.slice(0, VISIBLE_ATHLETES);

  // La sugerencia del aviso pendiente de cada atleta (KAN-474/478). Si el Asistente no responde,
  // la tarjeta sigue mostrando el motivo, sin sugerencia: el resto del Inicio no depende de la IA.
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticeState, setNoticeState] = useState<Record<string, NoticeState>>({});
  // Un aviso aplicado deja de estar pendiente y desaparecería: se guarda para mostrar "Aplicado"
  const [resolvedById, setResolvedById] = useState<Record<string, NoticeItem>>({});
  const loadNotices = useCallback(() => {
    alertsService
      .getPendingAlerts()
      .then(setNotices)
      .catch(() => setNotices([]));
  }, []);
  useEffect(() => {
    loadNotices();
    window.addEventListener(ALERTS_CHANGED_EVENT, loadNotices);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, loadNotices);
  }, [loadNotices]);
  const noticeByAthlete = useMemo(() => {
    const map = new Map<string, NoticeItem>();
    for (const notice of notices) {
      const key = notice.athleteId.toLowerCase();
      const current = map.get(key);
      if (!current || SEVERITY_WEIGHT[notice.severity] < SEVERITY_WEIGHT[current.severity]) {
        map.set(key, notice);
      }
    }
    return map;
  }, [notices]);

  const handleNotice = async (notice: NoticeItem, athlete: AthleteTrafficLightItem) => {
    // El ajuste de rutina no se aplica a ciegas: se abre la propuesta del día (KAN-452)
    if (hasRoutineProposalToday(notice, athlete)) {
      onAdjustRoutine(athlete);
      return;
    }
    setNoticeState((prev) => ({ ...prev, [notice.id]: { status: 'working' } }));
    try {
      // Un ajuste de rutina sin propuesta hoy solo se puede marcar como revisado
      const result =
        notice.actionType === 'routine_adjustment'
          ? await alertsService
              .archiveAlert(notice.id)
              .then(() => ({ success: true, message: 'Aviso marcado como revisado' }))
          : await alertsService.applyNoticeAction(notice);
      setResolvedById((prev) => ({ ...prev, [notice.id]: notice }));
      setNoticeState((prev) => ({
        ...prev,
        [notice.id]: { status: 'done', message: result.message },
      }));
      // La campana se actualiza sola; esta tarjeta mantiene el "Aplicado" hasta recargar
      window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo aplicar. Probá de nuevo.';
      // El ajuste se aplica sobre la sesión de hoy: si hoy no entrena no es un error, el aviso
      // sigue pendiente para el próximo día con sesión (el back no acepta otra fecha todavía).
      const noSessionToday = /no tiene una sesi[oó]n/i.test(message);
      setNoticeState((prev) => ({
        ...prev,
        [notice.id]: noSessionToday ? { status: 'later' } : { status: 'error', message },
      }));
    }
  };

  // Hoy no entrena: el PF puede dejar el ajuste hecho para la próxima sesión (KAN-481)
  const handleNextSession = async (notice: NoticeItem) => {
    setNoticeState((prev) => ({ ...prev, [notice.id]: { status: 'working' } }));
    try {
      const result = await alertsService.applyToNextSession(notice.id);
      setResolvedById((prev) => ({ ...prev, [notice.id]: notice }));
      setNoticeState((prev) => ({
        ...prev,
        [notice.id]: { status: 'done', message: result.message, sessionDate: result.sessionDate },
      }));
      window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo aplicar. Probá de nuevo.';
      setNoticeState((prev) => ({ ...prev, [notice.id]: { status: 'error', message } }));
    }
  };

  const noticeFor = (athlete: AthleteTrafficLightItem): NoticeItem | undefined =>
    noticeByAthlete.get(athlete.id.toLowerCase()) ??
    Object.values(resolvedById).find((n) => n.athleteId.toLowerCase() === athlete.id.toLowerCase());

  return (
    <section className="dash-w attention-widget" aria-labelledby="attention-widget-title">
      <header className="dash-w__header">
        <h3 id="attention-widget-title" className="dash-w__eyebrow">
          <AlertCircle size={14} aria-hidden="true" className="dash-w__eyebrow-icon" />
          Requieren atención hoy
        </h3>
        {!loading && !error && flagged.length > 0 && (
          <span className="dash-w__count">
            {flagged.length} {flagged.length === 1 ? 'atleta' : 'atletas'}
          </span>
        )}
      </header>

      {error ? (
        <WidgetErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        showSkeleton ? (
          <div className="attention-widget__skeleton" aria-label="Cargando atletas" role="status">
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
            <span className="dash-w__skeleton-row" />
          </div>
        ) : null
      ) : (
        <>
          {flagged.length === 0 ? (
            <p className="dash-w__empty">
              {athletes.length === 0
                ? 'Todavía no hay atletas en tus planteles.'
                : missing.length === athletes.length
                  ? // Sin ningún check-in no se sabe cómo llegan: no es lo mismo que "están todos bien"
                    'Todavía nadie hizo el check-in: no se sabe cómo llegan.'
                  : 'Nadie necesita atención hoy.'}
            </p>
          ) : (
            <ul className="attention-widget__list" id="attention-widget-list">
              {visible.map((athlete) => {
                const reasons = buildAttentionReasons(athlete);
                const status = athlete.status as 'red' | 'yellow';
                const notice = noticeFor(athlete);
                const state = notice ? noticeState[notice.id] : undefined;
                // Si el aviso ya propone el ajuste de rutina, "Ajustar rutina" sería el mismo botón
                const showAdjust =
                  athlete.hasDayConflict && notice?.actionType !== 'routine_adjustment';
                const nothingToAdjustToday =
                  notice?.actionType === 'routine_adjustment' && !athlete.hasDayConflict;
                return (
                  <li key={athlete.id} className="attention-widget__item">
                    <ProfileAvatar src={athlete.avatarUrl} name={athlete.name} size={36} />
                    <div className="attention-widget__main">
                      <div className="attention-widget__name-row">
                        <span className="attention-widget__name">{athlete.name}</span>
                        <span className={`dash-w__chip dash-w__chip--${status}`}>
                          <span className="dash-w__dot" aria-hidden="true" />
                          {STATUS_LABEL[status]}
                        </span>
                      </div>
                      <span className="attention-widget__category">{athlete.category}</span>
                      {reasons.length > 0 && (
                        <p className="attention-widget__reason">{reasons.join(' · ')}</p>
                      )}
                      {athlete.hasDayConflict && (
                        <p className="attention-widget__conflict">
                          La rutina de hoy carga esa zona
                        </p>
                      )}
                    </div>

                    {notice && (
                      <div className="attention-widget__suggestion">
                        <Lightbulb size={14} aria-hidden="true" />
                        <p>
                          <span className="attention-widget__suggestion-label">Qué hacer:</span>{' '}
                          {notice.suggestion}
                        </p>
                      </div>
                    )}

                    {/* Fuera del bloque del nombre: usan todo el ancho y entran en una línea */}
                    <div className="attention-widget__actions">
                      {notice &&
                        (state?.status === 'done' ? (
                          <span className="attention-widget__done" role="status">
                            <Check size={14} aria-hidden="true" />
                            {notice.actionType !== 'load_reduction'
                              ? 'Revisado'
                              : state.sessionDate
                                ? `Aplicado para el ${formatSessionDay(state.sessionDate)}`
                                : 'Aplicado'}
                          </span>
                        ) : state?.status === 'later' ? (
                          <button
                            type="button"
                            className="dash-w__btn dash-w__btn--primary"
                            onClick={() => handleNextSession(notice)}
                            aria-label={`Aplicar en la próxima sesión de ${athlete.name}: ${notice.suggestion}`}
                          >
                            <CalendarClock size={14} aria-hidden="true" />
                            Aplicar en la próxima sesión
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="dash-w__btn dash-w__btn--primary"
                            onClick={() => handleNotice(notice, athlete)}
                            disabled={state?.status === 'working'}
                            aria-label={`${noticeActionLabel(notice, athlete)} para ${athlete.name}: ${notice.suggestion}`}
                          >
                            {state?.status === 'working'
                              ? 'Aplicando…'
                              : noticeActionLabel(notice, athlete)}
                          </button>
                        ))}
                      <button
                        type="button"
                        className="dash-w__btn"
                        onClick={() => onViewProfile(athlete)}
                        aria-label={`Ver ficha de ${athlete.name}`}
                      >
                        <UserRound size={14} aria-hidden="true" />
                        Ver ficha
                      </button>
                      {showAdjust && (
                        <button
                          type="button"
                          className="dash-w__btn dash-w__btn--primary"
                          onClick={() => onAdjustRoutine(athlete)}
                          aria-label={`Ajustar rutina de hoy de ${athlete.name}`}
                        >
                          <Wrench size={14} aria-hidden="true" />
                          Ajustar rutina
                        </button>
                      )}
                      <ContactButtons athlete={athlete} />
                    </div>
                    {/* El error del back va pegado al botón que lo causó (ej.: "no tiene sesión hoy") */}
                    {notice && state?.status === 'error' && (
                      <p className="attention-widget__suggestion-error" role="alert">
                        <AlertCircle size={14} aria-hidden="true" />
                        No se pudo aplicar: {state.message}
                      </p>
                    )}
                    {notice && nothingToAdjustToday && state?.status !== 'done' && (
                      <p className="attention-widget__suggestion-later" role="status">
                        <CalendarClock size={14} aria-hidden="true" />
                        Hoy su rutina no carga esa zona: no hay nada que ajustar. El día que la
                        cargue, vas a ver acá la propuesta.
                      </p>
                    )}
                    {notice && state?.status === 'later' && (
                      <p className="attention-widget__suggestion-later" role="status">
                        <CalendarClock size={14} aria-hidden="true" />
                        Hoy no entrena. Podés dejar el ajuste aplicado en su próxima sesión.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {hiddenCount > 0 && (
            <button
              type="button"
              className="dash-w__link attention-widget__more"
              aria-expanded={expanded}
              aria-controls="attention-widget-list"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Ver menos' : `Ver ${hiddenCount} más`}
            </button>
          )}

          {missing.length > 0 && (
            <div className="attention-widget__missing">
              <ClipboardCheck size={15} aria-hidden="true" />
              <p>
                <strong>{missing.length} sin check-in:</strong>{' '}
                {summarizeNames(missing.map((a) => a.name))}.
              </p>
              <button
                type="button"
                className="btn btn-primary dash-w__cta"
                onClick={() =>
                  navigate('/pf/monitoring?filter=gray', { state: { filter: 'gray' } })
                }
              >
                Ver quiénes faltan
                <ArrowRight size={13} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

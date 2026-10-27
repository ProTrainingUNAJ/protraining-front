import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronRight, Loader2, X } from 'lucide-react';
import {
  AthleteInjury,
  InjuryStatus,
  createAthleteInjury,
  listAthleteInjuries,
  updateInjuryStatus,
} from '../../api/seguimientoService';

/**
 * Lesiones del atleta (KAN-421): lista el historial de lesiones, registra una
 * nueva y muestra el stepper de 3 pasos (Activa → En recuperación → Alta
 * médica) con el que el PF avanza de estado registrando sus observaciones
 * clínicas. La máquina de estados estricta vive en el backend (KAN-420): acá
 * solo se ofrece la transición siguiente, nunca el salto directo.
 */
interface AthleteInjuriesModalProps {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
}

const STATUS_ORDER: InjuryStatus[] = ['Active', 'InRecovery', 'MedicallyCleared'];

const STATUS_LABELS: Record<InjuryStatus, string> = {
  Active: 'Activa',
  InRecovery: 'En recuperación',
  MedicallyCleared: 'Alta médica',
};

const STATUS_BADGES: Record<InjuryStatus, string> = {
  Active: 'badge badge-danger',
  InRecovery: 'badge badge-warning',
  MedicallyCleared: 'badge badge-success',
};

// Única transición posible por estado: el stepper no puede ofrecer el salto
// directo Active → MedicallyCleared (la regla de negocio la valida el back).
const NEXT_STATUS: Partial<Record<InjuryStatus, InjuryStatus>> = {
  Active: 'InRecovery',
  InRecovery: 'MedicallyCleared',
};

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

// La fecha sin hora ("2026-10-27") se compara como texto: el orden ISO es
// cronológico, igual que la regla del dominio (solo importa el día).
function isReturnDateAfterInjuryDate(injuryDate: string, estimatedReturnDate: string): boolean {
  return estimatedReturnDate > injuryDate;
}

export function AthleteInjuriesModal({
  athleteId,
  athleteName,
  onClose,
}: AthleteInjuriesModalProps) {
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Avance del stepper (con observaciones clínicas obligatorias).
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingTransition, setSavingTransition] = useState(false);

  // Alta de una lesión nueva.
  const [zone, setZone] = useState('');
  const [description, setDescription] = useState('');
  const [injuryDate, setInjuryDate] = useState('');
  const [estimatedReturnDate, setEstimatedReturnDate] = useState('');
  const [savingInjury, setSavingInjury] = useState(false);

  useEffect(() => {
    let active = true;
    listAthleteInjuries(athleteId)
      .then((data) => {
        if (active) setInjuries(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las lesiones.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [athleteId]);

  // Con el textarea de observaciones abierto, Escape cancela el avance;
  // si no, cierra el modal (igual que AthleteRecordsModal).
  useEffect(() => {
    if (savingTransition || savingInjury) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (advancingId) {
        setAdvancingId(null);
        setNotes('');
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, advancingId, savingTransition, savingInjury]);

  const startAdvance = (injury: AthleteInjury) => {
    setError(null);
    setSavedMessage(null);
    setAdvancingId(injury.id);
    setNotes('');
  };

  const cancelAdvance = () => {
    setAdvancingId(null);
    setNotes('');
  };

  const confirmAdvance = async (injury: AthleteInjury) => {
    const nextStatus = NEXT_STATUS[injury.status];
    if (!nextStatus) return;

    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      setError('Las observaciones clínicas son obligatorias para avanzar de estado.');
      return;
    }

    setSavingTransition(true);
    setError(null);
    try {
      const updated = await updateInjuryStatus(injury.id, {
        newStatus: nextStatus,
        transitionNotes: trimmedNotes,
      });
      setInjuries((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSavedMessage(`Lesión actualizada a "${STATUS_LABELS[nextStatus]}".`);
      setAdvancingId(null);
      setNotes('');
    } catch (err: unknown) {
      // El back puede rechazar con 400 (p. ej. salto directo o nota vacía):
      // se muestra su ProblemDetails traducida, sin tildar al usuario.
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la lesión.');
    } finally {
      setSavingTransition(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!zone.trim()) {
      setError('La zona de la lesión es obligatoria.');
      return;
    }
    if (!description.trim()) {
      setError('La descripción de la lesión es obligatoria.');
      return;
    }
    if (!injuryDate || !estimatedReturnDate) {
      setError('La fecha de la lesión y la de retorno estimada son obligatorias.');
      return;
    }
    if (!isReturnDateAfterInjuryDate(injuryDate, estimatedReturnDate)) {
      setError('La fecha de retorno estimada debe ser posterior a la fecha de la lesión.');
      return;
    }

    setSavingInjury(true);
    setError(null);
    try {
      const created = await createAthleteInjury(athleteId, {
        zone: zone.trim(),
        description: description.trim(),
        injuryDate,
        estimatedReturnDate,
      });
      setInjuries((current) => [...current, created]);
      setSavedMessage(`Lesión registrada en "${STATUS_LABELS[created.status]}".`);
      setZone('');
      setDescription('');
      setInjuryDate('');
      setEstimatedReturnDate('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la lesión.');
    } finally {
      setSavingInjury(false);
    }
  };

  const busy = savingTransition || savingInjury;

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="athlete-injuries-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plan-picker-header">
          <h2 id="athlete-injuries-title">Lesiones de {athleteName}</h2>
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="plan-empty">
          El stepper avanza de a un paso: de Activa a En recuperación y recién ahí a Alta médica.
          Cada avance exige registrar las observaciones clínicas.
        </p>

        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {savedMessage && (
          <div className="alert-banner success" role="status">
            <span className="plan-inline">
              <Check size={18} aria-hidden="true" />
              {savedMessage}
            </span>
          </div>
        )}

        {loading ? (
          <p className="plan-empty plan-inline">
            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
            Cargando lesiones…
          </p>
        ) : injuries.length === 0 ? (
          <p className="plan-empty">Todavía no tiene lesiones registradas.</p>
        ) : (
          <ul className="injury-list">
            {injuries.map((injury) => {
              const currentIndex = STATUS_ORDER.indexOf(injury.status);
              const nextStatus = NEXT_STATUS[injury.status];
              const isAdvancing = advancingId === injury.id;

              return (
                <li key={injury.id} className="injury-item">
                  <div className="injury-item-header">
                    <span className="injury-item-title">{injury.zone}</span>
                    <span className={STATUS_BADGES[injury.status]}>
                      {STATUS_LABELS[injury.status]}
                    </span>
                  </div>

                  <p className="injury-item-desc">{injury.description}</p>

                  <div className="injury-item-dates">
                    <span>Lesión: {formatDate(injury.injuryDate)}</span>
                    <span>Retorno estimado: {formatDate(injury.estimatedReturnDate)}</span>
                    {injury.clearedAt && <span>Alta: {formatDate(injury.clearedAt)}</span>}
                  </div>

                  <ol
                    className="injury-stepper"
                    aria-label={`Estado: ${STATUS_LABELS[injury.status]}`}
                  >
                    {STATUS_ORDER.map((status, index) => {
                      const stepState =
                        index < currentIndex
                          ? 'is-done'
                          : index === currentIndex
                            ? 'is-current'
                            : 'is-pending';
                      return (
                        <li
                          key={status}
                          className={`injury-step ${stepState}`}
                          aria-current={index === currentIndex ? 'step' : undefined}
                        >
                          <span className="injury-step-dot" aria-hidden="true">
                            {index + 1}
                          </span>
                          <span className="injury-step-label">{STATUS_LABELS[status]}</span>
                        </li>
                      );
                    })}
                  </ol>

                  {isAdvancing ? (
                    <div className="injury-advance">
                      <label className="plan-field">
                        <span>Observaciones clínicas (obligatorio)</span>
                        <textarea
                          rows={3}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          disabled={savingTransition}
                          placeholder="Evolución, carga entrenada, molestias…"
                        />
                      </label>
                      <div className="plan-picker-pager">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={cancelAdvance}
                          disabled={savingTransition}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => confirmAdvance(injury)}
                          disabled={savingTransition || !notes.trim()}
                        >
                          {savingTransition && (
                            <Loader2 size={16} className="plan-spin" aria-hidden="true" />
                          )}
                          <span>Avanzar a {STATUS_LABELS[nextStatus!]}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    nextStatus &&
                    !advancingId && (
                      <button
                        type="button"
                        className="btn btn-secondary injury-advance-btn"
                        onClick={() => startAdvance(injury)}
                        disabled={busy}
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                        <span>Avanzar a {STATUS_LABELS[nextStatus]}</span>
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form className="records-form" onSubmit={handleCreate}>
          <h3>Registrar una lesión</h3>

          <div className="records-form-row">
            <label className="plan-field">
              <span>Zona</span>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                disabled={busy}
                placeholder="Ej.: isquiotibiales"
              />
            </label>
            <label className="plan-field">
              <span>Lesión</span>
              <input
                type="date"
                value={injuryDate}
                onChange={(e) => setInjuryDate(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="plan-field">
              <span>Retorno estimado</span>
              <input
                type="date"
                value={estimatedReturnDate}
                onChange={(e) => setEstimatedReturnDate(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <label className="plan-field">
            <span>Descripción</span>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              placeholder="Ej.: Gradación 3 tras sprint"
            />
          </label>

          <div className="plan-picker-pager">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cerrar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {savingInjury && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
              <span>{savingInjury ? 'Guardando…' : 'Registrar lesión'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

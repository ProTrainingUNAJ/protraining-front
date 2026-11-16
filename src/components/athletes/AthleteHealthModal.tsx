import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  HeartPulse,
  Loader2,
  ShieldCheck,
  X,
  Plus,
} from 'lucide-react';
import {
  AthleteInjury,
  InjuryStatus,
  createAthleteInjury,
  listAthleteInjuries,
  updateInjuryStatus,
} from '../../api/seguimientoService';
import { medicalRecordService } from '../../api/medicalRecord';
import { Athlete } from '../../types/structure';
import { MedicalRecord } from '../../types/medicalRecord';
import '../../styles/medicalRecord.css';

interface AthleteHealthModalProps {
  athlete: Athlete;
  initialTab?: 'injuries' | 'medicalRecord';
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

const NEXT_STATUS: Partial<Record<InjuryStatus, InjuryStatus>> = {
  Active: 'InRecovery',
  InRecovery: 'MedicallyCleared',
};

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isReturnDateAfterInjuryDate(injuryDate: string, estimatedReturnDate: string): boolean {
  return estimatedReturnDate > injuryDate;
}

const COMMON_JUSTIFICATIONS = [
  'Evaluación física periódica del plantel',
  'Planificación de cargas de pretemporada',
  'Seguimiento y evolución post-lesión',
  'Certificado de aptitud física para torneo',
  'Revisión médica solicitada por el atleta',
];

export const AthleteHealthModal: React.FC<AthleteHealthModalProps> = ({
  athlete,
  initialTab = 'injuries',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'injuries' | 'medicalRecord'>(initialTab);
  const athleteName = athlete.fullName || `${athlete.firstName} ${athlete.lastName}`.trim();

  // --- Lesiones State ---
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [injuriesLoading, setInjuriesLoading] = useState(true);
  const [injuriesError, setInjuriesError] = useState<string | null>(null);

  // Nueva lesión
  const [showNewInjuryForm, setShowNewInjuryForm] = useState(false);
  const [injuryZone, setInjuryZone] = useState('');
  const [injuryDescription, setInjuryDescription] = useState('');
  const [injuryDate, setInjuryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [estimatedReturnDate, setEstimatedReturnDate] = useState('');
  const [injurySaving, setInjurySaving] = useState(false);

  // Transición de estado de lesión
  const [advancingInjuryId, setAdvancingInjuryId] = useState<string | null>(null);
  const [advancingNotes, setAdvancingNotes] = useState('');
  const [advancingSubmitting, setAdvancingSubmitting] = useState(false);

  // --- Ficha Médica State ---
  const [justification, setJustification] = useState('');
  const [justificationError, setJustificationError] = useState<string | null>(null);
  const [submittingJustification, setSubmittingJustification] = useState(false);
  const [authorizedJustification, setAuthorizedJustification] = useState<string | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [medicalError, setMedicalError] = useState<string | null>(null);

  // Carga de Lesiones
  useEffect(() => {
    let active = true;
    listAthleteInjuries(athlete.id)
      .then((data) => {
        if (active) setInjuries(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setInjuriesError(
            err instanceof Error ? err.message : 'No se pudo cargar el historial de lesiones.',
          );
        }
      })
      .finally(() => {
        if (active) setInjuriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [athlete.id]);

  // Manejo de nueva lesión
  const handleCreateInjury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!injuryZone.trim() || !injuryDescription.trim()) {
      setInjuriesError('Zona y descripción de la lesión son obligatorias.');
      return;
    }
    if (
      !estimatedReturnDate.trim() ||
      !isReturnDateAfterInjuryDate(injuryDate, estimatedReturnDate)
    ) {
      setInjuriesError(
        'La fecha estimada de retorno es obligatoria y debe ser posterior a la fecha de lesión.',
      );
      return;
    }

    setInjurySaving(true);
    setInjuriesError(null);

    try {
      const created = await createAthleteInjury(athlete.id, {
        zone: injuryZone.trim(),
        description: injuryDescription.trim(),
        injuryDate,
        estimatedReturnDate: estimatedReturnDate.trim(),
      });

      setInjuries((prev) => [created, ...prev]);
      setShowNewInjuryForm(false);
      setInjuryZone('');
      setInjuryDescription('');
      setEstimatedReturnDate('');
    } catch (err: unknown) {
      setInjuriesError(err instanceof Error ? err.message : 'No se pudo registrar la lesión.');
    } finally {
      setInjurySaving(false);
    }
  };

  // Manejo de avance de estado de lesión
  const handleAdvanceStatus = async (injury: AthleteInjury) => {
    const nextStatus = NEXT_STATUS[injury.status];
    if (!nextStatus) return;

    const trimmedNotes = advancingNotes.trim();
    if (!trimmedNotes) {
      setInjuriesError('Las observaciones clínicas son obligatorias para avanzar de estado.');
      return;
    }

    setAdvancingSubmitting(true);
    setInjuriesError(null);

    try {
      const updated = await updateInjuryStatus(injury.id, {
        newStatus: nextStatus,
        transitionNotes: trimmedNotes,
      });

      setInjuries((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setAdvancingInjuryId(null);
      setAdvancingNotes('');
    } catch (err: unknown) {
      setInjuriesError(
        err instanceof Error ? err.message : 'No se pudo actualizar el estado de la lesión.',
      );
    } finally {
      setAdvancingSubmitting(false);
    }
  };

  // Acceso con justificación a Ficha Médica
  const handleRequestMedicalAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanJustification = justification.trim();
    if (cleanJustification.length < 10) {
      setJustificationError('La justificación debe tener al menos 10 caracteres explicativos.');
      return;
    }

    setSubmittingJustification(true);
    setJustificationError(null);
    setMedicalError(null);

    try {
      const record = await medicalRecordService.getMedicalRecord(athlete.id, cleanJustification);
      setMedicalRecord(record);
      setAuthorizedJustification(cleanJustification);
    } catch (err: unknown) {
      setMedicalError(err instanceof Error ? err.message : 'No se pudo acceder a la ficha médica.');
    } finally {
      setSubmittingJustification(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-health-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '800px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Cabecera */}
        <div className="plan-picker-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <HeartPulse size={22} color="var(--danger)" aria-hidden="true" />
            <div>
              <h2
                id="modal-health-title"
                style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}
              >
                Salud y Ficha Médica · {athleteName}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Gestión de historial de lesiones, aptitud física y antecedentes confidenciales.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="coach-icon-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Pestañas */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem 0',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-subtle)',
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === 'injuries' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: '6px 6px 0 0' }}
            onClick={() => setActiveTab('injuries')}
          >
            <Activity size={15} aria-hidden="true" />
            <span>Historial de Lesiones</span>
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'medicalRecord' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: '6px 6px 0 0' }}
            onClick={() => setActiveTab('medicalRecord')}
          >
            <FileText size={15} aria-hidden="true" />
            <span>Ficha Médica & Apto Físico</span>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1 }}>
          {/* PESTAÑA 1: LESIONES */}
          {activeTab === 'injuries' && (
            <div>
              {injuriesError && (
                <div className="alert-banner danger" role="alert" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{injuriesError}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  Registro de Lesiones Deportivas ({injuries.length})
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => setShowNewInjuryForm(!showNewInjuryForm)}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{showNewInjuryForm ? 'Cancelar' : 'Registrar Lesión'}</span>
                </button>
              </div>

              {/* Formulario de nueva lesión */}
              {showNewInjuryForm && (
                <form
                  onSubmit={handleCreateInjury}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1.5px solid var(--secondary)',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      marginBottom: '0.75rem',
                      color: 'var(--primary)',
                    }}
                  >
                    Alta de Lesión Deportiva
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginBottom: '0.25rem',
                        }}
                      >
                        Zona afectada *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Isquiotibiales, Rodilla derecha…"
                        value={injuryZone}
                        onChange={(e) => setInjuryZone(e.target.value)}
                        required
                        style={{ width: '100%', margin: 0 }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginBottom: '0.25rem',
                        }}
                      >
                        Descripción / Diagnóstico *
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Distensión muscular Grado 1"
                        value={injuryDescription}
                        onChange={(e) => setInjuryDescription(e.target.value)}
                        required
                        style={{ width: '100%', margin: 0 }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginBottom: '0.25rem',
                        }}
                      >
                        Fecha de la lesión *
                      </label>
                      <input
                        type="date"
                        value={injuryDate}
                        onChange={(e) => setInjuryDate(e.target.value)}
                        required
                        style={{ width: '100%', margin: 0 }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          marginBottom: '0.25rem',
                        }}
                      >
                        Retorno estimado *
                      </label>
                      <input
                        type="date"
                        value={estimatedReturnDate}
                        onChange={(e) => setEstimatedReturnDate(e.target.value)}
                        required
                        style={{ width: '100%', margin: 0 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowNewInjuryForm(false)}
                      disabled={injurySaving}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={injurySaving}>
                      {injurySaving ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                      <span>Registrar Lesión</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Listado de lesiones */}
              {injuriesLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0 }}>Cargando historial de lesiones…</p>
                </div>
              ) : injuries.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Activity size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>
                    No hay lesiones registradas para este atleta. ¡Plantel en óptimas condiciones!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {injuries.map((inj) => {
                    const next = NEXT_STATUS[inj.status];
                    const isAdvancing = advancingInjuryId === inj.id;
                    return (
                      <div
                        key={inj.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '1rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            marginBottom: '0.4rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
                              {capitalize(inj.zone)}
                            </span>
                            <span className={STATUS_BADGES[inj.status]}>
                              {STATUS_LABELS[inj.status]}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Ocurrida: {formatDate(inj.injuryDate)}
                            {inj.estimatedReturnDate &&
                              ` · Retorno est.: ${formatDate(inj.estimatedReturnDate)}`}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '0.88rem',
                            color: 'var(--text-main)',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <strong>Descripción:</strong> {inj.description}
                        </div>

                        {/* Stepper visual */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            marginBottom: '0.75rem',
                          }}
                        >
                          {STATUS_ORDER.map((step, idx) => {
                            const isCurrent = inj.status === step;
                            const isPast =
                              STATUS_ORDER.indexOf(inj.status) > idx ||
                              inj.status === 'MedicallyCleared';
                            return (
                              <React.Fragment key={step}>
                                <span
                                  style={{
                                    fontWeight: isCurrent ? 700 : 500,
                                    color: isCurrent
                                      ? 'var(--primary)'
                                      : isPast
                                        ? 'var(--success)'
                                        : 'var(--text-muted)',
                                  }}
                                >
                                  {STATUS_LABELS[step]}
                                </span>
                                {idx < STATUS_ORDER.length - 1 && <ChevronRight size={14} />}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Botón de transición */}
                        {next && !isAdvancing && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                            onClick={() => {
                              setAdvancingInjuryId(inj.id);
                              setAdvancingNotes('');
                            }}
                          >
                            Avanzar a: {STATUS_LABELS[next]}
                          </button>
                        )}

                        {isAdvancing && next && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.75rem',
                              background: 'var(--bg-subtle)',
                              borderRadius: '6px',
                            }}
                          >
                            <label
                              style={{
                                display: 'block',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                marginBottom: '0.35rem',
                              }}
                            >
                              Observaciones clínicas para el paso a {STATUS_LABELS[next]}:
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Ej. Buena respuesta funcional sin dolor en palpación..."
                              value={advancingNotes}
                              onChange={(e) => setAdvancingNotes(e.target.value)}
                              style={{ width: '100%', marginBottom: '0.5rem' }}
                            />
                            <div
                              style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}
                            >
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                                onClick={() => setAdvancingInjuryId(null)}
                                disabled={advancingSubmitting}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                                onClick={() => handleAdvanceStatus(inj)}
                                disabled={advancingSubmitting}
                              >
                                {advancingSubmitting ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                <span>Confirmar {STATUS_LABELS[next]}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: FICHA MÉDICA */}
          {activeTab === 'medicalRecord' && (
            <div>
              {/* Si todavía no se autorizó la justificación en esta sesión */}
              {!authorizedJustification ? (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <ShieldCheck size={26} color="var(--primary)" aria-hidden="true" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                        Acceso Médico Confidencial
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        De acuerdo a las normativas de privacidad clínica de ProTraining, cada
                        consulta de ficha médica requiere dejar asentado el motivo en la auditoría
                        inmutable.
                      </p>
                    </div>
                  </div>

                  {justificationError && (
                    <div
                      className="alert-banner danger"
                      role="alert"
                      style={{ marginBottom: '1rem' }}
                    >
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{justificationError}</span>
                    </div>
                  )}

                  {medicalError && (
                    <div
                      className="alert-banner danger"
                      role="alert"
                      style={{ marginBottom: '1rem' }}
                    >
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{medicalError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRequestMedicalAccess}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem',
                      }}
                    >
                      Seleccioná un motivo frecuente:
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginBottom: '1rem',
                      }}
                    >
                      {COMMON_JUSTIFICATIONS.map((motivo) => (
                        <button
                          key={motivo}
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.3rem 0.6rem',
                            border:
                              justification === motivo ? '1.5px solid var(--primary)' : undefined,
                            background:
                              justification === motivo ? 'var(--primary-light)' : undefined,
                          }}
                          onClick={() => setJustification(motivo)}
                        >
                          {motivo}
                        </button>
                      ))}
                    </div>

                    <label
                      htmlFor="input-justification-free"
                      style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '0.35rem',
                      }}
                    >
                      O ingresá una justificación personalizada (mínimo 10 caracteres) *:
                    </label>
                    <textarea
                      id="input-justification-free"
                      rows={3}
                      required
                      placeholder="Ej. Revisión de antecedentes quirúrgicos previa al plan de hipertrofia muscular."
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      style={{ width: '100%', marginBottom: '1rem' }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submittingJustification || justification.trim().length < 10}
                      >
                        {submittingJustification ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={16} />
                        )}
                        <span>Ver Ficha Médica y Apto Físico</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : medicalRecord ? (
                /* Ficha Médica Desplegada */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Banner de auditoría registrada */}
                  <div className="medical-notice-box" style={{ background: 'var(--bg-subtle)' }}>
                    <ShieldCheck
                      size={18}
                      style={{ color: 'var(--success)', flexShrink: 0 }}
                      aria-hidden="true"
                    />
                    <div style={{ fontSize: '0.82rem' }}>
                      <strong>Acceso registrado en auditoría inmutable:</strong> Motivo:{' '}
                      <em>"{authorizedJustification}"</em>.
                    </div>
                  </div>

                  {/* Estado de Apto Físico */}
                  <div
                    className="card"
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        marginBottom: '0.75rem',
                        color: 'var(--primary)',
                      }}
                    >
                      Certificado de Aptitud Física
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      {medicalRecord.hasPhysicalFitnessCertificate ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--success)',
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span style={{ fontWeight: 600 }}>Apto Físico Presentado y Vigente</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--danger)',
                          }}
                        >
                          <AlertTriangle size={18} />
                          <span style={{ fontWeight: 600 }}>
                            Sin certificado de apto físico registrado
                          </span>
                        </div>
                      )}

                      {medicalRecord.physicalFitnessExpiresAt && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Vencimiento: {formatDate(medicalRecord.physicalFitnessExpiresAt)}
                        </div>
                      )}
                    </div>
                    {medicalRecord.physicalFitnessNotes && (
                      <p
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <strong>Observaciones:</strong> {medicalRecord.physicalFitnessNotes}
                      </p>
                    )}
                  </div>

                  {/* Antecedentes Clínicos */}
                  <div
                    className="card"
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        marginBottom: '0.75rem',
                        color: 'var(--primary)',
                      }}
                    >
                      Antecedentes Médicos y Clínicos
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <div>
                        <strong>Historial Médico:</strong>{' '}
                        <span
                          style={{
                            color: medicalRecord.medicalHistory ? 'inherit' : 'var(--text-muted)',
                          }}
                        >
                          {medicalRecord.medicalHistory || 'Sin antecedentes reportados.'}
                        </span>
                      </div>
                      <div>
                        <strong>Cirugías / Intervenciones:</strong>{' '}
                        <span
                          style={{
                            color: medicalRecord.surgeries ? 'inherit' : 'var(--text-muted)',
                          }}
                        >
                          {medicalRecord.surgeries || 'Ninguna cirugía registrada.'}
                        </span>
                      </div>
                      <div>
                        <strong>Patologías / Condiciones Preexistentes:</strong>{' '}
                        <span
                          style={{
                            color: medicalRecord.pathologies ? 'inherit' : 'var(--text-muted)',
                          }}
                        >
                          {medicalRecord.pathologies || 'Sin patologías activas informadas.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

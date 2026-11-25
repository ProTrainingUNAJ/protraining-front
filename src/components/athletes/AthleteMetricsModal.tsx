import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, Check, Dumbbell, Loader2, TrendingUp, X } from 'lucide-react';
import { athleteRecordsService } from '../../api/athleteRecords';
import { athleteEvolutionService } from '../../api/athleteEvolution';
import { athleteBenchmarkService } from '../../api/athleteBenchmark';
import { ExercisePickerModal } from '../planning/ExercisePickerModal';
import { AthleteRecordItem, RecordOrigin, RECORD_ORIGIN_LABELS } from '../../types/athleteRecords';
import { CatalogExercise } from '../../types/trainingPlans';
import { AthleteEvolutionResponse } from '../../types/seguimiento';
import { CategoryBenchmarkSummary } from '../../types/benchmark';
import { OneRepMaxProgressionChart } from './OneRepMaxProgressionChart';
import { JumpVsLoadProgressionChart } from './JumpVsLoadProgressionChart';
import { EvolutionRangeSelector } from './EvolutionRangeSelector';
import { EvolutionRange, getEvolutionRangeOptions } from '../../utils/evolutionRange';
import { formatBenchmarkDelta, getStatusBadgeInfo } from '../../utils/benchmarkCalculator';
import { Athlete } from '../../types/structure';

interface AthleteMetricsModalProps {
  athlete: Athlete;
  categories?: Array<{ id: string; name: string }>;
  initialTab?: 'records' | 'evolution' | 'benchmark';
  onClose: () => void;
}

const WEIGHT_MAX_KG = 500;

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatRecordKg(value: number): string {
  const formatted = value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  return `${formatted} kg`;
}

export const AthleteMetricsModal: React.FC<AthleteMetricsModalProps> = ({
  athlete,
  categories = [],
  initialTab = 'records',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'evolution' | 'benchmark'>(initialTab);
  const athleteName = athlete.fullName || `${athlete.firstName} ${athlete.lastName}`.trim();

  // --- Récords (1RM) State ---
  const [records, setRecords] = useState<AthleteRecordItem[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [exercise, setExercise] = useState<CatalogExercise | null>(null);
  const [weight, setWeight] = useState('');
  const [origin, setOrigin] = useState<RecordOrigin>('TestedInSession');
  const [savingRecord, setSavingRecord] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // --- Evolución State ---
  const [range, setRange] = useState<EvolutionRange>('3m');
  const [evolutionData, setEvolutionData] = useState<AthleteEvolutionResponse | null>(null);
  const [evolutionLoading, setEvolutionLoading] = useState(false);
  const [evolutionError, setEvolutionError] = useState<string | null>(null);

  // --- Benchmark State ---
  const athleteCategories =
    athlete.categories && athlete.categories.length > 0 ? athlete.categories : categories;
  const [selectedBenchmarkCategoryId, setSelectedBenchmarkCategoryId] = useState<string>(
    athleteCategories.length > 0 ? athleteCategories[0].id : '',
  );
  const [benchmarkSummary, setBenchmarkSummary] = useState<CategoryBenchmarkSummary | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  const handleTabSelect = (tab: 'records' | 'evolution' | 'benchmark') => {
    setActiveTab(tab);
    if (tab === 'evolution') {
      setEvolutionLoading(true);
    } else if (tab === 'benchmark') {
      setBenchmarkLoading(true);
    }
  };

  const handleRangeChange = (nextRange: EvolutionRange) => {
    setRange(nextRange);
    setEvolutionLoading(true);
  };

  const handleSelectBenchmarkCategory = (catId: string) => {
    setSelectedBenchmarkCategoryId(catId);
    setBenchmarkLoading(true);
  };

  // Carga de Récords
  useEffect(() => {
    let active = true;
    athleteRecordsService
      .listCurrent(athlete.id)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setRecordsError(
            err instanceof Error ? err.message : 'No se pudieron cargar los récords.',
          );
        }
      })
      .finally(() => {
        if (active) setRecordsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [athlete.id]);

  // Carga de Evolución
  useEffect(() => {
    if (activeTab !== 'evolution') return;
    let active = true;

    athleteEvolutionService
      .getEvolution(athlete.id, getEvolutionRangeOptions(range))
      .then((data) => {
        if (active) {
          setEvolutionData(data);
          setEvolutionError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setEvolutionError(
            err instanceof Error ? err.message : 'No se pudo cargar la evolución del atleta.',
          );
        }
      })
      .finally(() => {
        if (active) setEvolutionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, athlete.id, range]);

  // Carga de Benchmark
  useEffect(() => {
    if (activeTab !== 'benchmark') return;
    if (!selectedBenchmarkCategoryId) return;

    let active = true;

    const cat = athleteCategories.find((c) => c.id === selectedBenchmarkCategoryId);
    const catName = cat ? cat.name : 'Categoría';

    athleteBenchmarkService
      .getAthleteBenchmark(athlete.id, selectedBenchmarkCategoryId, athleteName, catName)
      .then((data) => {
        if (active) {
          setBenchmarkSummary(data);
          setBenchmarkError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setBenchmarkError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar la comparativa de la categoría.',
          );
          setBenchmarkSummary(null);
        }
      })
      .finally(() => {
        if (active) setBenchmarkLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeTab, athlete.id, athleteName, athleteCategories, selectedBenchmarkCategoryId]);

  // Accesibilidad tecla escape
  useEffect(() => {
    if (showPicker || savingRecord) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, savingRecord, showPicker]);

  const closePicker = useCallback(() => setShowPicker(false), []);

  const selectExercise = (selected: CatalogExercise) => {
    setExercise(selected);
    setShowPicker(false);
    setSavedMessage(null);
    const current = records.find((r) => r.exerciseId === selected.id);
    setWeight(current ? String(current.weightKg) : '');
  };

  // Manejo de guardado de nuevo récord
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise) {
      setRecordsError('Seleccioná un ejercicio del catálogo.');
      return;
    }
    const weightKg = Number(weight.replace(',', '.'));

    if (Number.isNaN(weightKg) || weightKg <= 0 || weightKg > WEIGHT_MAX_KG) {
      setRecordsError(`Ingresá un peso válido mayor a 0 y hasta ${WEIGHT_MAX_KG} kg.`);
      return;
    }

    setSavingRecord(true);
    setRecordsError(null);
    setSavedMessage(null);

    try {
      const saved = await athleteRecordsService.save(athlete.id, exercise.id, weightKg, origin);

      setRecords((prev) => {
        const withoutOld = prev.filter((r) => r.exerciseId !== exercise.id);
        return [...withoutOld, saved].sort((a, b) =>
          a.exerciseName.localeCompare(b.exerciseName, 'es'),
        );
      });

      setSavedMessage(`Récord de ${exercise.name} guardado: ${weightKg} kg.`);
      setExercise(null);
      setWeight('');
      setOrigin('TestedInSession');
    } catch (err: unknown) {
      setRecordsError(err instanceof Error ? err.message : 'No se pudo guardar el récord.');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={savingRecord ? undefined : onClose} role="presentation">
      <div
        className="modal-content plan-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="athlete-metrics-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '95%' }}
      >
        {/* Cabecera del modal */}
        <div className="plan-picker-header">
          <div>
            <h2 id="athlete-metrics-modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>
              Métricas de Progreso · {athleteName}
            </h2>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Progreso físico, récords (1RM), evolución temporal y comparación grupal.
            </p>
          </div>
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onClose}
            aria-label="Cerrar modal de métricas"
            disabled={savingRecord}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Pestañas unificadas */}
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
            className={`btn ${activeTab === 'records' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: '6px 6px 0 0' }}
            onClick={() => handleTabSelect('records')}
          >
            <Dumbbell size={15} aria-hidden="true" />
            <span>Récords (1RM)</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'evolution' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: '6px 6px 0 0' }}
            onClick={() => handleTabSelect('evolution')}
          >
            <TrendingUp size={15} aria-hidden="true" />
            <span>Evolución Temporal</span>
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'benchmark' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', borderRadius: '6px 6px 0 0' }}
            onClick={() => handleTabSelect('benchmark')}
          >
            <TrendingUp size={15} aria-hidden="true" />
            <span>Benchmark Grupal</span>
          </button>
        </div>

        {/* Contenido de la pestaña activa */}
        <div style={{ maxHeight: 'calc(80vh - 160px)', overflowY: 'auto', padding: '0 0.25rem' }}>
          {/* PESTAÑA 1: RÉCORDS (1RM) */}
          {activeTab === 'records' && (
            <div>
              {recordsError && (
                <div className="alert-banner danger" role="alert" style={{ marginBottom: '1rem' }}>
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{recordsError}</span>
                </div>
              )}

              {savedMessage && (
                <div
                  className="alert-banner success"
                  role="status"
                  style={{ marginBottom: '1rem' }}
                >
                  <Check size={16} aria-hidden="true" />
                  <span>{savedMessage}</span>
                </div>
              )}

              {/* Formulario para registrar nuevo récord */}
              <form
                onSubmit={handleSaveRecord}
                style={{
                  background: 'var(--bg-subtle)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  Registrar nueva marca o 1RM
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
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
                      Ejercicio del catálogo *
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowPicker(true)}
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Dumbbell size={15} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {exercise ? exercise.name : 'Elegir del catálogo…'}
                      </span>
                    </button>
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
                      1RM (kilogramos) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="Ej. 110"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      disabled={savingRecord}
                      style={{ width: '100%', margin: 0 }}
                      required
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
                      Origen del dato *
                    </label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value as RecordOrigin)}
                      disabled={savingRecord}
                      style={{ width: '100%', margin: 0 }}
                    >
                      <option value="TestedInSession">Testeado en sesión</option>
                      <option value="Reported">Reportado por atleta</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingRecord || !exercise || !weight}
                  >
                    {savingRecord ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    <span>Guardar marca</span>
                  </button>
                </div>
              </form>

              {/* Listado de récords actuales */}
              {recordsLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0 }}>Cargando récords del atleta…</p>
                </div>
              ) : records.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Dumbbell size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>El atleta no posee récords cargados hasta el momento.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {records.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-subtle)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.exerciseName}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {RECORD_ORIGIN_LABELS[r.origin] || r.origin} · {formatDate(r.achievedAt)}
                        </div>
                      </div>
                      <div
                        style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)' }}
                      >
                        {formatRecordKg(r.weightKg)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: EVOLUCIÓN */}
          {activeTab === 'evolution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <EvolutionRangeSelector
                value={range}
                onChange={handleRangeChange}
                disabled={evolutionLoading}
              />

              {evolutionData?.strengthUnavailable && (
                <div
                  className="alert-banner warning evolution-alert-banner"
                  role="status"
                  data-testid="strength-unavailable-alert"
                >
                  <span className="plan-inline">
                    <AlertCircle size={18} aria-hidden="true" />
                    No pudimos cargar los récords de fuerza en este momento.
                  </span>
                </div>
              )}

              <JumpVsLoadProgressionChart
                fitnessTests={evolutionData?.fitnessTests ?? []}
                weeklyLoads={evolutionData?.weeklyLoads ?? []}
                isCoach={true}
                loading={evolutionLoading}
                error={evolutionError}
              />

              <OneRepMaxProgressionChart
                athleteId={athlete.id}
                strengthUnavailable={evolutionData?.strengthUnavailable}
                strengthSeries={evolutionData?.strength}
                loading={evolutionLoading}
                error={evolutionError}
                suppressBanner={true}
              />
            </div>
          )}

          {/* PESTAÑA 3: BENCHMARK */}
          {activeTab === 'benchmark' && (
            <div>
              {/* Selector de categoría */}
              {athleteCategories.length > 1 && (
                <div
                  style={{
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <label
                    htmlFor="select-benchmark-cat"
                    style={{ fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    Comparar con el grupo de:
                  </label>
                  <select
                    id="select-benchmark-cat"
                    value={selectedBenchmarkCategoryId}
                    onChange={(e) => handleSelectBenchmarkCategory(e.target.value)}
                    style={{ margin: 0, width: 'auto', minWidth: '180px' }}
                  >
                    {athleteCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {benchmarkLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0 }}>Cargando comparativa con el grupo…</p>
                </div>
              ) : benchmarkError ? (
                <div className="alert-banner danger" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{benchmarkError}</span>
                </div>
              ) : !benchmarkSummary || benchmarkSummary.items.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <AlertTriangle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ margin: 0 }}>
                    No hay suficientes datos del plantel deportivo para contrastar marcas.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Banner punto débil */}
                  {benchmarkSummary.weakestPoint && (
                    <div
                      role="status"
                      style={{
                        background: 'var(--warning-bg-strong)',
                        border: '1px solid var(--traffic-yellow-border)',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <AlertTriangle
                        size={24}
                        style={{ color: 'var(--warning)', flexShrink: 0, marginTop: '2px' }}
                        aria-hidden="true"
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: 'var(--warning-text)',
                            fontSize: '0.95rem',
                          }}
                        >
                          Punto más débil identificado: {benchmarkSummary.weakestPoint.testName}
                        </div>
                        <p
                          style={{
                            margin: '0.25rem 0 0',
                            color: 'var(--warning-text)',
                            fontSize: '0.85rem',
                          }}
                        >
                          Resultado del atleta:{' '}
                          <strong>
                            {benchmarkSummary.weakestPoint.athleteValue}{' '}
                            {benchmarkSummary.weakestPoint.unit}
                          </strong>{' '}
                          frente al promedio grupal de{' '}
                          <strong>
                            {benchmarkSummary.weakestPoint.groupAverage}{' '}
                            {benchmarkSummary.weakestPoint.unit}
                          </strong>{' '}
                          ({benchmarkSummary.weakestPoint.percentageDelta}% de diferencia).
                        </p>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    Plantel de referencia: <strong>{benchmarkSummary.categoryName}</strong> (
                    {benchmarkSummary.athleteCount} atletas evaluados).
                  </div>

                  {benchmarkSummary.items.map((item) => {
                    const isWeakest = benchmarkSummary.weakestPoint?.testName === item.testName;
                    const statusInfo = getStatusBadgeInfo(item.status, isWeakest);
                    return (
                      <div
                        key={item.testName}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.85rem 1rem',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                            {item.testName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Promedio del grupo:{' '}
                            <strong>
                              {item.groupAverage} {item.unit}
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                              {item.athleteValue !== null
                                ? `${item.athleteValue} ${item.unit}`
                                : 'Sin marca'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {formatBenchmarkDelta(item)}
                            </div>
                          </div>
                          <span
                            className={`badge badge-${statusInfo.variant}`}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal selector de ejercicios */}
        {showPicker && (
          <ExercisePickerModal onClose={closePicker} onSelect={selectExercise} filterUsedByPf />
        )}
      </div>
    </div>
  );
};

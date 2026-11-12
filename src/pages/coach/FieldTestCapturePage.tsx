import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Play, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/shell/PageHeader';
import { formatIsoDate } from '../../utils/argentinaDate';
import { structureService } from '../../api/structureService';
import {
  createFieldTestResult,
  getFieldTestSession,
  listFitnessTests,
  updateFieldTestSessionStatus,
} from '../../api/fieldTestSessions';
import type { FieldTestSession, FitnessTest } from '../../api/generated/seguimiento';
import type { Athlete } from '../../types/structure';

const STATUS_LABEL: Record<FieldTestSession['status'], string> = {
  Planned: 'Planificada',
  InProgress: 'En curso',
  Closed: 'Cerrada',
};

const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', 'back'];

const fullName = (athlete: Athlete): string =>
  athlete.fullName?.trim() || `${athlete.firstName} ${athlete.lastName}`.trim();

// Toma de marcas al costado de la cancha: un atleta por pantalla, teclado
// numérico gigante y Enter para registrar y avanzar al siguiente. Intentos fijos en 1.
export const FieldTestCapturePage: React.FC = () => {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<FieldTestSession | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [catalog, setCatalog] = useState<Record<string, FitnessTest>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentTestId, setCurrentTestId] = useState('');
  const [cursor, setCursor] = useState(0);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!sessionId) return;

    Promise.all([
      getFieldTestSession(sessionId),
      listFitnessTests().catch(() => [] as FitnessTest[]),
    ])
      .then(async ([loadedSession, tests]) => {
        if (!active) return;
        setSession(loadedSession);
        setCurrentTestId(loadedSession.tests[0]?.catalogTestId ?? '');
        setCatalog(Object.fromEntries(tests.map((test) => [test.id, test])));
        return structureService
          .getAthletes({ categoriaId: loadedSession.categoryId })
          .catch(() => [] as Athlete[]);
      })
      .then((loadedAthletes) => {
        if (!active || !loadedAthletes) return;
        setAthletes(loadedAthletes);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la sesión de test.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  const orderedTests = useMemo(
    () => [...(session?.tests ?? [])].sort((a, b) => a.order - b.order),
    [session],
  );
  const currentTest = orderedTests.find((test) => test.catalogTestId === currentTestId);

  // Marcas ya cargadas del test seleccionado, por atleta.
  const marks = useMemo(() => {
    const map = new Map<string, number>();
    for (const result of session?.results ?? []) {
      if (result.catalogTestId === currentTest?.catalogTestId) {
        map.set(result.athleteId, result.value);
      }
    }
    return map;
  }, [session, currentTest]);

  const currentAthlete = athletes[cursor];
  const isClosed = session?.status === 'Closed';
  const canSave = Boolean(session && currentAthlete && currentTest && !isClosed && !saving);

  const submitMark = useCallback(async (): Promise<void> => {
    if (!session || !currentAthlete || !currentTest) return;

    const raw = value.replace(',', '.').trim();
    const parsed = Number(raw);
    if (!raw || Number.isNaN(parsed)) {
      setError('Ingresá un valor numérico.');
      return;
    }
    if (session.status === 'Closed') {
      setError('La sesión ya está cerrada.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await createFieldTestResult(session.id, {
        catalogTestId: currentTest.catalogTestId,
        athleteId: currentAthlete.id,
        value: parsed,
        attempt: 1,
      });
      setSession((previous) =>
        previous ? { ...previous, results: [...previous.results, result] } : previous,
      );
      setValue('');
      setNotice(`Marca de ${fullName(currentAthlete)} registrada.`);
      setCursor((index) => index + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la marca.');
    } finally {
      setSaving(false);
    }
  }, [session, currentAthlete, currentTest, value]);

  const pressKey = (key: string): void => {
    if (!canSave) return;
    if (key === 'back') {
      setValue((current) => current.slice(0, -1));
      return;
    }
    if (key === ',') {
      setValue((current) => (current.includes(',') || current === '' ? current : `${current},`));
      return;
    }
    setValue((current) => (current.length >= 8 ? current : `${current}${key}`));
  };

  const changeStatus = async (status: 'InProgress' | 'Closed'): Promise<void> => {
    if (!session) return;
    setError(null);
    try {
      const updated = await updateFieldTestSessionStatus(session.id, status);
      setSession({ ...session, status: updated.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la sesión.');
    }
  };

  if (loading) {
    return (
      <div className="app-page-container">
        <div className="app-page-body">
          <p className="ft-muted">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="app-page-container">
        <PageHeader title="Test de campo" description="No se pudo abrir la sesión." />
        <div className="app-page-body">
          <div className="alert-banner danger">{loadError ?? 'Sesión no encontrada.'}</div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/pf/field-tests')}
          >
            Volver a las sesiones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page-container">
      <PageHeader
        title={session.name}
        description={`Test de campo · ${formatIsoDate(session.date.slice(0, 10))}`}
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/pf/field-tests')}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Sesiones</span>
          </button>
        }
      />

      <div className="app-page-body ft-capture">
        <div className="ft-capture__top">
          <span className={`ft-status ft-status--${session.status.toLowerCase()}`}>
            {STATUS_LABEL[session.status]}
          </span>

          {session.status === 'Planned' && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void changeStatus('InProgress')}
            >
              <Play size={15} aria-hidden="true" />
              <span>Iniciar toma</span>
            </button>
          )}
          {session.status === 'InProgress' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void changeStatus('Closed')}
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          )}
        </div>

        {orderedTests.length > 1 && (
          <div className="ft-test-chips" role="tablist" aria-label="Tests de la sesión">
            {orderedTests.map((test) => (
              <button
                key={test.catalogTestId}
                type="button"
                role="tab"
                aria-selected={test.catalogTestId === currentTest?.catalogTestId}
                className={`ft-test-chip${test.catalogTestId === currentTest?.catalogTestId ? ' ft-test-chip--active' : ''}`}
                onClick={() => setCurrentTestId(test.catalogTestId)}
              >
                {catalog[test.catalogTestId]?.name ?? 'Test'}
              </button>
            ))}
          </div>
        )}

        {isClosed && (
          <div className="alert-banner warning">
            Sesión cerrada: no se pueden cargar ni corregir marcas.
          </div>
        )}
        {error && <div className="alert-banner danger">{error}</div>}
        {notice && <div className="alert-banner success">{notice}</div>}

        <div className="ft-capture__grid">
          <section className="ft-capture__main">
            {currentAthlete ? (
              <>
                <div className="ft-athlete-display">
                  <span className="ft-athlete-display__label">Atleta</span>
                  <h2>{fullName(currentAthlete)}</h2>
                  <span className="ft-athlete-display__progress">
                    {cursor + 1} de {athletes.length}
                  </span>
                </div>

                <input
                  className="ft-value-input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label="Marca del atleta"
                  placeholder="0.0"
                  value={value}
                  disabled={!canSave}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void submitMark();
                    }
                  }}
                />

                <div className="ft-numpad" aria-label="Teclado numérico">
                  {NUMPAD_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="ft-numpad__key"
                      aria-label={key === 'back' ? 'Borrar último dígito' : key}
                      disabled={!canSave}
                      onClick={() => pressKey(key)}
                    >
                      {key === 'back' ? <Trash2 size={22} aria-hidden="true" /> : key}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="ft-numpad__key ft-numpad__key--enter"
                    disabled={!canSave}
                    onClick={() => void submitMark()}
                  >
                    {saving ? 'Enviando…' : 'Registrar ⏎'}
                  </button>
                </div>
              </>
            ) : (
              <div className="ft-complete">
                <CheckCircle2 size={40} aria-hidden="true" />
                <h2>Carga completa para este test</h2>
                <p className="ft-muted">
                  Tocá un atleta de la lista para corregir su carga (solo si la sesión sigue
                  abierta).
                </p>
              </div>
            )}
          </section>

          <aside className="ft-athlete-list" aria-label="Atletas de la categoría">
            {athletes.map((athlete, index) => {
              const mark = marks.get(athlete.id);
              return (
                <button
                  key={athlete.id}
                  type="button"
                  className={`ft-athlete-row${index === cursor ? ' ft-athlete-row--current' : ''}`}
                  onClick={() => {
                    setCursor(index);
                    setValue('');
                    setError(null);
                    setNotice(null);
                  }}
                >
                  <span className="ft-athlete-row__name">{fullName(athlete)}</span>
                  <span className="ft-athlete-row__mark">
                    {mark !== undefined ? `${mark}` : '—'}
                  </span>
                </button>
              );
            })}
            {athletes.length === 0 && (
              <p className="ft-muted">Esta categoría no tiene atletas cargados.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

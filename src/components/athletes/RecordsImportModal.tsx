import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FileUp, Loader2, Upload, X } from 'lucide-react';
import { recordsImportService } from '../../api/recordsImport';
import { matchColumn, parseCsvHeader } from '../../utils/csv';
import {
  RecordImportConfirmRow,
  RecordImportMapping,
  RecordImportPreviewRow,
} from '../../types/recordsImport';

interface RecordsImportModalProps {
  onClose: () => void;
}

type Step = 'upload' | 'map' | 'review' | 'done';

const EMPTY_MAPPING: RecordImportMapping = {
  athleteColumn: '',
  exerciseColumn: '',
  weightColumn: '',
  dateColumn: '',
  sourceColumn: '',
};

// Alias para preseleccionar columnas por su encabezado.
const COLUMN_ALIASES: Record<keyof RecordImportMapping, string[]> = {
  athleteColumn: ['atleta', 'athlete', 'deportista', 'jugador'],
  exerciseColumn: ['ejercicio', 'exercise'],
  weightColumn: ['peso', 'weight', 'kg', '1rm'],
  dateColumn: ['fecha', 'date'],
  sourceColumn: ['origen', 'source', 'fuente'],
};

const MAX_FILE_BYTES = 1_048_576;

const STEP_LABELS: Record<Step, string> = {
  upload: 'Paso 1 de 3 · Subir archivo',
  map: 'Paso 2 de 3 · Mapear columnas',
  review: 'Paso 3 de 3 · Revisar e importar',
  done: 'Importación completada',
};

function buildPreselectedMapping(headers: string[]): RecordImportMapping {
  const used = new Set<string>();

  const pick = (aliases: string[]): string => {
    const available = headers.filter((header) => !used.has(header));
    const found = matchColumn(available, aliases);
    if (found) used.add(found);
    return found;
  };

  return {
    athleteColumn: pick(COLUMN_ALIASES.athleteColumn),
    exerciseColumn: pick(COLUMN_ALIASES.exerciseColumn),
    weightColumn: pick(COLUMN_ALIASES.weightColumn),
    dateColumn: pick(COLUMN_ALIASES.dateColumn),
    sourceColumn: pick(COLUMN_ALIASES.sourceColumn),
  };
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function RecordsImportModal({ onClose }: RecordsImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<RecordImportMapping>({ ...EMPTY_MAPPING });
  const [previewRows, setPreviewRows] = useState<RecordImportPreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [confirmedRequested, setConfirmedRequested] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = loadingPreview || loadingConfirm;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [busy, onClose]);

  const usedColumns = useMemo(
    () => new Set(Object.values(mapping).filter((column) => column !== '')),
    [mapping],
  );

  const readyRows = useMemo<RecordImportConfirmRow[]>(
    () =>
      previewRows.flatMap((row) => {
        if (row.status !== 'Ok') return [];
        if (!row.athleteId || !row.exerciseId || row.weightOneRepMaxKg == null) return [];
        return [
          {
            athleteId: row.athleteId,
            exerciseId: row.exerciseId,
            weightOneRepMaxKg: row.weightOneRepMaxKg,
            achievedAt: row.achievedAt ?? undefined,
            origin: row.origin ?? undefined,
          },
        ];
      }),
    [previewRows],
  );

  const problemCount = previewRows.filter((row) => row.status !== 'Ok').length;

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setMapping({ ...EMPTY_MAPPING });
    setPreviewRows([]);
    setImportedCount(0);
    setConfirmedRequested(0);
    setError(null);
  }, []);

  const handleFile = async (selected: File | null) => {
    setError(null);
    setPreviewRows([]);
    setFile(null);
    setHeaders([]);
    setMapping({ ...EMPTY_MAPPING });

    if (!selected) return;

    if (!isCsvFile(selected)) {
      setError('El archivo debe ser un CSV (.csv).');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('El archivo supera el tamaño máximo de 1 MB.');
      return;
    }

    try {
      const text = await selected.text();
      const parsedHeaders = parseCsvHeader(text);
      setFile(selected);
      setHeaders(parsedHeaders);
      setMapping(buildPreselectedMapping(parsedHeaders));
      setStep('map');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo CSV.');
    }
  };

  const updateMapping = (field: keyof RecordImportMapping, value: string) => {
    setMapping((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handlePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Elegí un archivo CSV.');
      return;
    }
    if (!mapping.athleteColumn || !mapping.exerciseColumn || !mapping.weightColumn) {
      setError('Mapeá atleta, ejercicio y peso para continuar.');
      return;
    }

    setLoadingPreview(true);
    setError(null);
    try {
      const rows = await recordsImportService.preview(file, mapping);
      setPreviewRows(rows);
      setStep('review');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo generar la vista previa.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirm = async () => {
    if (readyRows.length === 0) {
      setError('No hay filas listas para importar.');
      return;
    }

    setLoadingConfirm(true);
    setError(null);
    try {
      const imported = await recordsImportService.confirm(readyRows);
      setImportedCount(imported.length);
      setConfirmedRequested(readyRows.length);
      setStep('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron importar los récords.');
    } finally {
      setLoadingConfirm(false);
    }
  };

  const renderColumnSelect = (
    label: string,
    field: keyof RecordImportMapping,
    required: boolean,
  ) => (
    <label className="plan-field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <select
        value={mapping[field]}
        onChange={(event) => updateMapping(field, event.target.value)}
        disabled={busy}
      >
        <option value="">Sin mapear</option>
        {headers.map((header) => (
          <option
            key={header}
            value={header}
            disabled={header !== mapping[field] && usedColumns.has(header)}
          >
            {header}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="modal-content records-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="records-import-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="plan-picker-header">
          <div>
            <h2 id="records-import-title">Importar récords</h2>
            <p className="records-import-subtitle">{STEP_LABELS[step]}</p>
          </div>
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

        {error && (
          <div className="alert-banner danger" role="alert">
            <span className="plan-inline">
              <AlertCircle size={18} aria-hidden="true" />
              {error}
            </span>
          </div>
        )}

        {step === 'upload' && (
          <div className="records-import-upload">
            <FileUp size={40} className="records-import-upload-icon" aria-hidden="true" />
            <p className="records-import-upload-title">
              Subí el CSV con los récords que querés importar.
            </p>
            <p className="records-import-help">Desde Excel: Archivo → Guardar como → CSV.</p>
            <label className="btn btn-primary records-import-file-btn">
              <Upload size={16} aria-hidden="true" />
              <span>Elegir archivo CSV</span>
              <input
                id="records-csv-file"
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0] ?? null;
                  event.currentTarget.value = '';
                  void handleFile(selected);
                }}
              />
            </label>
            {file && (
              <div className="records-import-upload-actions">
                <p className="records-import-file-name">{file.name}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('map')}
                  disabled={busy}
                >
                  Continuar con este archivo
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'map' && (
          <form className="records-import-form" onSubmit={handlePreview}>
            <p className="records-import-help">
              {file ? `${file.name} · ${formatCount(headers.length, 'columna', 'columnas')}` : ''}
            </p>
            <p className="records-import-help">
              Elegí qué columna del archivo corresponde a cada campo. Las que coinciden por nombre
              ya vienen seleccionadas.
            </p>

            <div className="records-import-fields">
              {renderColumnSelect('Atleta', 'athleteColumn', true)}
              {renderColumnSelect('Ejercicio', 'exerciseColumn', true)}
              {renderColumnSelect('Peso', 'weightColumn', true)}
              {renderColumnSelect('Fecha', 'dateColumn', false)}
              {renderColumnSelect('Origen', 'sourceColumn', false)}
            </div>

            <div className="plan-picker-pager">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('upload')}
                disabled={busy}
              >
                Volver
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy || !file}>
                {loadingPreview && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
                <span>{loadingPreview ? 'Generando vista previa…' : 'Ver vista previa'}</span>
              </button>
            </div>
          </form>
        )}

        {step === 'review' && (
          <div className="records-import-review">
            <div className="records-import-summary">
              <span className="badge badge-success">
                {formatCount(readyRows.length, 'lista', 'listas')}
              </span>
              <span className={problemCount > 0 ? 'badge badge-danger' : 'badge badge-info'}>
                {formatCount(problemCount, 'con problemas', 'con problemas')}
              </span>
            </div>

            {previewRows.length === 0 ? (
              <p className="records-import-empty">El archivo no tiene filas de datos.</p>
            ) : (
              <div className="records-import-table-wrap">
                <table className="records-import-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Atleta</th>
                      <th scope="col">Ejercicio</th>
                      <th scope="col">Peso</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => {
                      const isReady = row.status === 'Ok';
                      return (
                        <tr
                          key={row.rowNumber ?? index}
                          className={isReady ? 'is-ready' : 'is-error'}
                        >
                          <td>{row.rowNumber ?? index + 1}</td>
                          <td>{row.athleteName || '—'}</td>
                          <td>{row.exerciseName || '—'}</td>
                          <td>{row.weightText || '—'}</td>
                          <td>{row.dateText || '—'}</td>
                          <td>
                            <span className={`badge ${isReady ? 'badge-success' : 'badge-danger'}`}>
                              {isReady ? 'Lista' : row.message || 'Con problemas'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="records-import-help">
              Las filas con problemas no se importan. Corregilas en el Excel y volvé a subir el
              archivo.
            </p>

            <div className="plan-picker-pager">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('map')}
                disabled={busy}
              >
                Volver a mapear
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleConfirm()}
                disabled={busy || readyRows.length === 0}
              >
                {loadingConfirm && <Loader2 size={16} className="plan-spin" aria-hidden="true" />}
                <span>
                  {loadingConfirm
                    ? 'Importando…'
                    : `Importar ${formatCount(readyRows.length, 'récord', 'récords')}`}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="records-import-done">
            <Check size={44} className="records-import-done-icon" aria-hidden="true" />
            <h3>Importación completada</h3>
            <p>
              {importedCount === 1
                ? 'Se importó 1 récord.'
                : `Se importaron ${importedCount} récords.`}
            </p>
            {importedCount < confirmedRequested && (
              <p className="records-import-help">
                El back omitió filas duplicadas: se enviaron {confirmedRequested}.
              </p>
            )}
            <div className="plan-picker-pager">
              <button type="button" className="btn btn-secondary" onClick={reset}>
                Importar otro archivo
              </button>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

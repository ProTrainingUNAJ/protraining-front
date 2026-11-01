import {
  confirmRecordsImport,
  previewRecordsImport,
  type Record as ApiRecord,
} from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { AthleteRecordItem } from '../types/athleteRecords';
import {
  RawRecordImportPreviewRow,
  RawRecordImportPreviewStatus,
  RecordImportConfirmRow,
  RecordImportMapping,
  RecordImportPreviewRow,
  RecordImportPreviewStatus,
} from '../types/recordsImport';

// El back serializa el enum como número aunque el contrato diga string.
const PREVIEW_STATUS_BY_CODE: Record<number, RecordImportPreviewStatus> = {
  0: 'Ok',
  1: 'AthleteNotFound',
  2: 'ExerciseNotFound',
  3: 'InvalidWeight',
};

const PREVIEW_STATUSES: RecordImportPreviewStatus[] = [
  'Ok',
  'AthleteNotFound',
  'ExerciseNotFound',
  'InvalidWeight',
];

export function normalizePreviewStatus(
  status?: RawRecordImportPreviewStatus,
): RecordImportPreviewStatus {
  if (typeof status === 'number') {
    return PREVIEW_STATUS_BY_CODE[status] ?? 'InvalidWeight';
  }
  if (typeof status === 'string') {
    return (
      PREVIEW_STATUSES.find((value) => value.toLowerCase() === status.toLowerCase()) ??
      'InvalidWeight'
    );
  }
  return 'InvalidWeight';
}

function normalizePreviewRow(row: RawRecordImportPreviewRow): RecordImportPreviewRow {
  return { ...row, status: normalizePreviewStatus(row.status) };
}

function mapRecord(record: ApiRecord): AthleteRecordItem {
  return {
    id: record.id,
    exerciseId: record.exerciseId,
    exerciseName: record.exerciseName,
    weightKg: record.weightOneRepMaxKg,
    origin: record.origin,
    achievedAt: record.achievedAt,
  };
}

// Importación masiva de récords desde un CSV (KAN-389 back / KAN-390 front).
export const recordsImportService = {
  // El back valida atleta, ejercicio y peso fila por fila y devuelve el motivo
  // de las que no se pueden importar.
  async preview(file: File, mapping: RecordImportMapping): Promise<RecordImportPreviewRow[]> {
    try {
      const { data } = await previewRecordsImport({
        body: {
          file,
          athleteColumn: mapping.athleteColumn,
          exerciseColumn: mapping.exerciseColumn,
          weightColumn: mapping.weightColumn,
          dateColumn: mapping.dateColumn || undefined,
          sourceColumn: mapping.sourceColumn || undefined,
        },
        throwOnError: true,
      });
      return (data as RawRecordImportPreviewRow[]).map(normalizePreviewRow);
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  // Solo se envían las filas que el preview marcó como listas.
  async confirm(rows: RecordImportConfirmRow[]): Promise<AthleteRecordItem[]> {
    try {
      const { data } = await confirmRecordsImport({
        body: { rows },
        throwOnError: true,
      });
      return data.map(mapRecord);
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};

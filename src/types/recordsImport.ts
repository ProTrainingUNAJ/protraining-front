import type {
  ConfirmImportRecordRow,
  ImportRecordPreviewRow,
} from '../api/generated/entrenamiento';

// Tipos de la importación de récords desde CSV (KAN-390),
// derivados del contrato oficial de Entrenamiento.
export type RecordImportPreviewStatus =
  'Ok' | 'AthleteNotFound' | 'ExerciseNotFound' | 'InvalidWeight';

// El contrato declara `status` como string, pero el back (serialización por
// defecto de .NET) lo devuelve como número: 0 = Ok, 1 = AthleteNotFound, etc.
// El servicio normaliza ambos formatos para que la UI siempre reciba strings.
export type RawRecordImportPreviewStatus = RecordImportPreviewStatus | number | string | null;

export type RecordImportPreviewRow = Omit<ImportRecordPreviewRow, 'status'> & {
  status?: RecordImportPreviewStatus;
};

export type RawRecordImportPreviewRow = Omit<ImportRecordPreviewRow, 'status'> & {
  status?: RawRecordImportPreviewStatus;
};

export type RecordImportConfirmRow = ConfirmImportRecordRow;

// Columnas del CSV elegidas por el PF para cada campo.
export interface RecordImportMapping {
  athleteColumn: string;
  exerciseColumn: string;
  weightColumn: string;
  dateColumn: string;
  sourceColumn: string;
}

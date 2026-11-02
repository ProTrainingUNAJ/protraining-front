import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordsImportService } from '../recordsImport';
import * as generatedApi from '../generated/entrenamiento';
import { RecordImportMapping } from '../../types/recordsImport';

vi.mock('../generated/entrenamiento', async () => {
  return {
    previewRecordsImport: vi.fn(),
    confirmRecordsImport: vi.fn(),
  };
});

const mapping: RecordImportMapping = {
  athleteColumn: 'Atleta',
  exerciseColumn: 'Ejercicio',
  weightColumn: 'Peso',
  dateColumn: 'Fecha',
  sourceColumn: '',
};

describe('recordsImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preview sends the file and mapped columns to the API', async () => {
    const file = new File(['Atleta,Peso\nLucas,100'], 'records.csv', { type: 'text/csv' });
    const previewRows = [
      {
        rowNumber: 1,
        athleteName: 'Lucas Giménez',
        exerciseName: 'Sentadilla Trasera',
        weightText: '100',
        status: 'Ok',
        message: 'Listo para importar.',
        athleteId: 'ath-1',
        exerciseId: 'ex-1',
        weightOneRepMaxKg: 100,
        achievedAt: '2026-10-30T00:00:00Z',
        origin: 'Reported',
      },
    ];

    vi.mocked(generatedApi.previewRecordsImport).mockResolvedValueOnce({
      data: previewRows,
    } as never);

    const result = await recordsImportService.preview(file, mapping);

    expect(generatedApi.previewRecordsImport).toHaveBeenCalledWith({
      body: {
        file,
        athleteColumn: 'Atleta',
        exerciseColumn: 'Ejercicio',
        weightColumn: 'Peso',
        dateColumn: 'Fecha',
        sourceColumn: undefined,
      },
      throwOnError: true,
    });
    expect(result).toEqual(previewRows);
  });

  it('preview normalizes the numeric statuses returned by the backend', async () => {
    const file = new File(['Atleta,Peso\nLucas,100'], 'records.csv', { type: 'text/csv' });

    vi.mocked(generatedApi.previewRecordsImport).mockResolvedValueOnce({
      data: [
        { rowNumber: 1, status: 0, message: 'Listo para importar.' },
        { rowNumber: 2, status: 1, message: 'No se encontró el atleta.' },
        { rowNumber: 3, status: 2, message: 'No se encontró el ejercicio.' },
        { rowNumber: 4, status: 3, message: 'El peso no es válido.' },
        { rowNumber: 5, status: 'Ok', message: 'Listo para importar.' },
      ],
    } as never);

    const result = await recordsImportService.preview(file, mapping);

    expect(result.map((row) => row.status)).toEqual([
      'Ok',
      'AthleteNotFound',
      'ExerciseNotFound',
      'InvalidWeight',
      'Ok',
    ]);
  });

  it('preview surfaces the backend error message', async () => {
    const file = new File([''], 'records.csv', { type: 'text/csv' });
    vi.mocked(generatedApi.previewRecordsImport).mockRejectedValueOnce(
      new Error('El archivo CSV está vacío.'),
    );

    await expect(recordsImportService.preview(file, mapping)).rejects.toThrow(
      'El archivo CSV está vacío.',
    );
  });

  it('confirm sends only the ready rows and maps the imported records', async () => {
    const rows = [
      {
        athleteId: 'ath-1',
        exerciseId: 'ex-1',
        weightOneRepMaxKg: 100,
        achievedAt: '2026-10-30T00:00:00Z',
        origin: 'Reported',
      },
    ];

    vi.mocked(generatedApi.confirmRecordsImport).mockResolvedValueOnce({
      data: [
        {
          id: 'rec-1',
          athleteId: 'ath-1',
          exerciseId: 'ex-1',
          exerciseName: 'Sentadilla Trasera',
          weightOneRepMaxKg: 100,
          origin: 'Reported',
          achievedAt: '2026-10-30T00:00:00Z',
          isCurrent: true,
        },
      ],
    } as never);

    const result = await recordsImportService.confirm(rows);

    expect(generatedApi.confirmRecordsImport).toHaveBeenCalledWith({
      body: { rows },
      throwOnError: true,
    });
    expect(result).toEqual([
      {
        id: 'rec-1',
        exerciseId: 'ex-1',
        exerciseName: 'Sentadilla Trasera',
        weightKg: 100,
        origin: 'Reported',
        achievedAt: '2026-10-30T00:00:00Z',
      },
    ]);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RecordsImportModal } from '../RecordsImportModal';
import { recordsImportService } from '../../../api/recordsImport';

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
    dateText: null,
    achievedAt: null,
    origin: null,
  },
  {
    rowNumber: 2,
    athleteName: 'Ana Pérez',
    exerciseName: 'Press Banca',
    weightText: '50',
    status: 'Ok',
    message: 'Listo para importar.',
    athleteId: 'ath-2',
    exerciseId: 'ex-2',
    weightOneRepMaxKg: 50,
    dateText: null,
    achievedAt: null,
    origin: null,
  },
  {
    rowNumber: 3,
    athleteName: 'Atleta Inexistente',
    exerciseName: 'Peso Muerto',
    weightText: '120',
    status: 'AthleteNotFound',
    message: "No se encontró el atleta 'Atleta Inexistente'.",
    athleteId: null,
    exerciseId: null,
    weightOneRepMaxKg: null,
    dateText: null,
    achievedAt: null,
    origin: null,
  },
];

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe('RecordsImportModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows problem rows and imports only the ready ones', async () => {
    vi.spyOn(recordsImportService, 'preview').mockResolvedValue(previewRows as never);
    vi.spyOn(recordsImportService, 'confirm').mockResolvedValue([
      {
        id: 'rec-1',
        exerciseId: 'ex-1',
        exerciseName: 'Sentadilla Trasera',
        weightKg: 100,
        origin: 'Reported',
        achievedAt: '2026-10-30T00:00:00Z',
      },
      {
        id: 'rec-2',
        exerciseId: 'ex-2',
        exerciseName: 'Press Banca',
        weightKg: 50,
        origin: 'Reported',
        achievedAt: '2026-10-30T00:00:00Z',
      },
    ] as never);

    render(<RecordsImportModal onClose={vi.fn()} />);

    selectFile(
      new File(['Atleta,Ejercicio,Peso\nLucas,Sentadilla,100'], 'records.csv', {
        type: 'text/csv',
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Paso 2 de 3 · Mapear columnas')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ver vista previa' }));

    await waitFor(() => {
      expect(screen.getByText('2 listas')).toBeDefined();
      expect(screen.getByText('1 con problemas')).toBeDefined();
      expect(screen.getByText("No se encontró el atleta 'Atleta Inexistente'.")).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 récords' }));

    await waitFor(() => {
      expect(recordsImportService.confirm).toHaveBeenCalledWith([
        {
          athleteId: 'ath-1',
          exerciseId: 'ex-1',
          weightOneRepMaxKg: 100,
          achievedAt: undefined,
          origin: undefined,
        },
        {
          athleteId: 'ath-2',
          exerciseId: 'ex-2',
          weightOneRepMaxKg: 50,
          achievedAt: undefined,
          origin: undefined,
        },
      ]);
      expect(screen.getByText('Se importaron 2 récords.')).toBeDefined();
    });
  });

  it('rejects a file that is not a CSV before calling the API', async () => {
    vi.spyOn(recordsImportService, 'preview');

    render(<RecordsImportModal onClose={vi.fn()} />);

    selectFile(new File(['contenido'], 'records.xlsx'));

    await waitFor(() => {
      expect(screen.getByText('El archivo debe ser un CSV (.csv).')).toBeDefined();
    });
    expect(recordsImportService.preview).not.toHaveBeenCalled();
  });
});

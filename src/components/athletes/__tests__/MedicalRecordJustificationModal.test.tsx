import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MedicalRecordJustificationModal } from '../MedicalRecordJustificationModal';
import { medicalRecordService } from '../../../api/medicalRecord';
import { MedicalRecord } from '../../../types/medicalRecord';

describe('MedicalRecordJustificationModal (KAN-326)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRecord: MedicalRecord = {
    id: 'rec-1',
    athleteId: 'ath-123',
    hasPhysicalFitnessCertificate: true,
    physicalFitnessIssuedAt: '2026-02-01',
    physicalFitnessExpiresAt: '2027-02-01',
    medicalHistory: 'Sin antecedentes relevantes',
    surgeries: 'Apendicectomía en 2018',
    pathologies: 'Ninguna',
    physicalFitnessNotes: 'Apto para alta competencia',
  };

  it('renderiza el modal con aviso de confidencialidad y botón deshabilitado si no hay motivo', () => {
    render(
      <MedicalRecordJustificationModal
        athleteId="ath-123"
        athleteName="Rodrigo De Paul"
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText('Justificación de Acceso Médico')).toBeDefined();
    expect(screen.getByText(/Acceso a información confidencial de Rodrigo De Paul/i)).toBeDefined();

    const submitBtn = screen.getByRole('button', { name: 'Acceder a Ficha' });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('exige escribir motivo, llama a la API con la justificación y cierra al cargar con éxito', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const getSpy = vi.spyOn(medicalRecordService, 'getMedicalRecord').mockResolvedValue(mockRecord);

    render(
      <MedicalRecordJustificationModal
        athleteId="ath-123"
        athleteName="Rodrigo De Paul"
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const textarea = screen.getByLabelText(/Motivo de la consulta médica/i);
    fireEvent.change(textarea, {
      target: { value: 'Control médico previo a pretemporada' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Acceder a Ficha' });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith('ath-123', 'Control médico previo a pretemporada');
      expect(onSuccess).toHaveBeenCalledWith(mockRecord, 'Control médico previo a pretemporada');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('muestra error y no cierra el diálogo si el atleta es menor sin consentimiento del tutor (400)', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    vi.spyOn(medicalRecordService, 'getMedicalRecord').mockRejectedValue(
      new Error(
        'El atleta menor de edad no posee consentimiento digital firmado por su tutor legal.',
      ),
    );

    render(
      <MedicalRecordJustificationModal
        athleteId="ath-minor-99"
        athleteName="Thiago Messi"
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const textarea = screen.getByLabelText(/Motivo de la consulta médica/i);
    fireEvent.change(textarea, {
      target: { value: 'Revisión médica rutinaria' },
    });

    const submitBtn = screen.getByRole('button', { name: 'Acceder a Ficha' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'El atleta menor de edad no posee consentimiento digital firmado por su tutor legal.',
        ),
      ).toBeDefined();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('permite cancelar el diálogo sin invocar la API', () => {
    const onClose = vi.fn();
    const getSpy = vi.spyOn(medicalRecordService, 'getMedicalRecord');

    render(
      <MedicalRecordJustificationModal
        athleteId="ath-123"
        athleteName="Rodrigo De Paul"
        isOpen={true}
        onClose={onClose}
        onSuccess={vi.fn()}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
    expect(getSpy).not.toHaveBeenCalled();
  });
});

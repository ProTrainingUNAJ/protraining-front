import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MedicalRecordDetailModal } from '../MedicalRecordDetailModal';
import { medicalRecordService } from '../../../api/medicalRecord';
import { MedicalRecord } from '../../../types/medicalRecord';

describe('MedicalRecordDetailModal - Edición de Ficha Médica (KAN-664)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRecord: MedicalRecord = {
    id: 'rec-1',
    athleteId: 'ath-1',
    hasPhysicalFitnessCertificate: false,
    physicalFitnessIssuedAt: null,
    physicalFitnessExpiresAt: null,
    medicalHistory: 'Sin antecedentes',
    surgeries: null,
    pathologies: null,
    physicalFitnessNotes: null,
  };

  it('renderiza la vista inicial en modo lectura con botón para editar', () => {
    render(
      <MedicalRecordDetailModal
        athleteName="Lucas Gómez"
        record={mockRecord}
        justificationUsed="Consulta de rutina"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Ficha Médica · Lucas Gómez/i)).toBeDefined();
    expect(screen.getByText('Sin Certificado de Apto Físico')).toBeDefined();
    expect(screen.getByTestId('edit-medical-record-btn')).toBeDefined();
  });

  it('permite cambiar a modo edición, modificar datos y guardar mediante medicalRecordService', async () => {
    const onRecordUpdated = vi.fn();
    const updateSpy = vi.spyOn(medicalRecordService, 'updateMedicalRecord').mockResolvedValue({
      ...mockRecord,
      hasPhysicalFitnessCertificate: true,
      physicalFitnessIssuedAt: '2026-03-01',
      physicalFitnessExpiresAt: '2027-03-01',
      medicalHistory: 'Sin antecedentes relevantes',
      pathologies: 'Sin patologías conocidas',
    });

    render(
      <MedicalRecordDetailModal
        athleteName="Lucas Gómez"
        record={mockRecord}
        justificationUsed="Consulta de rutina"
        onClose={vi.fn()}
        onRecordUpdated={onRecordUpdated}
      />,
    );

    // Entrar a edición
    fireEvent.click(screen.getByTestId('edit-medical-record-btn'));

    expect(screen.getByText(/Ficha Médica · Lucas Gómez \(Edición\)/i)).toBeDefined();

    // Modificar certificado y campos
    const certCheckbox = screen.getByTestId('med-has-certificate');
    const issuedInput = screen.getByTestId('med-issued-at');
    const expiresInput = screen.getByTestId('med-expires-at');
    const pathologiesInput = screen.getByTestId('med-pathologies');
    const justificationInput = screen.getByTestId('med-justification');

    fireEvent.click(certCheckbox);
    fireEvent.change(issuedInput, { target: { value: '2026-03-01' } });
    fireEvent.change(expiresInput, { target: { value: '2027-03-01' } });
    fireEvent.change(pathologiesInput, { target: { value: 'Sin patologías conocidas' } });
    fireEvent.change(justificationInput, {
      target: { value: 'Actualización médica anual para pretemporada' },
    });

    // Guardar
    fireEvent.click(screen.getByTestId('save-medical-record-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('ath-1', {
        justification: 'Actualización médica anual para pretemporada',
        hasPhysicalFitnessCertificate: true,
        physicalFitnessIssuedAt: '2026-03-01',
        physicalFitnessExpiresAt: '2027-03-01',
        medicalHistory: 'Sin antecedentes',
        surgeries: null,
        pathologies: 'Sin patologías conocidas',
        physicalFitnessNotes: null,
      });
    });

    expect(onRecordUpdated).toHaveBeenCalled();
    expect(
      screen.getByText('Ficha médica actualizada y registrada en auditoría legal.'),
    ).toBeDefined();
    expect(screen.getByText('Apto Físico Acreditado')).toBeDefined();
  });

  it('exige la justificación antes de enviar el guardado', async () => {
    const updateSpy = vi.spyOn(medicalRecordService, 'updateMedicalRecord');

    render(
      <MedicalRecordDetailModal
        athleteName="Lucas Gómez"
        record={mockRecord}
        justificationUsed="Consulta de rutina"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('edit-medical-record-btn'));

    const justificationInput = screen.getByTestId('med-justification');
    fireEvent.change(justificationInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByTestId('save-medical-record-btn'));

    expect(updateSpy).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'La justificación del cambio es obligatoria para el registro de auditoría legal.',
      ),
    ).toBeDefined();
  });
});

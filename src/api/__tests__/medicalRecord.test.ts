import { describe, it, expect, vi, beforeEach } from 'vitest';
import { medicalRecordService } from '../medicalRecord';
import * as generatedApi from '../generated/estructura';

vi.mock('../generated/estructura', async () => {
  return {
    accessAthleteMedicalRecord: vi.fn(),
    updateAthleteMedicalRecord: vi.fn(),
    listAthleteMedicalRecordAuditLogs: vi.fn(),
  };
});

describe('medicalRecordService (KAN-326)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMedicalRecord', () => {
    it('obtiene la ficha médica declarando la justificación obligatoria en el body mediante POST', async () => {
      const mockRecord = {
        id: 'rec-1',
        athleteId: 'ath-1',
        hasPhysicalFitnessCertificate: true,
        medicalHistory: 'Asma leve',
      };

      vi.mocked(generatedApi.accessAthleteMedicalRecord).mockResolvedValue({
        data: mockRecord,
      } as never);

      const result = await medicalRecordService.getMedicalRecord(
        'ath-1',
        'Control de aptitud física',
      );

      expect(generatedApi.accessAthleteMedicalRecord).toHaveBeenCalledWith({
        path: { id: 'ath-1' },
        body: { justification: 'Control de aptitud física' },
        throwOnError: true,
      });
      expect(result).toEqual(mockRecord);
    });

    it('rechaza si la justificación está vacía o contiene solo espacios', async () => {
      await expect(medicalRecordService.getMedicalRecord('ath-1', '   ')).rejects.toThrow(
        'La justificación para acceder a la ficha médica es obligatoria.',
      );
      expect(generatedApi.accessAthleteMedicalRecord).not.toHaveBeenCalled();
    });
  });

  describe('updateMedicalRecord', () => {
    it('actualiza la ficha médica declarando la justificación en el body', async () => {
      const mockUpdated = {
        id: 'rec-1',
        athleteId: 'ath-1',
        hasPhysicalFitnessCertificate: true,
      };

      vi.mocked(generatedApi.updateAthleteMedicalRecord).mockResolvedValue({
        data: mockUpdated,
      } as never);

      const result = await medicalRecordService.updateMedicalRecord('ath-1', {
        justification: 'Actualización certificado médico',
        hasPhysicalFitnessCertificate: true,
      });

      expect(generatedApi.updateAthleteMedicalRecord).toHaveBeenCalledWith({
        path: { id: 'ath-1' },
        body: expect.objectContaining({
          justification: 'Actualización certificado médico',
          hasPhysicalFitnessCertificate: true,
        }),
        throwOnError: true,
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('listAuditLogs', () => {
    it('consulta la lista inmutable de accesos y auditorías', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          athleteId: 'ath-1',
          accessedByUserId: 'pf-1',
          action: 'Read' as const,
          justification: 'Control',
          createdAt: '2026-10-31T15:00:00Z',
        },
      ];

      vi.mocked(generatedApi.listAthleteMedicalRecordAuditLogs).mockResolvedValue({
        data: mockLogs,
      } as never);

      const result = await medicalRecordService.listAuditLogs('ath-1');
      expect(generatedApi.listAthleteMedicalRecordAuditLogs).toHaveBeenCalledWith({
        path: { id: 'ath-1' },
        throwOnError: true,
      });
      expect(result).toEqual(mockLogs);
    });
  });
});

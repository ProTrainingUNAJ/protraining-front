import {
  accessAthleteMedicalRecord,
  updateAthleteMedicalRecord,
  listAthleteMedicalRecordAuditLogs,
} from './generated/estructura';
import { extractErrorMessage } from './axiosClient';
import {
  MedicalRecord,
  UpdateMedicalRecordRequest,
  MedicalRecordAuditLog,
} from '../types/medicalRecord';

export const medicalRecordService = {
  /**
   * Retrieves athlete medical record requiring an explicit justification via POST /access (KAN-325).
   * Records an immutable access entry in the audit log table.
   */
  async getMedicalRecord(athleteId: string, justification: string): Promise<MedicalRecord> {
    const trimmed = justification.trim();
    if (!trimmed) {
      throw new Error('La justificación para acceder a la ficha médica es obligatoria.');
    }

    try {
      const { data } = await accessAthleteMedicalRecord({
        path: { id: athleteId },
        body: { justification: trimmed },
        throwOnError: true,
      });
      return data as MedicalRecord;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Updates physical clearance status and medical history (KAN-325).
   * Requires declaring justification in payload and records audit entry.
   */
  async updateMedicalRecord(
    athleteId: string,
    payload: UpdateMedicalRecordRequest,
  ): Promise<MedicalRecord> {
    const trimmed = payload.justification.trim();
    if (!trimmed) {
      throw new Error('La justificación para actualizar la ficha médica es obligatoria.');
    }

    try {
      const { data } = await updateAthleteMedicalRecord({
        path: { id: athleteId },
        body: {
          ...payload,
          justification: trimmed,
        },
        throwOnError: true,
      });
      return data as MedicalRecord;
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },

  /**
   * Retrieves immutable audit log of medical record accesses and changes (KAN-324 / KAN-325).
   */
  async listAuditLogs(athleteId: string): Promise<MedicalRecordAuditLog[]> {
    try {
      const { data } = await listAthleteMedicalRecordAuditLogs({
        path: { id: athleteId },
        throwOnError: true,
      });
      return (data || []) as MedicalRecordAuditLog[];
    } catch (err: unknown) {
      throw new Error(extractErrorMessage(err), { cause: err });
    }
  },
};

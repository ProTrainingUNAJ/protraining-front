import {
  MedicalRecord,
  UpdateMedicalRecordRequest,
  MedicalRecordAuditLog,
} from '../api/generated/estructura/types.gen';

export type { MedicalRecord, UpdateMedicalRecordRequest, MedicalRecordAuditLog };

export interface AthleteDigitalConsent {
  athleteId: string;
  isSigned: boolean;
  consentDate: string;
  isMinor: boolean;
  guardianName?: string | null;
  allowsPhysicalTraining: boolean;
  allowsHabitsRecommendations: boolean;
}

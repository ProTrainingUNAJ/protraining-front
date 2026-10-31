import {
  listRecordProposals,
  approveRecordProposal,
  discardRecordProposal,
  type Record as ApiRecord,
} from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { AthleteRecordItem, RecordOrigin } from '../types/athleteRecords';
import { RecordProposalItem } from '../types/recordProposals';

function mapRecord(record: ApiRecord): AthleteRecordItem {
  return {
    id: record.id,
    exerciseId: record.exerciseId,
    exerciseName: record.exerciseName,
    weightKg: record.weightOneRepMaxKg,
    origin: record.origin as RecordOrigin,
    achievedAt: record.achievedAt,
  };
}

export const recordProposalsService = {
  // Lista las propuestas pendientes de aprobación generadas por Epley para los atletas del PF.
  async listPending(): Promise<RecordProposalItem[]> {
    try {
      const { data } = await listRecordProposals({
        query: { status: 'Pending' },
        throwOnError: true,
      });
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  // Aprueba la propuesta en 1 clic: actualiza el récord vigente con origen Epley.
  async approve(id: string): Promise<AthleteRecordItem> {
    try {
      const { data } = await approveRecordProposal({
        path: { id },
        throwOnError: true,
      });
      return mapRecord(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  // Descarta la propuesta sin modificar el récord vigente.
  async discard(id: string): Promise<void> {
    try {
      await discardRecordProposal({
        path: { id },
        throwOnError: true,
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};

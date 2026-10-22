import { getAthleteRecords, saveRecord, Record as ApiRecord } from './generated/entrenamiento';
import { extractErrorMessage } from './axiosClient';
import { AthleteRecordItem, RecordOrigin } from '../types/athleteRecords';

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

// Con throwOnError el SDK lanza el error de Axios, y extractErrorMessage lee el
// mensaje en español del ProblemDetails del back.
export const athleteRecordsService = {
  // Solo los récords vigentes: uno por ejercicio.
  async listCurrent(athleteId: string): Promise<AthleteRecordItem[]> {
    try {
      const { data } = await getAthleteRecords({
        path: { athleteId },
        query: { currentOnly: true },
        throwOnError: true,
      });
      return data.map(mapRecord);
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  // El back deja el récord anterior de ese ejercicio como no vigente.
  async save(
    athleteId: string,
    exerciseId: string,
    weightKg: number,
    origin: RecordOrigin,
  ): Promise<AthleteRecordItem> {
    try {
      const { data } = await saveRecord({
        path: { athleteId },
        body: { exerciseId, weightOneRepMaxKg: weightKg, origin },
        throwOnError: true,
      });
      return mapRecord(data);
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};

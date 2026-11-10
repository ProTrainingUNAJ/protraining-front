import {
  completeOnboarding,
  getAthleteRecords,
  saveRecord,
  Record as ApiRecord,
} from './generated/entrenamiento';
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

  // Historial completo de récords del atleta (vigentes y pasados) para evolución.
  async listHistory(athleteId: string): Promise<AthleteRecordItem[]> {
    try {
      const { data } = await getAthleteRecords({
        path: { athleteId },
        query: { currentOnly: false },
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

  // Declara marcas en el onboarding (KAN-415/417). El back solo crea las de
  // ejercicios sin récord vigente y devuelve las creadas y las salteadas.
  async declareOnboarding(marks: { exerciseId: string; weightOneRepMaxKg: number }[]): Promise<{
    created: AthleteRecordItem[];
    skipped: { exerciseId: string; exerciseName: string }[];
  }> {
    try {
      const { data } = await completeOnboarding({ body: marks, throwOnError: true });
      return {
        created: (data.created ?? []).map(mapRecord),
        skipped: (data.skipped ?? []).map((item) => ({
          exerciseId: item.exerciseId ?? '',
          exerciseName: item.exerciseName ?? '',
        })),
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },
};

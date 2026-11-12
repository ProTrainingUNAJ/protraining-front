import { extractErrorMessage } from './axiosClient';
import {
  listFieldTestSessions as listFieldTestSessionsRequest,
  createFieldTestSession as createFieldTestSessionRequest,
  updateFieldTestSessionStatus as updateFieldTestSessionStatusRequest,
  getFieldTestSession as getFieldTestSessionRequest,
  createFieldTestResult as createFieldTestResultRequest,
  updateFieldTestResult as updateFieldTestResultRequest,
  listFitnessTests as listFitnessTestsRequest,
  type FieldTestSession,
  type FieldTestSessionSummary,
  type CreateFieldTestSessionRequest,
  type UpdateFieldTestSessionStatusRequest,
  type CreateFieldTestResultRequest,
  type UpdateFieldTestResultRequest,
  type FieldTestResult,
  type FitnessTest,
} from './generated/seguimiento';

// ---------------------------------------------------------------------------
// Sesiones de test de campo: gestión de sesiones y carga rápida de
// marcas en cancha. Los errores se traducen a Error con el mensaje del backend
// (p. ej. "La sesión ya está cerrada.").
// ---------------------------------------------------------------------------

/**
 * Lista las sesiones de una categoría (resumen: id, fecha, nombre y estado).
 * GET `/api/v1/field-test-sessions?categoryId=`.
 */
export async function listFieldTestSessions(
  categoryId: string,
): Promise<FieldTestSessionSummary[]> {
  try {
    const response = await listFieldTestSessionsRequest({
      query: { categoryId },
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Crea una sesión con sus pruebas del catálogo (estado inicial Planned).
 * POST `/api/v1/field-test-sessions`.
 */
export async function createFieldTestSession(
  payload: CreateFieldTestSessionRequest,
): Promise<FieldTestSession> {
  try {
    const response = await createFieldTestSessionRequest({
      body: payload,
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Avanza el estado de la sesión (Planned → InProgress → Closed, en orden estricto).
 * PATCH `/api/v1/field-test-sessions/{sessionId}/status`.
 */
export async function updateFieldTestSessionStatus(
  sessionId: string,
  status: UpdateFieldTestSessionStatusRequest['status'],
): Promise<FieldTestSessionSummary> {
  try {
    const response = await updateFieldTestSessionStatusRequest({
      path: { sessionId },
      body: { status },
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Sesión completa con sus pruebas y resultados cargados (una sola llamada
 * para pintar la pantalla de captura).
 * GET `/api/v1/field-test-sessions/{sessionId}`.
 */
export async function getFieldTestSession(sessionId: string): Promise<FieldTestSession> {
  try {
    const response = await getFieldTestSessionRequest({
      path: { sessionId },
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Carga la marca de un atleta en la sesión (intentos fijos en 1 desde la cancha).
 * POST `/api/v1/field-test-sessions/{sessionId}/results`.
 * Devuelve 400 "La sesión ya está cerrada." si la sesión está en estado Closed.
 */
export async function createFieldTestResult(
  sessionId: string,
  payload: CreateFieldTestResultRequest,
): Promise<FieldTestResult> {
  try {
    const response = await createFieldTestResultRequest({
      path: { sessionId },
      body: payload,
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Corrige una marca ya cargada (valor e intento) en la sesión (KAN-568).
 * PUT `/api/v1/field-test-sessions/{sessionId}/results/{resultId}`.
 * Devuelve 400 "La sesión ya está cerrada." si la sesión está en estado Closed.
 */
export async function updateFieldTestResult(
  sessionId: string,
  resultId: string,
  payload: UpdateFieldTestResultRequest,
): Promise<FieldTestResult> {
  try {
    const response = await updateFieldTestResultRequest({
      path: { sessionId, resultId },
      body: payload,
      throwOnError: true,
    });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

/**
 * Catálogo activo de tests físicos (nombres y unidades para armar la sesión).
 * GET `/api/v1/fitness-tests`.
 */
export async function listFitnessTests(): Promise<FitnessTest[]> {
  try {
    const response = await listFitnessTestsRequest({ throwOnError: true });
    return response.data;
  } catch (err) {
    throw new Error(extractErrorMessage(err), { cause: err });
  }
}

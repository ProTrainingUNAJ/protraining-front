import { client as estructuraClient } from './generated/estructura/client.gen';
import { client as identidadClient } from './generated/identidad/client.gen';
import { client as entrenamientoClient } from './generated/entrenamiento/client.gen';
import { client as seguimientoClient } from './generated/seguimiento/client.gen';
import { client as asistenteClient } from './generated/asistente/client.gen';
import { getStoredSession } from './axiosClient';

let isConfigured = false;

/**
 * Configura los clientes generados desde OpenAPI para que enruten
 * a través del API Gateway (/api/{servicio}) e inyecten automáticamente
 * el token JWT Bearer en cada petición autenticada.
 */
export function ensureApiConfigured(): void {
  if (isConfigured) return;
  isConfigured = true;

  const authCallback = () => {
    const session = getStoredSession();
    return session?.accessToken || localStorage.getItem('protraining_token') || undefined;
  };

  estructuraClient.setConfig({
    baseURL: '/api/estructura',
    auth: authCallback,
  });

  identidadClient.setConfig({
    baseURL: '/api/identidad',
    auth: authCallback,
  });

  entrenamientoClient.setConfig({
    baseURL: '/api/entrenamiento',
    auth: authCallback,
  });

  seguimientoClient.setConfig({
    baseURL: '/api/seguimiento',
    auth: authCallback,
  });

  asistenteClient.setConfig({
    baseURL: '/api/asistente',
    auth: authCallback,
  });
}

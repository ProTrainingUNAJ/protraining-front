import type { Client } from './generated/estructura/client';
import { client as identidadClient } from './generated/identidad/client.gen';
import { client as estructuraClient } from './generated/estructura/client.gen';
import { client as entrenamientoClient } from './generated/entrenamiento/client.gen';
import { client as seguimientoClient } from './generated/seguimiento/client.gen';
import { client as asistenteClient } from './generated/asistente/client.gen';
import { httpClient } from './axiosClient';

// El front llama al back siempre por el gateway, con el prefijo /api/<servicio>.
const GATEWAY_PREFIX = '/api';

function connectToGateway(client: Client, servicePath: string): void {
  // El SDK generado usa su propio Axios y apunta al puerto del servicio. Acá lo
  // reenseñamos: baseURL del gateway y el httpClient de la app, así los pedidos
  // mandan el Authorization: Bearer y renuevan el token igual que el resto.
  client.setConfig({
    baseURL: `${GATEWAY_PREFIX}${servicePath}`,
    axios: httpClient,
  });
}

/**
 * Conecta los clientes generados con OpenAPI al gateway y al httpClient.
 * Se llama una vez al iniciar la app (ver src/main.tsx).
 */
export function configureApiClients(): void {
  connectToGateway(identidadClient, '/identidad');
  connectToGateway(estructuraClient, '/estructura');
  connectToGateway(entrenamientoClient, '/entrenamiento');
  connectToGateway(seguimientoClient, '/seguimiento');
  connectToGateway(asistenteClient, '/asistente');
}

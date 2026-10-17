import { httpClient } from './axiosClient';

export interface VapidPublicKeyResponse {
  publicKey: string;
}

export interface RegisterPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

/**
 * Convierte una clave pública VAPID en Base64URL a Uint8Array para PushManager.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Obtiene la clave pública VAPID desde el backend (Estructura a través del Gateway).
 */
export async function getVapidPublicKey(): Promise<string> {
  const response = await httpClient.get<VapidPublicKeyResponse>(
    '/api/estructura/api/v1/push-subscriptions/public-key'
  );
  return response.data.publicKey;
}

/**
 * Registra una suscripción Web Push en el backend.
 */
export async function registerPushSubscription(
  payload: RegisterPushSubscriptionPayload
): Promise<void> {
  await httpClient.post('/api/estructura/api/v1/push-subscriptions', payload);
}

/**
 * Revoca una suscripción Web Push en el backend.
 */
export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  await httpClient.delete('/api/estructura/api/v1/push-subscriptions', {
    data: { endpoint },
  });
}

/**
 * Solicita permisos al usuario y suscribe el navegador a notificaciones Web Push.
 */
export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Web Push no está soportado en este navegador.');
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('Permiso de notificaciones no concedido.');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidPublicKey = await getVapidPublicKey();

  if (!vapidPublicKey) {
    throw new Error('No se pudo obtener la clave pública VAPID del servidor.');
  }

  const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey,
    });
  }

  const subJson = subscription.toJSON();
  if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
    throw new Error('La suscripción Web Push no contiene las claves requeridas.');
  }

  await registerPushSubscription({
    endpoint: subJson.endpoint,
    keys: {
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    },
    userAgent: navigator.userAgent,
  });

  return subscription;
}

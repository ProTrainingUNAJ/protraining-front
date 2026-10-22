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
 * Comprueba si Web Push y Notification están soportados en el entorno actual.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Retorna el estado actual de permisos de notificación.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Verifica si el navegador actual ya cuenta con una suscripción Web Push activa.
 */
export async function isUserSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Obtiene la clave pública VAPID desde el backend (Estructura a través del Gateway).
 */
export async function getVapidPublicKey(): Promise<string> {
  const response = await httpClient.get<VapidPublicKeyResponse>(
    '/estructura/api/v1/push-subscriptions/public-key',
  );
  return response.data.publicKey;
}

/**
 * Registra una suscripción Web Push en el backend.
 */
export async function registerPushSubscription(
  payload: RegisterPushSubscriptionPayload,
): Promise<void> {
  await httpClient.post('/estructura/api/v1/push-subscriptions', payload);
}

/**
 * Revoca una suscripción Web Push en el backend.
 * Envía el endpoint tanto por query params como en el cuerpo para compatibilidad con proxies.
 */
export async function unregisterPushSubscription(endpoint: string): Promise<void> {
  await httpClient.delete('/estructura/api/v1/push-subscriptions', {
    params: { endpoint },
    data: { endpoint },
  });
}

/**
 * Desuscribe al usuario de las notificaciones Web Push y revoca el registro en el backend.
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await unregisterPushSubscription(subscription.endpoint);
      return await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error('Error al desuscribir de notificaciones Web Push:', error);
    return false;
  }
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
      applicationServerKey: convertedKey as unknown as BufferSource,
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

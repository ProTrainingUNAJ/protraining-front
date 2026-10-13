// src/utils/deviceId.ts
// Utility to generate and persist a unique device identifier for the application.
// This implementation uses the browser's Crypto API to create a SHA-256 hash of a
// lightweight fingerprint and stores the result in localStorage so it remains
// stable across sessions.

/**
 * Generates a pseudo‑unique identifier based on browser characteristics.
 * The fingerprint is intentionally simple – it does not aim to uniquely track
 * users across sites, only to provide a stable identifier for the current app
 * instance.
 */
async function generateDeviceId(): Promise<string> {
  const signals = [
    navigator.userAgent,
    navigator.language,
    (screen.colorDepth ?? 0).toString(),
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset().toString(),
    (navigator.hardwareConcurrency ?? 0).toString(),
    ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0).toString(),
    'ontouchstart' in window ? 'touch' : 'no-touch',
  ];

  // Canvas fingerprint for extra entropy (fails gracefully in privacy mode)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('DeviceIdCanvas', 2, 15);
      signals.push(canvas.toDataURL());
    }
  } catch {
    signals.push('canvas-blocked');
  }

  const raw = signals.join('###');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Retrieves a persisted device identifier. If none exists, it generates a new one
 * and stores it in localStorage under the key "protraining_device_id".
 */
export async function getDeviceId(): Promise<string> {
  const storageKey = 'protraining_device_id';
  const existing = localStorage.getItem(storageKey);
  if (existing) return existing;
  const newId = await generateDeviceId();
  localStorage.setItem(storageKey, newId);
  return newId;
}

// src/utils/deviceId.ts
// Utility to manage a persistent unique device identifier for the application.
// Generates a random UUID on first run and persists it in localStorage.

const STORAGE_KEY = 'protraining_device_id';

/**
 * Retrieves a persisted random device identifier.
 * If none exists, generates a new random UUID and stores it in localStorage.
 */
export function getDeviceId(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}

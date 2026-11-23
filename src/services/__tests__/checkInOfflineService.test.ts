import { beforeEach, describe, expect, it, vi } from 'vitest';

type RequestStub<T> = {
  result: T;
  error: unknown;
  onsuccess: ((event: { target: RequestStub<T> }) => void) | null;
  onerror: ((event: { target: RequestStub<T> }) => void) | null;
};

const createRequest = <T>(result?: T): RequestStub<T> => ({
  result: result as T,
  error: null,
  onsuccess: null,
  onerror: null,
});

describe('limpieza de check-ins pendientes', () => {
  let clearRequest: RequestStub<void>;
  let clearMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    clearRequest = createRequest<void>();
    clearMock = vi.fn(() => clearRequest);
    const store = { clear: clearMock };
    const db = {
      objectStoreNames: { contains: () => true },
      transaction: vi.fn(() => ({ objectStore: () => store })),
    };
    const openRequest = createRequest(db);

    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: {
        open: vi.fn(() => {
          queueMicrotask(() => openRequest.onsuccess?.({ target: openRequest }));
          return openRequest;
        }),
      },
    });
  });

  it('borra todos los registros de la tienda de pendientes', async () => {
    const { clearAllOfflineCheckIns } = await import('../checkInOfflineService');

    const pending = clearAllOfflineCheckIns();
    await vi.waitFor(() => expect(clearMock).toHaveBeenCalledTimes(1));
    clearRequest.onsuccess?.({ target: clearRequest });

    await expect(pending).resolves.toBeUndefined();
  });

  it('propaga el error cuando IndexedDB no puede borrar', async () => {
    const { clearAllOfflineCheckIns } = await import('../checkInOfflineService');

    const pending = clearAllOfflineCheckIns();
    await vi.waitFor(() => expect(clearMock).toHaveBeenCalledTimes(1));
    clearRequest.error = new Error('falló el borrado');
    clearRequest.onerror?.({ target: clearRequest });

    await expect(pending).rejects.toThrow('falló el borrado');
  });
});

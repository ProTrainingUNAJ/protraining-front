import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthSession, ProblemDetails, RefreshResponse } from '../types/auth';
import { getDeviceId } from '../utils/deviceId';

const STORAGE_KEY = 'protraining_session';
const LEGACY_TOKEN_KEY = 'protraining_token';

// Callbacks for auth state change (e.g. session expired)
type AuthExpiredListener = () => void;
const authExpiredListeners: Set<AuthExpiredListener> = new Set();

export function onAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

function notifyAuthExpired() {
  authExpiredListeners.forEach((listener) => listener());
}

/**
 * Storage helpers for session persistence
 */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session || !session.accessToken) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: AuthSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    // Keep legacy token key synced for any legacy component
    localStorage.setItem(LEGACY_TOKEN_KEY, session.accessToken);
  } catch (error) {
    console.error('Error guardando la sesión en almacenamiento local', error);
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch (error) {
    console.error('Error al limpiar la sesión', error);
  }
}

// Queue mechanism for handling concurrent requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

/**
 * Main Axios instance for ProTraining
 */
export const httpClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * Attaches Bearer accessToken to all outgoing requests if session exists.
 */
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const session = getStoredSession();
    if (session?.accessToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/**
 * Response Interceptor:
 * - Detects 401 Unauthorized errors on protected routes.
 * - Prevents infinite loops and exclusions on login requests.
 * - Handles token refresh attempt or graceful session termination.
 */
httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // If there's no response or request config, propagate error immediately
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh');

    // 401 on login or refresh endpoint is an authentication error: DO NOT attempt refresh!
    if (error.response.status === 401 && isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Handle 401 on protected requests
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another request is currently refreshing; queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            const currentSession = getStoredSession();
            if (currentSession?.accessToken) {
              originalRequest.headers['Authorization'] = `Bearer ${currentSession.accessToken}`;
            }
            return httpClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const refreshed = await attemptTokenRefresh();

        if (refreshed) {
          processQueue(null);
          const currentSession = getStoredSession();
          if (currentSession?.accessToken) {
            originalRequest.headers['Authorization'] = `Bearer ${currentSession.accessToken}`;
          }
          return httpClient(originalRequest);
        } else {
          throw new Error('Sesión expirada');
        }
      } catch (refreshErr) {
        processQueue(refreshErr);
        clearStoredSession();
        notifyAuthExpired();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Pluggable token refresh handler.
 * Rotates accessToken and refreshToken via POST /api/identidad/api/v1/auth/refresh.
 * Returns true if refresh succeeded, false otherwise.
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const session = getStoredSession();
  const deviceId = getDeviceId();

  if (!session?.refreshToken || !deviceId) {
    return false;
  }

  try {
    const response = await axios.post<RefreshResponse>(
      '/api/identidad/api/v1/auth/refresh',
      {
        refreshToken: session.refreshToken,
        deviceId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    const data = response.data;
    if (!data.accessToken || !data.refreshToken) {
      return false;
    }

    const updatedSession: AuthSession = {
      ...session,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: data.tokenType || 'Bearer',
      expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
    };

    saveStoredSession(updatedSession);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to extract ProblemDetails or human-friendly message from an error
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ProblemDetails>(error)) {
    const data = error.response?.data;
    if (data) {
      if (data.errors) {
        const errorList = Object.values(data.errors).flat();
        if (errorList.length > 0) return errorList.join(' ');
      }
      if (data.detail) return data.detail;
      if (data.title) return data.title;
    }
    if (error.response?.status === 401) {
      return 'Credenciales inválidas. Verifica tu correo y contraseña.';
    }
    if (error.response?.status === 403) {
      return 'No tienes permisos para acceder a esta sección.';
    }
    if (error.response?.status === 404) {
      return 'El recurso solicitado no fue encontrado.';
    }
    if (error.response?.status && error.response.status >= 500) {
      return 'Error interno en el servidor. Intenta nuevamente más tarde.';
    }
    if (error.code === 'ECONNABORTED' || !error.response) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión de red o que el servicio esté activo.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado al procesar la solicitud.';
}

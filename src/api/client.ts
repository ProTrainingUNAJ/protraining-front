const API_BASE = '/api';

// Formato de error que devuelven todos los servicios (RFC 7807).
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  status: number;
  problemDetails?: ProblemDetails;

  constructor(message: string, status: number, problemDetails?: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problemDetails = problemDetails;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('protraining_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifique que la API esté iniciada.',
      0,
    );
  }

  if (!response.ok) {
    const errorData: ProblemDetails | null = await response.json().catch(() => null);
    const detail =
      errorData?.detail || errorData?.title || `Error ${response.status} en el servidor`;
    throw new ApiError(detail, response.status, errorData ?? undefined);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

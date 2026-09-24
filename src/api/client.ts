const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  problemDetails?: any;

  constructor(message: string, status: number, problemDetails?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problemDetails = problemDetails;
  }
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('protraining_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(15000)
    });
  } catch (err: any) {
    throw new ApiError('No se pudo conectar con el servidor. Verifique que la API esté iniciada.', 0);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detail = errorData?.detail || errorData?.title || `Error ${response.status} en el servidor`;
    throw new ApiError(detail, response.status, errorData);
  }

  if (response.status === 204) {
    return null as any;
  }

  return response.json();
}

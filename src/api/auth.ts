import { ensureApiConfigured } from './clientConfig';
import {
  iniciarSesion,
  obtenerUsuarioActual,
  type Sesion,
  type PerfilUsuario,
} from './generated/identidad';
import { saveStoredSession, clearStoredSession, getStoredSession } from './axiosClient';
import { AuthSession, LoginRequest } from '../types/auth';

ensureApiConfigured();

/**
 * Inicia sesión validando credenciales contra el microservicio Identidad
 */
export async function login(credentials: LoginRequest): Promise<AuthSession> {
  ensureApiConfigured();
  const res = await iniciarSesion({
    body: {
      email: credentials.email.trim(),
      contrasena: credentials.password,
    },
    throwOnError: true,
  });

  const data = res.data as Sesion;
  const expiresAt = Date.now() + (data.expiraEn || 3600) * 1000;

  const session: AuthSession = {
    accessToken: data.token,
    tokenType: data.tipoToken || 'Bearer',
    expiresAt,
    refreshToken: (data as unknown as { refreshToken?: string }).refreshToken || '',
    user: {
      id: data.cuentaId,
      email: data.email,
      fullName: data.nombreCompleto,
      role: data.rol,
      pfId: null,
    },
  };

  saveStoredSession(session);
  return session;
}

/**
 * Cierra la sesión activa y limpia el almacenamiento
 */
export function logout(): void {
  clearStoredSession();
}

/**
 * Obtiene la sesión almacenada si aún no ha expirado
 */
export function getValidSession(): AuthSession | null {
  const session = getStoredSession();
  if (!session) return null;

  if (Date.now() >= session.expiresAt) {
    clearStoredSession();
    return null;
  }

  return session;
}

/**
 * Consulta la información del usuario autenticado actual desde el backend
 */
export async function getCurrentUser(): Promise<PerfilUsuario | null> {
  ensureApiConfigured();
  try {
    const res = await obtenerUsuarioActual({ throwOnError: true });
    return (res.data as PerfilUsuario) ?? null;
  } catch {
    return null;
  }
}

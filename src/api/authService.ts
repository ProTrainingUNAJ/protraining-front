import {
  httpClient,
  saveStoredSession,
  clearStoredSession,
  getStoredSession,
  extractErrorMessage,
} from './axiosClient';
import { changePassword as changePasswordSdk } from './generated/identidad';
import { getDeviceId } from '../utils/deviceId';
import { AuthSession, LoginRequest, LoginResponse } from '../types/auth';

const LOGIN_ENDPOINT = '/identidad/api/v1/auth/login';

export const authService = {
  /**
   * Executes login against Identidad microservice through Gateway
   */
  async login(credentials: LoginRequest): Promise<AuthSession> {
    const deviceId = credentials.deviceId ?? getDeviceId();
    const response = await httpClient.post<LoginResponse>(LOGIN_ENDPOINT, {
      email: credentials.email.trim(),
      password: credentials.password,
      deviceId,
    });

    const data = response.data;

    // Calculate expiry timestamp in milliseconds
    const expiresAt = Date.now() + (data.expiresIn || 3600) * 1000;

    const session: AuthSession = {
      accessToken: data.accessToken,
      tokenType: data.tokenType || 'Bearer',
      expiresAt,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role,
        pfId: data.user.pfId ?? null,
        phoneNumber: data.user.phoneNumber ?? null,
      },
    };

    saveStoredSession(session);
    return session;
  },

  /**
   * Registers a new athlete account using a category invitation token (KAN-398 / KAN-397).
   */
  async registerByInvitation(request: {
    email: string;
    password: string;
    fullName: string;
    token: string;
    deviceId?: string;
  }): Promise<AuthSession> {
    const deviceId = request.deviceId ?? getDeviceId();
    const response = await httpClient.post<LoginResponse>(
      '/identidad/api/v1/auth/register-by-invitation',
      {
        ...request,
        email: request.email.trim(),
        deviceId,
      },
    );

    const data = response.data;
    const expiresAt = Date.now() + (data.expiresIn || 3600) * 1000;

    const session: AuthSession = {
      accessToken: data.accessToken,
      tokenType: data.tokenType || 'Bearer',
      expiresAt,
      refreshToken: data.refreshToken,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role,
        pfId: data.user.pfId ?? null,
        phoneNumber: data.user.phoneNumber ?? null,
      },
    };

    saveStoredSession(session);
    return session;
  },

  /**
   * Cambia la contraseña del usuario autenticado a través del SDK generado de Identidad (KAN-538).
   */
  async changePassword(passwords: { currentPassword: string; newPassword: string }): Promise<void> {
    try {
      await changePasswordSdk({
        body: {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        },
        throwOnError: true,
      });
    } catch (error) {
      throw new Error(extractErrorMessage(error), { cause: error });
    }
  },

  /**
   * Logs out current user and clears session storage
   */
  logout() {
    clearStoredSession();
  },

  /**
   * Retrieves active session from storage if still valid
   */
  getValidSession(): AuthSession | null {
    const session = getStoredSession();
    if (!session) return null;

    // If there is no refresh token and the access token has expired, clear it
    if (!session.refreshToken && Date.now() >= session.expiresAt) {
      clearStoredSession();
      return null;
    }

    return session;
  },
};

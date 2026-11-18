import { describe, it, expect, beforeEach } from 'vitest';
import axios, { InternalAxiosRequestConfig } from 'axios';
import {
  isPublicAuthEndpoint,
  extractErrorMessage,
  httpClient,
  saveStoredSession,
  clearStoredSession,
} from '../axiosClient';

describe('axiosClient (KAN-601)', () => {
  beforeEach(() => {
    clearStoredSession();
    localStorage.clear();
  });

  describe('isPublicAuthEndpoint', () => {
    it('reconoce las rutas públicas de autenticación y registro', () => {
      expect(isPublicAuthEndpoint('/api/v1/auth/login')).toBe(true);
      expect(isPublicAuthEndpoint('/identidad/api/v1/auth/register-pf')).toBe(true);
      expect(isPublicAuthEndpoint('/identidad/api/v1/auth/confirm-email')).toBe(true);
      expect(isPublicAuthEndpoint('/identidad/api/v1/auth/resend-confirmation')).toBe(true);
      expect(isPublicAuthEndpoint('/identidad/api/v1/auth/register-by-invitation')).toBe(true);
      expect(isPublicAuthEndpoint('/identidad/api/v1/auth/forgot-password')).toBe(true);
      expect(isPublicAuthEndpoint('/identidad/api/v1/auth/reset-password')).toBe(true);
    });

    it('no marca como públicas rutas privadas de la aplicación', () => {
      expect(isPublicAuthEndpoint('/estructura/api/v1/athletes')).toBe(false);
      expect(isPublicAuthEndpoint('/entrenamiento/api/v1/training-plans')).toBe(false);
      expect(isPublicAuthEndpoint('/seguimiento/api/v1/traffic-light')).toBe(false);
      expect(isPublicAuthEndpoint(undefined)).toBe(false);
    });
  });

  describe('extractErrorMessage', () => {
    it('para 401 en /auth/login retorna "El correo o la contraseña no son correctos."', () => {
      const err = new axios.AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        {
          url: '/identidad/api/v1/auth/login',
          headers: {} as never,
        },
        {},
        {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: { url: '/identidad/api/v1/auth/login', headers: {} as never },
        },
      );

      expect(extractErrorMessage(err)).toBe('El correo o la contraseña no son correctos.');
    });

    it('para 401 en endpoints que no son login no muestra el mensaje de credenciales erróneas', () => {
      const err = new axios.AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        {
          url: '/identidad/api/v1/auth/register-pf',
          headers: {} as never,
        },
        {},
        {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config: { url: '/identidad/api/v1/auth/register-pf', headers: {} as never },
        },
      );

      expect(extractErrorMessage(err)).toBe(
        'No tenés autorización para realizar esta acción o la sesión caducó.',
      );
    });

    it('para 409 retorna "El correo ya se encuentra registrado."', () => {
      const err = new axios.AxiosError(
        'Conflict',
        'ERR_BAD_REQUEST',
        {
          url: '/identidad/api/v1/auth/register-pf',
          headers: {} as never,
        },
        {},
        {
          status: 409,
          statusText: 'Conflict',
          data: { title: 'Ya existe una cuenta con ese email' },
          headers: {},
          config: { url: '/identidad/api/v1/auth/register-pf', headers: {} as never },
        },
      );

      expect(extractErrorMessage(err)).toBe('El correo ya se encuentra registrado.');
    });
  });

  describe('interceptor de peticiones salientes', () => {
    it('no adjunta cabecera Authorization en llamadas a endpoints públicos de registro aunque haya token guardado', () => {
      saveStoredSession({
        accessToken: 'token-viejo-guardado',
        refreshToken: 'refresh-viejo',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 10000,
        user: {
          id: 'u-1',
          email: 'coach@test.com',
          role: 'PreparadorFisico',
          fullName: 'Coach',
          pfId: null,
        },
      });

      const config: InternalAxiosRequestConfig = {
        url: '/identidad/api/v1/auth/register-pf',
        headers: new axios.AxiosHeaders(),
      };

      const requestHandlers =
        (
          httpClient.interceptors.request as unknown as {
            handlers: Array<{
              fulfilled?: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
            }>;
          }
        ).handlers || [];
      let finalConfig = config;
      for (const handler of requestHandlers) {
        if (handler?.fulfilled) {
          finalConfig = handler.fulfilled(finalConfig);
        }
      }

      expect(finalConfig.headers['Authorization']).toBeUndefined();
    });

    it('adjunta cabecera Authorization en llamadas a rutas privadas cuando hay sesión', () => {
      saveStoredSession({
        accessToken: 'token-valido',
        refreshToken: 'refresh-valido',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 10000,
        user: {
          id: 'u-1',
          email: 'coach@test.com',
          role: 'PreparadorFisico',
          fullName: 'Coach',
          pfId: null,
        },
      });

      const config: InternalAxiosRequestConfig = {
        url: '/estructura/api/v1/athletes',
        headers: new axios.AxiosHeaders(),
      };

      const requestHandlers =
        (
          httpClient.interceptors.request as unknown as {
            handlers: Array<{
              fulfilled?: (c: InternalAxiosRequestConfig) => InternalAxiosRequestConfig;
            }>;
          }
        ).handlers || [];
      let finalConfig = config;
      for (const handler of requestHandlers) {
        if (handler?.fulfilled) {
          finalConfig = handler.fulfilled(finalConfig);
        }
      }

      expect(finalConfig.headers['Authorization']).toBe('Bearer token-valido');
    });
  });
});

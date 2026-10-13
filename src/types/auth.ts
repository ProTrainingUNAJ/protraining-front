/**
 * Authentication contract types based on KAN-302 / Identidad microservice
 */

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string; // nuevo campo opcional
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  pfId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string; // nuevo token de refresco (30 días)
  user: UserDto;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export type RoleType = 'PF' | 'Atleta';

export interface AuthSession {
  accessToken: string;
  tokenType: string;
  expiresAt: number; // timestamp in ms when token expires
  refreshToken: string; // nuevo token de refresco
  user: UserDto;
}

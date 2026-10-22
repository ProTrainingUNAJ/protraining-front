/**
 * Authentication contract types based on KAN-302 / KAN-306 / Identidad microservice
 */

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export type UserRole = 'PreparadorFisico' | 'Atleta' | 'Tutor';

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
  refreshToken: string;
  user: UserDto;
}

export interface RefreshRequest {
  refreshToken: string;
  deviceId: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
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
  refreshToken: string;
  user: UserDto;
}

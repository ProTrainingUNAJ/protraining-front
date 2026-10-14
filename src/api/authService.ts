/**
 * @deprecated Use directly the modular API endpoints:
 * - import { login, logout, getValidSession, getCurrentUser } from './auth';
 */

import { login, logout, getValidSession, getCurrentUser } from './auth';

export const authService = {
  login,
  logout,
  getValidSession,
  getCurrentUser,
};

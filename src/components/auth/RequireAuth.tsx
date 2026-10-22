import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface RequireAuthProps {
  allowedRole?: UserRole;
}

/**
 * Route protection guard that enforces authentication and exact role authorization.
 */
export const RequireAuth: React.FC<RequireAuthProps> = ({ allowedRole }) => {
  const { isAuthenticated, user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Exact role match: redirect to user's assigned area if known, otherwise login
    if (user.role === 'PreparadorFisico') {
      return <Navigate to="/pf" replace />;
    }
    if (user.role === 'Atleta') {
      return <Navigate to="/athlete" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

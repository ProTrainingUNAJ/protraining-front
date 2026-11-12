import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginForm } from '../components/auth/LoginForm';
import { BentoShowcase } from '../components/auth/BentoShowcase';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'PreparadorFisico' ? '/pf' : '/athlete'} replace />;
  }

  return (
    <main className="auth-page-root" id="login-container">
      <div className="auth-layout-grid">
        {/* Columna Izquierda: Tarjeta de Acceso Unificada + Tarjeta Comunitaria */}
        <div className="auth-left-column">
          <LoginForm />
        </div>

        {/* Columna Derecha: Panel Visual 3D de Marca */}
        <div className="auth-right-column">
          <BentoShowcase />
        </div>
      </div>
    </main>
  );
};

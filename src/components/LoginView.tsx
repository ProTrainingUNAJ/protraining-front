import React, { useState } from 'react';
import { apiRequest, ApiError } from '../api/client';
import { UserSession } from '../types';

interface LoginViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Por favor complete todos los campos.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<{
        accessToken: string;
        tokenType: string;
        expiresIn: number;
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
          pfId?: string;
        };
      }>(
        '/identidad/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim(), password })
        }
      );

      const session: UserSession = {
        token: response.accessToken,
        fullName: response.user?.fullName || response.user?.email || 'Usuario',
        email: response.user?.email || email.trim(),
        role: response.user?.role === 'PreparadorFisico' ? 'PF' : 'Athlete',
        accountId: response.user?.id || ''
      };

      localStorage.setItem('protraining_token', session.token);
      localStorage.setItem('protraining_session', JSON.stringify(session));
      onLoginSuccess(session);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al conectar con el servicio de autenticación.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px', margin: '4rem auto', padding: '1rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Iniciar Sesión
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Panel de Preparador Físico (PF)
          </p>
        </div>

        {error && (
          <div className="alert-banner danger" role="alert" style={{ marginBottom: '1.25rem' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Correo Electrónico
          </label>
          <input
            id="login-email"
            type="email"
            required
            placeholder="ejemplo@protraining.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <label htmlFor="login-password" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? 'Iniciando sesión…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

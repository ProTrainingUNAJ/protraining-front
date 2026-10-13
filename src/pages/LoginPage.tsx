import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';
import { BentoShowcase } from '../components/auth/BentoShowcase';
import avatar1 from '../assets/avatars/User (1).png';
import avatar2 from '../assets/avatars/User (2).png';
import avatar3 from '../assets/avatars/User (3).png';

export const LoginPage: React.FC = () => {
  return (
    <main className="auth-page-root" id="login-container">
      <div className="auth-layout-grid">
        {/* Columna Izquierda: Tarjeta de Acceso Unificada + Tarjeta Comunitaria */}
        <div className="auth-left-column">
          <LoginForm />

          {/* Tarjeta inferior de comunidad */}
          <div className="auth-community-card">
            <div className="auth-community-left">
              <div className="auth-avatar-group">
                <img src={avatar1} alt="Atleta ProTraining" className="auth-avatar-item" />
                <img src={avatar2} alt="Atleta ProTraining" className="auth-avatar-item" />
                <img src={avatar3} alt="Preparador Físico" className="auth-avatar-item" />
              </div>
              <div className="auth-community-text">
                <h3 className="font-extrabold auth-community-title">Atletas y Entrenadores</h3>
                <p className="font-medium auth-community-sub">
                  Monitoreando rendimiento y superación
                </p>
              </div>
            </div>

            <button
              type="button"
              className="auth-community-arrow-btn"
              aria-label="Ver testimonios de la comunidad"
              title="Comunidad ProTraining"
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        </div>

        {/* Columna Derecha: Panel Visual 3D de Marca */}
        <div className="auth-right-column">
          <BentoShowcase />
        </div>
      </div>
    </main>
  );
};

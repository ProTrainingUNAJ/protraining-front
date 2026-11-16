import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Dumbbell, Activity, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '../../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../../components/brand/ProTrainingLogo';

export const RegisterChoicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-main)',
      }}
    >
      <div className="auth-card" style={{ maxWidth: '520px', width: '100%' }}>
        {/* Cabecera con Logo y Selector de Tema */}
        <div className="auth-brand-top">
          <div className="auth-brand-logo-wrap">
            <ProTrainingLogo height={48} />
          </div>
          <ThemeToggle />
        </div>

        <div className="auth-header-block" style={{ marginBottom: '1.75rem' }}>
          <h1 className="auth-title" style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>
            ¿Quién sos?
          </h1>
          <p className="auth-subtitle" style={{ fontSize: '0.92rem' }}>
            Elegí cómo vas a usar ProTraining para continuar con tu registro.
          </p>
        </div>

        {/* Opciones de perfil */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
          role="radiogroup"
          aria-label="Selección de perfil"
        >
          {/* Tarjeta Soy preparador físico */}
          <button
            type="button"
            onClick={() => navigate('/registro/pf')}
            className="register-choice-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.1rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--secondary)';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Dumbbell size={24} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  marginBottom: '0.2rem',
                  color: 'var(--text-main)',
                }}
              >
                Soy preparador físico
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.35,
                }}
              >
                Armá los planes de tus atletas y seguí cómo vienen
              </p>
            </div>

            <ArrowRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>

          {/* Tarjeta Soy atleta */}
          <button
            type="button"
            onClick={() => navigate('/registro/atleta')}
            className="register-choice-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.1rem',
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              border: '1.5px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--secondary)';
              e.currentTarget.style.boxShadow = 'var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--info-bg)',
                color: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Activity size={24} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  marginBottom: '0.2rem',
                  color: 'var(--text-main)',
                }}
              >
                Soy atleta
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.86rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.35,
                }}
              >
                Entrená con el plan de tu PF
              </p>
            </div>

            <ArrowRight size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </button>
        </div>

        {/* Footer para volver al login */}
        <div style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          <span>¿Ya tenés una cuenta? </span>
          <Link
            to="/login"
            style={{
              color: 'var(--secondary)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
};

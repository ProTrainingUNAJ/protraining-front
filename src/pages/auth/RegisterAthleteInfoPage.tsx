import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft, LogIn } from 'lucide-react';
import { ThemeToggle } from '../../components/auth/ThemeToggle';
import { ProTrainingLogo } from '../../components/brand/ProTrainingLogo';

export const RegisterAthleteInfoPage: React.FC = () => {
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
      <div className="auth-card" style={{ maxWidth: '480px', width: '100%' }}>
        {/* Cabecera con Logo y Selector de Tema */}
        <div className="auth-brand-top">
          <div className="auth-brand-logo-wrap">
            <ProTrainingLogo height={48} />
          </div>
          <ThemeToggle />
        </div>

        {/* Bloque explicativo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '1rem 0 0.5rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--info-bg)',
              color: 'var(--secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              border: '1px solid var(--info-border)',
            }}
            aria-hidden="true"
          >
            <MessageCircle size={32} />
          </div>

          <h1
            className="auth-title"
            style={{ fontSize: '1.45rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}
          >
            Registro para Atletas
          </h1>

          <div
            style={{
              padding: '1.15rem',
              borderRadius: 'var(--radius)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              marginBottom: '1.75rem',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '0.96rem',
                lineHeight: 1.5,
                color: 'var(--text-main)',
                fontWeight: 500,
              }}
            >
              Para sumarte, pedile a tu preparador físico el link de invitación. Te llega por
              WhatsApp y con ese link quedás en su grupo.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-pill-primary"
              id="btn-athlete-login"
            >
              <LogIn size={18} />
              <span>Ya tengo cuenta, iniciar sesión</span>
            </button>

            <Link
              to="/registro"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '0.6rem',
              }}
            >
              <ArrowLeft size={16} />
              <span>Volver a ¿Quién sos?</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, Sparkles, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { ProTrainingLogo } from '../brand/ProTrainingLogo';

export interface PfWelcomeModalProps {
  isOpen: boolean;
  coachName?: string;
  onClose: () => void;
}

export const PfWelcomeModal: React.FC<PfWelcomeModalProps> = ({ isOpen, coachName, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoToOrganizations = () => {
    onClose();
    navigate('/pf/organizations');
  };

  return createPortal(
    <div
      className="manage-assignments-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pf-welcome-title"
      onClick={onClose}
      style={{
        zIndex: 9999,
        backdropFilter: 'blur(6px)',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
      }}
    >
      <div
        className="manage-assignments-modal-card"
        style={{
          maxWidth: '540px',
          width: '90%',
          padding: '2.25rem 2rem',
          borderRadius: '20px',
          backgroundColor: 'var(--bg-surface, #ffffff)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          textAlign: 'center',
          animation: 'modalSlideUp 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar bienvenida"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted, #64748b)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>

        {/* Cabecera / Logo */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <ProTrainingLogo height={42} />
        </div>

        {/* Badge de agradecimiento */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(0, 102, 255, 0.08)',
            color: 'var(--primary, #0066ff)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          <Sparkles size={16} />
          <span>¡Gracias por elegir ProTraining!</span>
        </div>

        {/* Título de bienvenida */}
        <h2
          id="pf-welcome-title"
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-main, #0f172a)',
            margin: '0 0 0.75rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          ¡Te damos la bienvenida{coachName ? `, ${coachName}` : ''}!
        </h2>

        {/* Mensaje descriptivo */}
        <p
          style={{
            fontSize: '0.98rem',
            color: 'var(--text-muted, #475569)',
            lineHeight: 1.6,
            margin: '0 auto 1.75rem auto',
            maxWidth: '460px',
          }}
        >
          Estamos felices de acompañarte en la gestión física, planificación de cargas y
          optimización del rendimiento de tus atletas.
        </p>

        {/* Tarjeta de paso inicial */}
        <div
          style={{
            backgroundColor: 'var(--bg-main, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '14px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(0, 102, 255, 0.1)',
              color: 'var(--primary, #0066ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <h4
              style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-main, #0f172a)',
              }}
            >
              Primer paso: Creá tu organización deportiva
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                color: 'var(--text-muted, #64748b)',
                lineHeight: 1.45,
              }}
            >
              Registrá el club o institución en el que trabajás para luego definir sus planteles,
              categorías y atletas.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleGoToOrganizations}
            className="btn-pill-primary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
              fontSize: '0.98rem',
              fontWeight: 700,
            }}
          >
            <span>Crear mi primera organización</span>
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-pill-secondary"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              fontSize: '0.92rem',
              background: 'transparent',
              border: '1px solid var(--border-color, #e2e8f0)',
              color: 'var(--text-main, #0f172a)',
            }}
          >
            <LayoutDashboard size={16} />
            <span>Explorar el panel de inicio</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

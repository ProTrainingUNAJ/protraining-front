import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

export const RoleSwitchButton: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isAthlete = location.pathname.startsWith('/athlete');

  const handleToggle = () => {
    if (isAthlete) {
      navigate('/pf');
    } else {
      navigate('/athlete');
    }
  };

  return (
    <button
      type="button"
      className="role-switch-btn"
      onClick={handleToggle}
      title={
        isAthlete
          ? 'Cambiar a vista de Preparador Físico (/pf)'
          : 'Cambiar a vista de Atleta (/athlete)'
      }
      aria-label="Alternar rol entre Atleta y PF"
    >
      <RefreshCw size={14} className="role-switch-icon" aria-hidden="true" />
      <span>{isAthlete ? '🏋️ Modo PF' : '🏃 Modo Atleta'}</span>
    </button>
  );
};

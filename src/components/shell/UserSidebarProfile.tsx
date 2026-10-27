import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import coachAvatarImg from '../../assets/avatars/user-1.webp';
import athleteAvatarImg from '../../assets/avatars/user-2.webp';

export const UserSidebarProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAthlete = location.pathname.startsWith('/athlete');

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const defaultName = isAthlete ? 'Lucía Martínez' : 'Julián Pérez';
  const defaultRole = isAthlete ? 'Atleta' : 'Preparador Físico';
  const defaultEmail = isAthlete ? 'lucia@protraining.com' : 'profesor@protraining.com';

  const fullName = user?.fullName || defaultName;
  const roleName = user?.role || defaultRole;
  const email = user?.email || defaultEmail;

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || (isAthlete ? 'AT' : 'PF');

  const avatarSrc = isAthlete ? athleteAvatarImg : coachAvatarImg;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const settingsPath = isAthlete ? '/athlete/settings' : '/pf/settings';

  return (
    <div className="shell-sidebar-user-wrap" ref={menuRef}>
      <button
        type="button"
        className="shell-sidebar-avatar-btn"
        onClick={() => setOpen(!open)}
        aria-label={`Menú de usuario: ${fullName}`}
        title={`${fullName} (${roleName})`}
        aria-expanded={open}
      >
        <span className="shell-sidebar-avatar" aria-hidden="true">
          {!imgError ? (
            <img
              src={avatarSrc}
              alt={fullName}
              className="shell-sidebar-avatar-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="shell-sidebar-avatar-initials">{initials}</span>
          )}
        </span>
        <span className="shell-sidebar-avatar-label">Mi Perfil</span>
      </button>

      {open && (
        <div className="shell-sidebar-user-dropdown" role="menu">
          <div className="shell-user-dropdown-header">
            <strong className="shell-user-dropdown-name">{fullName}</strong>
            <span className="shell-user-dropdown-role">{roleName}</span>
            <small className="shell-user-dropdown-email">{email}</small>
          </div>

          <div className="shell-user-dropdown-divider" />

          <button
            type="button"
            className="shell-user-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate(settingsPath);
            }}
          >
            <Settings size={16} aria-hidden="true" />
            <span>Configuración</span>
          </button>

          <div className="shell-user-dropdown-divider" />

          <button
            type="button"
            className="shell-user-dropdown-item danger"
            role="menuitem"
            onClick={handleLogout}
          >
            <LogOut size={16} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
};

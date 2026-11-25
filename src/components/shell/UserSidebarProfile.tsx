import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usersService } from '../../api/users';
import { ProfileAvatar } from '../common/ProfileAvatar';

export const UserSidebarProfile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
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

  const fullName = user?.fullName ?? '';
  const roleName = isAthlete ? 'Atleta' : 'Preparador físico';
  const email = user?.email ?? '';
  const photoUrl = user?.id ? usersService.getMyPhotoUrl(user.id) : null;

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
        <ProfileAvatar
          key={photoUrl || user?.id || 'user-avatar'}
          src={photoUrl}
          name={fullName || (isAthlete ? 'Atleta' : 'Preparador físico')}
          size={32}
          className="shell-sidebar-avatar"
        />
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

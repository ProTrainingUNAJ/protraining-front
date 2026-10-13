import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import coachAvatarImg from '../../assets/avatars/User (1).png';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera del menú
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

  const fullName = user?.fullName || 'Julián Pérez';
  const roleName = user?.role || 'Preparador Físico';
  const email = user?.email || 'profesor@protraining.com';

  const initials =
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'PF';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="shell-user-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className="shell-user-avatar-btn"
        onClick={() => setOpen(!open)}
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        <span
          className="coach-avatar"
          aria-hidden="true"
          style={{ overflow: 'hidden', position: 'relative' }}
        >
          {!imgError ? (
            <img
              src={coachAvatarImg}
              alt={fullName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setImgError(true)}
            />
          ) : (
            initials
          )}
        </span>
        <ChevronDown size={14} className="avatar-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="shell-user-dropdown" role="menu">
          <div className="user-dropdown-header">
            <strong className="user-dropdown-name">{fullName}</strong>
            <span className="user-dropdown-role">{roleName}</span>
            <small className="user-dropdown-email">{email}</small>
          </div>

          <div className="user-dropdown-divider" />

          <button
            type="button"
            className="user-dropdown-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate('/pf/settings');
            }}
          >
            <Settings size={16} aria-hidden="true" />
            <span>Configuración</span>
          </button>

          <div className="user-dropdown-divider" />

          <button
            type="button"
            className="user-dropdown-item danger"
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

import React from 'react';
import { NavLink } from 'react-router-dom';
import officialLogo from '../../assets/protraining-official-isotype.png';
import { coachMenuItems } from '../../layouts/CoachMenu';
import { athleteMenuItems } from '../../layouts/AthleteMenu';
import { UserSidebarProfile } from './UserSidebarProfile';

interface AppSidebarProps {
  role: 'pf' | 'athlete';
  onNavigate?: () => void;
  className?: string;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  onNavigate,
  className = '',
}) => {
  const items = role === 'pf' ? coachMenuItems : athleteMenuItems;
  const rootPath = role === 'pf' ? '/pf' : '/athlete';

  return (
    <aside className={`app-sidebar ${className}`} aria-label="Navegación lateral de ProTraining">
      <div className="app-sidebar-top">
        {/* Logo oficial de ProTraining */}
        <NavLink
          to={rootPath}
          className="app-sidebar-logo-link"
          title="Ir a Inicio de ProTraining"
          aria-label="ProTraining Inicio"
          onClick={onNavigate}
        >
          <img
            src={officialLogo}
            alt="ProTraining"
            className="app-sidebar-logo-img"
          />
        </NavLink>

        {/* Lista vertical de opciones de menú */}
        <nav className="app-sidebar-nav" aria-label="Menú principal">
          {items.map((item) => {
            const Icon = item.icon;
            const isRoot = item.to === rootPath;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={isRoot}
                className={({ isActive }) =>
                  isActive ? 'app-sidebar-link active' : 'app-sidebar-link'
                }
                title={item.label}
                aria-label={item.label}
                onClick={onNavigate}
              >
                <Icon size={24} className="app-sidebar-link-icon" aria-hidden="true" />
                <span className="app-sidebar-tooltip">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Parte inferior: línea divisoria y perfil de usuario autenticado */}
      <div className="app-sidebar-bottom">
        <div className="app-sidebar-divider" aria-hidden="true" />
        <UserSidebarProfile />
      </div>
    </aside>
  );
};

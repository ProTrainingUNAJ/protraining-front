import React, { useId } from 'react';
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import officialLogo from '../../assets/protraining-official-isotype.webp';
import logoDark from '../../assets/protraining-logo-dark.webp';
import { coachMenuItems } from '../../layouts/CoachMenu';
import { athleteMenuItems } from '../../layouts/AthleteMenu';
import { UserSidebarProfile } from './UserSidebarProfile';

interface AppSidebarProps {
  role: 'pf' | 'athlete';
  onNavigate?: () => void;
  className?: string;
  isMobile?: boolean;
  /** Solo escritorio: si el menú muestra el nombre de cada sección además del ícono */
  expanded?: boolean;
  /** Solo escritorio: pliega o despliega el menú. Sin esta prop no se muestra el botón */
  onToggleExpanded?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  role,
  onNavigate,
  className = '',
  isMobile = false,
  expanded = false,
  onToggleExpanded,
}) => {
  const navId = useId();
  const items = role === 'pf' ? coachMenuItems : athleteMenuItems;
  const rootPath = role === 'pf' ? '/pf' : '/athlete';
  const isMobileDrawer = isMobile || className.includes('app-sidebar-mobile');
  const showToggle = !isMobileDrawer && onToggleExpanded !== undefined;
  const isExpanded = showToggle && expanded;
  const toggleLabel = isExpanded ? 'Ocultar nombres' : 'Mostrar nombres';
  const ToggleIcon = isExpanded ? PanelLeftClose : PanelLeftOpen;
  const stateClass = showToggle ? (isExpanded ? 'is-expanded' : 'is-collapsed') : '';

  return (
    <aside
      className={`app-sidebar ${className} ${stateClass}`.trim()}
      aria-label="Navegación lateral de ProTraining"
    >
      <div className="app-sidebar-top">
        {/* Logo oficial de ProTraining: versión completa horizontal en móvil, isotipo en escritorio */}
        <NavLink
          to={rootPath}
          className="app-sidebar-logo-link"
          title="Ir a Inicio de ProTraining"
          aria-label="ProTraining Inicio"
          onClick={onNavigate}
        >
          {isMobileDrawer || isExpanded ? (
            <img src={logoDark} alt="ProTraining" className="app-sidebar-logo-mobile" />
          ) : (
            <img src={officialLogo} alt="ProTraining" className="app-sidebar-logo-img" />
          )}
        </NavLink>

        {/* Lista vertical de opciones de menú */}
        <nav id={navId} className="app-sidebar-nav" aria-label="Menú principal">
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
        {showToggle && (
          <button
            type="button"
            className="app-sidebar-link app-sidebar-toggle"
            onClick={onToggleExpanded}
            aria-expanded={isExpanded}
            aria-controls={navId}
            aria-label={toggleLabel}
            title={toggleLabel}
          >
            <ToggleIcon size={22} className="app-sidebar-link-icon" aria-hidden="true" />
            <span className="app-sidebar-tooltip" aria-hidden="true">
              {toggleLabel}
            </span>
          </button>
        )}
        <div className="app-sidebar-divider" aria-hidden="true" />
        <UserSidebarProfile />
      </div>
    </aside>
  );
};

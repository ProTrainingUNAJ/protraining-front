import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { Brand } from '../components/Brand';
import { coachMenuItems, coachTabItems, coachUser, type CoachMenuItem } from './CoachMenu';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'coach-menu-item active' : 'coach-menu-item';

function MenuNav({ items, onNavigate }: { items: CoachMenuItem[]; onNavigate: () => void }) {
  return (
    <nav className="coach-menu" aria-label="Navegación del preparador">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/pf'}
          className={linkClass}
          onClick={onNavigate}
        >
          <item.icon size={20} aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function UserBox() {
  return (
    <div className="coach-user">
      <span className="coach-avatar" aria-hidden="true">
        {coachUser.initials}
      </span>
      <div className="coach-user-info">
        <strong>{coachUser.name}</strong>
        <small>{coachUser.role}</small>
      </div>
    </div>
  );
}

export function CoachLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenus = () => {
    setMenuOpen(false);
  };

  return (
    <div className="coach-shell">
      <aside className="coach-sidebar">
        <Brand />
        <MenuNav items={coachMenuItems} onNavigate={closeMenus} />
        <NavLink to="/athlete" className="coach-switch">
          <LayoutDashboard size={20} aria-hidden="true" />
          <span>Vista atleta</span>
        </NavLink>
        <UserBox />
      </aside>

      <header className="coach-topbar">
        <button
          type="button"
          className="coach-icon-btn"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={24} aria-hidden="true" />
        </button>
        <Brand />
      </header>

      {menuOpen && (
        <div className="coach-drawer-backdrop" onClick={closeMenus}>
          <aside
            className="coach-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Menú"
          >
            <div className="coach-drawer-header">
              <Brand />
              <button
                type="button"
                className="coach-icon-btn coach-icon-btn--light"
                aria-label="Cerrar menú"
                onClick={closeMenus}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <MenuNav items={coachMenuItems} onNavigate={closeMenus} />
            <UserBox />
          </aside>
        </div>
      )}

      <main className="coach-content">
        <Outlet />
      </main>

      <nav className="coach-tabbar" aria-label="Pestañas del preparador">
        {coachTabItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/pf'}
            className={({ isActive }) => (isActive ? 'coach-tab active' : 'coach-tab')}
          >
            <item.icon size={22} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

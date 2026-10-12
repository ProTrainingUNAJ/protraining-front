import { NavLink, Outlet } from 'react-router-dom';
import { Brand } from '../components/Brand';
import { athleteMenuItems, athleteUser, type AthleteMenuItem } from './AthleteMenu';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'ath-menu-item active' : 'ath-menu-item';

function MenuNav({ items }: { items: AthleteMenuItem[] }) {
  return (
    <nav className="ath-menu" aria-label="Navegación del atleta">
      {items.map(item => (
        <NavLink key={item.to} to={item.to} end={item.to === '/athlete'} className={linkClass}>
          <item.icon size={20} aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function UserBox() {
  return (
    <div className="ath-user">
      <span className="ath-avatar" aria-hidden="true">{athleteUser.initials}</span>
      <div className="ath-user-info">
        <strong>{athleteUser.name}</strong>
        <small>{athleteUser.role}</small>
      </div>
    </div>
  );
}

export function AthleteLayout() {
  return (
    <div className="ath-shell">
      <aside className="ath-sidebar">
        <Brand />
        <MenuNav items={athleteMenuItems} />
        <UserBox />
      </aside>

      <header className="ath-topbar">
        <Brand />
        <div className="ath-topbar-actions">
          <span className="ath-avatar ath-avatar--top" aria-hidden="true">{athleteUser.initials}</span>
        </div>
      </header>

      <main className="ath-content">
        <Outlet />
      </main>

      <nav className="ath-tabbar" aria-label="Pestañas del atleta">
        {athleteMenuItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/athlete'}
            className={({ isActive }) => (isActive ? 'ath-tab active' : 'ath-tab')}
          >
            <item.icon size={22} aria-hidden="true" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
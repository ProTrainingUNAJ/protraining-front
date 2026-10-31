import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { SearchBar } from './SearchBar';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsButton } from './NotificationsButton';
import { CalendarButton } from './CalendarButton';
import { ContactPfButton } from '../athlete/ContactPfButton';

interface AppShellProps {
  role: 'pf' | 'athlete';
}

export const AppShell: React.FC<AppShellProps> = ({ role }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // React pattern: synchronize state during render on route transition
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  // Close mobile drawer when window expands to desktop breakpoint (>= 992px)
  // to prevent displaying duplicate active sidebars
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 992px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setMobileMenuOpen(false);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  return (
    <div className="app-shell-viewport">
      <div className="app-shell-container">
        {/* Barra lateral izquierda fija de escritorio */}
        <AppSidebar role={role} className="app-sidebar-desktop" />

        {/* Panel principal derecho: Encabezado superior persistente y área de contenido */}
        <div className="app-main-panel">
          {/* Encabezado superior persistente */}
          <header className="app-header" aria-label="Encabezado superior de ProTraining">
            <div className="app-header-left">
              {/* Botón de menú hamburguesa para móviles/tablets */}
              <button
                type="button"
                className="app-mobile-menu-btn"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menú de navegación"
                title="Abrir menú"
              >
                <Menu size={22} aria-hidden="true" />
              </button>

              {/* A. Campo de búsqueda persistente */}
              <SearchBar placeholder="Buscar..." />
            </div>

            {/* Acciones globales persistentes */}
            <div className="app-header-actions" aria-label="Controles globales">
              {/* Selector de tema claro / oscuro */}
              <ThemeToggle />

              {/* Botón de notificaciones (Centro de Avisos exclusivo para PF) */}
              {role === 'pf' && <NotificationsButton />}

              {/* Botón de WhatsApp para el atleta (solo si el PF tiene número) */}
              {role === 'athlete' && <ContactPfButton />}

              {/* Botón de calendario */}
              <CalendarButton />
            </div>
          </header>

          {/* Área principal de contenido (única zona que cambia al navegar) */}
          <main className="app-content-body" id="main-content">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Drawer móvil para pantallas pequeñas */}
      {mobileMenuOpen && (
        <div className="app-mobile-backdrop" onClick={closeMobileMenu}>
          <div
            className="app-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Menú de navegación móvil"
          >
            <button
              type="button"
              className="app-mobile-drawer-close"
              onClick={closeMobileMenu}
              aria-label="Cerrar menú"
              title="Cerrar menú"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <AppSidebar
              role={role}
              onNavigate={closeMobileMenu}
              className="app-sidebar-mobile"
              isMobile={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

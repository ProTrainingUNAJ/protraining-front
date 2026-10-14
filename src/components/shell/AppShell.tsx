import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { SearchBar } from './SearchBar';
import { RoleSwitchButton } from './RoleSwitchButton';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsButton } from './NotificationsButton';
import { CalendarButton } from './CalendarButton';

interface AppShellProps {
  role: 'pf' | 'athlete';
}

export const AppShell: React.FC<AppShellProps> = ({ role }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Patrón oficial de React: ajustar estado durante el render si cambia la ruta
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  // Si la ventana se agranda a tamaño escritorio (>= 992px), cierra el menú móvil
  // para evitar que queden dos barras laterales activas al mismo tiempo
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

            {/* B, C, D, E. Acciones globales persistentes */}
            <div className="app-header-actions" aria-label="Controles globales">
              {/* B. Cambio de modo */}
              <RoleSwitchButton />

              {/* C. Selector de tema claro / oscuro */}
              <ThemeToggle />

              {/* D. Botón de notificaciones */}
              <NotificationsButton />

              {/* E. Botón de calendario */}
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
            <AppSidebar role={role} onNavigate={closeMobileMenu} className="app-sidebar-mobile" />
          </div>
        </div>
      )}
    </div>
  );
};

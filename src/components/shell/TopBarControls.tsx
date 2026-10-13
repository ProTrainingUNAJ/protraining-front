import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsButton } from './NotificationsButton';
import { UserMenu } from './UserMenu';

export const TopBarControls: React.FC = () => {
  return (
    <div className="shell-topbar-controls" aria-label="Controles globales de usuario y aplicación">
      {/* 1. Selector de tema claro/oscuro */}
      <ThemeToggle />

      {/* 2. Botón de notificaciones */}
      <NotificationsButton />

      {/* 3. Avatar del usuario autenticado con menú desplegable */}
      <UserMenu />
    </div>
  );
};

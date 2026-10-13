import React from 'react';
import { RoleSwitchButton } from './RoleSwitchButton';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsButton } from './NotificationsButton';
import { UserMenu } from './UserMenu';

export const TopBarControls: React.FC = () => {
  return (
    <div className="shell-topbar-controls" aria-label="Controles globales de usuario y aplicación">
      {/* 0. Botón temporal para alternar rápido entre PF y Atleta */}
      <RoleSwitchButton />

      {/* 1. Selector de tema claro/oscuro */}
      <ThemeToggle />

      {/* 2. Botón de notificaciones */}
      <NotificationsButton />

      {/* 3. Avatar del usuario autenticado con menú desplegable */}
      <UserMenu />
    </div>
  );
};

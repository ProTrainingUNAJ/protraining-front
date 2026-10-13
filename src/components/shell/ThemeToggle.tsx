import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useAuth();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`shell-theme-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`}
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Alternar tema claro y oscuro"
    >
      <span className={`theme-toggle-icon ${theme === 'light' ? 'active' : ''}`} aria-hidden="true">
        <Sun size={16} />
      </span>
      <span className={`theme-toggle-icon ${theme === 'dark' ? 'active' : ''}`} aria-hidden="true">
        <Moon size={16} />
      </span>
    </button>
  );
};

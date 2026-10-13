import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useAuth();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Alternar tema visual"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

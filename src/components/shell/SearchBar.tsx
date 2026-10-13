import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Buscar...',
  className = '',
}) => {
  const [query, setQuery] = useState('');

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className={`shell-search-bar ${className}`} role="search" aria-label="Búsqueda global">
      <Search size={18} className="shell-search-icon" aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="shell-search-input"
        aria-label="Buscar en la aplicación"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="shell-search-clear-btn"
          aria-label="Limpiar búsqueda"
          title="Limpiar búsqueda"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

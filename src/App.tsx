import React, { useState, useEffect } from 'react';
import { UserSession, Organization } from './types';
import { apiRequest } from './api/client';
import { LoginView } from './components/LoginView';
import { OrganizationsView } from './components/OrganizationsView';
import { CategoriesView } from './components/CategoriesView';
import { AthletesView } from './components/AthletesView';
import { Building2, Layers, Users, LogOut, Dumbbell } from 'lucide-react';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<'organizations' | 'categories' | 'athletes'>('categories');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);

  // Inicializar sesión desde localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('protraining_token');
    const savedSession = localStorage.getItem('protraining_session');
    if (savedToken && savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch {
        localStorage.removeItem('protraining_session');
      }
    }
  }, []);

  // Cargar organizaciones autorizadas cuando haya sesión activa
  const refreshOrganizations = async () => {
    try {
      const data = await apiRequest<Organization[]>('/estructura/api/organizations');
      setOrganizations(data || []);
      if (data && data.length > 0 && !currentOrg) {
        setCurrentOrg(data[0]);
      }
    } catch {
      // Manejado en los componentes correspondientes
    }
  };

  useEffect(() => {
    if (session) {
      refreshOrganizations();
    }
  }, [session]);

  const handleLogout = () => {
    localStorage.removeItem('protraining_token');
    localStorage.removeItem('protraining_session');
    setSession(null);
    setCurrentOrg(null);
    setOrganizations([]);
  };

  // Si no está autenticado, renderizar LoginView
  if (!session) {
    return <LoginView onLoginSuccess={(newSession) => setSession(newSession)} />;
  }

  return (
    <div>
      <header className="navbar">
        <div className="nav-content">
          <div className="brand">
            <Dumbbell size={24} />
            <span>ProTraining</span>
          </div>

          <nav className="nav-links">
            <button
              className={`nav-btn ${activeTab === 'organizations' ? 'active' : ''}`}
              onClick={() => setActiveTab('organizations')}
            >
              <Building2 size={16} />
              Organizaciones
            </button>
            <button
              className={`nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              <Layers size={16} />
              Categorías
            </button>
            <button
              className={`nav-btn ${activeTab === 'athletes' ? 'active' : ''}`}
              onClick={() => setActiveTab('athletes')}
            >
              <Users size={16} />
              Atletas
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentOrg && (
              <span className="badge badge-info" title="Organización activa">
                Club: {currentOrg.name}
              </span>
            )}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <strong>{session.fullName}</strong> ({session.role})
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {activeTab === 'organizations' && (
          <OrganizationsView
            selectedOrgId={currentOrg?.id}
            onSelectOrg={(org) => {
              setCurrentOrg(org);
              refreshOrganizations();
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            currentOrg={currentOrg}
            organizations={organizations}
            onSelectOrg={(org) => setCurrentOrg(org)}
          />
        )}

        {activeTab === 'athletes' && (
          <AthletesView
            currentOrg={currentOrg}
            organizations={organizations}
          />
        )}
      </main>
    </div>
  );
};

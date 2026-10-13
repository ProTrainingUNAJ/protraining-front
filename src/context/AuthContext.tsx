import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AuthSession, LoginRequest, RoleType, UserDto } from '../types/auth';
import { authService } from '../api/authService';
import { onAuthExpired } from '../api/axiosClient';

interface AuthContextType {
  session: AuthSession | null;
  user: UserDto | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  selectedRole: RoleType;
  setSelectedRole: (role: RoleType) => void;
  login: (credentials: LoginRequest) => Promise<AuthSession>;
  logout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleType>('PF');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('protraining_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('protraining_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Hydrate session on initial load
  useEffect(() => {
    try {
      const validSession = authService.getValidSession();
      if (validSession) {
        setSession(validSession);
        // Automatically align selectedRole with user role if known
        const isPF =
          validSession.user.role.toLowerCase().includes('pf') ||
          validSession.user.role.toLowerCase().includes('preparador');
        setSelectedRole(isPF ? 'PF' : 'Atleta');
      }
    } finally {
      setIsHydrating(false);
    }
  }, []);

  // Listen to Axios interceptor token expiration events
  useEffect(() => {
    const unsubscribe = onAuthExpired(() => {
      setSession(null);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthSession> => {
    const newSession = await authService.login(credentials);
    setSession(newSession);
    const isPF =
      newSession.user.role.toLowerCase().includes('pf') ||
      newSession.user.role.toLowerCase().includes('preparador');
    setSelectedRole(isPF ? 'PF' : 'Atleta');
    return newSession;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        isHydrating,
        selectedRole,
        setSelectedRole,
        login,
        logout,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

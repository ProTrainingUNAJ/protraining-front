import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AuthSession, LoginRequest, RoleType, UserDto } from '../types/auth';
import { login as apiLogin, logout as apiLogout, getValidSession } from '../api/auth';
import { onAuthExpired } from '../api/axiosClient';

export type ThemePreference = 'system' | 'light' | 'dark';

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
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleType>('PF');

  // Preferencia del usuario: 'system' (por defecto), 'light' o 'dark'
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const savedPref = localStorage.getItem('protraining_theme_preference');
    if (savedPref === 'system' || savedPref === 'light' || savedPref === 'dark') {
      return savedPref;
    }
    const legacySaved = localStorage.getItem('protraining_theme');
    if (legacySaved === 'light' || legacySaved === 'dark') {
      return legacySaved;
    }
    return 'system';
  });

  // Estado del sistema operativo (prefers-color-scheme)
  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    return (
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    );
  });

  // Escuchar cambios en la preferencia del sistema operativo en tiempo real
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      mediaQuery.addListener(handleSystemChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, []);

  // Tema resuelto efectivo que se aplica a document.documentElement
  const theme: 'light' | 'dark' =
    themePreference === 'system' ? (systemIsDark ? 'dark' : 'light') : themePreference;

  // Aplicar tema en data-theme y sincronizar storage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('protraining_theme', theme);
    localStorage.setItem('protraining_theme_preference', themePreference);
  }, [theme, themePreference]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreferenceState((prev) => {
      if (prev === 'system') {
        return systemIsDark ? 'light' : 'dark';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  }, [systemIsDark]);

  // Hydrate session on initial load
  useEffect(() => {
    try {
      const validSession = getValidSession();
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
    const newSession = await apiLogin(credentials);
    setSession(newSession);
    const isPF =
      newSession.user.role.toLowerCase().includes('pf') ||
      newSession.user.role.toLowerCase().includes('preparador');
    setSelectedRole(isPF ? 'PF' : 'Atleta');
    return newSession;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
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
        themePreference,
        setThemePreference,
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

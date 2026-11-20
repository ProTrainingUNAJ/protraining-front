export interface GoogleCredentialResponse {
  credential?: string;
}

export interface GoogleAccountsIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void | Promise<void>;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      width?: number | string;
      locale?: string;
    },
  ) => void;
  cancel?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsIdApi;
      };
    };
  }
}

const GSI_SCRIPT_ID = 'google-gsi-client';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gsiLoadPromise: Promise<GoogleAccountsIdApi> | null = null;

export function getGoogleClientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

export function isGoogleAuthConfigured(): boolean {
  return import.meta.env.VITE_GOOGLE_LOGIN_ENABLED === 'true' && Boolean(getGoogleClientId());
}

/**
 * Carga el script oficial de Google Identity Services una sola vez.
 */
export function loadGoogleIdentityApi(): Promise<GoogleAccountsIdApi> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('El navegador no está disponible.'));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google.accounts.id);
  }

  if (gsiLoadPromise) {
    return gsiLoadPromise;
  }

  gsiLoadPromise = new Promise<GoogleAccountsIdApi>((resolve, reject) => {
    const existing = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
        return;
      }
      existing.addEventListener('load', () => {
        if (window.google?.accounts?.id) {
          resolve(window.google.accounts.id);
        } else {
          gsiLoadPromise = null;
          reject(new Error('Google Identity Services no se inicializó correctamente.'));
        }
      });
      existing.addEventListener('error', () => {
        gsiLoadPromise = null;
        reject(new Error('No se pudo cargar el servicio de autenticación de Google.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = GSI_SCRIPT_ID;
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve(window.google.accounts.id);
      } else {
        gsiLoadPromise = null;
        reject(new Error('Google Identity Services no se inicializó correctamente.'));
      }
    };
    script.onerror = () => {
      gsiLoadPromise = null;
      reject(new Error('No se pudo cargar el servicio de autenticación de Google.'));
    };
    document.body.appendChild(script);
  });

  return gsiLoadPromise;
}

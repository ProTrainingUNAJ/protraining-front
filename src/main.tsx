import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { router } from './router';
import { AuthProvider } from './context/AuthContext';
// Montserrat variable (pesos 100 a 900) en woff2, servida desde la app.
import '@fontsource-variable/montserrat/wght.css';
import './index.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);

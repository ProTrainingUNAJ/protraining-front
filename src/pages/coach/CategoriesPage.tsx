import React from 'react';
import { OrganizationsPage } from './OrganizationsPage';

/**
 * CategoriesPage ahora utiliza la vista unificada Master-Detail de Organizaciones y Categorías (KAN-606).
 * Se mantiene este export y ruta para compatibilidad con accesos directos, marcadores y tests existentes.
 */
export const CategoriesPage: React.FC = () => {
  return <OrganizationsPage />;
};

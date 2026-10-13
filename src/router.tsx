import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { CoachLayout } from './layouts/CoachLayout';
import { AthleteLayout } from './layouts/AthleteLayout';
import { DashboardPage } from './pages/coach/DashboardPage';
import { OrganizationsPage } from './pages/coach/OrganizationsPage';
import { CategoriesPage } from './pages/coach/CategoriesPage';
import { AthletesPage } from './pages/coach/AthletesPage';
import { PlanningPage } from './pages/coach/PlanningPage';
import { TrainingPage } from './pages/coach/TrainingPage';
import { MonitoringPage } from './pages/coach/MonitoringPage';
import { ReportsPage } from './pages/coach/ReportsPage';
import { SettingsPage } from './pages/coach/SettingsPage';
import { HomePage } from './pages/athlete/HomePage';
import { RoutinePage } from './pages/athlete/RoutinePage';
import { CheckInPage } from './pages/athlete/CheckInPage';
import { ProgressPage } from './pages/athlete/ProgressPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './context/AuthContext';

// eslint-disable-next-line react-refresh/only-export-components
function RootRedirect() {
  const { isAuthenticated, user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isPF =
    user.role.toLowerCase().includes('pf') || user.role.toLowerCase().includes('preparador');
  return <Navigate to={isPF ? '/pf' : '/athlete'} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <RootRedirect /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'login/atleta', element: <LoginPage /> },
      { path: 'login/pf', element: <LoginPage /> },
      {
        path: 'pf',
        element: <CoachLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'organizations', element: <OrganizationsPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'athletes', element: <AthletesPage /> },
          { path: 'planning', element: <PlanningPage /> },
          { path: 'training', element: <TrainingPage /> },
          { path: 'monitoring', element: <MonitoringPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      {
        path: 'athlete',
        element: <AthleteLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'routine', element: <RoutinePage /> },
          { path: 'check-in', element: <CheckInPage /> },
          { path: 'progress', element: <ProgressPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

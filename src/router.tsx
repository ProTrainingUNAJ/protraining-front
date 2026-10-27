import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { CoachLayout } from './layouts/CoachLayout';
import { AthleteLayout } from './layouts/AthleteLayout';
import { DashboardPage } from './pages/coach/DashboardPage';
import { OrganizationsPage } from './pages/coach/OrganizationsPage';
import { CategoriesPage } from './pages/coach/CategoriesPage';
import { AthletesPage } from './pages/coach/AthletesPage';
import { PlanningPage } from './pages/coach/PlanningPage';
import { PlanEditorPage } from './pages/coach/PlanEditorPage';
import { SeasonCalendarPage } from './pages/coach/SeasonCalendarPage';
import { TrainingPage } from './pages/coach/TrainingPage';
import { MonitoringPage } from './pages/coach/MonitoringPage';
import { ReportsPage } from './pages/coach/ReportsPage';
import { SettingsPage } from './pages/coach/SettingsPage';
import { HomePage } from './pages/athlete/HomePage';
import { RoutinePage } from './pages/athlete/RoutinePage';
import { CheckInPage } from './pages/athlete/CheckInPage';
import { ProgressPage } from './pages/athlete/ProgressPage';
import { SettingsPage as AthleteSettingsPage } from './pages/athlete/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './context/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';

// eslint-disable-next-line react-refresh/only-export-components
function RootRedirect() {
  const { isAuthenticated, user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'PreparadorFisico') {
    return <Navigate to="/pf" replace />;
  }

  if (user.role === 'Atleta') {
    return <Navigate to="/athlete" replace />;
  }

  return <Navigate to="/login" replace />;
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
        element: <RequireAuth allowedRole="PreparadorFisico" />,
        children: [
          {
            element: <CoachLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'organizations', element: <OrganizationsPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'athletes', element: <AthletesPage /> },
              { path: 'calendar', element: <SeasonCalendarPage /> },
              { path: 'planning', element: <PlanningPage /> },
              { path: 'planning/:planId', element: <PlanEditorPage /> },
              { path: 'training', element: <TrainingPage /> },
              { path: 'monitoring', element: <MonitoringPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
      {
        path: 'athlete',
        element: <RequireAuth allowedRole="Atleta" />,
        children: [
          {
            element: <AthleteLayout />,
            children: [
              { index: true, element: <HomePage /> },
              { path: 'routine', element: <RoutinePage /> },
              { path: 'check-in', element: <CheckInPage /> },
              { path: 'progress', element: <ProgressPage /> },
              { path: 'settings', element: <AthleteSettingsPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

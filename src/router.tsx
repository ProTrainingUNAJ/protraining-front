import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { CoachLayout } from './layouts/CoachLayout';
import { AthleteLayout } from './layouts/AthleteLayout';
import { DashboardPage } from './pages/coach/DashboardPage';
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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="/pf" replace /> },
      {
        path: 'pf',
        element: <CoachLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
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

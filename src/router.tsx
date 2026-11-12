import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { CoachLayout } from './layouts/CoachLayout';
import { AthleteLayout } from './layouts/AthleteLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './context/AuthContext';
import { RequireAuth } from './components/auth/RequireAuth';

// Cada pantalla se descarga recién cuando se abre: la primera carga baja solo el login y el armado de la app
function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(loader);
  return function LazyPage() {
    return (
      <Suspense fallback={<div className="app-page-loading" role="status" aria-label="Cargando" />}>
        <Page />
      </Suspense>
    );
  };
}

const DashboardPage = lazyPage(() =>
  import('./pages/coach/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const OrganizationsPage = lazyPage(() =>
  import('./pages/coach/OrganizationsPage').then((m) => ({ default: m.OrganizationsPage })),
);
const CategoriesPage = lazyPage(() =>
  import('./pages/coach/CategoriesPage').then((m) => ({ default: m.CategoriesPage })),
);
const AthletesPage = lazyPage(() =>
  import('./pages/coach/AthletesPage').then((m) => ({ default: m.AthletesPage })),
);
const PlanningPage = lazyPage(() =>
  import('./pages/coach/PlanningPage').then((m) => ({ default: m.PlanningPage })),
);
const PlanEditorPage = lazyPage(() =>
  import('./pages/coach/PlanEditorPage').then((m) => ({ default: m.PlanEditorPage })),
);
const SeasonCalendarPage = lazyPage(() =>
  import('./pages/coach/SeasonCalendarPage').then((m) => ({ default: m.SeasonCalendarPage })),
);
const GeneratePlanDraftPage = lazyPage(() =>
  import('./pages/coach/GeneratePlanDraftPage').then((m) => ({ default: m.GeneratePlanDraftPage })),
);
const AssistantDraftPage = lazyPage(() =>
  import('./pages/coach/AssistantDraftPage').then((m) => ({ default: m.AssistantDraftPage })),
);
const TrainingPage = lazyPage(() =>
  import('./pages/coach/TrainingPage').then((m) => ({ default: m.TrainingPage })),
);
const MonitoringPage = lazyPage(() =>
  import('./pages/coach/MonitoringPage').then((m) => ({ default: m.MonitoringPage })),
);
const RecordsReliabilityPage = lazyPage(() =>
  import('./pages/coach/RecordsReliabilityPage').then((m) => ({
    default: m.RecordsReliabilityPage,
  })),
);
const FieldTestsPage = lazyPage(() =>
  import('./pages/coach/FieldTestsPage').then((m) => ({ default: m.FieldTestsPage })),
);
const FieldTestCapturePage = lazyPage(() =>
  import('./pages/coach/FieldTestCapturePage').then((m) => ({ default: m.FieldTestCapturePage })),
);
const ReportsPage = lazyPage(() =>
  import('./pages/coach/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazyPage(() =>
  import('./pages/coach/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const HomePage = lazyPage(() =>
  import('./pages/athlete/HomePage').then((m) => ({ default: m.HomePage })),
);
const RoutinePage = lazyPage(() =>
  import('./pages/athlete/RoutinePage').then((m) => ({ default: m.RoutinePage })),
);
const CheckInPage = lazyPage(() =>
  import('./pages/athlete/CheckInPage').then((m) => ({ default: m.CheckInPage })),
);
const DailyLoadPage = lazyPage(() =>
  import('./pages/athlete/DailyLoadPage').then((m) => ({ default: m.DailyLoadPage })),
);
const ProgressPage = lazyPage(() =>
  import('./pages/athlete/ProgressPage').then((m) => ({ default: m.ProgressPage })),
);
const AthleteSettingsPage = lazyPage(() =>
  import('./pages/athlete/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const InvitationLandingPage = lazyPage(() =>
  import('./pages/athlete/InvitationLandingPage').then((m) => ({
    default: m.InvitationLandingPage,
  })),
);
const ForceChangePasswordPage = lazyPage(() =>
  import('./pages/ForceChangePasswordPage').then((m) => ({ default: m.ForceChangePasswordPage })),
);
const ForgotPasswordPage = lazyPage(() =>
  import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazyPage(() =>
  import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);

// eslint-disable-next-line react-refresh/only-export-components
function RootRedirect() {
  const { isAuthenticated, user, isHydrating } = useAuth();

  if (isHydrating) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/force-change-password" replace />;
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
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'invite/:token', element: <InvitationLandingPage /> },
      { path: 'force-change-password', element: <ForceChangePasswordPage /> },
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
              { path: 'assistant/new', element: <GeneratePlanDraftPage /> },
              { path: 'assistant/drafts/:draftId', element: <AssistantDraftPage /> },
              { path: 'training', element: <TrainingPage /> },
              { path: 'monitoring', element: <MonitoringPage /> },
              { path: 'field-tests', element: <FieldTestsPage /> },
              { path: 'field-tests/:sessionId', element: <FieldTestCapturePage /> },
              { path: 'records-reliability', element: <RecordsReliabilityPage /> },
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
              { path: 'daily-load', element: <DailyLoadPage /> },
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

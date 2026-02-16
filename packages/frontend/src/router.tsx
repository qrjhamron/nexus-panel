import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ServerLayout } from './components/layout/ServerLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';

import { ConsolePage } from './pages/server/ConsolePage';
import { FilesPage } from './pages/server/FilesPage';
import { DatabasesPage } from './pages/server/DatabasesPage';
import { SchedulesPage } from './pages/server/SchedulesPage';
import { StartupPage } from './pages/server/StartupPage';
import { SettingsPage } from './pages/server/SettingsPage';
import { SubusersPage } from './pages/server/SubusersPage';

import { AccountSettingsPage } from './pages/account/AccountSettingsPage';
import { ApiKeysPage } from './pages/account/ApiKeysPage';
import { SessionsPage } from './pages/account/SessionsPage';

import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { NodesPage } from './pages/admin/NodesPage';
import { ServersPage as AdminServersPage } from './pages/admin/ServersPage';
import { UsersPage } from './pages/admin/UsersPage';
import { EggsPage } from './pages/admin/EggsPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },

          // Server routes
          {
            path: '/server/:uuid',
            element: <ServerLayout />,
            children: [
              { index: true, element: <Navigate to="console" replace /> },
              { path: 'console', element: <ConsolePage /> },
              { path: 'files', element: <FilesPage /> },
              { path: 'databases', element: <DatabasesPage /> },
              { path: 'schedules', element: <SchedulesPage /> },
              { path: 'startup', element: <StartupPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'subusers', element: <SubusersPage /> },
            ],
          },

          // Account routes
          {
            path: '/account',
            children: [
              { index: true, element: <Navigate to="settings" replace /> },
              { path: 'settings', element: <AccountSettingsPage /> },
              { path: 'api-keys', element: <ApiKeysPage /> },
              { path: 'sessions', element: <SessionsPage /> },
            ],
          },
        ],
      },

      // Admin routes
      {
        element: <AdminRoute />,
        children: [
          {
            element: <MainLayout />,
            children: [
              {
                path: '/admin',
                children: [
                  { index: true, element: <Navigate to="dashboard" replace /> },
                  { path: 'dashboard', element: <AdminDashboardPage /> },
                  { path: 'nodes', element: <NodesPage /> },
                  { path: 'nodes/:id', element: <NodesPage /> },
                  { path: 'servers', element: <AdminServersPage /> },
                  { path: 'users', element: <UsersPage /> },
                  { path: 'eggs', element: <EggsPage /> },
                  { path: 'audit-log', element: <AuditLogPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

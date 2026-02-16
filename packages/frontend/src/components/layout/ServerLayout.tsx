import { Outlet, useParams, Navigate } from 'react-router-dom';

export function ServerLayout() {
  const { uuid } = useParams<{ uuid: string }>();

  if (!uuid) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

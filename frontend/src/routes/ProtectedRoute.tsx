import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedRoute() {
  const { accessToken } = useAuth();
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

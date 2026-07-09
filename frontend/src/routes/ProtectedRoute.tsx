import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function ProtectedRoute() {
  const { accessToken, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Restoring your workspace...
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

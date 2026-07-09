import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthProvider';

export function OwnerRoute() {
  const { isInitializing, user } = useAuth();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Restoring your workspace...
      </div>
    );
  }

  if (user?.role !== 'Owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

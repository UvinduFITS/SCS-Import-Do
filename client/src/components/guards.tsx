import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';

function FullScreenLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

/** Gate routes behind authentication. Redirects to /login, preserving destination. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Gate routes behind the admin role. */
export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/import-do" replace />;
  return <Outlet />;
}

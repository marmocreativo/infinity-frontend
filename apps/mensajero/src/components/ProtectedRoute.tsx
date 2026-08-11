import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth } from '../lib/auth';

export default function ProtectedRoute() {
  const location = useLocation();

  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = auth.getUser();

  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

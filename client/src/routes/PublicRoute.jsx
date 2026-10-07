/**
 * routes/PublicRoute.jsx
 * Redirects already-authenticated users to /dashboard.
 * Prevents logged-in users from accessing /login, /register etc.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const PublicRoute = () => {
  const { isAuthenticated, isLoading } = useSelector((s) => s.auth);

  if (isLoading) return null;

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

export default PublicRoute;

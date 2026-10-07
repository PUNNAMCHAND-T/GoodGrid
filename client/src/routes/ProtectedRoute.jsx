/**
 * routes/ProtectedRoute.jsx
 * Redirects to /login if the user is not authenticated.
 * Wraps <Outlet /> so it composes cleanly with any layout.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useSelector((s) => s.auth);

  if (isLoading) return null; // wait for session restore before deciding

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

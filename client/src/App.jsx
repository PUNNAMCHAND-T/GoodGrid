/**
 * App.jsx
 *
 * Route tree — mirrors 03_FRONTEND_SPEC.md exactly.
 * On mount, attempts a silent session restore via /auth/me using the
 * existing httpOnly cookie. If it succeeds, the user is auto-logged-in.
 * If it fails, they see the public routes.
 *
 * Route structure:
 *   /                           → Home (public)
 *   /login                      → Login (public only)
 *   /register                   → Register (public only)
 *   /forgot-password            → ForgotPassword (public only)
 *   /reset-password/:token      → ResetPassword (public only)
 *
 *   [DashboardLayout]
 *     /dashboard                → Dashboard
 *     /profile                  → Own profile
 *     /profile/:id              → Public profile
 *     /requests                 → Request list
 *     /requests/my              → My requests + applications
 *     /requests/new             → Create request
 *     /requests/:id             → Request detail
 *     /map                      → Map view
 *     /chat                     → Chat list
 *     /chat/:id                 → Chat room
 *     /notifications            → Notifications
 *     /admin                    → Admin panel (role-gated in component)
 *
 *   *                           → 404 NotFound
 */
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from './features/authSlice';
import { setUnreadCount } from './features/uiSlice';
import { connect as connectSocket } from './api/socketService';
import { notificationService } from './api/services';

// Layouts & guards
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Requests from './pages/Requests/Requests';
import MyRequests from './pages/Requests/MyRequests';
import CreateRequest from './pages/Requests/CreateRequest';
import RequestDetail from './pages/Requests/RequestDetail';
import MapView from './pages/MapView';
import ChatList from './pages/Chat/ChatList';
import ChatRoom from './pages/Chat/ChatRoom';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';
import Spinner from './components/common/Spinner';

const App = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, accessToken } = useSelector((s) => s.auth);

  // Session restore on cold load
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, []);

  // Connect socket and fetch unread count once authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
      notificationService.unreadCount()
        .then((r) => dispatch(setUnreadCount(r.data.data.count)))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Show full-screen spinner during session restore
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-canvas dark:bg-surface-oled">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public landing */}
      <Route path="/" element={<Home />} />

      {/* Auth pages — redirect to /dashboard if already logged in */}
      <Route element={<PublicRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>
      </Route>

      {/* Protected app pages */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          {/* Specific request routes before /:id */}
          <Route path="/requests/my" element={<MyRequests />} />
          <Route path="/requests/new" element={<CreateRequest />} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      {/* Redirect /index to dashboard if authenticated */}
      <Route path="/index" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;

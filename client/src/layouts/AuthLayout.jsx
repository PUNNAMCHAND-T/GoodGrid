/**
 * layouts/AuthLayout.jsx
 * Wraps login, register, forgot-password, reset-password pages.
 * Centred card on a warm off-white (light) or OLED-black (dark) canvas.
 */
import { Outlet } from 'react-router-dom';
import Logo from '../components/common/Logo';

const AuthLayout = () => (
  <div className="min-h-screen flex items-center justify-center px-4 bg-light-canvas dark:bg-surface-oled">
    <div className="w-full max-w-md">
      {/* Brand — logo + tagline */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-2">
          <Logo size="xl" />
        </div>
        <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Community help, made simple</p>
      </div>
      {/* Auth card */}
      <div className="card p-8">
        <Outlet />
      </div>
    </div>
  </div>
);

export default AuthLayout;


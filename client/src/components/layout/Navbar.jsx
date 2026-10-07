/**
 * components/layout/Navbar.jsx
 *
 * Top bar shown inside DashboardLayout — hamburger (mobile), notification
 * bell, theme toggle (sun/moon), and user avatar.
 *
 * The theme toggle button dispatches `toggleDarkMode` from uiSlice, which
 * handles the <html> class and localStorage persistence in one place.
 */
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logoutUser } from '../../features/authSlice';
import { toggleSidebar, toggleDarkMode } from '../../features/uiSlice';
import Avatar from '../common/Avatar';
import Logo from '../common/Logo';

const Navbar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { isDarkMode, notifications: { unreadCount } } = useSelector((s) => s.ui);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-surface-oled shrink-0">
      {/* Mobile hamburger */}
      <button
        id="sidebar-toggle"
        onClick={() => dispatch(toggleSidebar())}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-surface-raised"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo (visible on mobile since sidebar is hidden) */}
      <Link to="/dashboard" className="lg:hidden">
        <Logo size="sm" />
      </Link>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Theme toggle — sun icon for dark mode (click to go light), moon for light mode */}
        <button
          id="theme-toggle"
          onClick={() => dispatch(toggleDarkMode())}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-surface-raised transition-colors"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            /* Sun icon — shown when in dark mode, click switches to light */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            /* Moon icon — shown when in light mode, click switches to dark */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Notifications bell */}
        <Link
          to="/notifications"
          id="notifications-link"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-surface-raised transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-brand-500 rounded-full" />
          )}
        </Link>

        {/* User avatar → profile */}
        <Link to="/profile" id="profile-link" className="rounded-full">
          <Avatar src={user?.avatar} name={user?.name} size="sm" />
        </Link>
      </div>
    </header>
  );
};

export default Navbar;


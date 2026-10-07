/**
 * main.jsx
 * Entry point — wraps the app in Redux Provider, React Router, and Toaster.
 *
 * Theme initialisation: before React renders, we read the saved theme
 * preference from localStorage and apply the "dark" class to <html>.
 * This prevents a flash of light content when the user prefers dark mode.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import App from './App';
import './index.css';

// Apply saved theme before first paint — avoids a white flash for dark-mode users
if (localStorage.getItem('goodgrid-theme') === 'dark') {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            // Light mode: white card with dark text.
            // Dark mode: dark card with white text.
            // We use CSS classes so styles respond to the theme toggle
            // without needing a React re-render of the Toaster itself.
            className: '!bg-white !text-slate-800 !border !border-slate-200 dark:!bg-surface-dark dark:!text-white dark:!border-white/[0.08]',
            style: {
              borderRadius: '8px',
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#0ea5e9', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);


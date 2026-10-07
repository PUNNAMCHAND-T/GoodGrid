/**
 * pages/NotFound/index.jsx
 * 404 page — shown for any unmatched route.
 */
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-light-canvas dark:bg-surface-oled gap-4">
    <p className="text-8xl font-bold text-brand-500">404</p>
    {/* Heading — slate-800 in light, white in dark */}
    <h1 className="text-2xl font-semibold text-slate-800 dark:text-white">Page not found</h1>
    {/* Body text — slate-500 in light, zinc-400 in dark */}
    <p className="text-slate-500 dark:text-zinc-400">The page you're looking for doesn't exist.</p>
    <Link to="/"><Button>Back to home</Button></Link>
  </div>
);

export default NotFound;

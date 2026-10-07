/**
 * pages/Home/index.jsx
 * Public landing page — links to login/register.
 */
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Logo from '../../components/common/Logo';

const Home = () => (
  <div className="min-h-screen flex flex-col bg-light-canvas dark:bg-surface-oled">
    {/* Header */}
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/[0.08]">
      <Link to="/">
        <Logo size="sm" />
      </Link>
      <div className="flex gap-3">
        <Link to="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
        <Link to="/register"><Button size="sm">Sign up</Button></Link>
      </div>
    </header>

    {/* Hero */}
    <main className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-6">
      <h1 className="text-4xl lg:text-6xl font-bold text-slate-800 dark:text-white max-w-2xl">
        Community help,<br />
        <span className="text-brand-500">made simple.</span>
      </h1>
      <p className="text-lg text-slate-500 dark:text-zinc-400 max-w-xl">
        Post a help request, find nearby volunteers, and get things done — together.
      </p>
      <div className="flex gap-4">
        <Link to="/register"><Button size="lg">Get started free</Button></Link>
        <Link to="/login"><Button variant="outline" size="lg">Log in</Button></Link>
      </div>
    </main>
  </div>
);

export default Home;

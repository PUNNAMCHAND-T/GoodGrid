/**
 * components/common/Button.jsx
 * Reusable button with variant and size props.
 */
import { cn } from '../../utils/cn';
import Spinner from './Spinner';

const variants = {
  primary: 'bg-brand-500 hover:bg-brand-600 active:bg-brand-600 text-white',
  secondary: 'bg-light-raised hover:bg-light-muted text-slate-700 border border-slate-200 dark:bg-surface-raised dark:hover:bg-surface-elevated dark:text-white dark:border-white/10',
  ghost: 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:bg-white/5 dark:text-zinc-400 dark:hover:text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  outline: 'border border-brand-500 text-brand-500 hover:bg-brand-500/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  loading = false,
  disabled = false,
  className,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed',
        pill ? 'rounded-full' : 'rounded-lg',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
};

export default Button;

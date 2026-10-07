/**
 * components/common/Input.jsx
 * Labelled input with error display and 8px radius.
 */
import { cn } from '../../utils/cn';

const Input = ({ label, error, className, id, ...props }) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors',
          'bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400',
          'dark:bg-surface-raised dark:border-white/[0.08] dark:text-white dark:placeholder:text-zinc-500',
          'focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default Input;

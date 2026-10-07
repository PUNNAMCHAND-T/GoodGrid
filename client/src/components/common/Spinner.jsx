/**
 * components/common/Spinner.jsx
 */
import { cn } from '../../utils/cn';

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

const Spinner = ({ size = 'md', className }) => (
  <div
    className={cn(
      'animate-spin rounded-full border-2 border-transparent border-t-brand-500',
      sizes[size],
      className
    )}
  />
);

export default Spinner;

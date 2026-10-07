/**
 * utils/cn.js
 * Class-merge helper — combines clsx (conditional classes) with
 * tailwind-merge (resolves Tailwind class conflicts, e.g. two bg-* values).
 */
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

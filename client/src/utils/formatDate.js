/**
 * utils/formatDate.js
 * date-fns wrappers used across pages. Centralised so date formatting
 * is consistent everywhere and easy to change in one place.
 */
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

/** "2 hours ago", "5 minutes ago" etc. */
export const timeAgo = (date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

/** "9:41 AM" */
export const shortTime = (date) => format(new Date(date), 'h:mm a');

/** "Sep 7, 2026" */
export const shortDate = (date) => format(new Date(date), 'MMM d, yyyy');

/** "Today", "Yesterday", or "Sep 5" */
export const chatDateLabel = (date) => {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
};

/** Full timestamp: "Sep 7, 2026 at 9:41 AM" */
export const fullDateTime = (date) =>
  format(new Date(date), "MMM d, yyyy 'at' h:mm a");

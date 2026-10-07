/**
 * pages/Notifications/index.jsx
 * Paginated notification feed with mark-all-read and single-read actions.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { notificationService } from '../../api/services';
import { resetUnreadCount } from '../../features/uiSlice';
import { timeAgo } from '../../utils/formatDate';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import { cn } from '../../utils/cn';

const Notifications = () => {
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    try {
      const res = await notificationService.list({ limit: 30 });
      setNotifications(res.data.data.data);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    setMarking(true);
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      dispatch(resetUnreadCount());
    } catch (_) {}
    finally { setMarking(false); }
  };

  const markOne = async (id) => {
    try {
      await notificationService.markOneRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (_) {}
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        {/* Heading — slate-800 in light, white in dark */}
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Notifications {unread > 0 && <span className="text-brand-500">({unread})</span>}
        </h1>
        {unread > 0 && (
          <Button size="sm" variant="ghost" loading={marking} onClick={markAll}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">🔔</p>
          {/* Empty state — slate-500 in light, zinc-400 in dark */}
          <p className="text-slate-500 dark:text-zinc-400">You're all caught up!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={cn(
                'card p-4 flex gap-3 transition-colors',
                !n.isRead && 'border-l-2 border-l-brand-500 bg-brand-500/[0.04]'
              )}
            >
              {/* Unread/read dot */}
              <div className="shrink-0 mt-1.5">
                {!n.isRead
                  ? <span className="status-dot bg-brand-500" />
                  : <span className="status-dot bg-transparent" />
                }
              </div>

              <div className="flex-1 min-w-0">
                {n.link ? (
                  /* Notification message link — slate-800 in light, white in dark */
                  <Link to={n.link} className="text-sm text-slate-800 dark:text-white hover:text-brand-500 transition-colors">
                    {n.message}
                  </Link>
                ) : (
                  /* Notification message text — slate-800 in light, white in dark */
                  <p className="text-sm text-slate-800 dark:text-white">{n.message}</p>
                )}
                {/* Timestamp — slate-400 in light, zinc-500 in dark */}
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">{timeAgo(n.createdAt)}</p>
              </div>

              {!n.isRead && (
                /* Mark-read button — slate-400 in light, zinc-500 in dark */
                <button
                  onClick={() => markOne(n._id)}
                  className="shrink-0 text-xs text-slate-400 dark:text-zinc-500 hover:text-brand-500 transition-colors"
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;

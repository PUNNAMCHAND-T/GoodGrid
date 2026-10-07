/**
 * pages/Dashboard/index.jsx
 * Overview stats + recent activity for the logged-in user.
 * Fetches real data from /users/me and /requests/my.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { userService, requestService, notificationService } from '../../api/services';
import { timeAgo } from '../../utils/formatDate';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { REQUEST_STATUS } from '../../utils/constants';

const statusColor = {
  open: 'bg-brand-500 text-white',
  in_progress: 'bg-amber-500 text-white',
  completed: 'bg-emerald-500 text-white',
  closed: 'bg-zinc-500 text-white',
};

const Dashboard = () => {
  const { user } = useSelector((s) => s.auth);
  const [requests, setRequests] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [reqRes, notifRes] = await Promise.all([
          requestService.myRequests({ limit: 5 }),
          notificationService.unreadCount(),
        ]);
        setRequests(reqRes.data.data.data);
        setUnread(notifRes.data.data.count);
      } catch (_) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting */}
      <div className="flex items-center gap-4">
        <Avatar src={user?.avatar} name={user?.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hey, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm">Here's your GoodGrid overview</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Requests', value: user?.requestsCount ?? 0, color: 'text-brand-500' },
          { label: 'Times Helped', value: user?.volunteersCount ?? 0, color: 'text-emerald-400' },
          { label: 'Unread', value: unread, color: 'text-amber-400' },
          { label: 'Active', value: requests.filter(r => r.status === REQUEST_STATUS.IN_PROGRESS).length, color: 'text-brand-400' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-white">Recent Requests</h2>
          <Link to="/requests/my" className="text-brand-500 text-sm hover:underline">View all</Link>
        </div>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-zinc-500 space-y-3">
            <p>You haven't posted any requests yet.</p>
            <Link to="/requests/new"><Button size="sm">Post a request</Button></Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-white/[0.06]">
            {requests.map((r) => (
              <li key={r._id} className="py-3 flex items-center justify-between gap-4">
                <Link to={`/requests/${r._id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-white truncate">{r.title}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">{timeAgo(r.createdAt)}</p>
                </Link>
                <span className={`badge ${statusColor[r.status]}`}>{r.status.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link to="/requests/new"><Button>New Request</Button></Link>
        <Link to="/map"><Button variant="outline">Browse Map</Button></Link>
        <Link to="/notifications"><Button variant="ghost">Notifications {unread > 0 && `(${unread})`}</Button></Link>
      </div>
    </div>
  );
};

export default Dashboard;

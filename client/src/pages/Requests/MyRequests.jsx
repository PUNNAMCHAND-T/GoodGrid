/**
 * pages/Requests/MyRequests.jsx
 * The user's own requests + their applications to others' requests.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestService } from '../../api/services';
import { timeAgo } from '../../utils/formatDate';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';

const statusColor = { open: 'bg-brand-500 text-white', in_progress: 'bg-amber-500 text-white', completed: 'bg-emerald-500 text-white', closed: 'bg-zinc-500 text-white' };
const appStatusColor = { pending: 'bg-zinc-500 text-white', accepted: 'bg-emerald-500 text-white', rejected: 'bg-red-500 text-white' };

const MyRequests = () => {
  const [tab, setTab] = useState('my');
  const [myRequests, setMyRequests] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, aRes] = await Promise.all([
          requestService.myRequests({ limit: 20 }),
          requestService.myApplications({ limit: 20 }),
        ]);
        setMyRequests(rRes.data.data.data);
        setMyApps(aRes.data.data.data);
      } catch (_) {} finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">My Activity</h1>
        <Link to="/requests/new"><Button size="sm">+ New Request</Button></Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-light-raised dark:bg-surface-dark rounded-lg">
        {[['my', 'My Requests'], ['apps', 'My Applications']].map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === val ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'my' && (
        myRequests.length === 0
          ? <p className="text-center text-slate-500 dark:text-zinc-400 py-10">No requests yet. <Link to="/requests/new" className="text-brand-500">Post one!</Link></p>
          : <ul className="space-y-3">
            {myRequests.map((r) => (
              <li key={r._id}>
                <Link to={`/requests/${r._id}`} className="card p-4 flex items-center justify-between gap-3 hover:border-brand-500/50 block">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">{timeAgo(r.createdAt)}</p>
                  </div>
                  <span className={`badge ${statusColor[r.status]}`}>{r.status.replace('_', ' ')}</span>
                </Link>
              </li>
            ))}
          </ul>
      )}

      {tab === 'apps' && (
        myApps.length === 0
          ? <p className="text-center text-slate-500 dark:text-zinc-400 py-10">You haven't applied to any requests yet.</p>
          : <ul className="space-y-3">
            {myApps.map((app) => (
              <li key={app._id}>
                <Link to={`/requests/${app.request?._id}`} className="card p-4 flex items-center justify-between gap-3 hover:border-brand-500/50 block">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-white truncate">{app.request?.title}</p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">by {app.request?.owner?.name} · {timeAgo(app.createdAt)}</p>
                  </div>
                  <span className={`badge ${appStatusColor[app.status]}`}>{app.status}</span>
                </Link>
              </li>
            ))}
          </ul>
      )}
    </div>
  );
};

export default MyRequests;

/**
 * pages/Requests/Requests.jsx
 * Filterable, paginated list of all requests.
 * Pill filter chips for category, status, urgency.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { requestService } from '../../api/services';
import { REQUEST_CATEGORIES, REQUEST_STATUS, URGENCY_LEVELS } from '../../utils/constants';
import { timeAgo } from '../../utils/formatDate';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import { cn } from '../../utils/cn';

const urgencyColor = {
  low: 'bg-zinc-500 text-white',
  medium: 'bg-brand-500 text-white',
  high: 'bg-amber-500 text-white',
};
const statusColor = {
  open: 'bg-brand-500 text-white',
  in_progress: 'bg-amber-500 text-white',
  completed: 'bg-emerald-500 text-white',
  closed: 'bg-zinc-500 text-white',
};

const PillChip = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'rounded-full px-4 py-1.5 text-sm border transition-colors whitespace-nowrap',
      active
        ? 'bg-brand-500 border-brand-500 text-white'
        : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-zinc-400 hover:border-brand-500 hover:text-brand-500'
    )}
  >
    {label}
  </button>
);

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ category: '', status: '', urgency: '' });

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 10 };
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.urgency) params.urgency = filters.urgency;
      const res = await requestService.list(params);
      setRequests(res.data.data.data);
      setTotalPages(res.data.data.totalPages);
      setPage(p);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); }, [filters]);

  const toggleFilter = (key, val) =>
    setFilters((p) => ({ ...p, [key]: p[key] === val ? '' : val }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Requests</h1>
        <Link to="/requests/new">
          <Button pill>+ New Request</Button>
        </Link>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {REQUEST_CATEGORIES.map((c) => (
          <PillChip key={c} label={c.replace('_', ' ')} active={filters.category === c}
            onClick={() => toggleFilter('category', c)} />
        ))}
      </div>

      {/* Status + Urgency chips */}
      <div className="flex gap-2 flex-wrap">
        {Object.values(REQUEST_STATUS).map((s) => (
          <PillChip key={s} label={s.replace('_', ' ')} active={filters.status === s}
            onClick={() => toggleFilter('status', s)} />
        ))}
        <span className="w-px bg-slate-200 dark:bg-white/[0.08]" />
        {Object.values(URGENCY_LEVELS).map((u) => (
          <PillChip key={u} label={u} active={filters.urgency === u}
            onClick={() => toggleFilter('urgency', u)} />
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center mt-10"><Spinner size="lg" /></div>
      ) : requests.length === 0 ? (
        <p className="text-slate-500 dark:text-zinc-400 text-center py-12">No requests match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r._id}>
              <Link to={`/requests/${r._id}`} className="card p-4 flex gap-4 hover:border-brand-500/50 transition-colors block">
                <Avatar src={r.owner?.avatar} name={r.owner?.name} size="md" className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-slate-800 dark:text-white truncate">{r.title}</h3>
                    <div className="flex gap-1.5 shrink-0">
                      <span className={`badge ${urgencyColor[r.urgency]}`}>{r.urgency}</span>
                      <span className={`badge ${statusColor[r.status]}`}>{r.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">{r.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-zinc-500">
                    <span>{r.owner?.name}</span>
                    <span>·</span>
                    <span className="badge bg-light-raised text-slate-500 dark:bg-surface-raised dark:text-zinc-400">{r.category.replace('_', ' ')}</span>
                    <span>·</span>
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
          <span className="text-sm text-slate-500 dark:text-zinc-400 self-center">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
};

export default Requests;

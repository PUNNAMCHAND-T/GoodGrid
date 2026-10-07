/**
 * pages/Admin/index.jsx
 * Admin dashboard — platform stats, user management, request moderation.
 * Only accessible to admin/moderator roles (enforced at route level too).
 */
import { useEffect, useState } from 'react';
import { adminService } from '../../api/services';
import { ROLES } from '../../utils/constants';
import { useSelector } from 'react-redux';
import { shortDate } from '../../utils/formatDate';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import Avatar from '../../components/common/Avatar';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

// Role badge colours work in both themes:
//   admin/moderator — semi-transparent brand/amber tints look good on any bg.
//   user — in dark mode: zinc-700 bg with zinc-300 text;
//          in light mode: slate-100 bg with slate-600 text so it stays readable.
const roleBadge = {
  admin: 'bg-brand-500/20 text-brand-400',
  moderator: 'bg-amber-500/20 text-amber-400',
  user: 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300',
};

const Admin = () => {
  const { user: me } = useSelector((s) => s.auth);
  const isAdmin = me?.role === ROLES.ADMIN;

  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, uRes, rRes] = await Promise.all([
          adminService.stats(),
          adminService.listUsers({ limit: 20 }),
          adminService.listRequests({ limit: 20 }),
        ]);
        setStats(sRes.data.data);
        setUsers(uRes.data.data.data);
        setRequests(rRes.data.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleBan = async (userId, isBanned) => {
    try {
      if (isBanned) {
        await adminService.unbanUser(userId);
        toast.success('User unbanned');
      } else {
        await adminService.banUser(userId, 'Violates community guidelines');
        toast.success('User banned');
      }
      setUsers((prev) =>
        prev.map((u) => u._id === userId ? { ...u, isBanned: !isBanned } : u)
      );
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const handleChangeRole = async (userId, currentRole) => {
    const newRole = currentRole === ROLES.USER ? ROLES.MODERATOR : ROLES.USER;
    try {
      await adminService.changeRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => u._id === userId ? { ...u, role: newRole } : u)
      );
      toast.success(`Role changed to ${newRole}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      await adminService.deleteRequest(id);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      toast.success('Request deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;

  const tabs = [['stats', 'Stats'], ['users', 'Users'], ['requests', 'Requests']];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Heading — light: slate-800, dark: white */}
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Admin Panel</h1>

      {/* Tab bar — light: slate-100 pill, dark: surface-dark pill */}
      <div className="flex gap-1 p-1 bg-light-raised dark:bg-surface-dark rounded-lg w-fit">
        {tabs.map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val)}
            className={cn('px-5 py-2 text-sm font-medium rounded-md transition-colors',
              tab === val
                ? 'bg-brand-500 text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white')}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.users.total, color: 'text-brand-500' },
              { label: 'Banned', value: stats.users.banned, color: 'text-red-400' },
              { label: 'Total Requests', value: stats.requests.total, color: 'text-brand-400' },
              { label: 'Open', value: stats.requests.open, color: 'text-emerald-400' },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                {/* Label — slate-500 in light, zinc-400 in dark */}
                <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'In Progress', value: stats.requests.inProgress, color: 'text-amber-400' },
              { label: 'Completed', value: stats.requests.completed, color: 'text-emerald-400' },
              { label: 'Closed', value: stats.requests.closed, color: 'text-zinc-400' },
              { label: 'Messages', value: stats.messages.total, color: 'text-brand-400' },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <p className="text-xs text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Users table ───────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              {/* Header row — light: slate-50 bg with slate-500 text; dark: transparent with zinc-400 */}
              <tr className="border-b border-slate-200 dark:border-white/[0.06] text-left bg-slate-50 dark:bg-transparent">
                <th className="px-4 py-3 text-slate-500 dark:text-zinc-400 font-medium">User</th>
                <th className="px-4 py-3 text-slate-500 dark:text-zinc-400 font-medium">Role</th>
                <th className="px-4 py-3 text-slate-500 dark:text-zinc-400 font-medium">Joined</th>
                <th className="px-4 py-3 text-slate-500 dark:text-zinc-400 font-medium">Status</th>
                {isAdmin && <th className="px-4 py-3 text-slate-500 dark:text-zinc-400 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                // Row divider — light: slate-100; dark: white at 4% opacity
                <tr key={u._id} className="border-b border-slate-100 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Avatar src={u.avatar} name={u.name} size="sm" />
                    <div>
                      <p className="text-slate-800 dark:text-white font-medium">{u.name}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${roleBadge[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{shortDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {u.isBanned
                      ? <span className="badge bg-red-500/20 text-red-400">Banned</span>
                      : <span className="badge bg-emerald-500/20 text-emerald-400">Active</span>
                    }
                  </td>
                  {isAdmin && u._id !== me._id && u.role !== ROLES.ADMIN && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant={u.isBanned ? 'outline' : 'danger'}
                          onClick={() => handleBan(u._id, u.isBanned)}>
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => handleChangeRole(u._id, u.role)}>
                          {u.role === ROLES.USER ? '→ Mod' : '→ User'}
                        </Button>
                      </div>
                    </td>
                  )}
                  {isAdmin && (u._id === me._id || u.role === ROLES.ADMIN) && (
                    <td className="px-4 py-3 text-slate-400 dark:text-zinc-600 text-xs">—</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Requests moderation ───────────────────────────────────────── */}
      {tab === 'requests' && (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r._id} className="card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-white truncate">{r.title}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  by {r.owner?.name} · {r.category.replace('_', ' ')} · {r.status}
                </p>
              </div>
              <Button size="sm" variant="danger" onClick={() => handleDeleteRequest(r._id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Admin;

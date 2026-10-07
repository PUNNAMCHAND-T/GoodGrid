/**
 * pages/Requests/RequestDetail.jsx
 * Full request view — volunteer button for non-owners, applicant list + accept for owner.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { requestService } from '../../api/services';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { timeAgo, fullDateTime } from '../../utils/formatDate';

const urgencyColor = { low: 'bg-zinc-500 text-white', medium: 'bg-brand-500 text-white', high: 'bg-amber-500 text-white' };
const statusColor = { open: 'bg-brand-500 text-white', in_progress: 'bg-amber-500 text-white', completed: 'bg-emerald-500 text-white', closed: 'bg-zinc-500 text-white' };

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [request, setRequest] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  const load = async () => {
    try {
      const res = await requestService.getById(id);
      setRequest(res.data.data.request);
      if (res.data.data.request.owner._id === user._id) {
        const vRes = await requestService.getVolunteers(id);
        setApplications(vRes.data.data.data);
      }
    } catch { toast.error('Request not found'); navigate('/requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await requestService.applyVolunteer(id, applyMsg);
      toast.success('Application submitted!');
      setApplyMsg('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally { setApplying(false); }
  };

  const handleAccept = async (appId) => {
    try {
      await requestService.acceptVolunteer(id, appId);
      toast.success('Volunteer accepted!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to accept'); }
  };

  const handleClose = async () => {
    try { await requestService.close(id); toast.success('Request closed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async () => {
    try { await requestService.complete(id); toast.success('Marked as completed'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this request?')) return;
    try { await requestService.delete(id); toast.success('Deleted'); navigate('/requests/my'); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (!request) return null;

  const isOwner = request.owner._id === user._id;
  const isOpen = request.status === 'open';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">{request.title}</h1>
          <div className="flex gap-2 shrink-0">
            <span className={`badge ${urgencyColor[request.urgency]}`}>{request.urgency}</span>
            <span className={`badge ${statusColor[request.status]}`}>{request.status.replace('_', ' ')}</span>
          </div>
        </div>

        <p className="text-sm text-slate-500 dark:text-zinc-400">{request.description}</p>

        <div className="flex items-center gap-3 text-sm">
          <Link to={`/profile/${request.owner._id}`} className="flex items-center gap-2 hover:text-brand-500">
            <Avatar src={request.owner.avatar} name={request.owner.name} size="sm" />
            <span className="text-slate-600 dark:text-zinc-300">{request.owner.name}</span>
          </Link>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500">{timeAgo(request.createdAt)}</span>
          <span className="badge bg-light-raised text-slate-500 dark:bg-surface-raised dark:text-zinc-400">{request.category.replace('_', ' ')}</span>
        </div>

        {/* Images */}
        {request.images?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {request.images.map((url, i) => (
              <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded-lg" />
            ))}
          </div>
        )}

        {/* Location */}
        {request.location?.address && (
          <p className="text-sm text-zinc-500">📍 {request.location.address}</p>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
            {request.status === 'in_progress' && (
              <Button size="sm" variant="secondary" onClick={handleComplete}>Mark Completed</Button>
            )}
            {isOpen && <Button size="sm" variant="ghost" onClick={handleClose}>Close Request</Button>}
            <Button size="sm" variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        )}
      </div>

      {/* Volunteer apply section (non-owners, open requests) */}
      {!isOwner && isOpen && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-white">Offer to help</h2>
          <textarea
            value={applyMsg}
            onChange={(e) => setApplyMsg(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Why are you a good fit? (optional)"
            className="w-full rounded-lg px-3 py-2 text-sm bg-light-raised border border-slate-200 text-slate-800 placeholder:text-slate-400 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-500 outline-none resize-none"
          />
          <Button loading={applying} onClick={handleApply}>Apply to volunteer</Button>
        </div>
      )}

      {/* Volunteer applications (owner view) */}
      {isOwner && applications.length > 0 && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 dark:text-white">Applicants ({applications.length})</h2>
          {applications.map((app) => (
            <div key={app._id} className="flex items-start gap-3 py-3 border-t border-slate-200 dark:border-white/[0.06]">
              <Link to={`/profile/${app.volunteer._id}`}>
                <Avatar src={app.volunteer.avatar} name={app.volunteer.name} size="md" />
              </Link>
              <div className="flex-1">
                <p className="font-medium text-slate-800 dark:text-white">{app.volunteer.name}</p>
                {app.message && <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">{app.message}</p>}
                <p className="text-xs text-zinc-500 mt-1">{timeAgo(app.createdAt)}</p>
              </div>
              <div className="shrink-0">
                {app.status === 'pending' && isOpen && (
                  <Button size="sm" onClick={() => handleAccept(app._id)}>Accept</Button>
                )}
                {app.status !== 'pending' && (
                  <span className={`badge ${app.status === 'accepted' ? 'bg-emerald-500 text-white' : 'bg-zinc-500 text-white'}`}>
                    {app.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RequestDetail;

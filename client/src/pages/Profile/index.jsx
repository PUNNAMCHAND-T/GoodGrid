/**
 * pages/Profile/index.jsx
 * View/edit own profile at /profile.
 * View anyone's public profile at /profile/:id (no edit controls).
 */
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { userService } from '../../api/services';
import { updateUser } from '../../features/authSlice';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { AVAILABILITY } from '../../utils/constants';
import { shortDate } from '../../utils/formatDate';

const availabilityBadge = {
  available: 'bg-emerald-500 text-white',
  busy: 'bg-amber-500 text-white',
  away: 'bg-zinc-500 text-white',
};

const Profile = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user: me } = useSelector((s) => s.auth);
  const isOwn = !id || id === me?._id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const fileRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        const res = isOwn
          ? await userService.getMe()
          : await userService.getUserById(id);
        setProfile(res.data.data.user);
        if (isOwn) setForm({
          name: res.data.data.user.name,
          bio: res.data.data.user.bio || '',
          availability: res.data.data.user.availability,
          skills: (res.data.data.user.skills || []).join(', '),
        });
      } catch { toast.error('Failed to load profile'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        bio: form.bio,
        availability: form.availability,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const res = await userService.updateMe(payload);
      setProfile(res.data.data.user);
      dispatch(updateUser(res.data.data.user));
      setEditing(false);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await userService.updateAvatar(fd);
      setProfile(res.data.data.user);
      dispatch(updateUser({ avatar: res.data.data.user.avatar }));
      toast.success('Avatar updated');
    } catch { toast.error('Failed to upload avatar'); }
  };

  if (loading) return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  if (!profile) return <p className="text-slate-500 dark:text-zinc-400 text-center mt-10">User not found.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header card */}
      <div className="card p-6 flex flex-col sm:flex-row gap-5 items-start">
        {/* Avatar with edit overlay for own profile */}
        <div className="relative shrink-0">
          <Avatar src={profile.avatar} name={profile.name} size="xl" />
          {isOwn && (
            <>
              <button
                onClick={() => fileRef.current.click()}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs"
              >Edit</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="mb-2" />
          ) : (
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{profile.name}</h1>
          )}
          <span className={`badge ${availabilityBadge[profile.availability] || 'bg-zinc-500 text-white'} mt-1`}>
            {profile.availability}
          </span>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">Member since {shortDate(profile.createdAt)}</p>
        </div>

        {isOwn && (
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" loading={saving} onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit profile</Button>
            )}
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-white">About</h2>
        {editing ? (
          <textarea
            value={form.bio}
            onChange={(e) => setForm(p => ({ ...p, bio: e.target.value }))}
            rows={3}
            maxLength={300}
            className="w-full rounded-lg px-3 py-2 text-sm bg-light-raised border border-slate-200 text-slate-800 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white focus:ring-2 focus:ring-brand-500 outline-none resize-none"
            placeholder="Tell people about yourself..."
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-zinc-400">{profile.bio || 'No bio yet.'}</p>
        )}
      </div>

      {/* Skills */}
      <div className="card p-5 space-y-3">
        <h2 className="font-semibold text-slate-800 dark:text-white">Skills</h2>
        {editing ? (
          <Input value={form.skills} onChange={(e) => setForm(p => ({ ...p, skills: e.target.value }))}
            placeholder="e.g. cooking, tutoring, repair" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(profile.skills || []).length === 0
              ? <p className="text-sm text-slate-500 dark:text-zinc-400">No skills listed.</p>
              : profile.skills.map((s) => (
                <span key={s} className="badge bg-brand-500/10 text-brand-400">{s}</span>
              ))}
          </div>
        )}
      </div>

      {/* Availability (edit) */}
      {editing && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-800 dark:text-white">Availability</h2>
          <div className="flex gap-3">
            {Object.values(AVAILABILITY).map((a) => (
              <button key={a}
                onClick={() => setForm(p => ({ ...p, availability: a }))}
                className={`badge cursor-pointer ${form.availability === a ? availabilityBadge[a] : 'bg-light-raised text-slate-500 dark:bg-surface-raised dark:text-zinc-400'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-brand-500">{profile.requestsCount || 0}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Requests posted</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{profile.volunteersCount || 0}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Times helped</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;

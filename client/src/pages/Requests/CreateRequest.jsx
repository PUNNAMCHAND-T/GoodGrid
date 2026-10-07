/**
 * pages/Requests/CreateRequest.jsx
 * Form: title, description, category, urgency, images (max 4), lat/lng/address.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestService } from '../../api/services';
import { REQUEST_CATEGORIES, URGENCY_LEVELS } from '../../utils/constants';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const CreateRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    title: '', description: '', category: 'other',
    urgency: 'medium', lat: '', lng: '', address: '',
  });

  const onChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      images.forEach((img) => fd.append('images', img));
      const res = await requestService.create(fd);
      toast.success('Request posted!');
      navigate(`/requests/${res.data.data.request._id}`);
    } catch (err) {
      const errs = err.response?.data?.errors || [];
      const map = {};
      errs.forEach((e) => { map[e.field] = e.message; });
      setErrors(map);
      if (!errs.length) toast.error(err.response?.data?.message || 'Failed to create request');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Post a Help Request</h1>

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <Input label="Title" id="req-title" name="title" value={form.title}
          onChange={onChange} error={errors.title} required placeholder="Brief description of what you need" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">Description</label>
          <textarea name="description" value={form.description} onChange={onChange} rows={4}
            maxLength={1000} placeholder="Describe what you need in detail..."
            className="w-full rounded-lg px-3 py-2.5 text-sm bg-light-raised border border-slate-200 text-slate-800 placeholder:text-slate-400 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-brand-500 outline-none resize-none" />
          {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">Category</label>
            <select name="category" value={form.category} onChange={onChange}
              className="rounded-lg px-3 py-2.5 text-sm bg-light-raised border border-slate-200 text-slate-800 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white focus:ring-2 focus:ring-brand-500 outline-none">
              {REQUEST_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">Urgency</label>
            <select name="urgency" value={form.urgency} onChange={onChange}
              className="rounded-lg px-3 py-2.5 text-sm bg-light-raised border border-slate-200 text-slate-800 dark:bg-surface-raised dark:border-white/[0.08] dark:text-white focus:ring-2 focus:ring-brand-500 outline-none">
              {Object.values(URGENCY_LEVELS).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Latitude" id="req-lat" name="lat" type="number" step="any"
            value={form.lat} onChange={onChange} error={errors.lat} placeholder="e.g. 12.9716" />
          <Input label="Longitude" id="req-lng" name="lng" type="number" step="any"
            value={form.lng} onChange={onChange} error={errors.lng} placeholder="e.g. 77.5946" />
        </div>

        <Input label="Address (optional)" id="req-address" name="address" value={form.address}
          onChange={onChange} placeholder="e.g. Indiranagar, Bangalore" />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-zinc-300">Images (max 4)</label>
          <input type="file" accept="image/*" multiple
            onChange={(e) => setImages(Array.from(e.target.files).slice(0, 4))}
            className="text-sm text-slate-500 dark:text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-500 file:text-white file:text-sm file:cursor-pointer" />
          {images.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-zinc-400">{images.length} image(s) selected</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={loading}>Post Request</Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};

export default CreateRequest;

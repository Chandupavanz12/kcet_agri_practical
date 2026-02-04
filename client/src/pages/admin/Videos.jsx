import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Videos() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', youtubeId: '', subject: 'General', status: 'active' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = useMemo(() => {
    return Boolean(form.title.trim() && form.youtubeId.trim() && form.subject.trim() && (form.status === 'active' || form.status === 'inactive'));
  }, [form]);

  const load = async () => {
    const res = await apiFetch('/api/admin/videos', { token });
    setItems(res.videos || []);
  };

  useEffect(() => {
    load().catch((e) => setServerError(e?.message || 'Failed to load videos'));
  }, [token]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.youtubeId.trim()) e.youtubeId = 'YouTube ID is required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (form.status !== 'active' && form.status !== 'inactive') e.status = 'Status must be active or inactive';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/videos', {
        token,
        method: 'POST',
        body: {
          title: form.title.trim(),
          youtubeId: form.youtubeId.trim(),
          subject: form.subject.trim(),
          status: form.status,
        },
      });
      setForm({ title: '', youtubeId: '', subject: 'General', status: 'active' });
      await load();
    } catch (err) {
      setServerError(err?.message || 'Failed to save video');
      if (err?.details) setErrors(err.details);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Add Video</h2>
        </div>
        <div className="card-body">
          {serverError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{serverError}</div>
          ) : null}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <div className="label">Title</div>
              <input className="input" value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} />
              {errors.title ? <div className="mt-1 text-xs text-red-600">{errors.title}</div> : null}
            </div>
            <div>
              <div className="label">YouTube ID</div>
              <input className="input" value={form.youtubeId} onChange={(e) => setForm((s) => ({ ...s, youtubeId: e.target.value }))} />
              {errors.youtubeId ? <div className="mt-1 text-xs text-red-600">{errors.youtubeId}</div> : null}
            </div>
            <div>
              <div className="label">Subject</div>
              <input className="input" value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} />
              {errors.subject ? <div className="mt-1 text-xs text-red-600">{errors.subject}</div> : null}
            </div>
            <div>
              <div className="label">Status</div>
              <select className="input" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status ? <div className="mt-1 text-xs text-red-600">{errors.status}</div> : null}
            </div>
            <button type="submit" className="btn-primary" disabled={!isValid || saving}>
              {saving ? 'Saving…' : 'Save Video'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold">Videos</h3>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {items.map((v) => (
              <div key={v.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-base font-semibold">{v.title}</div>
                    <div className="text-sm text-slate-500">{v.subject}</div>
                    <div className="text-xs text-slate-400 mt-1">ID: {v.youtubeId}</div>
                  </div>
                  <span className={`badge ${v.status === 'active' ? 'badge-success' : ''}`}>{v.status}</span>
                </div>
                <div className="flex gap-4">
                  <img
                    src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`}
                    alt="thumbnail"
                    className="h-24 w-32 rounded border object-cover"
                    onError={(e) => (e.target.src = 'https://via.placeholder.com/128x72?text=No+Thumbnail')}
                  />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">Embed link:</div>
                    <a
                      href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline break-all"
                    >
                      https://www.youtube.com/watch?v={v.youtubeId}
                    </a>
                    <div className="mt-2">
                      <iframe
                        src={`https://www.youtube.com/embed/${v.youtubeId}`}
                        title={v.title}
                        className="w-full h-32 rounded border"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

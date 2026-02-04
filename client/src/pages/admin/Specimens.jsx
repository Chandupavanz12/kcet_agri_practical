import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Specimens() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState(0);
  const [status, setStatus] = useState('active');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const isValid = useMemo(() => {
    return Boolean(
      imageUrl.trim() &&
      options.length === 4 &&
      options.every((o) => o.trim().length > 0) &&
      Number.isInteger(Number(correct)) &&
      Number(correct) >= 0 &&
      Number(correct) <= 3 &&
      (status === 'active' || status === 'inactive')
    );
  }, [imageUrl, options, correct, status]);

  const load = async () => {
    const res = await apiFetch('/api/admin/specimens', { token });
    setItems(res.specimens || []);
  };

  useEffect(() => {
    load().catch((e) => setServerError(e?.message || 'Failed to load specimens'));
  }, [token]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setServerError('');
    try {
      const res = await apiFetch('/api/admin/upload/specimen-image', {
        token,
        method: 'POST',
        body: fd,
        headers: {},
      });
      setImageUrl(res.url || '');
    } catch (err) {
      setServerError(err?.message || 'Upload failed');
    }
  };

  const validate = () => {
    const e = {};
    if (!imageUrl.trim()) e.imageUrl = 'Image URL is required';
    const normalized = options.map((o) => o.trim());
    if (normalized.length !== 4 || normalized.some((o) => !o)) e.options = 'Enter all 4 options';
    const c = Number(correct);
    if (!Number.isInteger(c) || c < 0 || c > 3) e.correct = 'Correct option must be 0-3';
    if (status !== 'active' && status !== 'inactive') e.status = 'Status must be active or inactive';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/specimens', {
        token,
        method: 'POST',
        body: {
          imageUrl: imageUrl.trim(),
          questionText: questionText.trim() || null,
          options: options.map((o) => o.trim()),
          correct: Number(correct),
          status,
        },
      });
      setImageUrl('');
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrect(0);
      setStatus('active');
      await load();
    } catch (err) {
      setServerError(err?.message || 'Failed to save specimen');
      if (err?.details) setErrors(err.details);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Add Specimen</h2>
        </div>
        <div className="card-body">
          {serverError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 mb-4">{serverError}</div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <div className="label">Upload Image</div>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="input" />
              {errors.imageUrl ? <div className="mt-1 text-xs text-red-600">{errors.imageUrl}</div> : null}
              {imageUrl ? <img src={imageUrl} alt="preview" className="mt-2 h-32 w-auto rounded border" /> : null}
            </div>

            <div>
              <div className="label">Question Text (optional)</div>
              <input className="input" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
            </div>

            <div>
              <div className="label">Options</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((opt, idx) => (
                  <input
                    key={idx}
                    className="input"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[idx] = e.target.value;
                      setOptions(next);
                    }}
                  />
                ))}
              </div>
              {errors.options ? <div className="mt-1 text-xs text-red-600">{errors.options}</div> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="label">Correct Option</div>
                <select className="input" value={String(correct)} onChange={(e) => setCorrect(Number(e.target.value))}>
                  <option value="0">Option 1 (A)</option>
                  <option value="1">Option 2 (B)</option>
                  <option value="2">Option 3 (C)</option>
                  <option value="3">Option 4 (D)</option>
                </select>
                {errors.correct ? <div className="mt-1 text-xs text-red-600">{errors.correct}</div> : null}
              </div>

              <div>
                <div className="label">Status</div>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {errors.status ? <div className="mt-1 text-xs text-red-600">{errors.status}</div> : null}
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={!isValid || saving}>
              {saving ? 'Saving…' : 'Save Specimen'}
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold">Specimens</h3>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <img src={s.imageUrl} alt="" className="h-12 w-12 rounded border object-cover" />
                  <div>
                    <div className="text-sm font-medium">Specimen #{s.id}</div>
                    <div className="text-xs text-slate-500">Correct: {s.correct}</div>
                  </div>
                </div>
                <span className={`badge ${s.status === 'active' ? 'badge-success' : ''}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

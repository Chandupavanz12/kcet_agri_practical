import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentMaterialsPremium() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const toFileUrl = useMemo(
    () => (u) => {
      const url = String(u || '').trim();
      if (!url) return '';
      if (/^https?:\/\//i.test(url)) return url;
      return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
    },
    [apiBaseUrl]
  );

  const openProtectedFile = async (fileUrl) => {
    const absoluteUrl = toFileUrl(fileUrl);
    if (!absoluteUrl) return;
    if (!token) {
      setError('Please login again');
      return;
    }

    try {
      setError('');
      const res = await fetch(absoluteUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        const lowered = String(text || '').toLowerCase();
        if (res.status === 404 || lowered.includes('file not found') || lowered.includes('cannot get /uploads')) {
          throw new Error('File not found. Please contact admin or try again later.');
        }
        throw new Error(text || `Failed to open file (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      setError(e?.message || 'Failed to open file');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch('/api/student/materials?access=paid&type=pdf', { token });
        if (!alive) return;
        setItems(Array.isArray(res?.materials) ? res.materials : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load materials');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-56 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-secondary-50 via-white to-accent-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold">Premium Materials</h1>
              <div className="mt-1 text-sm text-slate-700">Premium-only documents. Unlock with subscription.</div>
            </div>
            <Link to="/student/premium" className="btn-primary text-xs">View Plans</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-700">No premium materials available.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <div key={m.id} className="card overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-secondary-500 to-accent-500" />
                  <div className="card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{m.title}</div>
                        <div className="mt-1 text-xs text-slate-600">{m.subject}</div>
                      </div>
                      {m.locked ? <span className="badge">Locked</span> : <span className="badge badge-success">Unlocked</span>}
                    </div>
                    <div className="mt-4">
                      {m.locked ? (
                        <button type="button" className="btn-primary text-xs" onClick={() => navigate('/student/premium')}>
                          Unlock
                        </button>
                      ) : (
                        <button type="button" className="btn-primary text-xs" onClick={() => openProtectedFile(m.pdfUrl)}>
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

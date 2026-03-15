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
        if (res.status === 404 || lowered.includes('file not found')) {
          throw new Error('File not found. Please contact admin.');
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

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-purple-500 to-indigo-600 p-8 shadow-lg">
          <div className="flex items-center justify-between gap-3 text-white">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">⭐ Premium Materials</h1>
              <div className="mt-1 text-purple-100 font-medium italic">Exclusive chapter-wise notes and solved materials.</div>
            </div>
            <Link to="/student/premium" className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-sm font-bold transition-colors">
              View Plans
            </Link>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card border-0 shadow-sm">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-medium rounded-xl">{error}</div>
        </div>
      ) : null}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium">No premium materials available in this section.</div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <div key={m.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className={`h-1.5 w-full rounded-t-2xl ${m.locked ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 line-clamp-2">{m.title}</div>
                        <div className="mt-1 text-xs text-slate-500 font-medium">{m.subject}</div>
                      </div>
                      {m.locked ? (
                        <span className="shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 font-bold rounded-full border border-amber-200">
                          ⭐ Premium
                        </span>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 font-bold rounded-full border border-emerald-200">
                          ✅ Unlocked
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                      {m.locked ? (
                        <button
                          type="button"
                          className="w-full bg-slate-100 text-slate-700 hover:bg-amber-500 hover:text-white transition-all py-2.5 rounded-xl text-xs font-bold shadow-sm"
                          onClick={() => navigate('/student/premium')}
                        >
                          Get Access to View
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all py-2.5 rounded-xl text-xs font-bold shadow-lg"
                          onClick={() => openProtectedFile(m.pdfUrl)}
                        >
                          Read Now
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

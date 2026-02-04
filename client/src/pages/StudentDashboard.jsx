import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const toFileUrl = (u) => {
    const url = String(u || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/dashboard', { token });
        if (!alive) return;
        setData(res);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load dashboard');
      } finally {
        if (!alive) return;
        setLoading(false);
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
            <div className="h-6 w-48 bg-slate-200 rounded" />
            <div className="mt-2 h-4 w-64 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 w-20 bg-slate-200 rounded" />
                <div className="mt-2 h-8 w-12 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-slate-50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold">Student Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge">KCET Prep</span>
              <span className="badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card">
          <div className="card-body">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/student/mock-test" className="btn-primary justify-center">
              Start Mock Test
            </Link>
            <Link to="/student/profile" className="btn-ghost justify-center">
              Profile
            </Link>
            <Link to="/student/pyqs" className="btn-ghost justify-center">
              Previous Year Questions
            </Link>
          </div>
        </div>
      </div>

      {/* Videos */}
      {data?.settings?.videosEnabled && data?.videos?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Recent Videos</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.videos.map((v) => (
                <div key={v.id} className="space-y-2">
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    <iframe
                      src={`https://www.youtube.com/embed/${v.youtubeId}`}
                      title={v.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                  <div className="text-sm font-medium">{v.title}</div>
                  <div className="text-xs text-slate-500">{v.subject}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Materials */}
      {data?.settings?.pdfsEnabled && data?.materials?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Study Materials</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-slate-500">{m.subject}</div>
                  </div>
                  <a
                    href={toFileUrl(m.pdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Notifications */}
      {data?.settings?.notificationsEnabled && data?.notifications?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          <div className="card-body space-y-3">
            {data.notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-200 bg-primary-50 p-3">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="mt-1 text-sm text-slate-700">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

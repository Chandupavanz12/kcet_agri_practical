import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/admin/dashboard', { token });
        if (!alive) return;
        setDashboard(res);
        setLoading(false);

        // Load analytics in background
        try {
          const a = await apiFetch('/api/admin/analytics', { token });
          if (!alive) return;
          setAnalytics(a);
        } catch {
          // ignore background failure
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load analytics');
      } finally {
        if (!alive) return;
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
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge">Admin</span>
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

      {/* Analytics Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Students</div>
            <div className="mt-2 text-3xl font-semibold">{dashboard?.students?.count ?? analytics?.studentsCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Tests</div>
            <div className="mt-2 text-3xl font-semibold">{dashboard?.tests?.count ?? analytics?.testsCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Specimens</div>
            <div className="mt-2 text-3xl font-semibold">{analytics?.specimensCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Videos</div>
            <div className="mt-2 text-3xl font-semibold">{dashboard?.videos?.count ?? analytics?.videosCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Materials</div>
            <div className="mt-2 text-3xl font-semibold">{dashboard?.materials?.count ?? analytics?.materialsCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">PYQs</div>
            <div className="mt-2 text-3xl font-semibold">{analytics?.pyqsCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Results</div>
            <div className="mt-2 text-3xl font-semibold">{analytics?.resultsCount ?? 0}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="text-sm font-semibold text-slate-800">Avg Accuracy</div>
            <div className="mt-2 text-3xl font-semibold">
              {analytics?.avgAccuracy ? Math.round(analytics.avgAccuracy) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Manage</h2>
        </div>
        <div className="card-body">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/admin/students" className="btn-ghost justify-start">
              Students
            </Link>
            <Link to="/admin/tests" className="btn-ghost justify-start">
              Tests
            </Link>
            <Link to="/admin/tests/builder" className="btn-primary justify-start">
              Test Builder
            </Link>
            <Link to="/admin/videos" className="btn-ghost justify-start">
              Videos
            </Link>
            <Link to="/admin/materials" className="btn-ghost justify-start">
              Materials
            </Link>
            <Link to="/admin/pyqs" className="btn-ghost justify-start">
              PYQs
            </Link>
            <Link to="/admin/notifications" className="btn-ghost justify-start">
              Notifications
            </Link>
            <Link to="/admin/settings" className="btn-ghost justify-start">
              Settings
            </Link>
            <Link to="/admin/results" className="btn-ghost justify-start">
              Results
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

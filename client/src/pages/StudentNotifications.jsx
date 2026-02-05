import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async (opts = { showLoading: true }, isAlive = () => true) => {
    try {
      setError('');
      if (opts.showLoading) setLoading(true);
      const res = await apiFetch('/api/student/notifications', { token });
      if (!isAlive()) return;
      setNotifications(Array.isArray(res?.notifications) ? res.notifications : []);
    } catch (e) {
      if (!isAlive()) return;
      setError(e?.message || 'Failed to load notifications');
    } finally {
      if (opts.showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;

    loadNotifications({ showLoading: true }, () => alive);

    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Loading notifications...</div>
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
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">Notifications</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => loadNotifications({ showLoading: true })}
                disabled={loading}
              >
                Refresh
              </button>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setNotifications([])}
                disabled={notifications.length === 0}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        <div className="card-body space-y-3">
          {notifications.length === 0 ? (
            <div className="text-sm text-slate-600">No notifications.</div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-200 bg-primary-50 p-3">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="mt-1 text-sm text-slate-700">{n.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

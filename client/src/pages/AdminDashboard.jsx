import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

const MANAGE_LINKS = [
  { to: '/admin/students', icon: '👥', label: 'Students', desc: 'View & manage students', color: 'from-violet-500 to-purple-600' },
  { to: '/admin/tests', icon: '📝', label: 'Tests', desc: 'Manage mock tests', color: 'from-blue-500 to-indigo-600' },
  { to: '/admin/tests/builder', icon: '🔧', label: 'Test Builder', desc: 'Create new tests', color: 'from-cyan-500 to-blue-600' },
  { to: '/admin/videos', icon: '🎥', label: 'Videos', desc: 'Upload & manage videos', color: 'from-rose-500 to-pink-600' },
  { to: '/admin/materials', icon: '📚', label: 'Materials', desc: 'Study PDFs & notes', color: 'from-emerald-500 to-teal-600' },
  { to: '/admin/pyqs', icon: '📄', label: 'PYQs', desc: 'Previous year questions', color: 'from-amber-500 to-orange-500' },
  { to: '/admin/plans', icon: '💳', label: 'Plans', desc: 'Manage subscription plans', color: 'from-green-500 to-emerald-600' },
  { to: '/admin/payments', icon: '💰', label: 'Payments', desc: 'View payment records', color: 'from-yellow-500 to-amber-600' },
  { to: '/admin/notifications', icon: '🔔', label: 'Notifications', desc: 'Broadcast announcements', color: 'from-indigo-500 to-violet-600' },
  { to: '/admin/results', icon: '🏆', label: 'Results', desc: 'View test scores', color: 'from-red-500 to-rose-600' },
  { to: '/admin/menu', icon: '🗂️', label: 'Menu Mgmt', desc: 'Configure navigation menus', color: 'from-slate-500 to-gray-600' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings', desc: 'App-wide settings', color: 'from-gray-500 to-slate-700' },
];

function StatCard({ icon, label, value, sub, color, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay ?? 0);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className={`admin-stat-card ${visible ? 'admin-stat-card--in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`admin-stat-icon bg-gradient-to-br ${color}`}>{icon}</div>
      <div className="admin-stat-info">
        <div className="admin-stat-value">{value ?? 0}</div>
        <div className="admin-stat-label">{label}</div>
        {sub && <div className="admin-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ManageCard({ to, icon, label, desc, color, idx }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60 * idx);
    return () => clearTimeout(t);
  }, [idx]);

  return (
    <Link to={to} className={`admin-manage-card ${visible ? 'admin-manage-card--in' : ''}`}>
      <div className={`admin-manage-icon bg-gradient-to-br ${color}`}>{icon}</div>
      <div className="admin-manage-body">
        <div className="admin-manage-label">{label}</div>
        <div className="admin-manage-desc">{desc}</div>
      </div>
      <span className="admin-manage-arrow">›</span>
    </Link>
  );
}

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

        try {
          const a = await apiFetch('/api/admin/analytics', { token });
          if (!alive) return;
          setAnalytics(a);
        } catch { /* ignore background failure */ }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load dashboard');
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6 page-in">
        <div className="dash-hero-skeleton" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton-card" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="dash-skeleton-card h-20" />)}
        </div>
      </div>
    );
  }

  const d = dashboard || {};
  const a = analytics || {};

  const stats = [
    { icon: '👥', label: 'Students', value: d.students?.count ?? a.studentsCount ?? 0, color: 'from-violet-500 to-purple-600', delay: 0 },
    { icon: '📝', label: 'Tests', value: d.tests?.count ?? a.testsCount ?? 0, color: 'from-blue-500 to-indigo-600', delay: 70 },
    { icon: '🎥', label: 'Videos', value: d.videos?.count ?? a.videosCount ?? 0, color: 'from-rose-500 to-pink-600', delay: 140 },
    { icon: '📚', label: 'Materials', value: d.materials?.count ?? a.materialsCount ?? 0, color: 'from-emerald-500 to-teal-600', delay: 210 },
    { icon: '📄', label: 'PYQs', value: a.pyqsCount ?? 0, color: 'from-amber-500 to-orange-500', delay: 280 },
    { icon: '🧪', label: 'Specimens', value: a.specimensCount ?? 0, color: 'from-cyan-500 to-blue-600', delay: 350 },
    { icon: '🏆', label: 'Results', value: a.resultsCount ?? 0, color: 'from-red-500 to-rose-600', delay: 420 },
    { icon: '🎯', label: 'Avg Accuracy', value: `${a.avgAccuracy ? Math.round(a.avgAccuracy) : 0}%`, color: 'from-green-500 to-emerald-600', delay: 490 },
  ];

  return (
    <div className="space-y-8 page-in">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="admin-hero">
        <div className="admin-hero-bg" />
        <div className="admin-hero-content">
          <div>
            <div className="admin-hero-role">⚡ Administrator</div>
            <h1 className="admin-hero-name">Welcome, {user?.name || 'Admin'}</h1>
            <p className="admin-hero-sub">Manage your KCET Agri Practical platform from here</p>
          </div>
          <div className="admin-hero-badges">
            <span className="dash-badge dash-badge--green">✓ Active</span>
            <span className="dash-badge dash-badge--purple">Admin</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Analytics Stats ──────────────────────────────────── */}
      <div>
        <h2 className="dash-section-title">📊 Platform Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </div>

      {/* ── Management Grid ──────────────────────────────────── */}
      <div>
        <h2 className="dash-section-title">⚙️ Manage Platform</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MANAGE_LINKS.map((l, i) => (
            <ManageCard key={l.to} {...l} idx={i} />
          ))}
        </div>
      </div>

    </div>
  );
}

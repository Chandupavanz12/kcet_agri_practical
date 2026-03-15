import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

const MANAGE_LINKS = [
  { to: '/admin/students', icon: '👥', label: 'Students', desc: 'Accounts & Subscription', color: 'from-violet-500 to-indigo-600' },
  { to: '/admin/tests', icon: '📝', label: 'Tests', desc: 'Manage Question Banks', color: 'from-blue-500 to-blue-600' },
  { to: '/admin/test-builder', icon: '🔧', label: 'Test Builder', desc: 'Craft Mock Exams', color: 'from-cyan-500 to-blue-500' },
  { to: '/admin/videos', icon: '🎥', label: 'Videos', desc: 'Tutorials & Practical Guides', color: 'from-rose-500 to-pink-500' },
  { to: '/admin/materials', icon: '📚', label: 'Materials', desc: 'PDFs & Chapter Notes', color: 'from-emerald-500 to-teal-500' },
  { to: '/admin/pyqs', icon: '📄', label: 'PYQs', desc: 'Previous Year Papers', color: 'from-amber-500 to-orange-500' },
  { to: '/admin/plans', icon: '💳', label: 'Plans', desc: 'Pricing & Tiers', color: 'from-green-500 to-emerald-500' },
  { to: '/admin/payments', icon: '💰', label: 'Payments', desc: 'Revenue & Transaction Logs', color: 'from-yellow-400 to-amber-600' },
  { to: '/admin/feedback', icon: '💬', label: 'Feedback', desc: 'Student Communications', color: 'from-pink-500 to-purple-500' },
  { to: '/admin/notifications', icon: '🔔', label: 'Broadcast', desc: 'Global Announcements', color: 'from-indigo-400 to-violet-600' },
  { to: '/admin/results', icon: '🏆', label: 'Results', desc: 'Student Performance', color: 'from-red-500 to-orange-600' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings', desc: 'Global configuration', color: 'from-slate-600 to-slate-800' },
];

function StatCard({ icon, label, value, color, delay }) {
  return (
    <div className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300" style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-black text-slate-800 tracking-tight">{value ?? 0}</div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>
        </div>
      </div>
    </div>
  );
}

function ManageCard({ to, icon, label, desc, color, idx }) {
  return (
    <Link to={to} className="group bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex items-center gap-4">
      <div className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl text-white shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase text-xs tracking-wider">{label}</div>
        <div className="text-xs text-slate-500 mt-1 line-clamp-1 italic">{desc}</div>
      </div>
      <div className="text-slate-300 group-hover:text-indigo-400 font-black text-xl transition-colors">→</div>
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent shadow-xl"></div>
      </div>
    );
  }

  const d = dashboard || {};
  const a = analytics || {};

  const stats = [
    { icon: '👥', label: 'Students', value: d.students?.count ?? a.studentsCount ?? 0, color: 'from-violet-500 to-purple-600', delay: 0 },
    { icon: '📝', label: 'Tests', value: d.tests?.count ?? a.testsCount ?? 0, color: 'from-blue-500 to-indigo-600', delay: 50 },
    { icon: '🎥', label: 'Videos', value: d.videos?.count ?? a.videosCount ?? 0, color: 'from-rose-500 to-pink-600', delay: 100 },
    { icon: '📚', label: 'Documents', value: d.materials?.count ?? a.materialsCount ?? 0, color: 'from-emerald-500 to-teal-600', delay: 150 },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-10">

      {/* ── CUSTOM HERO ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full" />

        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">
                👑 Super Admin Console
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                Welcome, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">{user?.name || 'Chandu'}</span>
              </h1>
              <p className="mt-4 text-slate-400 text-lg font-medium leading-relaxed">
                Platform metrics are stable. You have full control over students, content, and revenue from this dashboard.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 text-center flex-1 md:flex-none md:w-32">
                <div className="text-2xl font-black text-white italic">PRO</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1">Status</div>
              </div>
              <div className="bg-indigo-600 p-6 rounded-3xl text-center flex-1 md:flex-none md:w-32 shadow-xl shadow-indigo-900/40">
                <div className="text-2xl font-black text-white">200+</div>
                <div className="text-[10px] font-bold text-indigo-200 uppercase mt-1">Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-bold flex items-center gap-3">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* ── ANALYTICS ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">📊 Live Stats</h2>
          <div className="h-px flex-1 mx-6 bg-slate-100 hidden md:block" />
          <button onClick={() => window.location.reload()} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">Refresh ↻</button>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ── MANAGEMENT ───────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">⚙️ Console Actions</h2>
          <div className="h-px flex-1 mx-6 bg-slate-100 hidden md:block" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MANAGE_LINKS.map((l, i) => (
            <ManageCard key={l.to} {...l} idx={i} />
          ))}
        </div>
      </section>

      {/* ── QUICK FEEDBACK BANNER ─────────────────────────── */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative z-10 text-center md:text-left">
          <h3 className="text-2xl font-black">Incoming Feedback?</h3>
          <p className="opacity-90 mt-1 font-medium">Check what students are saying about the platform.</p>
        </div>
        <Link to="/admin/feedback" className="relative z-10 bg-white text-rose-600 px-8 py-3 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform">
          Open Messages Inbox
        </Link>
      </div>

    </div>
  );
}

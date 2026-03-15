import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

const QUICK_ACTIONS = [
  { to: '/student/mock-test', icon: '🧪', label: 'Mock Test', desc: 'Attempt a timed test', color: 'from-violet-500 to-purple-600' },
  { to: '/student/pyqs', icon: '📄', label: 'PYQs', desc: 'Previous year papers', color: 'from-blue-500 to-cyan-600' },
  { to: '/student/materials', icon: '📚', label: 'Materials', desc: 'Study PDFs & notes', color: 'from-emerald-500 to-teal-600' },
  { to: '/student/videos', icon: '🎥', label: 'Video Lectures', desc: 'Learn with videos', color: 'from-rose-500 to-pink-600' },
  { to: '/student/premium', icon: '⭐', label: 'Premium', desc: 'Unlock all content', color: 'from-amber-500 to-orange-600' },
  { to: '/student/progress', icon: '📊', label: 'My Progress', desc: 'Track your scores', color: 'from-indigo-500 to-blue-600' },
];

function StatCard({ icon, label, value, color, delay = 0 }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={`dash-stat-card ${show ? 'dash-stat-card--in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className={`dash-stat-icon bg-gradient-to-br ${color}`}>{icon}</div>
      <div className="dash-stat-text">
        <div className="dash-stat-value">{value}</div>
        <div className="dash-stat-label">{label}</div>
      </div>
    </div>
  );
}

function ActionCard({ to, icon, label, desc, color, idx }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 80 * idx); return () => clearTimeout(t); }, [idx]);
  return (
    <Link
      to={to}
      className={`dash-action-card ${show ? 'dash-action-card--in' : ''}`}
      style={{ transitionDelay: `${80 * idx}ms` }}
    >
      <div className={`dash-action-icon bg-gradient-to-br ${color}`}>{icon}</div>
      <div className="dash-action-body">
        <div className="dash-action-label">{label}</div>
        <div className="dash-action-desc">{desc}</div>
      </div>
      <span className="dash-action-arrow">→</span>
    </Link>
  );
}

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening';

  return (
    <div className="space-y-8 page-in">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="dash-hero">
        <div className="dash-hero-bg" />
        <div className="dash-hero-content">
          <div>
            <p className="dash-hero-greeting">{greeting}</p>
            <h1 className="dash-hero-name">{user?.name || 'Student'} 👋</h1>
            <p className="dash-hero-sub">Ready to ace your KCET Agri practical today?</p>
          </div>
          <div className="dash-hero-badges">
            <span className="dash-badge dash-badge--green">✓ Active</span>
            <span className="dash-badge dash-badge--blue">KCET Prep</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="📝" label="Tests Taken" value={data?.stats?.testsTaken ?? 0} color="from-violet-500 to-purple-600" delay={0} />
        <StatCard icon="🎯" label="Avg Accuracy" value={`${data?.stats?.avgAccuracy ?? 0}%`} color="from-blue-500 to-cyan-600" delay={80} />
        <StatCard icon="🏆" label="Best Score" value={data?.stats?.bestScore ?? 0} color="from-amber-500 to-orange-500" delay={160} />
        <StatCard icon="📚" label="Materials Read" value={data?.stats?.materialsRead ?? 0} color="from-emerald-500 to-teal-600" delay={240} />
      </div>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <div>
        <h2 className="dash-section-title">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((a, i) => (
            <ActionCard key={a.to} {...a} idx={i} />
          ))}
        </div>
      </div>

      {/* ── Premium CTA (if not unlocked) ───────────────────── */}
      {!data?.access?.combo?.unlocked && (
        <div className="dash-premium-cta">
          <div className="dash-premium-cta-glow" />
          <div className="dash-premium-left">
            <span className="text-3xl">⭐</span>
            <div>
              <div className="dash-premium-title">Unlock Premium Access</div>
              <div className="dash-premium-sub">Access all PYQs, premium PDFs, and unlimited study materials</div>
            </div>
          </div>
          <Link to="/student/premium" className="dash-premium-btn">
            Upgrade Now →
          </Link>
        </div>
      )}

      {/* ── Recent Videos ────────────────────────────────────── */}
      {data?.settings?.videosEnabled && data?.videos?.length ? (
        <div>
          <div className="dash-section-header">
            <h2 className="dash-section-title">🎥 Recent Videos</h2>
            <Link to="/student/videos" className="dash-section-link">View all →</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.videos.map((v, i) => (
              <div key={v.id} className="dash-video-card" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-100">
                  <iframe
                    src={`https://www.youtube.com/embed/${v.youtubeId}`}
                    title={v.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                <div className="mt-2 px-1">
                  <div className="text-sm font-semibold text-slate-800">{v.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{v.subject}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Study Materials ──────────────────────────────────── */}
      {data?.settings?.pdfsEnabled && data?.materials?.length ? (
        <div>
          <div className="dash-section-header">
            <h2 className="dash-section-title">📚 Study Materials</h2>
            <Link to="/student/materials" className="dash-section-link">View all →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.materials.map((m, i) => (
              <div key={m.id} className="dash-material-card" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="dash-material-icon">📄</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{m.title}</div>
                  <div className="text-xs text-slate-500">{m.subject}</div>
                </div>
                <a
                  href={toFileUrl(m.pdfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-material-btn"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── Notifications ────────────────────────────────────── */}
      {data?.settings?.notificationsEnabled && data?.notifications?.length ? (
        <div>
          <h2 className="dash-section-title">🔔 Notifications</h2>
          <div className="space-y-3">
            {data.notifications.map((n, i) => (
              <div key={n.id} className="dash-notif-card" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="dash-notif-dot" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">{n.title}</div>
                  <div className="mt-0.5 text-sm text-slate-600">{n.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
}

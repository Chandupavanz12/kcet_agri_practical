import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function IndexPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'admin') {
        const res = await apiFetch('/api/admin/dashboard', { token });
        setData(res);
        return;
      }

      // Student: only fetch notifications quickly for the landing page.
      const n = await apiFetch('/api/student/notifications', { token });
      setData({ notifications: Array.isArray(n?.notifications) ? n.notifications : [] });
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-in">
        <div className="app-container py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-slate-200 rounded" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1,2,3,4,5,6].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-in">
      <div className="app-container py-4">
        {/* Welcome Header */}
        <div className="mb-8 rounded-3xl border border-white/40 bg-white/60 backdrop-blur p-6 shadow-sm">
          <h1 className="font-display text-3xl font-semibold text-slate-900 mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-slate-700">
            {user?.role === 'admin' ? 'Manage your learning platform' : 'Continue your learning journey'}
          </p>
          <div className="mt-3 text-sm text-slate-600">
            Support:{' '}
            <a className="font-semibold" href="mailto:chandupavanz12@gmail.com">
              chandupavanz12@gmail.com
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Admin Dashboard */}
        {user?.role === 'admin' && data && (
          <>
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-800">
                      <span className="text-lg">👥</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">Students</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{data.students?.count || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                      <span className="text-lg">📝</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">Active Tests</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{data.tests?.count || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                      <span className="text-lg">🎬</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">Videos</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{data.videos?.count || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
                      <span className="text-lg">📚</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-slate-700">Materials</div>
                      <div className="mt-1 text-2xl font-semibold text-slate-900">{data.materials?.count || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Quick Actions */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold">Quick Actions</h2>
                </div>
                <div className="card-body">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link to="/admin/test-builder" className="btn-primary text-center">
                      📝 Create Test
                    </Link>
                    <Link to="/admin/videos" className="btn-primary text-center">
                      🎬 Add Video
                    </Link>
                    <Link to="/admin/materials" className="btn-primary text-center">
                      📚 Add Material
                    </Link>
                    <Link to="/admin/students" className="btn-primary text-center">
                      👥 Manage Students
                    </Link>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold">Management</h2>
                </div>
                <div className="card-body">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link to="/admin/notifications" className="btn-ghost text-center">
                      🔔 Notifications
                    </Link>
                    <Link to="/admin/settings" className="btn-ghost text-center">
                      ⚙️ Settings
                    </Link>
                    <Link to="/admin/results" className="btn-ghost text-center">
                      📊 Results
                    </Link>
                    <Link to="/admin/pyqs" className="btn-ghost text-center">
                      📄 PYQs
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Student Dashboard */}
        {user?.role === 'student' && (
          <>
            {/* Latest Updates */}
            {data?.notifications && data.notifications.length > 0 && (
              <div className="mb-8">
                <div className="card">
                  <div className="card-header">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      🔔 Latest Updates
                    </h2>
                  </div>
                  <div className="card-body">
                    <div className="space-y-3">
                      {(() => {
                        const seen = new Set();
                        const out = [];
                        for (const n of data.notifications) {
                          const msg = String(n?.message || '').trim();
                          if (!msg) continue;
                          const key = msg.toLowerCase();
                          if (seen.has(key)) continue;
                          seen.add(key);
                          out.push({ id: n.id, message: msg });
                          if (out.length >= 4) break;
                        }
                        return out;
                      })().map((notification) => (
                        <div key={notification.id} className="flex items-start gap-3 p-3 bg-secondary-50 rounded-2xl border border-secondary-100">
                          <div className="text-xl">📢</div>
                          <div className="flex-1">
                            <div className="text-sm text-slate-700">{notification.message}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </div>
              <div className="card-body">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Link to="/student/tests" className="btn-primary text-center">
                    📝 Take Test
                  </Link>
                  <Link to="/student/dashboard" className="btn-primary text-center">
                    📚 Study Materials
                  </Link>
                  <Link to="/student/dashboard" className="btn-primary text-center">
                    🎬 Watch Videos
                  </Link>
                  <Link to="/student/results" className="btn-primary text-center">
                    📊 View Progress
                  </Link>
                </div>
              </div>
            </div>

            {/* Available Content */}
            <div className="mt-8">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold">📚 Available Content</h2>
                </div>
                <div className="card-body">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Mock Tests */}
                    {data?.tests?.length > 0 && (
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="text-2xl mb-2">📝</div>
                        <h3 className="font-semibold mb-1">Mock Tests</h3>
                        <p className="text-sm text-slate-600 mb-3">
                          {data.tests.length} test{data.tests.length !== 1 ? 's' : ''} available
                        </p>
                        <Link to="/student/tests" className="btn-primary w-full text-center text-sm">
                          Start Practice
                        </Link>
                      </div>
                    )}

                    {/* Videos */}
                    {data?.videos?.length > 0 && (
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="text-2xl mb-2">🎬</div>
                        <h3 className="font-semibold mb-1">Learning Videos</h3>
                        <p className="text-sm text-slate-600 mb-3">
                          {data.videos.length} video{data.videos.length !== 1 ? 's' : ''} available
                        </p>
                        <Link to="/student/dashboard" className="btn-primary w-full text-center text-sm">
                          Watch Now
                        </Link>
                      </div>
                    )}

                    {/* Materials */}
                    {data?.materials?.length > 0 && (
                      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="text-2xl mb-2">📚</div>
                        <h3 className="font-semibold mb-1">Study Materials</h3>
                        <p className="text-sm text-slate-600 mb-3">
                          {data.materials.length} material{data.materials.length !== 1 ? 's' : ''} available
                        </p>
                        <Link to="/student/dashboard" className="btn-primary w-full text-center text-sm">
                          Study Now
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import PublicHeader from '../components/PublicHeader.jsx';
import PublicFooter from '../components/PublicFooter.jsx';

export default function Login() {
  const { loginStudent, loginAdmin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'admin') {
        const data = await loginAdmin({ email, password });
        navigate(data.user?.role === 'admin' ? '/admin/dashboard' : '/login', { replace: true });
      } else {
        const data = await loginStudent({ email, password });
        navigate(data.user?.role === 'student' ? '/student/dashboard' : '/login', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="app-container py-10">
        <div className="grid gap-6 lg:grid-cols-2 items-center">
          <div className="glass overflow-hidden page-in">
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
                  <p className="mt-1 text-sm text-slate-700">Login to continue your preparation.</p>
                </div>
                <span className="badge-success">Secure</span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('student')}
                  className={mode === 'student' ? 'btn-primary w-full' : 'btn-ghost w-full'}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setMode('admin')}
                  className={mode === 'admin' ? 'btn-primary w-full' : 'btn-ghost w-full'}
                >
                  Admin
                </button>
              </div>

              <form className="mt-5 space-y-4" onSubmit={onSubmit}>
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                    <input
                      className="input pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pl-9 pr-12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {mode === 'student' ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      className="text-left text-sm font-semibold text-primary-700 hover:text-primary-800"
                      to="/student/forgot-password"
                    >
                      Forgot password?
                    </Link>
                    <Link
                      className="text-left text-sm font-semibold text-primary-700 hover:text-primary-800"
                      to="/student/otp-login"
                    >
                      Login with OTP
                    </Link>
                  </div>
                ) : null}

                {error ? (
                  <div className={"rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 " + (error ? 'shake' : '')}>
                    {error}
                  </div>
                ) : null}

                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? 'Please wait...' : 'Login'}
                </button>
              </form>

              <div className="mt-5 text-sm text-slate-600">
                Student new?{' '}
                <Link className="font-semibold" to="/register">
                  Create account
                </Link>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 text-white font-bold shadow-sm">
                  KA
                </div>
                <div>
                  <div className="font-display text-lg font-semibold">KCET Agriculture Practical</div>
                  <div className="text-sm text-slate-700">Learn faster. Practice smarter.</div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="text-sm font-semibold">Mock Tests</div>
                  <div className="mt-1 text-sm text-slate-600">Specimen-based timed practice.</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="text-sm font-semibold">Progress</div>
                  <div className="mt-1 text-sm text-slate-600">Track accuracy and scores.</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="text-sm font-semibold">Videos & PDFs</div>
                  <div className="mt-1 text-sm text-slate-600">Concepts + identification.</div>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="text-sm font-semibold">Admin Panel</div>
                  <div className="mt-1 text-sm text-slate-600">Manage content and results.</div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-primary-50 p-4">
                <div className="text-sm font-semibold">Tip</div>
                <div className="mt-1 text-sm text-slate-700">
                  Use the timed mock test daily to improve specimen identification speed.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

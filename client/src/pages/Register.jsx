import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import PublicHeader from '../components/PublicHeader.jsx';
import PublicFooter from '../components/PublicFooter.jsx';

export default function Register() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        return;
      }
      const data = await registerStudent({ name, email, password });
      navigate(data.user?.role === 'student' ? '/student/dashboard' : '/login', { replace: true });
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="app-container py-10">
        <div className="mx-auto max-w-xl">
          <div className="glass overflow-hidden page-in">
            <div className="p-6 sm:p-8">
              <h1 className="font-display text-2xl font-semibold">Create your student account</h1>
              <p className="mt-1 text-sm text-slate-700">Start learning and take mock tests.</p>

              <form className="space-y-4 mt-6" onSubmit={onSubmit}>
                <div>
                  <label className="label">Name</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">👤</span>
                    <input
                      className="input pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                    <input
                      type="email"
                      className="input pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      autoComplete="email"
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
                      placeholder="Create a password"
                      autoComplete="new-password"
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

                {error ? (
                  <div className={"rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 " + (error ? 'shake' : '')}>
                    {error}
                  </div>
                ) : null}

                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? 'Please wait...' : 'Create account'}
                </button>
              </form>

              <div className="mt-5 text-sm text-slate-600">
                Already have an account?{' '}
                <Link className="font-semibold" to="/login">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}

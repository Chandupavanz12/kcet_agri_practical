import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import PublicHeader from '../components/PublicHeader.jsx';
import PublicFooter from '../components/PublicFooter.jsx';

export default function StudentOtpLogin() {
  const { user, requestStudentLoginOtp, loginStudentWithOtp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'admin' ? '/' : '/student/dashboard'} replace />;
  }

  async function handleSendOtp() {
    setMessage('');

    const e = String(email || '').trim();
    if (!e) {
      setMessage('Please enter your registered email');
      return;
    }

    try {
      setBusy(true);
      const res = await requestStudentLoginOtp({ email: e });
      setMessage(res?.message || 'OTP sent');
    } catch (err) {
      setMessage(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyLogin() {
    setMessage('');

    const e = String(email || '').trim();
    if (!e) {
      setMessage('Please enter your registered email');
      return;
    }
    if (!otp) {
      setMessage('Please enter OTP');
      return;
    }

    try {
      setBusy(true);
      const res = await loginStudentWithOtp({ email: e, otp });
      if (res?.user?.role === 'student') {
        navigate('/student/dashboard', { replace: true });
        return;
      }
      setMessage('Login failed');
    } catch (err) {
      setMessage(err?.message || 'Login failed');
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
            <div className="p-6 sm:p-8 space-y-4">
              <div>
                <h1 className="font-display text-2xl font-semibold">Login with OTP</h1>
                <p className="mt-1 text-sm text-slate-700">Skip password and login using OTP.</p>
              </div>

              <div>
                <label className="label">Registered Email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                  <input
                    type="email"
                    className="input pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter registered email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <button type="button" className="btn-primary" disabled={busy} onClick={handleSendOtp}>
                  {busy ? 'Sending...' : 'Send OTP'}
                </button>
                <div className="flex-1">
                  <label className="label">OTP</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">#</span>
                    <input className="input pl-9" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
                  </div>
                </div>
                <button type="button" className="btn-primary" disabled={busy} onClick={handleVerifyLogin}>
                  {busy ? 'Please wait...' : 'Verify & Login'}
                </button>
              </div>

              {message ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</div>
              ) : null}

              <div className="text-sm text-slate-600">
                Back to{' '}
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

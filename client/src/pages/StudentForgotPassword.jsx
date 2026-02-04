import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';
import PublicHeader from '../components/PublicHeader.jsx';
import PublicFooter from '../components/PublicFooter.jsx';

export default function StudentForgotPassword() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendLeftSec, setResendLeftSec] = useState(0);

  useEffect(() => {
    if (!resendLeftSec) return;
    const t = setInterval(() => {
      setResendLeftSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendLeftSec]);

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
    if (!newPassword || !confirmPassword) {
      setMessage('Please enter new password and confirm password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    try {
      setBusy(true);
      const res = await apiFetch('/api/auth/student/password-reset/request', {
        method: 'POST',
        body: { email: e },
      });
      setMessage(res?.message || 'OTP sent');
      setResendLeftSec(30);
    } catch (err) {
      setMessage(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndReset() {
    setMessage('');

    const e = String(email || '').trim();
    if (!e) {
      setMessage('Please enter your registered email');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setMessage('Please enter new password and confirm password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    if (!otp) {
      setMessage('Please enter OTP');
      return;
    }

    try {
      setBusy(true);
      await apiFetch('/api/auth/student/password-reset/reset', {
        method: 'POST',
        body: { email: e, otp, newPassword },
      });
      setMessage('Password reset successful. Please login.');
      setTimeout(() => navigate('/login'), 500);
    } catch (err) {
      setMessage(err?.message || 'Failed to reset password');
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
                <h1 className="font-display text-2xl font-semibold">Forgot Password</h1>
                <p className="mt-1 text-sm text-slate-700">Reset using OTP sent to your registered email.</p>
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">New password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                    <input
                      type="password"
                      className="input pl-9"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Confirm password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                    <input
                      type="password"
                      className="input pl-9"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy || resendLeftSec > 0}
                  onClick={handleSendOtp}
                >
                  {busy ? 'Sending...' : resendLeftSec > 0 ? `Resend in ${resendLeftSec}s` : 'Send OTP'}
                </button>
                <div className="flex-1">
                  <label className="label">OTP</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">#</span>
                    <input
                      className="input pl-9"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter OTP"
                    />
                  </div>
                </div>
                <button type="button" className="btn-primary" disabled={busy} onClick={handleVerifyAndReset}>
                  {busy ? 'Please wait...' : 'Verify & Reset'}
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

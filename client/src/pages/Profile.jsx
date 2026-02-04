import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function Profile() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch('/api/student/profile', { token });
        if (!alive) return;
        setProfile(res.user);
        setName(res.user.name);
      } catch (err) {
        if (!alive) return;
        setMessage(err?.message || 'Failed to load profile');
      }
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const handleSave = async () => {
    try {
      await apiFetch('/api/student/profile', {
        token,
        method: 'PUT',
        body: { name },
      });
      setEditMode(false);
      setMessage('Profile updated');
    } catch (err) {
      setMessage(err?.message || 'Failed to update profile');
    }
  };

  const handleSendOtp = async () => {
    try {
      const res = await apiFetch('/api/student/password-reset/request', {
        token,
        method: 'POST',
      });
      setMessage(res.message || 'OTP sent');
      setOtpSent(true);
    } catch (err) {
      setMessage(err?.message || 'Failed to send OTP');
    }
  };

  const handleResetWithOtp = async () => {
    if (!otp.trim()) {
      setMessage('Enter OTP');
      return;
    }
    if (!newPassword) {
      setMessage('Enter new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    try {
      const res = await apiFetch('/api/student/password-reset/reset', {
        token,
        method: 'POST',
        body: { otp, newPassword },
      });
      if (res?.reset) {
        setMessage('Password updated');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSent(false);
      } else {
        setMessage(res?.message || 'Failed to reset password');
      }
    } catch (err) {
      setMessage(err?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Profile</h2>
        </div>
        <div className="card-body space-y-4">
          {message && (
            <div className="rounded-xl border border-slate-200 bg-primary-50 p-3 text-sm text-slate-700">
              {message}
            </div>
          )}
          <div>
            <div className="label">Name</div>
            {editMode ? (
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            ) : (
              <div className="mt-1 text-sm">{profile?.name}</div>
            )}
          </div>
          <div>
            <div className="label">Email</div>
            <div className="mt-1 text-sm">{profile?.email}</div>
          </div>
          <div>
            <div className="label">Role</div>
            <div className="mt-1 text-sm capitalize">{profile?.role}</div>
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <button onClick={handleSave} className="btn-primary">
                  Save
                </button>
                <button onClick={() => setEditMode(false)} className="btn-ghost">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditMode(true)} className="btn-primary">
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Password Reset</h2>
        </div>
        <div className="card-body space-y-4">
          <p className="text-sm text-slate-600">
            Request an OTP to your registered email, then verify the OTP to set a new password.
          </p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Registered email: <span className="font-medium">{profile?.email || user?.email || '-'}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSendOtp} className="btn-primary">
              Send OTP
            </button>
            {otpSent ? (
              <button
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {otpSent ? (
            <div className="space-y-3">
              <input
                className="input"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                className="input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button onClick={handleResetWithOtp} className="btn-primary">
                Verify OTP & Reset Password
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

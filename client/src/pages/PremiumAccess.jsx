import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

function formatINR(paise) {
  const n = Number(paise || 0) / 100;
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    const existing = document.querySelector('script[data-razorpay="true"]');
    if (existing) {
      resolve(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.dataset.razorpay = 'true';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PremiumAccess() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const benefits = useMemo(
    () => [
      { title: 'Premium PYQs', text: 'All centres + all years access (view-only).' },
      { title: 'Premium Study Materials', text: 'Unlock all paid documents (view-only).' },
      { title: '1 Year Validity', text: 'Access remains active for 365 days from purchase.' },
      { title: 'Auto-unlock new content', text: 'New premium materials become available automatically while your plan is active.' },
    ],
    []
  );

  const refresh = async () => {
    const [p, s] = await Promise.all([
      apiFetch('/api/student/premium/plans', { token }),
      apiFetch('/api/student/premium/status', { token }),
    ]);
    setPlans(Array.isArray(p?.plans) ? p.plans : []);
    setStatus(s?.access || null);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        await refresh();
        if (!alive) return;
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load premium plans');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const buy = async (planCode) => {
    try {
      setBusy(true);
      setMessage('');
      setError('');

      const orderRes = await apiFetch('/api/student/premium/order', { token, method: 'POST', body: { planCode } });
      if (orderRes?.free) {
        setMessage('Premium activated successfully.');
        await refresh();
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load payment gateway');

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amountPaise,
        currency: orderRes.currency || 'INR',
        name: 'KCET Agri',
        description: orderRes?.plan?.name || 'Premium Access',
        order_id: orderRes.orderId,
        prefill: {
          name: orderRes?.user?.name || user?.name || '',
          email: orderRes?.user?.email || user?.email || '',
        },
        theme: { color: '#2563eb' },
        handler: async (response) => {
          const verifyPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };
          await apiFetch('/api/student/premium/verify', { token, method: 'POST', body: verifyPayload });
          setMessage('Payment successful. Premium activated.');
          await refresh();
        },
        modal: {
          ondismiss: () => {
            setMessage('');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setError(e?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-48 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-secondary-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold">Premium Access</h1>
              <div className="mt-1 text-sm text-slate-700">Unlock PYQs and premium study materials with secure payments.</div>
            </div>
            {status?.combo?.unlocked || status?.pyq?.unlocked || status?.materials?.unlocked ? (
              <span className="badge badge-success">Active</span>
            ) : (
              <span className="badge">Not active</span>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="card">
          <div className="card-body">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="card">
          <div className="card-body">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div key={b.title} className="card">
            <div className="card-body">
              <div className="text-sm font-semibold text-slate-900">{b.title}</div>
              <div className="mt-1 text-xs text-slate-600">{b.text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const code = String(p.code || '').toLowerCase();
          const unlocked = Boolean(status?.[code]?.unlocked);
          const expiry = status?.[code]?.expiry;

          return (
            <div key={p.id} className="card overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary-600 to-secondary-600" />
              <div className="card-body">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                    <div className="mt-1 text-xs text-slate-600">Validity: {p.durationDays} days</div>
                    {expiry ? <div className="mt-1 text-xs text-slate-600">Expires: {new Date(expiry).toLocaleDateString()}</div> : null}
                  </div>
                  {unlocked ? <span className="badge badge-success">Active</span> : <span className="badge">Plan</span>}
                </div>

                <div className="mt-4 text-2xl font-bold text-slate-900">
                  {p.isFree ? 'Free' : formatINR(p.pricePaise)}
                </div>

                <div className="mt-4">
                  {unlocked ? (
                    <button type="button" disabled className="btn-ghost text-xs">Already active</button>
                  ) : (
                    <button type="button" disabled={busy} className="btn-primary text-xs" onClick={() => buy(code)}>
                      {busy ? 'Please wait...' : p.isFree ? 'Activate' : 'Buy now'}
                    </button>
                  )}
                </div>

                <div className="mt-3 text-[11px] text-slate-500">
                  View-only access. Download may be restricted.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

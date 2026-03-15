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
    if (existing) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.dataset.razorpay = 'true';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PLAN_META = {
  pyq: { icon: '📄', color: 'from-blue-500 to-cyan-600', badge: 'PYQ Access', highlight: false },
  materials: { icon: '📚', color: 'from-emerald-500 to-teal-600', badge: 'Study PDFs', highlight: false },
  combo: { icon: '⭐', color: 'from-amber-500 to-orange-600', badge: 'Best Value', highlight: true },
};

const BENEFITS = [
  { icon: '📄', title: 'All PYQs Unlocked', text: 'Access previous year papers from all centres and all years.' },
  { icon: '📚', title: 'Premium Study Materials', text: 'Download and view all premium PDFs and notes.' },
  { icon: '🔄', title: 'Auto-unlock New Content', text: 'New premium materials become available automatically.' },
  { icon: '📅', title: '1-Year Validity', text: 'Full access for 365 days from plan activation.' },
];

const PLAN_BULLETS = {
  pyq: ['All PYQ centres and years', 'View inside the app', 'Mobile & desktop friendly', 'Valid for plan duration'],
  materials: ['All premium study PDFs', 'New uploads unlock automatically', 'View inside the app', 'Valid for plan duration'],
  combo: ['Everything in PYQ + Materials', 'Best value for serious prep', 'One purchase for all access', 'Valid for plan duration'],
};

export default function PremiumAccess() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
    return () => { alive = false; };
  }, [token]);

  const buy = async (planCode) => {
    try {
      setBusy(true);
      setMessage('');
      setError('');

      const orderRes = await apiFetch('/api/student/premium/order', { token, method: 'POST', body: { planCode } });
      if (orderRes?.free) {
        setMessage('🎉 Premium activated successfully!');
        await refresh();
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Failed to load payment gateway');

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amountPaise,
        currency: orderRes.currency || 'INR',
        name: 'KCET Agri Practical',
        description: orderRes?.plan?.name || 'Premium Access',
        order_id: orderRes.orderId,
        prefill: {
          name: orderRes?.user?.name || user?.name || '',
          email: orderRes?.user?.email || user?.email || '',
        },
        theme: { color: '#7c3aed' },
        handler: async (response) => {
          const verifyPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };
          await apiFetch('/api/student/premium/verify', { token, method: 'POST', body: verifyPayload });
          setMessage('🎉 Payment successful. Premium activated!');
          await refresh();
        },
        modal: { ondismiss: () => setMessage('') },
      };

      new window.Razorpay(options).open();
    } catch (e) {
      setError(e?.message || 'Payment failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 page-in">
        <div className="dash-hero-skeleton" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="dash-skeleton-card" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map(i => <div key={i} className="dash-skeleton-card h-64" />)}
        </div>
      </div>
    );
  }

  const hasAnyAccess = status?.combo?.unlocked || status?.pyq?.unlocked || status?.materials?.unlocked;

  return (
    <div className="space-y-8 page-in">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="premium-hero">
        <div className="premium-hero-bg" />
        <div className="premium-hero-content">
          <div className="premium-hero-icon">⭐</div>
          <h1 className="premium-hero-title">Premium Access</h1>
          <p className="premium-hero-sub">Unlock full access to PYQs, premium study materials, and more.</p>
          {hasAnyAccess && <span className="dash-badge dash-badge--green mt-4 inline-flex">✓ You have an active plan</span>}
        </div>
      </div>

      {/* ── Alerts ───────────────────────────────────────────── */}
      {error && <div className="rounded-2xl border border-red-200   bg-red-50   px-5 py-4 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">{message}</div>}

      {/* ── Benefit strips ───────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BENEFITS.map((b, i) => (
          <div key={b.title} className="premium-benefit-card" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="premium-benefit-icon">{b.icon}</span>
            <div>
              <div className="premium-benefit-title">{b.title}</div>
              <div className="premium-benefit-text">{b.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Plan Cards ───────────────────────────────────────── */}
      <div>
        <h2 className="dash-section-title">💳 Choose Your Plan</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p, i) => {
            const code = String(p.code || '').toLowerCase();
            const unlocked = Boolean(status?.[code]?.unlocked);
            const expiry = status?.[code]?.expiry;
            const bullets = PLAN_BULLETS[code] || [];
            const meta = PLAN_META[code] || { icon: '📦', color: 'from-slate-500 to-gray-600', badge: 'Plan', highlight: false };

            return (
              <div
                key={p.id}
                className={`premium-plan-card ${meta.highlight ? 'premium-plan-card--highlight' : ''}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {meta.highlight && <div className="premium-plan-ribbon">⭐ Best Value</div>}

                {/* Card gradient bar */}
                <div className={`premium-plan-bar bg-gradient-to-r ${meta.color}`} />

                <div className="premium-plan-body">
                  {/* Icon + Name */}
                  <div className="premium-plan-top">
                    <div className={`premium-plan-icon bg-gradient-to-br ${meta.color}`}>{meta.icon}</div>
                    <div className="flex-1">
                      <div className="premium-plan-name">{p.name}</div>
                      <div className="premium-plan-duration">{p.durationDays} days validity</div>
                      {expiry && <div className="premium-plan-expiry">Expires: {new Date(expiry).toLocaleDateString('en-IN')}</div>}
                    </div>
                    {unlocked
                      ? <span className="dash-badge dash-badge--green">✓ Active</span>
                      : <span className={`dash-badge ${meta.highlight ? 'dash-badge--amber' : 'dash-badge--blue'}`}>{meta.badge}</span>
                    }
                  </div>

                  {/* Price */}
                  <div className="premium-plan-price">
                    {p.isFree ? <span className="premium-price-free">Free</span> : <span className="premium-price-paid">{formatINR(p.pricePaise)}</span>}
                    {!p.isFree && <span className="premium-price-period">/year</span>}
                  </div>

                  {/* Bullets */}
                  {bullets.length > 0 && (
                    <ul className="premium-plan-bullets">
                      {bullets.map((b) => (
                        <li key={b} className="premium-plan-bullet">
                          <span className={`premium-bullet-dot bg-gradient-to-br ${meta.color}`}>✓</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* CTA */}
                  <div className="pt-2">
                    {unlocked ? (
                      <button type="button" disabled className="premium-plan-cta premium-plan-cta--active">
                        ✓ Already Active
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => buy(code)}
                        className={`premium-plan-cta ${meta.highlight ? 'premium-plan-cta--highlight' : 'premium-plan-cta--default'}`}
                      >
                        {busy ? '⏳ Processing...' : p.isFree ? '🚀 Activate Free' : '💳 Buy Now'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

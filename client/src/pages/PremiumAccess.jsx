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



      {/* ── Plan Cards ───────────────────────────────────────── */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl mb-4">💳 Choose Your Plan</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">Get unlimited access to all 20 chapter materials, PYQs, and everything you need to score top marks.</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((p, i) => {
            const code = String(p.code || '').toLowerCase();
            const unlocked = Boolean(status?.[code]?.unlocked);
            const expiry = status?.[code]?.expiry;
            const bullets = PLAN_BULLETS[code] || [];
            const meta = PLAN_META[code] || { icon: '📦', color: 'from-slate-500 to-gray-600', textColors: 'text-slate-600', lightBg: 'bg-slate-50', badge: 'Plan', highlight: false };

            const isHighlight = meta.highlight;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col overflow-hidden rounded-[2rem] border-2 bg-white shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${isHighlight ? 'border-amber-400 ring-8 ring-amber-50 scale-105 z-10' : 'border-slate-100 hover:border-blue-200'
                  }`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Decorative background blast */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br ${meta.color} opacity-10 blur-3xl`} />
                <div className={`absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-gradient-to-tr ${meta.color} opacity-10 blur-3xl`} />

                {isHighlight && (
                  <div className="absolute top-0 inset-x-0 mx-auto w-max px-4 py-1 rounded-b-xl bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-[10px] tracking-widest text-white uppercase shadow-sm">
                    ⭐ Most Popular
                  </div>
                )}

                <div className="p-8 flex-1 flex flex-col relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} shadow-lg shadow-current/20 text-white text-2xl`}>
                      {meta.icon}
                    </div>
                    {unlocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg> Active
                      </span>
                    ) : (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${isHighlight ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {meta.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  <p className="mt-1 flex items-baseline gap-x-1">
                    {p.isFree ? (
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900">Free</span>
                    ) : (
                      <>
                        <span className={`text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br ${meta.color}`}>
                          {formatINR(p.pricePaise)}
                        </span>
                        <span className="text-sm font-medium text-slate-500">/year</span>
                      </>
                    )}
                  </p>

                  <div className="mt-2 text-sm text-slate-500 font-medium">{p.durationDays} days access</div>
                  {expiry && <div className="mt-1 text-xs font-semibold text-emerald-600">Expires: {new Date(expiry).toLocaleDateString('en-IN')}</div>}

                  <div className="mt-8 mb-8 flex-1">
                    <ul className="space-y-4">
                      {bullets.map((b) => (
                        <li key={b} className="flex gap-x-3 text-sm leading-6 text-slate-600 font-medium">
                          <svg className={`h-6 w-5 flex-none bg-clip-text text-transparent`} style={{ color: isHighlight ? '#f59e0b' : '#3b82f6' }} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto">
                    {unlocked ? (
                      <button type="button" disabled className="w-full rounded-xl bg-slate-100 py-3.5 px-4 text-center text-sm font-bold text-slate-400 shadow-inner cursor-not-allowed">
                        Already Active
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => buy(code)}
                        className={`group w-full relative overflow-hidden rounded-xl py-3.5 px-4 text-center text-sm font-bold text-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${isHighlight ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                          }`}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {busy ? '⏳ Processing...' : p.isFree ? '🚀 Activate Free' : '💳 Unlock Now'}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
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

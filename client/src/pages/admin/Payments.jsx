import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

function formatINR(paise) {
  const n = Number(paise || 0) / 100;
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

export default function Payments() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPaid = useMemo(() => {
    return items
      .filter((p) => p.status === 'paid' || p.status === 'free')
      .reduce((sum, p) => sum + Number(p.amountPaise || 0), 0);
  }, [items]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch('/api/admin/payments', { token });
        if (!alive) return;
        setItems(Array.isArray(res?.payments) ? res.payments : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load payments');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

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
              <h1 className="font-display text-xl font-semibold">Payments</h1>
              <div className="mt-1 text-sm text-slate-700">Latest premium payments (last 200).</div>
            </div>
            <span className="badge">Total: {formatINR(totalPaid)}</span>
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

      <div className="card">
        <div className="card-body">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-700">No payments yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.userName} ({p.userEmail})</div>
                      <div className="mt-1 text-xs text-slate-600">Plan: {p.planName} ({p.planCode})</div>
                      <div className="mt-1 text-xs text-slate-600">Order: {p.orderId}</div>
                      {p.paymentId ? <div className="mt-1 text-xs text-slate-600">Payment: {p.paymentId}</div> : null}
                      <div className="mt-1 text-xs text-slate-600">Created: {new Date(p.createdAt).toLocaleString()}</div>
                      {p.paidAt ? <div className="mt-1 text-xs text-slate-600">Paid: {new Date(p.paidAt).toLocaleString()}</div> : null}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatINR(p.amountPaise)}</div>
                      <div className="mt-2">
                        <span className={`badge ${p.status === 'paid' || p.status === 'free' ? 'badge-success' : ''}`}>{p.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

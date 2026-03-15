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
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const totalPaid = useMemo(() => {
    return items
      .filter((p) => p.status === 'paid' || p.status === 'free')
      .reduce((sum, p) => sum + Number(p.amountPaise || 0), 0);
  }, [items]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch('/api/admin/payments', { token });
      setItems(Array.isArray(res?.payments) ? res.payments : []);
    } catch (e) {
      setError(e?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} payment record(s)?`)) return;

    try {
      setBusy(true);
      await apiFetch('/api/admin/payments', {
        token,
        method: 'DELETE',
        body: { ids: selectedIds }
      });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert(err.message || 'Deletion failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading && items.length === 0) {
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
        <div className="card-body bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 p-8">
          <div className="flex items-start justify-between gap-3 text-white">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">💰 Payments Management</h1>
              <div className="mt-1 text-emerald-50 font-medium">Review transactions and track total revenue.</div>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30 text-right shadow-sm">
              <div className="text-xs uppercase font-bold opacity-80">Total Revenue</div>
              <div className="text-xl font-bold leading-none mt-1">{formatINR(totalPaid)}</div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card border-0 shadow-sm">
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-medium rounded-xl">{error}</div>
        </div>
      ) : null}

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSelectAll}
            className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm"
          >
            {selectedIds.length === items.length && items.length > 0 ? 'Deselect All' : 'Select All'}
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              disabled={busy}
              className="text-sm font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 bg-white shadow-sm transition-all"
            >
              {busy ? 'Deleting...' : `🗑️ Delete Selected (${selectedIds.length})`}
            </button>
          )}
        </div>
        <div className="text-sm text-slate-500 font-medium">
          Showing {items.length} records
        </div>
      </div>

      <div className="card border-0 shadow-sm overflow-hidden">
        <div className="card-body p-0">
          {items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-medium bg-white">No payments found in history.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 w-10">Select</th>
                    <th className="px-6 py-4">Student / Plan</th>
                    <th className="px-6 py-4">Transaction Details</th>
                    <th className="px-6 py-4 text-right">Amount / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {items.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr key={p.id} className={`transition-colors hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(p.id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{p.userName}</div>
                          <div className="text-slate-500 text-xs mt-0.5">{p.userEmail}</div>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100 italic">
                            {p.planName || p.planCode}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            <span className="text-slate-400">ORDER: <span className="text-slate-600 font-medium">{p.orderId}</span></span>
                            {p.paymentId && <span className="text-slate-400">TXNID: <span className="text-slate-600 font-medium">{p.paymentId}</span></span>}
                            <span className="text-slate-400 font-medium mt-1">{new Date(p.createdAt).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-base font-bold text-slate-900">{formatINR(p.amountPaise)}</div>
                          <div className="mt-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${p.status === 'paid' || p.status === 'free'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                              {p.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

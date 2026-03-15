import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Students() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const plans = [
    { code: 'combo', label: '🌟 Combo Plan (All Access)' },
    { code: 'pyq', label: '📄 PYQ Plan' },
    { code: 'materials', label: '📚 Materials Plan' }
  ];

  // Modal: 'info' | 'plan' | null
  const [modal, setModal] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [selectedPlanCode, setSelectedPlanCode] = useState('combo');
  const [busy, setBusy] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/students', { token });
      setStudents(res?.students || []);
    } catch (err) {
      setMessage(err?.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [token]);

  const closeModal = () => { setModal(null); setActiveStudent(null); };

  const openInfoModal = (s) => {
    setActiveStudent(s);
    setEditForm({ name: s.name, email: s.email, password: '' });
    setModal('info');
  };

  const openPlanModal = (s) => {
    setActiveStudent(s);
    setSelectedPlanCode('combo');
    setModal('plan');
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!activeStudent) return;
    try {
      setBusy(true);
      await apiFetch(`/api/admin/students/${activeStudent.id}`, {
        token, method: 'PUT', body: editForm
      });
      setMessage(`Student "${activeStudent.name}" updated.`);
      closeModal();
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubscription = async (action) => {
    if (!activeStudent) return;
    try {
      setBusy(true);
      await apiFetch(`/api/admin/students/${activeStudent.id}/subscribe`, {
        token, method: 'POST', body: { planCode: selectedPlanCode, action }
      });
      setMessage(`${action === 'subscribe' ? '✅ Unlocked' : '❌ Revoked'} "${selectedPlanCode}" for ${activeStudent.name}.`);
      closeModal();
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to process subscription.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`PERMANENTLY delete "${name}"? This also removes all their test results.`)) return;
    try {
      setBusy(true);
      await apiFetch(`/api/admin/students/${id}`, { token, method: 'DELETE' });
      setMessage(`Student "${name}" deleted.`);
      closeModal();
      fetchStudents();
    } catch (err) {
      alert(err.message || 'Failed to delete.');
    } finally {
      setBusy(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">👥 Student Management</h2>
              <div className="mt-1 text-blue-50 text-sm">
                <strong>Student Info</strong> — edit details &amp; reset password. <strong>Manage Plan</strong> — allocate premium access.
              </div>
            </div>
            <input
              type="text"
              placeholder="🔍 Search by name or email..."
              className="input bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white focus:text-slate-900 transition-all rounded-xl w-full md:w-72"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 border-l-4 border-indigo-500 bg-indigo-50 text-indigo-800 font-bold rounded-xl flex justify-between items-center shadow-sm">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-indigo-400 hover:text-indigo-600 ml-4">✕</button>
        </div>
      )}

      {/* ── MODAL: Student Info / Edit / Reset Password ── */}
      {modal === 'info' && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg shadow-2xl">
            <div className="card-header bg-indigo-600 text-white flex justify-between items-center px-5 py-4">
              <h3 className="text-lg font-bold">✏️ Student Info — {activeStudent.name}</h3>
              <span onClick={closeModal} className="text-xs text-black font-semibold cursor-pointer select-none border border-white/30 bg-white/90 px-2 py-0.5 rounded">Close</span>
            </div>
            <form onSubmit={handleUpdateStudent} className="card-body p-6 space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input className="input" type="email" value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Reset Password</label>
                <input
                  className="input font-mono"
                  type="text"
                  placeholder="Enter new password (leave blank to keep current)"
                  value={editForm.password}
                  onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">Passwords are stored securely as hashes. You can set a new one here.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" disabled={busy} className="btn-primary flex-1">
                  {busy ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(activeStudent.id, activeStudent.name)}
                  disabled={busy}
                  className="btn-ghost text-red-600 border border-red-200 hover:bg-red-50 flex-1"
                >
                  🗑️ Delete Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Manage Premium Plan ── */}
      {modal === 'plan' && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="card w-full max-w-lg shadow-2xl">
            <div className="card-header bg-gradient-to-r from-amber-500 to-orange-500 text-white flex justify-between items-center px-5 py-4">
              <h3 className="text-lg font-bold">⭐ Manage Plan — {activeStudent.name}</h3>
              <span onClick={closeModal} className="text-xs text-black font-semibold cursor-pointer select-none border border-white/30 bg-white/90 px-2 py-0.5 rounded">Close</span>
            </div>
            <div className="card-body p-6 space-y-5">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Status</div>
                <span className={`inline-block px-3 py-1.5 text-sm font-bold rounded-full ${activeStudent.premiumStatus === 'Free' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                  {activeStudent.premiumStatus === 'Free' ? '🆓 Free User' : `⭐ ${activeStudent.premiumStatus}`}
                </span>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Select Plan Tier</div>
                <div className="grid gap-2">
                  {plans.map(p => (
                    <button key={p.code} onClick={() => setSelectedPlanCode(p.code)}
                      className={`p-4 rounded-xl border-2 text-left font-bold text-sm transition-all ${selectedPlanCode === p.code ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-100 hover:border-slate-300 bg-white'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => handleSubscription('subscribe')} disabled={busy}
                  className="btn-primary flex-1 bg-indigo-600 hover:bg-indigo-700">
                  {busy ? 'Processing...' : '✅ Unlock Access'}
                </button>
                <button onClick={() => handleSubscription('unsubscribe')} disabled={busy}
                  className="btn-ghost flex-1 text-red-600 border border-red-200 hover:bg-red-50">
                  {busy ? 'Revoking...' : '❌ Revoke Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Table */}
      <div className="card border-0 shadow-xl overflow-hidden">
        <div className="card-header bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            All Registered Students
            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-full">{filteredStudents.length}</span>
          </h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-r-transparent mb-3"></div>
              <div className="text-slate-500 font-medium">Loading students...</div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">No students found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4 text-center">Plan</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStudents.map(s => {
                    const isPremium = s.premiumStatus && s.premiumStatus !== 'Free';
                    return (
                      <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{s.name}</div>
                          <div className="text-slate-500 text-xs mt-0.5">{s.email}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">ID #{s.id} • {new Date(s.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${isPremium ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                            {isPremium ? `⭐ ${s.premiumStatus}` : '🆓 Free'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => openInfoModal(s)}
                              className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-lg shadow-sm transition-colors">
                              Student Info
                            </button>
                            <button onClick={() => openPlanModal(s)}
                              className="px-3 py-1.5 bg-white border border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-bold rounded-lg shadow-sm transition-colors">
                              Manage Plan
                            </button>
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

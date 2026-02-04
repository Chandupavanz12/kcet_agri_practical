import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ICONS = ['📊', '🗂️', '👥', '📝', '🎬', '📚', '📋', '🔔', '⚙️', '📈', '👤', '❓', '🚪', '📄'];

const STUDENT_ROUTE_OPTIONS = [
  { value: '/student/dashboard', label: '/student/dashboard' },
  { value: '/student/tests', label: '/student/tests' },
  { value: '/student/progress', label: '/student/progress' },
  { value: '/student/results', label: '/student/results' },
  { value: '/student/videos', label: '/student/videos' },
  { value: '/student/materials', label: '/student/materials' },
  { value: '/student/pyqs', label: '/student/pyqs' },
  { value: '/student/notifications', label: '/student/notifications' },
  { value: '/student/profile', label: '/student/profile' },
  { value: '/student/faq', label: '/student/faq' },
  { value: '/student/about', label: '/student/about' },
  { value: '/logout', label: '/logout' },
];

const ADMIN_ROUTE_OPTIONS = [
  { value: '/admin/dashboard', label: '/admin/dashboard' },
  { value: '/admin/menu', label: '/admin/menu' },
  { value: '/admin/students', label: '/admin/students' },
  { value: '/admin/specimens', label: '/admin/specimens' },
  { value: '/admin/tests', label: '/admin/tests' },
  { value: '/admin/test-builder', label: '/admin/test-builder' },
  { value: '/admin/videos', label: '/admin/videos' },
  { value: '/admin/materials', label: '/admin/materials' },
  { value: '/admin/pyqs', label: '/admin/pyqs' },
  { value: '/admin/notifications', label: '/admin/notifications' },
  { value: '/admin/results', label: '/admin/results' },
  { value: '/admin/settings', label: '/admin/settings' },
  { value: '/logout', label: '/logout' },
];

function getRouteOptions(type) {
  if (type === 'admin') return ADMIN_ROUTE_OPTIONS;
  if (type === 'both') return [...STUDENT_ROUTE_OPTIONS, ...ADMIN_ROUTE_OPTIONS];
  return STUDENT_ROUTE_OPTIONS;
}

export default function MenuManagement() {
  const { token } = useAuth();

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [typeFilter, setTypeFilter] = useState('student');

  const [form, setForm] = useState({
    id: null,
    name: '',
    route: '',
    icon: '📄',
    type: 'student',
    status: 'active',
    menu_order: 0,
  });

  const visibleMenus = useMemo(() => {
    const items = Array.isArray(menus) ? menus : [];
    const filtered = typeFilter ? items.filter((m) => m.type === typeFilter || m.type === 'both') : items;
    return [...filtered].sort((a, b) => (Number(a.menu_order) - Number(b.menu_order)) || (Number(a.id) - Number(b.id)));
  }, [menus, typeFilter]);

  async function loadMenus() {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/menu?type=${encodeURIComponent(typeFilter)}`, { token });
      setMenus(Array.isArray(res?.menus) ? res.menus : []);
    } catch (e) {
      setError(e?.message || 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  function resetForm() {
    setForm({
      id: null,
      name: '',
      route: '',
      icon: '📄',
      type: typeFilter || 'student',
      status: 'active',
      menu_order: 0,
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      if (!form.name.trim()) {
        setError('Menu name is required');
        return;
      }

      if (form.id) {
        await apiFetch(`/api/admin/menu/${form.id}`, {
          token,
          method: 'PUT',
          body: {
            name: form.name,
            route: form.route,
            icon: form.icon,
            type: form.type,
            status: form.status,
            menu_order: Number(form.menu_order) || 0,
          },
        });
      } else {
        await apiFetch('/api/admin/menu', {
          token,
          method: 'POST',
          body: {
            name: form.name,
            route: form.route,
            icon: form.icon,
            type: form.type,
            status: form.status,
            menu_order: Number(form.menu_order) || 0,
          },
        });
      }

      resetForm();
      await loadMenus();
    } catch (e2) {
      setError(e2?.message || 'Failed to save menu');
    }
  }

  function onEdit(m) {
    setForm({
      id: m.id,
      name: m.name || '',
      route: m.route || '',
      icon: m.icon || '📄',
      type: m.type || 'student',
      status: m.status || 'active',
      menu_order: Number(m.menu_order) || 0,
    });
  }

  async function onDelete(m) {
    if (!m?.id) return;
    const ok = window.confirm(`Delete menu "${m.name}"?`);
    if (!ok) return;

    setError('');
    try {
      await apiFetch(`/api/admin/menu/${m.id}`, { token, method: 'DELETE' });
      await loadMenus();
    } catch (e) {
      setError(e?.message || 'Failed to delete menu');
    }
  }

  async function moveMenu(id, dir) {
    const list = visibleMenus;
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) return;

    const swapWith = dir === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];

    const orders = [
      { id: a.id, menu_order: Number(b.menu_order) || 0 },
      { id: b.id, menu_order: Number(a.menu_order) || 0 },
    ];

    setError('');
    try {
      await apiFetch('/api/admin/menu/reorder', { token, method: 'PUT', body: { orders } });
      await loadMenus();
    } catch (e) {
      setError(e?.message || 'Failed to reorder');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-semibold">Menu Management</h1>
            <div className="flex items-center gap-2">
              <select
                className="input"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  resetForm();
                }}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
                <option value="both">Both</option>
              </select>
              <button type="button" className="btn-ghost" onClick={() => loadMenus()}>
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">Menu name</label>
              <input
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Videos"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">Route</label>
              <select
                className="input w-full"
                value={form.route}
                onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
              >
                <option value="">Select route</option>
                {getRouteOptions(form.type).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Icon</label>
              <select
                className="input w-full"
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              >
                {ICONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">Order</label>
              <input
                type="number"
                className="input w-full"
                value={form.menu_order}
                onChange={(e) => setForm((p) => ({ ...p, menu_order: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs text-slate-600">Type</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="student">Student</option>
                <option value="admin">Admin</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600">Status</label>
              <select
                className="input w-full"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <button type="submit" className="btn-primary">
                {form.id ? 'Update' : 'Add'}
              </button>
              <button type="button" className="btn-ghost" onClick={resetForm}>
                Clear
              </button>
            </div>
          </form>

          <div className="mt-6">
            {loading ? (
              <div className="text-sm text-slate-600">Loading menus...</div>
            ) : visibleMenus.length === 0 ? (
              <div className="text-sm text-slate-600">No menus found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-600">
                      <th className="py-2 pr-4">Order</th>
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Route</th>
                      <th className="py-2 pr-4">Icon</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMenus.map((m) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-2 pr-4">{m.menu_order}</td>
                        <td className="py-2 pr-4 font-medium">{m.name}</td>
                        <td className="py-2 pr-4 text-slate-600">{m.route}</td>
                        <td className="py-2 pr-4">{m.icon}</td>
                        <td className="py-2 pr-4">{m.type}</td>
                        <td className="py-2 pr-4">{m.status}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <button type="button" className="btn-ghost" onClick={() => moveMenu(m.id, 'up')}>
                              Up
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => moveMenu(m.id, 'down')}>
                              Down
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => onEdit(m)}>
                              Edit
                            </button>
                            <button type="button" className="btn-ghost" onClick={() => onDelete(m)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

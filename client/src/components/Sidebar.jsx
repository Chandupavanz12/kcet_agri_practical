import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

function normalizeMenus(menus) {
  if (!Array.isArray(menus)) return [];
  return menus
    .filter((m) => m && (m.status === 'active' || !m.status))
    .sort((a, b) => (Number(a.menu_order || a.menuOrder || 0) - Number(b.menu_order || b.menuOrder || 0)))
    .map((m) => ({
      id: m.id,
      name: m.name,
      route: m.route,
      icon: m.icon || '📄',
      type: m.type,
      menuOrder: m.menu_order ?? m.menuOrder ?? 0,
    }));
}

function getFallbackMenus(isAdmin) {
  if (isAdmin) {
    return [
      { id: 'admin-1', name: 'Dashboard', route: '/admin/dashboard', icon: '📊' },
      { id: 'admin-2', name: 'Menu Management', route: '/admin/menu', icon: '🗂️' },
      { id: 'admin-3', name: 'Students', route: '/admin/students', icon: '👥' },
      { id: 'admin-4', name: 'Test Builder', route: '/admin/test-builder', icon: '📝' },
      { id: 'admin-5', name: 'Videos', route: '/admin/videos', icon: '🎬' },
      { id: 'admin-6', name: 'Materials', route: '/admin/materials', icon: '📚' },
      { id: 'admin-6b', name: 'Plans', route: '/admin/plans', icon: '💳' },
      { id: 'admin-6c', name: 'Payments', route: '/admin/payments', icon: '🧾' },
      { id: 'admin-7', name: 'Notifications', route: '/admin/notifications', icon: '🔔' },
      { id: 'admin-8', name: 'Results', route: '/admin/results', icon: '📈' },
      { id: 'admin-9', name: 'Settings', route: '/admin/settings', icon: '⚙️' },
      { id: 'admin-10', name: 'Logout', route: '/logout', icon: '🚪' },
    ];
  }

  return [
    { id: 'stu-1', name: 'Dashboard', route: '/student/dashboard', icon: '📊' },
    { id: 'stu-2', name: 'Mock Tests', route: '/student/tests', icon: '📝' },
    { id: 'stu-3', name: 'Progress', route: '/student/progress', icon: '📈' },
    { id: 'stu-4', name: 'Videos', route: '/student/videos', icon: '🎬' },
    { id: 'stu-5', name: 'Free Materials', route: '/student/materials/free', icon: '📚' },
    { id: 'stu-6', name: 'Premium Materials', route: '/student/materials/premium', icon: '🔒' },
    { id: 'stu-7', name: 'Premium Access', route: '/student/premium', icon: '�' },
    { id: 'stu-8', name: 'PYQs', route: '/student/pyqs', icon: '📋' },
    { id: 'stu-9', name: 'Notifications', route: '/student/notifications', icon: '🔔' },
    { id: 'stu-10', name: 'Profile', route: '/student/profile', icon: '👤' },
    { id: 'stu-11', name: 'Logout', route: '/logout', icon: '🚪' },
  ];
}

export default function Sidebar({ isOpen, onClose }) {
  const { token, user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const location = useLocation();

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        if (!token) {
          if (!alive) return;
          setMenus(getFallbackMenus(isAdmin));
          return;
        }

        if (isAdmin) {
          const res = await apiFetch('/api/admin/menu?type=admin', { token });
          if (!alive) return;
          const normalized = normalizeMenus(res?.menus);
          setMenus(normalized.length ? normalized : getFallbackMenus(true));
        } else {
          const res = await apiFetch('/api/student/menus', { token });
          if (!alive) return;
          const normalized = normalizeMenus(res?.menus);
          setMenus(normalized.length ? normalized : getFallbackMenus(false));
        }
      } catch {
        if (!alive) return;
        setMenus(getFallbackMenus(isAdmin));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, isAdmin]);

  const isActive = (route) => {
    if (!route || route === '/logout') return false;
    if (location.pathname === route) return true;
    if (route !== '/' && location.pathname.startsWith(route + '/')) return true;
    return false;
  };

  const handleClick = (m) => {
    if (m.route === '/logout' || m.name?.toLowerCase() === 'logout') {
      logout();
      navigate('/login');
      onClose?.();
      return;
    }

    const rawRoute = typeof m.route === 'string' ? m.route.trim() : '';
    const to = rawRoute;

    if (to) {
      navigate(to);
      onClose?.();
      return;
    }

    onClose?.();
  };

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} /> : null}

      <aside
        className={
          "fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200/70 bg-white/85 backdrop-blur shadow-2xl transition-transform duration-200 " +
          (isOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200/70 px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 text-sm font-bold text-white shadow">
              KA
            </div>
            <div>
              <div className="font-display text-sm font-semibold leading-tight">KCET Agri</div>
              <div className="text-xs text-slate-500 leading-tight">Navigation</div>
            </div>
          </div>
          <button type="button" className="btn-ghost lg:hidden" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-primary-50 to-accent-50 p-3">
            <div className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</div>
            <div className="text-xs text-slate-600 capitalize">{isAdmin ? 'admin' : 'student'}</div>
            <div className="mt-2 text-xs text-slate-600">
              Support:{' '}
              <a className="font-semibold" href="mailto:chandupavanz12@gmail.com">
                chandupavanz12@gmail.com
              </a>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : (
              menus.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleClick(m)}
                  className={
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all " +
                    (isActive(m.route)
                      ? "bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-800 shadow-sm"
                      : "text-slate-700 hover:bg-slate-50 hover:shadow-sm")
                  }
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 border border-slate-200/70 text-lg group-hover:shadow-sm">
                    {m.icon || '📄'}
                  </span>
                  <span className="flex-1 font-medium">{m.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

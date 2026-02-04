import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen text-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
          <div className="app-container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 text-sm font-bold text-white shadow-sm">
              KA
            </div>
            <div>
              <div className="font-display text-sm font-semibold leading-tight">KCET Agri Practical</div>
              <div className="text-xs text-slate-500 leading-tight">Student learning + mock tests</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-primary-500" />
                {user.name}
                <span className="badge-success">{user.role}</span>
              </span>
            ) : null}

            {user?.role === 'student' && (
              <Link className="btn-ghost" to="/student/dashboard">
                Dashboard
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link className="btn-ghost" to="/admin/dashboard">
                Dashboard
              </Link>
            )}

            <a className="hidden sm:inline-flex btn-ghost" href="mailto:chandupavanz12@gmail.com">
              Support
            </a>

            <button type="button" onClick={onLogout} className="btn-primary">
              Logout
            </button>
          </div>
          </div>
        </header>

        <main className="app-container py-8 page-in">{children}</main>

        <Footer />
      </div>
    </div>
  );
}

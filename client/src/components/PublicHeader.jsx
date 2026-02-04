import React from 'react';
import { Link } from 'react-router-dom';

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-white/40 bg-white/60 backdrop-blur">
      <div className="app-container flex items-center justify-between py-4">
        <Link to="/login" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-secondary-600 text-sm font-bold text-white shadow-sm">
            KA
          </div>
          <div>
            <div className="font-display text-sm font-semibold leading-tight text-slate-900">KCET Agri Practical</div>
            <div className="text-xs text-slate-600 leading-tight">Modern learning platform</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link className="btn-ghost" to="/login">
            Login
          </Link>
          <Link className="btn-primary" to="/register">
            Register
          </Link>
          <a className="hidden sm:inline-flex btn-ghost" href="mailto:chandupavanz12@gmail.com">
            Support
          </a>
        </div>
      </div>
    </header>
  );
}

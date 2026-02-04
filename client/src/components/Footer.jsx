import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="app-container py-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="font-display text-base font-semibold text-slate-900">KCET Agri Practical</div>
            <div className="mt-2 text-sm text-slate-600">
              Student-friendly preparation platform for Agriculture practical learning, materials, videos and mock tests.
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Quick Links</div>
            <div className="mt-2 grid gap-2 text-sm">
              <Link to="/student/about" className="text-slate-700 hover:text-primary-800">
                About
              </Link>
              <Link to="/student/faq" className="text-slate-700 hover:text-primary-800">
                FAQ
              </Link>
              <a className="text-slate-700 hover:text-primary-800" href="mailto:chandupavanz12@gmail.com">
                Contact / Support
              </a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-slate-900">Support</div>
            <div className="mt-2 text-sm text-slate-700">
              Email:
              <a className="ml-2 font-semibold text-primary-800" href="mailto:chandupavanz12@gmail.com">
                chandupavanz12@gmail.com
              </a>
            </div>
            <div className="mt-2 text-xs text-slate-500">We usually respond within 24 hours.</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-200/70 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} KCET Agri Practical. All rights reserved.</div>
          <div className="text-slate-500">Built for students • Clean • Fast • Secure</div>
        </div>
      </div>
    </footer>
  );
}

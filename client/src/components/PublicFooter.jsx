import React from 'react';

export default function PublicFooter() {
  return (
    <footer className="mt-10 border-t border-white/40 bg-white/60 backdrop-blur">
      <div className="app-container py-6">
        <div className="flex flex-col gap-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-medium">Need help?</div>
          <div>
            Contact:{' '}
            <a className="font-semibold text-primary-800" href="mailto:chandupavanz12@gmail.com">
              chandupavanz12@gmail.com
            </a>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">© {new Date().getFullYear()} KCET Agri Practical</div>
      </div>
    </footer>
  );
}

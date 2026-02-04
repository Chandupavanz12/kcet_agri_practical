import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-primary-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <Link className="mt-3 inline-block text-primary-700 hover:underline" to="/login">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

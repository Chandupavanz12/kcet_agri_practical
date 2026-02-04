import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function PrivateRoute({ role, children }) {
  const { token, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-50 text-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 shadow">Loading...</div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

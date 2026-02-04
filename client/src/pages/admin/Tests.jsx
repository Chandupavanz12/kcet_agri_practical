import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Tests() {
  const { token } = useAuth();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/tests', { token });
        setTests(res.tests || []);
      } catch (err) {
        setError(err?.message || 'Failed to load tests');
      }
    })();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tests</h2>
            <Link to="/admin/tests/builder" className="btn-primary text-xs">
              Add Test (Builder)
            </Link>
          </div>
        </div>
        <div className="card-body">
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <div className="space-y-3">
            {tests.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-slate-500">Questions: {t.questionCount} • {t.perQuestionSeconds}s • +{t.marksCorrect}</div>
                </div>
                <span className={`badge ${t.isActive ? 'badge-success' : ''}`}>{t.isActive ? 'active' : 'inactive'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

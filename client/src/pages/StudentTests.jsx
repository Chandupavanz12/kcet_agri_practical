import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentTests() {
  const { token } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/tests', { token });
        if (!alive) return;
        setTests(Array.isArray(res?.tests) ? res.tests : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load tests');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse overflow-hidden">
          <div className="card-body">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-64 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-28 rounded bg-slate-200" />
                <div className="mt-4 h-9 w-full rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-accent-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold">Mock Tests</h1>
              <div className="mt-1 text-sm text-slate-700">Timed practice to boost your speed and accuracy.</div>
            </div>
            <span className="badge">📝 Practice</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {tests.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-700">
              No tests available.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tests.map((t) => (
                <div key={t.id} className="card overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
                  <div className="card-body">
                    <h3 className="font-semibold text-slate-900">{t.title}</h3>
                    <div className="mt-2 text-sm text-slate-700">
                      {t.questionCount || t.question_count || 0} questions
                    </div>
                    <div className="mt-4">
                      <Link to={`/student/mock-test/${t.id}`} className="btn-primary w-full text-center">
                        Start Test
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

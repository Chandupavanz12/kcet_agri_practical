import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentProgress() {
  const { token } = useAuth();

  const [results, setResults] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const [res1, res2] = await Promise.all([
          apiFetch('/api/student/results', { token }),
          apiFetch('/api/student/progress', { token }),
        ]);
        if (!alive) return;
        setResults(Array.isArray(res1?.results) ? res1.results : []);
        setPoints(Array.isArray(res2?.points) ? res2.points : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load progress');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const summary = useMemo(() => {
    const attended = results.length;
    const avgAccuracy = attended
      ? Math.round((results.reduce((acc, r) => acc + Number(r.accuracy || 0), 0) / attended) * 100) / 100
      : 0;

    return { attended, avgAccuracy };
  }, [results]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-48 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-8 w-16 rounded bg-slate-200" />
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
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-secondary-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-xl font-semibold">Progress</h1>
              <div className="mt-1 text-sm text-slate-700">Track your results and improve your accuracy.</div>
            </div>
            <span className="badge">📈 Analytics</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
          <div className="card-body">
            <div className="text-sm text-slate-700">Tests attended</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.attended}</div>
          </div>
        </div>
        <div className="card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-accent-400 to-primary-500" />
          <div className="card-body">
            <div className="text-sm text-slate-700">Average accuracy (%)</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{summary.avgAccuracy}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h1 className="font-display text-lg font-semibold">Results</h1>
        </div>
        <div className="card-body">
          {results.length === 0 ? (
            <div className="text-sm text-slate-600">No results yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-700 border-b bg-slate-50/70">
                    <th className="py-2 pr-4">Test</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Accuracy (%)</th>
                    <th className="py-2 pr-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-slate-900">{r.testTitle}</td>
                      <td className="py-2 pr-4">{r.score}</td>
                      <td className="py-2 pr-4">{Number(r.accuracy || 0)}</td>
                      <td className="py-2 pr-4">{new Date(r.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-display text-lg font-semibold">Recent progress points</h2>
        </div>
        <div className="card-body">
          {points.length === 0 ? (
            <div className="text-sm text-slate-600">No progress points yet.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {points.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">{new Date(p.date).toLocaleString()}</div>
                  <div className="mt-1 text-sm">Score: <span className="font-semibold">{p.score}</span></div>
                  <div className="text-sm">Accuracy: <span className="font-semibold">{p.accuracy}%</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

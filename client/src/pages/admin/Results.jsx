import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Results() {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [testId, setTestId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/tests', { token });
        setTests(res.tests || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = testId ? `/api/admin/results?testId=${encodeURIComponent(testId)}` : '/api/admin/results';
        const res = await apiFetch(url, { token });
        setResults(res.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, testId]);

  const handleExportCsv = async () => {
    try {
      const endpointUrl = testId
        ? `/api/admin/results/export.csv?testId=${encodeURIComponent(testId)}`
        : '/api/admin/results/export.csv';
      const res = await apiFetch(endpointUrl, { token });
      const blob = new Blob([res], { type: 'text/csv' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'results.csv';
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Failed to export');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-secondary-50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">Results</h2>
              <div className="mt-1 text-sm text-slate-700">View rankings and export results.</div>
            </div>
            <button onClick={handleExportCsv} className="btn-primary text-xs">
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Test (for ranks)</label>
              <select className="input" value={testId} onChange={(e) => setTestId(e.target.value)}>
                <option value="">All tests (latest results)</option>
                {tests.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-slate-600">
                {testId ? 'Showing ranks by score (tie-break: less time)' : 'Select a test to view ranks'}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-600">Loading...</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200/70 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50/70 text-slate-700">
                    {testId ? <th className="text-left py-2">Rank</th> : null}
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Student</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Test</th>
                    <th className="text-left py-2">Score</th>
                    <th className="text-left py-2">Accuracy</th>
                    <th className="text-left py-2">Time (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      {testId ? <td className="py-3 font-semibold">{r.rank ?? ''}</td> : null}
                      <td className="py-3">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="py-2">{r.student_name}</td>
                      <td className="py-2">{r.student_email}</td>
                      <td className="py-2">{r.test_title}</td>
                      <td className="py-2">{r.score}</td>
                      <td className="py-2">{r.accuracy}%</td>
                      <td className="py-2">{r.time_taken_sec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

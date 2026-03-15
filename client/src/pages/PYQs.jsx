import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function PYQs() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [centres, setCentres] = useState([]);
  const [years, setYears] = useState([]);
  const [pyqs, setPyqs] = useState([]);

  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedPyq, setSelectedPyq] = useState(null);

  const [pdfBlobUrl, setPdfBlobUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingPyqs, setLoadingPyqs] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    (async () => {
      try {
        setError('');
        setLoading(true);
        const res = await apiFetch('/api/student/exam-centres', { token });
        setCentres(Array.isArray(res?.centres) ? res.centres : []);
      } catch (err) {
        setError(err?.message || 'Failed to load exam centres');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!selectedCentreId) {
      setYears([]);
      setSelectedYear('');
      setPyqs([]);
      setSelectedPyq(null);
      return;
    }

    (async () => {
      try {
        setError('');
        setLoadingYears(true);
        setYears([]);
        setSelectedYear('');
        setPyqs([]);
        setSelectedPyq(null);
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
          setPdfBlobUrl('');
        }

        const res = await apiFetch(`/api/student/exam-centres/${selectedCentreId}/years`, { token });
        setYears(Array.isArray(res?.years) ? res.years : []);
      } catch (err) {
        setError(err?.message || 'Failed to load years');
      } finally {
        setLoadingYears(false);
      }
    })();
  }, [selectedCentreId, token]);

  useEffect(() => {
    if (!selectedCentreId || !selectedYear) {
      setPyqs([]);
      setSelectedPyq(null);
      return;
    }

    (async () => {
      try {
        setError('');
        setLoadingPyqs(true);
        setPyqs([]);
        setSelectedPyq(null);
        if (pdfBlobUrl) {
          URL.revokeObjectURL(pdfBlobUrl);
          setPdfBlobUrl('');
        }

        const qs = new URLSearchParams({ centreId: selectedCentreId, year: selectedYear });
        const res = await apiFetch(`/api/student/pyqs/by-centre-year?${qs.toString()}`, { token });
        setPyqs(Array.isArray(res?.pyqs) ? res.pyqs : []);
      } catch (err) {
        setError(err?.message || 'Failed to load PYQs');
      } finally {
        setLoadingPyqs(false);
      }
    })();
  }, [selectedCentreId, selectedYear, token]);

  const openPyq = async (p) => {
    try {
      if (p?.locked) {
        setError('Premium access required');
        navigate('/student/premium');
        return;
      }
      setError('');
      setLoadingPdf(true);
      setSelectedPyq(p);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl('');
      }

      const res = await fetch(`${apiBaseUrl}/api/student/pyqs/${p.id}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to load PDF (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      setError(err?.message || 'Failed to load PDF');
      setSelectedPyq(null);
    } finally {
      setLoadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-48 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="mt-2 h-3 w-24 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="card shadow-md">
        <div className="card-body">
          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div>
            <div className="label">Exam Centre</div>
            <select
              className="input"
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
            >
              <option value="">Select centre</option>
              {centres.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
            {loadingYears ? <div className="mt-2 text-xs text-slate-600">Loading years...</div> : null}
          </div>

          {selectedPyq && pdfBlobUrl ? (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{selectedPyq.title}</div>
                  <div className="text-xs text-slate-600">{selectedPyq.subject} • {selectedPyq.year}</div>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setSelectedPyq(null);
                    if (pdfBlobUrl) {
                      URL.revokeObjectURL(pdfBlobUrl);
                      setPdfBlobUrl('');
                    }
                  }}
                >
                  Back
                </button>
              </div>

              <div
                className="overflow-hidden rounded-xl border border-slate-200"
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && ['p', 's'].includes(String(e.key || '').toLowerCase())) {
                    e.preventDefault();
                  }
                }}
                tabIndex={0}
              >
                {loadingPdf ? (
                  <div className="p-4 text-sm text-slate-600">Loading PDF...</div>
                ) : (
                  <iframe
                    title="PYQ PDF Viewer"
                    src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="h-[80vh] w-full bg-white"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {!selectedCentreId ? (
                <div className="text-sm text-slate-600">Select an exam centre to view PYQs.</div>
              ) : !selectedYear ? (
                <div>
                  <div className="text-sm font-semibold">Available Years</div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {years.map((y) => (
                      <button
                        key={y.id}
                        type="button"
                        onClick={() => setSelectedYear(String(y.year))}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200 text-left"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-0 transition-opacity group-hover:opacity-100" />
                        <div className="relative z-10">
                          <div className="text-2xl font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{y.year}</div>
                          <div className="mt-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">View Papers →</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {!loadingYears && years.length === 0 ? (
                    <div className="mt-3 text-sm text-slate-600">No years available for this centre.</div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Year {selectedYear}</div>
                      {loadingPyqs ? <div className="mt-1 text-xs text-slate-600">Loading papers...</div> : null}
                    </div>
                    <button type="button" className="btn-ghost" onClick={() => setSelectedYear('')}>
                      Back to years
                    </button>
                  </div>

                  {pyqs.length === 0 && !loadingPyqs ? (
                    <div className="text-sm text-slate-600">No PYQs found for {selectedYear}.</div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {pyqs.map((p) => (
                        <div key={p.id} className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-indigo-200 p-5">
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <h3 className="text-base font-bold text-slate-800 leading-snug">{p.title}</h3>
                              {String(p.accessType || '').toLowerCase() === 'paid' ? (
                                p.locked ? (
                                  <span className="badge badge-warning text-[10px] px-2 py-0.5 whitespace-nowrap bg-amber-100 text-amber-700 font-bold rounded">⭐ Premium</span>
                                ) : (
                                  <span className="badge badge-info text-[10px] px-2 py-0.5 whitespace-nowrap bg-blue-100 text-blue-700 font-bold rounded">Unlocked</span>
                                )
                              ) : (
                                <span className="badge badge-success text-[10px] px-2 py-0.5 whitespace-nowrap bg-emerald-100 text-emerald-700 font-bold rounded">Free</span>
                              )}
                            </div>
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{p.subject} • {p.year}</div>
                          </div>

                          <div className="mt-5">
                            {p.locked ? (
                              <button type="button" onClick={() => navigate('/student/premium')} className="btn-primary text-xs w-full text-center justify-center flex bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-none text-white shadow" disabled={loadingPdf}>
                                Unlock
                              </button>
                            ) : (
                              <button type="button" onClick={() => openPyq(p)} className="btn-primary text-xs w-full text-center justify-center flex bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-none text-white shadow" disabled={loadingPdf}>
                                View Document
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentDashboardNew() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const toFileUrl = (u) => {
    const url = String(u || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const openProtectedFile = async (fileUrl) => {
    const absoluteUrl = toFileUrl(fileUrl);
    if (!absoluteUrl) return;
    if (!token) {
      setError('Please login again');
      return;
    }

    try {
      setError('');
      const res = await fetch(absoluteUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to open file (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      setError(e?.message || 'Failed to open file');
    }
  };

  useEffect(() => {
    let alive = true;

    const loadDashboard = async () => {
      try {
        setError('');
        setLoading(true);
        // Step 1 (fast): load notifications first so the page can render quickly.
        const notificationsRes = await apiFetch('/api/student/notifications', { token });
        if (!alive) return;

        setData({
          settings: { testsEnabled: true, videosEnabled: true, notificationsEnabled: true, pdfsEnabled: true, pyqsEnabled: true },
          premiumPlans: [],
          premiumStatus: {
            comboActive: false,
            pyqActive: false,
            materialActive: false,
            comboExpiry: null,
            pyqExpiry: null,
            materialExpiry: null,
          },
          videos: [],
          notifications: Array.isArray(notificationsRes?.notifications) ? notificationsRes.notifications : [],
          tests: [],
          pdfs: [],
          pyqs: [],
        });
        setLoading(false);

        // Step 2 (background): load the remaining dashboard data.
        const [plansRes, statusRes, videosRes, testsRes, pdfsRes] = await Promise.all([
          apiFetch('/api/student/premium/plans', { token }),
          apiFetch('/api/student/premium/status', { token }),
          apiFetch('/api/student/videos', { token }),
          apiFetch('/api/student/tests', { token }),
          apiFetch('/api/student/materials?type=pdf', { token }),
        ]);

        if (!alive) return;

        const premiumPlans = Array.isArray(plansRes?.plans) ? plansRes.plans : [];
        const premiumStatus = statusRes?.access
          ? {
            comboActive: Boolean(statusRes.access?.combo?.unlocked),
            pyqActive: Boolean(statusRes.access?.pyq?.unlocked),
            materialActive: Boolean(statusRes.access?.materials?.unlocked),
            comboExpiry: statusRes.access?.combo?.expiry || null,
            pyqExpiry: statusRes.access?.pyq?.expiry || null,
            materialExpiry: statusRes.access?.materials?.expiry || null,
          }
          : {
            comboActive: false,
            pyqActive: false,
            materialActive: false,
            comboExpiry: null,
            pyqExpiry: null,
            materialExpiry: null,
          };

        setData((prev) => ({
          ...(prev || {}),
          premiumPlans,
          premiumStatus,
          videos: Array.isArray(videosRes?.videos) ? videosRes.videos : [],
          tests: Array.isArray(testsRes?.tests) ? testsRes.tests : [],
          pdfs: Array.isArray(pdfsRes?.materials) ? pdfsRes.materials : [],
        }));
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [token]);


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-32 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="mt-2 h-3 w-32 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const latestUniqueNotifications = (() => {
    const seen = new Set();
    const out = [];
    for (const n of Array.isArray(data?.notifications) ? data.notifications : []) {
      const msg = String(n?.message || '').trim();
      if (!msg) continue;
      const key = msg.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...n, message: msg });
      if (out.length >= 4) break;
    }
    return out;
  })();

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-slate-50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-slate-900 tracking-tight">Student Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600 font-medium">Welcome back, {user?.name} 👋</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge">KCET Prep</span>
              <span className="badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {latestUniqueNotifications.length ? (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Link to="/student/notifications" className="btn-ghost">View all</Link>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {latestUniqueNotifications.map((n) => (
                <div key={n.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                  {String(n?.message || '').trim()}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}



      {/* Navigation Section */}
      {null}

      {error ? (
        <div className="card">
          <div className="card-body">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      ) : null}

      {/* Mock Tests Section */}
      {data?.settings?.testsEnabled && data?.tests?.length ? (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Mock Tests</h2>
              <Link to="/student/tests" className="btn-ghost">View all</Link>
            </div>
          </div>
          <div className="card-body">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.tests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium mb-2">{test.title}</h3>
                  <div className="text-sm text-slate-600 mb-3">
                    {test.questionCount} questions • {test.perQuestionSeconds}s per question
                  </div>
                  <Link
                    to={`/student/mock-test/${test.id}`}
                    className="btn-primary w-full text-center"
                  >
                    Start Test
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Videos */}
      {data?.settings?.videosEnabled && data?.videos?.length ? (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Educational Videos</h2>
              <Link to="/student/videos" className="btn-ghost">View all</Link>
            </div>
          </div>
          <div className="card-body">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.videos.slice(0, 6).map((v) => {
                // Function to extract YouTube video ID from URL
                const extractYouTubeId = (url) => {
                  const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
                    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
                  ];

                  for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match) return match[1];
                  }
                  return null;
                };

                // Function to generate YouTube thumbnail URL with fallbacks
                const getYouTubeThumbnailUrl = (videoUrl) => {
                  const youtubeId = extractYouTubeId(videoUrl);
                  if (youtubeId) {
                    // Try different thumbnail sizes in order of preference
                    const thumbnailSizes = [
                      'maxresdefault.jpg',  // Highest quality
                      'sddefault.jpg',      // Standard definition
                      'hqdefault.jpg',      // High quality
                      'mqdefault.jpg',      // Medium quality
                      'default.jpg'         // Default quality
                    ];

                    // Return the first available size (we'll handle fallback in the img onError)
                    const thumbnailUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
                    return thumbnailUrl;
                  }
                  return null;
                };

                const thumbnailUrl = getYouTubeThumbnailUrl(v.videoUrl);

                return (
                  <div key={v.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {thumbnailUrl ? (
                      <div className="relative">
                        <img
                          src={thumbnailUrl}
                          alt={v.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            // Try fallback thumbnail sizes
                            const youtubeId = extractYouTubeId(v.videoUrl);
                            if (youtubeId) {
                              const currentSrc = e.target.src;
                              const currentSize = currentSrc.split('/').pop();

                              if (currentSize === 'hqdefault.jpg') {
                                e.target.src = `https://i.ytimg.com/vi/${youtubeId}/sddefault.jpg`;
                              } else if (currentSize === 'sddefault.jpg') {
                                e.target.src = `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
                              } else if (currentSize === 'mqdefault.jpg') {
                                e.target.src = `https://i.ytimg.com/vi/${youtubeId}/default.jpg`;
                              } else {
                                // Final fallback to placeholder
                                e.target.src = 'https://via.placeholder.com/400x225?text=Video+Thumbnail';
                              }
                            } else {
                              e.target.src = 'https://via.placeholder.com/400x225?text=Video+Thumbnail';
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-colors flex items-center justify-center">
                          <a
                            href={v.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-3 transition-colors"
                          >
                            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-slate-200 flex items-center justify-center">
                        <a
                          href={v.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white rounded-full p-3 shadow-md hover:shadow-lg transition-shadow"
                        >
                          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </a>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-base mb-1 line-clamp-2">{v.title}</h3>
                      <div className="text-sm text-slate-600 mb-2">{v.subject}</div>
                      <a
                        href={v.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Watch Video
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Latest Documents */}
      {data?.settings?.pdfsEnabled && data?.pdfs?.length ? (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Latest Documents</h2>
              <Link to="/student/materials" className="btn-ghost">View all</Link>
            </div>
          </div>
          <div className="card-body">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.pdfs.slice(0, 6).map((m) => (
                <div key={m.id} className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3
                  transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-sm font-semibold text-slate-800 truncate">{m.title}</div>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                      <span className="truncate">{m.subject}</span>
                      {m.locked ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-700 text-[10px]">⭐ Premium</span>
                      ) : String(m.accessType || '').toLowerCase() === 'paid' ? (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700 text-[10px]">Unlocked</span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 text-[10px]">Free</span>
                      )}
                    </div>
                  </div>
                  {m.locked ? (
                    <button type="button" className="shrink-0 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-md" onClick={() => window.location.href = '/student/premium'}>
                      Unlock
                    </button>
                  ) : (
                    <button type="button" className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:scale-105 hover:shadow-md" onClick={() => openProtectedFile(m.pdfUrl)}>
                      View
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Notifications */}
      {null}

      {/* Feedback Form */}
      <section className="card bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 mt-6 p-5">
        <div className="card-header pb-2">
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">💬 Student Feedback</h2>
          <p className="text-sm text-indigo-700 font-medium">Have any questions, suggestions, or found an issue? Let us know!</p>
        </div>

        <div className="card-body pt-2">
          {feedbackMessage && (
            <div className="mb-4 p-3 rounded-lg overflow-hidden relative border-l-4 border-green-500 bg-white">
              <div className="text-sm text-green-700 font-bold">{feedbackMessage}</div>
            </div>
          )}

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!feedback.trim()) return;
            try {
              setFeedbackSubmitting(true);
              const res = await apiFetch('/api/student/feedback', {
                token,
                method: 'POST',
                body: { message: feedback },
              });
              setFeedback('');
              setFeedbackMessage(res.message || 'Feedback sent successfully!');
              setTimeout(() => setFeedbackMessage(''), 5000);
            } catch (err) {
              alert(err.message || 'Failed to submit feedback');
            } finally {
              setFeedbackSubmitting(false);
            }
          }}>
            <textarea
              className="w-full text-sm rounded-xl border-indigo-200 shadow-sm focus:border-indigo-400 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 min-h-[100px] mb-3 p-3 resize-none bg-white"
              placeholder="Type your message here..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              disabled={feedbackSubmitting}
            />
            <button
              type="submit"
              disabled={feedbackSubmitting || !feedback.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {feedbackSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

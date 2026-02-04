import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentDashboardFiltered() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const toFileUrl = (u) => {
    const url = String(u || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  const activeTab = searchParams.get('tab') || 'dashboard';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/dashboard', { token });
        if (!alive) return;
        setData(res);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load dashboard');
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
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-32 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map((i) => (
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card overflow-hidden">
        <div className="card-body bg-gradient-to-r from-primary-50 via-white to-slate-50">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold capitalize">
                {activeTab === 'dashboard' ? 'Student Dashboard' : 
                 activeTab === 'videos' ? 'Learning Videos' :
                 activeTab === 'tests' ? 'Mock Tests' :
                 activeTab === 'materials' ? 'Study Materials' :
                 activeTab === 'notifications' ? 'Notifications' : 'Student Dashboard'}
              </h1>
              <p className="mt-1 text-sm text-slate-600">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge">KCET Prep</span>
              <span className="badge-success">Active</span>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card">
          <div className="card-body">
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      ) : null}

      {/* Filtered Content */}
      {activeTab === 'dashboard' && (
        <>
          {/* Notifications */}
          {data?.settings?.notificationsEnabled && data?.notifications?.length ? (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">📢 Latest Updates</h2>
              </div>
              <div className="card-body space-y-3">
                {data.notifications.map((n) => (
                  <div key={n.id} className="rounded-xl border border-slate-200 bg-primary-50 p-3">
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="mt-1 text-sm text-slate-700">{n.message}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

        </>
      )}

      {activeTab === 'videos' && data?.settings?.videosEnabled && data?.videos?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">🎬 Learning Videos</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.videos.map((v) => {
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
                              <path d="M8 5v14l11-7z"/>
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
                            <path d="M8 5v14l11-7z"/>
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
                          <path d="M8 5v14l11-7z"/>
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
      ) : activeTab === 'videos' && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="text-2xl mb-2">🎬</div>
            <div className="text-lg font-medium text-slate-900">No videos available</div>
            <div className="text-sm text-slate-600">Check back later for new learning videos</div>
          </div>
        </div>
      )}

      {activeTab === 'tests' && data?.settings?.testsEnabled && data?.tests?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">📝 Mock Tests</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.tests.map((test) => (
                <div key={test.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium mb-2">{test.title}</h3>
                  <div className="text-sm text-slate-600 mb-3">
                    {test.questionCount} questions • {test.perQuestionSeconds}s per question
                  </div>
                  <a
                    href={`/student/mock-test/${test.id}`}
                    className="btn-primary w-full text-center"
                  >
                    Start Test
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'tests' && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-lg font-medium text-slate-900">No tests available</div>
            <div className="text-sm text-slate-600">Check back later for new mock tests</div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && data?.settings?.pdfsEnabled && data?.materials?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">📚 Study Materials</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.materials.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-slate-500">{m.subject}</div>
                  </div>
                  <a
                    href={toFileUrl(m.pdfUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'materials' && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-lg font-medium text-slate-900">No materials available</div>
            <div className="text-sm text-slate-600">Check back later for new study materials</div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && data?.settings?.notificationsEnabled && data?.notifications?.length ? (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">🔔 Notifications</h2>
          </div>
          <div className="card-body space-y-3">
            {data.notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-slate-200 bg-primary-50 p-3">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="mt-1 text-sm text-slate-700">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'notifications' && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="text-2xl mb-2">🔔</div>
            <div className="text-lg font-medium text-slate-900">No notifications</div>
            <div className="text-sm text-slate-600">You're all caught up!</div>
          </div>
        </div>
      )}
    </div>
  );
}

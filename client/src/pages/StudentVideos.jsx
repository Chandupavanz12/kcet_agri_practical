import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentVideos() {
  const { token } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/videos', { token });
        if (!alive) return;
        setVideos(Array.isArray(res?.videos) ? res.videos : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load videos');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const extractYouTubeId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = String(url || '').match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getThumb = (url) => {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="card animate-pulse">
          <div className="card-body">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse overflow-hidden">
              <div className="h-40 bg-slate-200" />
              <div className="card-body">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-24 rounded bg-slate-200" />
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
              <h1 className="font-display text-xl font-semibold">Videos</h1>
              <div className="mt-1 text-sm text-slate-700">Short lessons to revise concepts quickly.</div>
            </div>
            <span className="badge">🎬 Learn</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {videos.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 text-sm text-slate-700">
              No videos available.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => {
                const thumb = getThumb(v.videoUrl);
                return (
                  <div key={v.id} className="card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-secondary-500 to-primary-500" />
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={v.title}
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400x225?text=Video';
                        }}
                      />
                    ) : (
                      <div className="w-full h-44 bg-slate-200" />
                    )}
                    <div className="card-body">
                      <div className="font-semibold line-clamp-2 text-slate-900">{v.title}</div>
                      <div className="mt-1 text-sm text-slate-700">{v.subject}</div>
                      <a
                        className="mt-3 inline-flex items-center gap-2 text-sm text-secondary-700 hover:text-secondary-800 font-semibold"
                        href={v.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Watch
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

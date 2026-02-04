import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';

export default function StudentMenuResources() {
  const { token } = useAuth();
  const { menuId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch(`/api/student/menu/${encodeURIComponent(menuId)}`, { token });
        if (!alive) return;
        setData(res);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, menuId]);

  const title = data?.menu?.name || 'Resources';

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Loading...</div>
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

  if (!data?.menu) {
    return (
      <div className="card">
        <div className="card-body">Not found.</div>
      </div>
    );
  }

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = String(url).match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-semibold">{title}</h1>
            <Link to="/student/dashboard" className="btn-ghost">Back</Link>
          </div>
        </div>
        <div className="card-body">
          {data.resourceType === 'video' ? (
            (data?.videos || []).length === 0 ? (
              <div className="text-sm text-slate-600">No videos available.</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.videos.map((v) => {
                  const videoId = extractYouTubeId(v.videoUrl);
                  return (
                    <div key={v.id} className="border rounded-lg overflow-hidden">
                      {videoId ? (
                        <iframe
                          className="w-full aspect-video"
                          src={`https://www.youtube.com/embed/${videoId}`}
                          title={v.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="p-4 text-sm text-slate-600">Video preview not available.</div>
                      )}
                      <div className="p-4">
                        <div className="font-medium">{v.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{v.subject || 'General'}</div>
                        <a
                          className="btn-primary mt-3 inline-block"
                          href={v.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : data.resourceType === 'pdf' ? (
            (data?.pdfs || []).length === 0 ? (
              <div className="text-sm text-slate-600">No documents available.</div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.pdfs.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-slate-500">{p.subject || 'General'}</div>
                    </div>
                    <a
                      href={p.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary text-xs"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-sm text-slate-600">This menu is a link type and has no resources.</div>
          )}
        </div>
      </div>
    </div>
  );
}

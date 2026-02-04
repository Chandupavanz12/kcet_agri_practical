import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

// Function to extract YouTube video ID from URL
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Function to generate YouTube thumbnail URL
function getYouTubeThumbnailUrl(videoUrl) {
  const youtubeId = extractYouTubeId(videoUrl);
  if (youtubeId) {
    // Use hqdefault.jpg as it's more reliable than maxresdefault.jpg
    const thumbnailUrl = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
    console.log('[VideosNew] Generated thumbnail URL:', thumbnailUrl);
    return thumbnailUrl;
  }
  return null;
}

export default function Videos() {
  const { token } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    videoUrl: '',
    subject: 'General',
    status: 'active',
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/videos', { token });
      setVideos(res.videos || []);
    } catch (err) {
      setError(err?.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      videoUrl: '',
      subject: 'General',
      status: 'active',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiFetch(`/api/admin/videos/${editingId}`, {
          token,
          method: 'PUT',
          body: form,
        });
      } else {
        await apiFetch('/api/admin/videos', {
          token,
          method: 'POST',
          body: form,
        });
      }
      resetForm();
      fetchVideos();
    } catch (err) {
      setError(err?.message || 'Failed to save video');
    }
  };

  const handleEdit = (video) => {
    setForm({
      title: video.title,
      videoUrl: video.videoUrl,
      subject: video.subject,
      status: video.status,
    });
    setEditingId(video.id);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    try {
      await apiFetch(`/api/admin/videos/${id}`, {
        token,
        method: 'DELETE',
      });
      fetchVideos();
    } catch (err) {
      setError(err?.message || 'Failed to delete video');
    }
  };

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
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">
            {editingId ? 'Edit Video' : 'Add New Video'}
          </h2>
        </div>
        <div className="card-body">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="label">Video Title</div>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter video title"
                required
              />
            </div>
            <div>
              <div className="label">Video URL</div>
              <input
                className="input"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
              {form.videoUrl && extractYouTubeId(form.videoUrl) && (
                <div className="mt-2 text-xs text-green-600">
                  ✓ YouTube video detected - thumbnail will be generated automatically
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="label">Subject</div>
                <select
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                >
                  <option value="General">General</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Biology">Biology</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Physics">Physics</option>
                  <option value="Mathematics">Mathematics</option>
                </select>
              </div>
              <div>
                <div className="label">Status</div>
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Update Video' : 'Add Video'}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="btn-ghost">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Videos ({videos.length})</h2>
        </div>
        <div className="card-body">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-lg">No videos found</div>
              <div className="text-sm">Add your first video using the form above</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => {
                const thumbnailUrl = getYouTubeThumbnailUrl(video.videoUrl);
                console.log('[VideosNew] Processing video:', video.title);
                console.log('[VideosNew] Video URL:', video.videoUrl);
                console.log('[VideosNew] Generated thumbnail URL:', thumbnailUrl);
                return (
                  <div key={video.id} className="border rounded-lg overflow-hidden">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={video.title}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          // Try fallback thumbnail sizes
                          const youtubeId = extractYouTubeId(video.videoUrl);
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
                              // Final fallback - hide image
                              e.target.style.display = 'none';
                            }
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-40 bg-slate-200 flex items-center justify-center">
                        <div className="text-slate-500 text-sm">No thumbnail available</div>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-medium text-sm mb-1">{video.title}</h3>
                      <div className="text-xs text-slate-600 mb-2">{video.subject}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          video.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {video.status}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(video)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(video.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
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

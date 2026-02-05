import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../lib/api.js';
import { Link } from 'react-router-dom';
import TopMenu from '../components/TopMenu.jsx';

export default function MainDashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data based on user role
      const endpoint = user.role === 'admin' ? '/api/admin/dashboard' : '/api/student/dashboard';
      const res = await apiFetch(endpoint, { token });
      setData(res);
      
      // Fetch recent activity/notifications
      await fetchRecentActivity();
      
    } catch (err) {
      console.error('[MainDashboard] Error fetching dashboard data:', err);
      setError(err?.message || 'Failed to load dashboard');
      
      // Set default data to prevent complete failure
      setData({
        students: { count: 0 },
        tests: { count: 0 },
        videos: { count: 0 },
        materials: { count: 0 },
        tests: [],
        videos: [],
        materials: [],
        notifications: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // For students, get recent test results and new materials
      if (user.role === 'student') {
        const [resultsRes, materialsRes, videosRes] = await Promise.all([
          apiFetch('/api/student/results?limit=5', { token }),
          apiFetch('/api/student/materials?type=pdf', { token }),
          apiFetch('/api/student/videos', { token }),
        ]);
        
        const activities = [];
        
        // Add recent test results
        if (resultsRes.results) {
          resultsRes.results.slice(0, 3).forEach(result => {
            activities.push({
              type: 'test_result',
              title: `Test completed: ${result.testTitle}`,
              description: `Score: ${result.score} out of ${result.outOf}`,
              time: new Date(result.date),
              icon: '📝',
              link: `/student/mock-test/result?testId=${result.testId}`
            });
          });
        }
        
        // Add new materials
        if (materialsRes.materials) {
          materialsRes.materials.slice(0, 2).forEach(pdf => {
            activities.push({
              type: 'new_material',
              title: `New study material: ${pdf.title}`,
              description: `Subject: ${pdf.subject}`,
              time: new Date(pdf.createdAt || Date.now()),
              icon: '📚',
              link: `/student/materials`
            });
          });
        }
        
        // Add new videos
        if (videosRes.videos) {
          videosRes.videos.slice(0, 2).forEach(video => {
            activities.push({
              type: 'new_video',
              title: `New video: ${video.title}`,
              description: `Subject: ${video.subject}`,
              time: new Date(video.createdAt || Date.now()),
              icon: '🎬',
              link: video.videoUrl
            });
          });
        }
        
        // Sort by time (most recent first)
        activities.sort((a, b) => b.time - a.time);
        setRecentActivity(activities.slice(0, 5));
      }
      
      // For admins, get recent updates
      if (user.role === 'admin') {
        const [testsRes, videosRes, studentsRes] = await Promise.all([
          apiFetch('/api/admin/tests', { token }),
          apiFetch('/api/admin/videos', { token }),
          apiFetch('/api/admin/students', { token })
        ]);
        
        const activities = [];
        
        // Add recent tests
        if (testsRes.tests) {
          testsRes.tests.slice(0, 2).forEach(test => {
            activities.push({
              type: 'new_test',
              title: `New test created: ${test.title}`,
              description: `${test.questionCount} questions`,
              time: new Date(test.createdAt || Date.now()),
              icon: '📋',
              link: `/admin/test-builder`
            });
          });
        }
        
        // Add recent videos
        if (videosRes.videos) {
          videosRes.videos.slice(0, 2).forEach(video => {
            activities.push({
              type: 'new_video',
              title: `New video added: ${video.title}`,
              description: `Subject: ${video.subject}`,
              time: new Date(video.createdAt || Date.now()),
              icon: '🎬',
              link: `/admin/videos`
            });
          });
        }
        
        // Add recent students
        if (studentsRes.students) {
          studentsRes.students.slice(0, 2).forEach(student => {
            activities.push({
              type: 'new_student',
              title: `New student registered: ${student.name}`,
              description: student.email,
              time: new Date(student.createdAt || Date.now()),
              icon: '👤',
              link: `/admin/students`
            });
          });
        }
        
        // Sort by time (most recent first)
        activities.sort((a, b) => b.time - a.time);
        setRecentActivity(activities.slice(0, 5));
      }
      
    } catch (err) {
      console.error('Failed to fetch recent activity:', err);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button onClick={fetchDashboardData} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Menu Navigation */}
      <TopMenu />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {user.role === 'admin' ? 'Admin Dashboard' : 'Student Dashboard'}
          </h1>
          <p className="text-slate-600">
            Welcome back, {user.name}! Here's what's new today.
          </p>
        </div>
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {user.role === 'admin' ? (
              <>
                <Link to="/admin/test-builder" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="font-medium">Create Test</div>
                    <div className="text-sm text-slate-600">Build new mock tests</div>
                  </div>
                </Link>
                <Link to="/admin/videos" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">🎬</div>
                    <div className="font-medium">Add Video</div>
                    <div className="text-sm text-slate-600">Upload educational videos</div>
                  </div>
                </Link>
                <Link to="/admin/materials" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">📚</div>
                    <div className="font-medium">Study Materials</div>
                    <div className="text-sm text-slate-600">Manage PDFs and notes</div>
                  </div>
                </Link>
                <Link to="/admin/students" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="font-medium">Students</div>
                    <div className="text-sm text-slate-600">Manage student accounts</div>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <Link to="/student/dashboard" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">📚</div>
                    <div className="font-medium">Study Materials</div>
                    <div className="text-sm text-slate-600">Access all resources</div>
                  </div>
                </Link>
                <Link to="/student/tests" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">📝</div>
                    <div className="font-medium">Take Test</div>
                    <div className="text-sm text-slate-600">Practice mock tests</div>
                  </div>
                </Link>
                <Link to="/student/results" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="font-medium">View Results</div>
                    <div className="text-sm text-slate-600">Check your progress</div>
                  </div>
                </Link>
                <Link to="/profile" className="card hover:shadow-md transition-shadow cursor-pointer">
                  <div className="card-body text-center">
                    <div className="text-3xl mb-2">👤</div>
                    <div className="font-medium">Profile</div>
                    <div className="text-sm text-slate-600">Update your info</div>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold">Recent Activity</h2>
              </div>
              <div className="card-body">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="text-lg">No recent activity</div>
                    <div className="text-sm">Check back later for updates</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <Link
                        key={index}
                        to={activity.link}
                        className="block p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">{activity.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900">{activity.title}</div>
                            <div className="text-sm text-slate-600">{activity.description}</div>
                            <div className="text-xs text-slate-500 mt-1">{formatTimeAgo(activity.time)}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-6">
            {user.role === 'admin' ? (
              <>
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-semibold">Statistics</h3>
                  </div>
                  <div className="card-body space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Students</span>
                      <span className="font-semibold">{data?.students?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Active Tests</span>
                      <span className="font-semibold">{data?.tests?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Videos</span>
                      <span className="font-semibold">{data?.videos?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Materials</span>
                      <span className="font-semibold">{data?.materials?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="card">
                  <div className="card-header">
                    <h3 className="font-semibold">Your Progress</h3>
                  </div>
                  <div className="card-body space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Tests Taken</span>
                      <span className="font-semibold">{data?.results?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Average Score</span>
                      <span className="font-semibold">
                        {data?.results?.length > 0 
                          ? Math.round(data.results.reduce((acc, r) => acc + (r.score / r.outOf * 100), 0) / data.results.length) + '%'
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Materials Studied</span>
                      <span className="font-semibold">{data?.materials?.length || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Videos Watched</span>
                      <span className="font-semibold">{data?.videos?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

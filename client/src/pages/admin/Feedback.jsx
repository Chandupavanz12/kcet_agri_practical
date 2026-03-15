import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function AdminFeedback() {
    const { token } = useAuth();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const fetchFeedbacks = async () => {
        try {
            setLoading(true);
            const res = await apiFetch('/api/admin/feedback', { token });
            setFeedbacks(res?.feedbacks || []);
        } catch (err) {
            setMessage(err?.message || 'Failed to fetch feedbacks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks();
    }, [token]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this feedback message?')) return;
        try {
            await apiFetch(`/api/admin/feedback/${id}`, {
                token,
                method: 'DELETE',
            });
            fetchFeedbacks();
        } catch (err) {
            alert('Failed to delete: ' + err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="card overflow-hidden">
                <div className="card-body bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 p-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">💬 Student Feedbacks & Messages</h2>
                        <div className="mt-1 text-blue-100 font-medium">View and manage messages sent from the student dashboard.</div>
                    </div>
                </div>
            </div>

            {message && (
                <div className="card border-0 shadow-sm">
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 font-medium rounded-xl">
                        {message}
                    </div>
                </div>
            )}

            <div className="card border-0 shadow-sm">
                <div className="card-header bg-slate-50 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-700">All Messages</h3>
                </div>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 font-medium">Loading messages...</div>
                    ) : feedbacks.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 font-medium">No feedbacks or messages available.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {feedbacks.map(f => (
                                <div key={f.id} className="p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-800 text-lg">{f.user_name}</div>
                                            <div className="text-indigo-600 text-sm font-medium">{f.user_email}</div>
                                            <div className="text-xs text-slate-400 mt-1">{new Date(f.created_at).toLocaleString()}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(f.id)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-md shadow-sm transition-colors text-xs font-bold"
                                        >
                                            Delete Message
                                        </button>
                                    </div>
                                    <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg shadow-inner text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                                        {f.message}
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

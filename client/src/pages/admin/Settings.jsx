import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Settings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/settings', { token });
        setSettings(res.settings);
      } catch (err) {
        setMessage(err?.message || 'Failed to load settings');
      }
    })();
  }, [token]);

  const handleChange = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await apiFetch('/api/admin/settings', {
        token,
        method: 'PUT',
        body: settings,
      });
      setMessage('Settings saved');
    } catch (err) {
      setMessage(err?.message || 'Failed to save');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Feature Settings</h2>
        </div>
        <div className="card-body space-y-4">
          {message && (
            <div className="rounded-xl border border-slate-200 bg-primary-50 p-3 text-sm text-slate-700">
              {message}
            </div>
          )}
          {[
            { key: 'videosEnabled', label: 'Videos' },
            { key: 'testsEnabled', label: 'Tests' },
            { key: 'pdfsEnabled', label: 'PDFs' },
            { key: 'pyqsEnabled', label: 'PYQs' },
            { key: 'notificationsEnabled', label: 'Notifications' },
          ].map((field) => (
            <div key={field.key} className="flex items-center justify-between">
              <span className="text-sm font-medium">{field.label}</span>
              <input
                type="checkbox"
                checked={settings[field.key]}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          ))}
          <button onClick={handleSave} className="btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

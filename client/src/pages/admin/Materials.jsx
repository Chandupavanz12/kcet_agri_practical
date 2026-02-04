import React, { useState } from 'react';
import AdminCRUDPage from '../../components/AdminCRUDPage.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function Materials() {
  const { token } = useAuth();
  const [pdfUrl, setPdfUrl] = useState('');
  const [accessType, setAccessType] = useState('free');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
  const previewUrl = pdfUrl && !/^https?:\/\//i.test(pdfUrl) ? `${apiBaseUrl}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}` : pdfUrl;

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const uploadPath = accessType === 'paid' ? '/api/admin/upload/material-private' : '/api/admin/upload/material-pdf';
      const res = await apiFetch(uploadPath, {
        token,
        method: 'POST',
        body: fd,
        headers: {},
      });
      setPdfUrl(accessType === 'paid' ? res.ref : res.url);
    } catch (err) {
      alert(err?.message || 'Upload failed');
    }
  };

  const fields = [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'type', label: 'Type', type: 'select', options: [
      { value: 'pdf', label: 'PDF' },
      { value: 'pyq', label: 'PYQ' },
    ]},
    { name: 'accessType', label: 'Access', type: 'select', options: [
      { value: 'free', label: 'Free (Public)' },
      { value: 'paid', label: 'Paid (Premium / Private)' },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Upload PDF</h2>
        </div>
        <div className="card-body space-y-3">
          <div>
            <div className="label">Upload as</div>
            <select
              value={accessType}
              onChange={(e) => {
                setAccessType(e.target.value);
                setPdfUrl('');
              }}
              className="input"
            >
              <option value="free">Free (Public)</option>
              <option value="paid">Paid (Private)</option>
            </select>
          </div>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx" onChange={handlePdfUpload} className="input" />
          {pdfUrl && (
            <div>
              <div className="label">File Reference (copied to form)</div>
              <input
                type="text"
                value={pdfUrl}
                readOnly
                className="input"
                onClick={(e) => e.target.select()}
              />
              {accessType === 'free' ? (
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs mt-2 inline-block">
                  Preview
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <AdminCRUDPage
        title="Manage Materials"
        apiEndpoint="materials"
        fields={fields}
        initialForm={{ title: '', pdf_url: pdfUrl || '', subject: 'General', type: 'pdf', accessType: accessType || 'free' }}
        onFormChange={(next) => {
          if (next && typeof next === 'object' && typeof next.accessType === 'string') {
            setAccessType(next.accessType);
          }
          return next;
        }}
        listTransform={(m) => ({
          ...m,
          accessType: m.accessType || m.access_type || 'free',
        })}
        customCreateHandler={async (data) => {
          const payload = {
            title: data.title,
            pdf_url: pdfUrl || '',
            subject: data.subject,
            type: data.type
            ,access_type: data.accessType || accessType || 'free'
          };
          return await apiFetch('/api/admin/materials', { token, method: 'POST', body: payload });
        }}
      />
    </div>
  );
}

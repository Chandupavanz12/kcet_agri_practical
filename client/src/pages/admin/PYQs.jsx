import React, { useState } from 'react';
import AdminCRUDPage from '../../components/AdminCRUDPage.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { apiFetch } from '../../lib/api.js';

export default function PYQs() {
  const { token } = useAuth();
  const [pdfUrl, setPdfUrl] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [accessType, setAccessType] = useState('paid');

  const handlePdfUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const uploadPath = accessType === 'free' ? '/api/admin/upload/pyq-public' : '/api/admin/upload/pyq-pdf';
      const res = await apiFetch(uploadPath, {
        token,
        method: 'POST',
        body: fd,
        headers: {},
      });
      const value = accessType === 'free' ? res.url : res.ref;
      if (type === 'pdf') setPdfUrl(value);
      else setSolutionUrl(value);
    } catch (err) {
      alert(err?.message || 'Upload failed');
    }
  };

  const fields = [
    { name: 'centre_name', label: 'Exam Centre', type: 'text', placeholder: 'Enter exam centre name' },
    { name: 'year', label: 'Year', type: 'text', placeholder: 'Enter year (e.g. 2025)' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'accessType', label: 'Access', type: 'select', options: [
      { value: 'free', label: 'Free (Public)' },
      { value: 'paid', label: 'Paid (Premium / Private)' },
    ]},
    { name: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold">Upload PDFs</h2>
        </div>
        <div className="card-body space-y-3">
          <div>
            <div className="label">Upload as</div>
            <select
              value={accessType}
              onChange={(e) => {
                setAccessType(e.target.value);
                setPdfUrl('');
                setSolutionUrl('');
              }}
              className="input"
            >
              <option value="free">Free (Public)</option>
              <option value="paid">Paid (Private)</option>
            </select>
          </div>
          <div>
            <div className="label">Question PDF</div>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx" onChange={(e) => handlePdfUpload(e, 'pdf')} className="input" />
            {pdfUrl && (
              <div className="mt-2">
                <input
                  type="text"
                  value={pdfUrl}
                  readOnly
                  className="input"
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </div>
          <div>
            <div className="label">Solution PDF (optional)</div>
            <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.ppt,.pptx" onChange={(e) => handlePdfUpload(e, 'solution')} className="input" />
            {solutionUrl && (
              <div className="mt-2">
                <input
                  type="text"
                  value={solutionUrl}
                  readOnly
                  className="input"
                  onClick={(e) => e.target.select()}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <AdminCRUDPage
        title="Manage PYQs"
        apiEndpoint="pyqs"
        fields={fields}
        initialForm={{ centre_name: '', year: '', title: '', pdf_url: '', solution_url: '', subject: 'General', status: 'active', accessType: accessType || 'paid' }}
        onFormChange={(next) => {
          if (next && typeof next === 'object' && typeof next.accessType === 'string') {
            setAccessType(next.accessType);
          }
          return next;
        }}
        onEdit={(item) => {
          setPdfUrl(item?.pdf_url || '');
          setSolutionUrl(item?.solution_url || '');
          setAccessType(item?.access_type || item?.accessType || 'paid');
        }}
        onAfterSubmit={() => {
          setPdfUrl('');
          setSolutionUrl('');
        }}
        onCancelEdit={() => {
          setPdfUrl('');
          setSolutionUrl('');
        }}
        listTransform={(p) => ({
          ...p,
          accessType: p.accessType || p.access_type || 'paid',
        })}
        formTransform={(data) => ({
          ...data,
          pdf_url: pdfUrl || data.pdf_url || '',
          solution_url: solutionUrl || data.solution_url || '',
          centre_name: data.centre_name || '',
          year: data.year || '',
          access_type: data.accessType || accessType || 'paid',
        })}
      />
    </div>
  );
}

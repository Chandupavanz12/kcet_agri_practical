import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminCRUDPage from '../../components/AdminCRUDPage.jsx';

export default function ExamCentres() {
  const navigate = useNavigate();
  const [activeCentreId, setActiveCentreId] = useState(null);

  const fields = [
    { name: 'name', label: 'Centre Name', type: 'text' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  ];

  return (
    <AdminCRUDPage
      title="Manage Exam Centres"
      apiEndpoint="exam-centres"
      responseKey="centres"
      fields={fields}
      initialForm={{ name: '', status: 'active' }}
      onEdit={(item) => setActiveCentreId(item?.id ?? null)}
      renderItemActions={(item) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/exam-centres/${item.id}/years`)}
          className={
            'btn-ghost text-xs ' +
            (activeCentreId === item.id ? 'bg-primary-50 text-primary-700' : '')
          }
        >
          Years
        </button>
      )}
    />
  );
}

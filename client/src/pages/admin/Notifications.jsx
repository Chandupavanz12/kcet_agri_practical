import React from 'react';
import AdminCRUDPage from '../../components/AdminCRUDPage.jsx';

export default function Notifications() {
  const fields = [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'message', label: 'Message', type: 'textarea' },
    { name: 'status', label: 'Status', type: 'select', options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ]},
  ];

  return (
    <AdminCRUDPage
      title="Manage Notifications"
      apiEndpoint="notifications"
      fields={fields}
      initialForm={{ title: '', message: '', status: 'active' }}
    />
  );
}

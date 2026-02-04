import React from 'react';
import AdminCRUDPage from '../../components/AdminCRUDPage.jsx';

export default function Students() {
  const fields = [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'password', label: 'Password', type: 'password' },
    { name: 'role', label: 'Role', type: 'select', options: [
      { value: 'student', label: 'Student' },
      { value: 'admin', label: 'Admin' },
    ]},
  ];

  return (
    <AdminCRUDPage
      title="Manage Students"
      apiEndpoint="students"
      fields={fields}
      initialForm={{ name: '', email: '', password: '', role: 'student' }}
      listTransform={(r) => ({ ...r, password: '' })}
      formTransform={(data) => data}
    />
  );
}

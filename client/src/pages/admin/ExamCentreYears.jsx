import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminCRUDPage from '../../components/AdminCRUDPage.jsx';

export default function ExamCentreYears() {
  const { centreId } = useParams();

  const fields = useMemo(
    () => [
      { name: 'year', label: 'Year', type: 'text' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-body flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600">Exam Centre</div>
            <div className="text-lg font-semibold">Centre ID: {centreId}</div>
          </div>
          <Link to="/admin/exam-centres" className="btn-ghost">
            Back
          </Link>
        </div>
      </div>

      <AdminCRUDPage
        title="Manage Centre Years"
        apiEndpoint="exam-centres"
        endpointPath={`exam-centres/${centreId}/years`}
        responseKey="years"
        updateEndpointPath="exam-centre-years"
        deleteEndpointPath="exam-centre-years"
        fields={fields}
        initialForm={{ year: '', status: 'active' }}
        formTransform={(data) => ({ year: data.year, status: data.status })}
      />
    </div>
  );
}

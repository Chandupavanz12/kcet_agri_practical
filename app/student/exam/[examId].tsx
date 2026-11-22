import React from 'react';
import ExamDetailsScreen from '../../../src/screens/ExamDetailsScreen.jsx';

export function generateStaticParams() {
  return [
    { examId: 'puc' },
    { examId: 'kcet' },
    { examId: 'neet' },
    { examId: 'agri' },
  ];
}

export default function ExamPage() {
  return <ExamDetailsScreen />;
}


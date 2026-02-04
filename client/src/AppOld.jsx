import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/StudentDashboardNew.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import MockTest from './pages/MockTestNew.jsx';
import MockTestResult from './pages/MockTestResult.jsx';
import Profile from './pages/Profile.jsx';
import PYQs from './pages/PYQs.jsx';
import NotFound from './pages/NotFound.jsx';
import MainDashboard from './pages/MainDashboard.jsx';
import Navigation from './components/Navigation.jsx';

// Admin CRUD pages
import Students from './pages/admin/Students.jsx';
import Specimens from './pages/admin/Specimens.jsx';
import Tests from './pages/admin/Tests.jsx';
import TestBuilder from './pages/admin/TestBuilderNew.jsx';
import Videos from './pages/admin/VideosNew.jsx';
import Materials from './pages/admin/Materials.jsx';
import PYQsAdmin from './pages/admin/PYQs.jsx';
import Notifications from './pages/admin/Notifications.jsx';
import Settings from './pages/admin/Settings.jsx';
import Results from './pages/admin/Results.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/student/*"
          element={
            <PrivateRoute role="student">
              <Layout role="student">
                <Routes>
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="mock-test" element={<MockTest />} />
                  <Route path="mock-test/:testId" element={<MockTest />} />
                  <Route path="mock-test/result" element={<MockTestResult />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="pyqs" element={<PYQs />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <PrivateRoute role="admin">
              <Layout role="admin">
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="students" element={<Students />} />
                  <Route path="specimens" element={<Specimens />} />
                  <Route path="tests" element={<Tests />} />
                  <Route path="tests/builder" element={<TestBuilder />} />
                  <Route path="tests" element={<Tests />} />
                  <Route path="videos" element={<Videos />} />
                  <Route path="materials" element={<Materials />} />
                  <Route path="pyqs" element={<PYQsAdmin />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="results" element={<Results />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/main-dashboard"
          element={
            <PrivateRoute>
              <MainDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigation>
              <NotFound />
            </Navigation>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

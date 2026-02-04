import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import MainDashboard from './pages/MainDashboard.jsx';
import TopMenu from './components/TopMenu.jsx';

// Lazy load pages
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboardNew.jsx'));
const MockTestNew = React.lazy(() => import('./pages/MockTestNew.jsx'));
const MockTestResult = React.lazy(() => import('./pages/MockTestResult.jsx'));
const Profile = React.lazy(() => import('./pages/Profile.jsx'));
const PYQs = React.lazy(() => import('./pages/PYQs.jsx'));
const NotFound = React.lazy(() => import('./pages/NotFound.jsx'));

// Admin CRUD pages
const Students = React.lazy(() => import('./pages/admin/Students.jsx'));
const Specimens = React.lazy(() => import('./pages/admin/Specimens.jsx'));
const Tests = React.lazy(() => import('./pages/admin/Tests.jsx'));
const TestBuilder = React.lazy(() => import('./pages/admin/TestBuilderNew.jsx'));
const Videos = React.lazy(() => import('./pages/admin/VideosNew.jsx'));
const Materials = React.lazy(() => import('./pages/admin/Materials.jsx'));
const PYQsAdmin = React.lazy(() => import('./pages/admin/PYQs.jsx'));
const Notifications = React.lazy(() => import('./pages/admin/Notifications.jsx'));
const Settings = React.lazy(() => import('./pages/admin/Settings.jsx'));
const Results = React.lazy(() => import('./pages/admin/Results.jsx'));

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-50">
      <TopMenu />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Main Dashboard - Default Route */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <StudentDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/mock-test/:testId"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading test...</div></div>}>
                <MockTestNew />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/mock-test/result"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading results...</div></div>}>
                <MockTestResult />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/tests"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <StudentDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/results"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <MockTestResult />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/pyqs"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <PYQs />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/materials"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <StudentDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Profile />
              </Suspense>
            </ProtectedRoute>
          }
        />
        
        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <MainDashboard />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Students />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/specimens"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Specimens />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tests"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Tests />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/test-builder"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <TestBuilder />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/videos"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Videos />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/materials"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Materials />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/pyqs"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <PYQsAdmin />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Notifications />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Settings />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/results"
          element={
            <ProtectedRoute adminOnly>
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
                <Results />
              </Suspense>
            </ProtectedRoute>
          }
        />
        
        {/* 404 Route */}
        <Route
          path="*"
          element={
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

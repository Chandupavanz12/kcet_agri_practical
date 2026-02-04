import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import IndexPage from './pages/IndexPage.jsx';
import Layout from './components/Layout.jsx';

import StudentForgotPassword from './pages/StudentForgotPassword.jsx';
import StudentOtpLogin from './pages/StudentOtpLogin.jsx';

// Lazy load pages
const StudentDashboard = React.lazy(() => import('./pages/StudentDashboardNew.jsx'));
const MockTestNew = React.lazy(() => import('./pages/MockTestNew.jsx'));
const MockTestResult = React.lazy(() => import('./pages/MockTestResult.jsx'));
const Profile = React.lazy(() => import('./pages/Profile.jsx'));
const PYQs = React.lazy(() => import('./pages/PYQs.jsx'));
const StudentTests = React.lazy(() => import('./pages/StudentTests.jsx'));
const StudentProgress = React.lazy(() => import('./pages/StudentProgress.jsx'));
const StudentVideos = React.lazy(() => import('./pages/StudentVideos.jsx'));
const StudentMaterials = React.lazy(() => import('./pages/StudentMaterials.jsx'));
const StudentMaterialsFree = React.lazy(() => import('./pages/StudentMaterialsFree.jsx'));
const StudentMaterialsPremium = React.lazy(() => import('./pages/StudentMaterialsPremium.jsx'));
const PremiumAccess = React.lazy(() => import('./pages/PremiumAccess.jsx'));
const StudentNotifications = React.lazy(() => import('./pages/StudentNotifications.jsx'));
const FAQ = React.lazy(() => import('./pages/FAQ.jsx'));
const About = React.lazy(() => import('./pages/About.jsx'));
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
const AdminResults = React.lazy(() => import('./pages/admin/Results.jsx'));
const MenuManagement = React.lazy(() => import('./pages/admin/MenuManagement.jsx'));
const ExamCentres = React.lazy(() => import('./pages/admin/ExamCentres.jsx'));
const ExamCentreYears = React.lazy(() => import('./pages/admin/ExamCentreYears.jsx'));
const Plans = React.lazy(() => import('./pages/admin/Plans.jsx'));
const Payments = React.lazy(() => import('./pages/admin/Payments.jsx'));

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
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  
  return (
    <Routes>
      {/* Auth Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to={user.role === 'admin' ? '/' : '/student/dashboard'} replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to={user.role === 'admin' ? '/' : '/student/dashboard'} replace /> : <Register />} 
      />

      <Route
        path="/student/forgot-password"
        element={user ? <Navigate to={user.role === 'admin' ? '/' : '/student/dashboard'} replace /> : <StudentForgotPassword />}
      />
      <Route
        path="/student/otp-login"
        element={user ? <Navigate to={user.role === 'admin' ? '/' : '/student/dashboard'} replace /> : <StudentOtpLogin />}
      />
      
      {/* Root Route */}
      <Route 
        path="/" 
        element={
          user ? (
            user.role === 'admin' ? (
              <Layout>
                <IndexPage />
              </Layout>
            ) : (
              <Navigate to="/student/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
      
      {/* Student Routes */}
      <Route
        path="/student/dashboard"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentDashboard />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/mock-test/:testId"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading test...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <MockTestNew />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/mock-test/result"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading results...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <MockTestResult />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/tests"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentTests />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/results"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentProgress />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/progress"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentProgress />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/videos"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentVideos />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/materials"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentMaterialsFree />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/materials/free"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentMaterialsFree />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/materials/premium"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentMaterialsPremium />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/premium"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <PremiumAccess />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/notifications"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <StudentNotifications />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/profile"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/pyqs"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <PYQs />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/faq"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <FAQ />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/student/about"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute>
              <Layout>
                <About />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <IndexPage />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/menu"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <MenuManagement />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/students"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Students />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/specimens"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Specimens />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/tests"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Tests />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/test-builder"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <TestBuilder />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/videos"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Videos />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/materials"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Materials />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/plans"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Plans />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Payments />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/pyqs"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <PYQsAdmin />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/exam-centres"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <ExamCentres />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/exam-centres/:centreId/years"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <ExamCentreYears />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/notifications"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/results"
        element={
          <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-lg">Loading...</div></div>}>
            <ProtectedRoute adminOnly={true}>
              <Layout>
                <Results />
              </Layout>
            </ProtectedRoute>
          </Suspense>
        }
      />
      
      {/* 404 Route */}
      <Route 
        path="*" 
        element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/' : '/student/dashboard'} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        } 
      />
    </Routes>
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

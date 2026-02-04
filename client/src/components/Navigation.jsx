import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Navigation() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KC</span>
              </div>
              <span className="font-bold text-xl text-slate-900">KCET Agriculture</span>
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive('/') 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </Link>
            
            {user.role === 'admin' ? (
              <>
                <Link
                  to="/admin/test-builder"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/admin/test-builder') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Test Builder
                </Link>
                <Link
                  to="/admin/videos"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/admin/videos') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Videos
                </Link>
                <Link
                  to="/admin/materials"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/admin/materials') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Materials
                </Link>
                <Link
                  to="/admin/students"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/admin/students') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Students
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/student/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/student/dashboard') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Study Materials
                </Link>
                <Link
                  to="/student/tests"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/student/tests') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Tests
                </Link>
                <Link
                  to="/student/results"
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive('/student/results') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Results
                </Link>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-700">{user.name}</span>
              <span className="text-xs text-slate-500 capitalize">{user.role}</span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-slate-600 hover:text-slate-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-slate-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link
            to="/"
            className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
              isActive('/') 
                ? 'text-primary-600 bg-primary-50' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Dashboard
          </Link>
          
          {user.role === 'admin' ? (
            <>
              <Link
                to="/admin/test-builder"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/admin/test-builder') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Test Builder
              </Link>
              <Link
                to="/admin/videos"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/admin/videos') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Videos
              </Link>
              <Link
                to="/admin/materials"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/admin/materials') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Materials
              </Link>
              <Link
                to="/admin/students"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/admin/students') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Students
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/student/dashboard"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/student/dashboard') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Study Materials
              </Link>
              <Link
                to="/student/tests"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/student/tests') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Tests
              </Link>
              <Link
                to="/student/results"
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive('/student/results') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Results
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

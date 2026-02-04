import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SimpleMenuBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-md border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KC</span>
              </div>
              <span className="font-bold text-lg text-slate-900">KCET Agriculture</span>
            </Link>
          </div>

          {/* Main Menu */}
          <div className="flex items-center space-x-1" ref={dropdownRef}>
            {user.role === 'student' && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    isActive('/student/dashboard') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  📚 Study Materials
                </Link>
                <Link
                  to="/student/dashboard"
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    isActive('/student/dashboard') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  🎬 Learning Videos
                </Link>
                <Link
                  to="/student/tests"
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    isActive('/student/tests') 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  📝 Tests
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <>
                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('students')}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      isActive('/admin/students') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    👥 Students
                    <svg className={`w-3 h-3 transition-transform ${openDropdown === 'students' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'students' && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded shadow-lg border border-slate-200 z-50">
                      <Link to="/admin/students" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">View Students</Link>
                      <Link to="/admin/students" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Add Student</Link>
                      <Link to="/admin/students" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Student</Link>
                      <Link to="/admin/students" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Delete Student</Link>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('content')}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      isActive('/admin/materials') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    📚 Content
                    <svg className={`w-3 h-3 transition-transform ${openDropdown === 'content' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'content' && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded shadow-lg border border-slate-200 z-50">
                      <Link to="/admin/materials" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Study Materials</Link>
                      <Link to="/admin/materials" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Add Material</Link>
                      <Link to="/admin/materials" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Materials</Link>
                      <Link to="/admin/materials" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Delete Materials</Link>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('videos')}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      isActive('/admin/videos') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    🎬 Videos
                    <svg className={`w-3 h-3 transition-transform ${openDropdown === 'videos' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'videos' && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded shadow-lg border border-slate-200 z-50">
                      <Link to="/admin/videos" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">View Videos</Link>
                      <Link to="/admin/videos" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Upload Video</Link>
                      <Link to="/admin/videos" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Video</Link>
                      <Link to="/admin/videos" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Delete Video</Link>
                      <Link to="/admin/videos" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Move Videos</Link>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={() => toggleDropdown('tests')}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      isActive('/admin/test-builder') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    📝 Tests
                    <svg className={`w-3 h-3 transition-transform ${openDropdown === 'tests' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'tests' && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded shadow-lg border border-slate-200 z-50">
                      <Link to="/admin/test-builder" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Create Test</Link>
                      <Link to="/admin/tests" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">View Tests</Link>
                      <Link to="/admin/tests" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Test</Link>
                      <Link to="/admin/tests" onClick={() => setOpenDropdown(null)} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Delete Test</Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* User Menu */}
            <div className="flex items-center space-x-2 pl-4 border-l border-slate-300">
              <span className="text-sm text-slate-600">{user.name}</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

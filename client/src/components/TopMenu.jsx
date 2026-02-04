import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function TopMenu() {
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

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const menuItems = {
    student: [
      {
        label: 'Study Materials',
        icon: '📚',
        link: '/student/dashboard',
        submenu: [
          { label: 'All Materials', link: '/student/dashboard' },
          { label: 'PDF Notes', link: '/student/materials' },
          { label: 'Previous Papers', link: '/student/pyqs' },
        ]
      },
      {
        label: 'Learning Videos',
        icon: '🎬',
        link: '/student/videos',
        submenu: [
          { label: 'All Videos', link: '/student/dashboard' },
          { label: 'Agriculture', link: '/student/dashboard' },
          { label: 'Biology', link: '/student/dashboard' },
          { label: 'Chemistry', link: '/student/dashboard' },
        ]
      },
      {
        label: 'Tests',
        icon: '📝',
        link: '/student/tests',
        submenu: [
          { label: 'Take Test', link: '/student/tests' },
          { label: 'View Results', link: '/student/results' },
          { label: 'Test History', link: '/student/results' },
        ]
      },
    ],
    admin: [
      {
        label: 'Student Management',
        icon: '👥',
        link: '/admin/students',
        submenu: [
          { label: 'View All Students', link: '/admin/students' },
          { label: 'Add New Student', link: '/admin/students' },
          { label: 'Edit Student', link: '/admin/students' },
          { label: 'Delete Student', link: '/admin/students' },
        ]
      },
      {
        label: 'Content Management',
        icon: '📚',
        submenu: [
          { label: 'Study Materials', link: '/admin/materials' },
          { label: 'Add Material', link: '/admin/materials' },
          { label: 'Edit Materials', link: '/admin/materials' },
          { label: 'Delete Materials', link: '/admin/materials' },
        ]
      },
      {
        label: 'Video Management',
        icon: '🎬',
        submenu: [
          { label: 'View All Videos', link: '/admin/videos' },
          { label: 'Upload New Video', link: '/admin/videos' },
          { label: 'Edit Video', link: '/admin/videos' },
          { label: 'Delete Video', link: '/admin/videos' },
          { label: 'Move Videos', link: '/admin/videos' },
        ]
      },
      {
        label: 'Test Management',
        icon: '📝',
        submenu: [
          { label: 'Create Test', link: '/admin/test-builder' },
          { label: 'View Tests', link: '/admin/tests' },
          { label: 'Edit Test', link: '/admin/tests' },
          { label: 'Delete Test', link: '/admin/tests' },
        ]
      },
    ]
  };

  const currentMenuItems = user ? menuItems[user.role] || [] : [];

  return (
    <nav className="bg-white shadow-lg border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">KC</span>
              </div>
              <div>
                <span className="font-bold text-xl text-slate-900">KCET Agriculture</span>
                <div className="text-xs text-slate-500">Learning Platform</div>
              </div>
            </Link>
          </div>

          {/* Main Menu */}
          <div className="hidden md:flex items-center space-x-1" ref={dropdownRef}>
            {currentMenuItems.map((item, index) => (
              <div key={index} className="relative">
                <button
                  onClick={() => toggleDropdown(item.label)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.link)
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.submenu && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${
                        openDropdown === item.label ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Dropdown Menu */}
                {item.submenu && openDropdown === item.label && (
                  <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                    <div className="py-2">
                      {item.submenu.map((subItem, subIndex) => (
                        <Link
                          key={subIndex}
                          to={subItem.link}
                          onClick={() => setOpenDropdown(null)}
                          className={`block px-4 py-3 text-sm transition-colors ${
                            isActive(subItem.link)
                              ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* User Profile Section */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">{user?.name || 'User'}</div>
                <div className="text-xs text-slate-500 capitalize">{user?.role || 'guest'}</div>
              </div>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => toggleDropdown('profile')}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {openDropdown === 'profile' && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{user?.name || 'User'}</div>
                        <div className="text-sm text-slate-500">{user?.email || 'user@example.com'}</div>
                        <div className="text-xs text-slate-400 capitalize">{user?.role || 'guest'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <Link
                      to="/profile"
                      onClick={() => setOpenDropdown(null)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Edit Profile
                      </div>
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setOpenDropdown(null)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </div>
                    </Link>
                    <div className="border-t border-slate-200 my-2"></div>
                    <button
                      onClick={() => {
                        logout();
                        setOpenDropdown(null);
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="p-2 text-slate-600 hover:text-slate-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-slate-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {currentMenuItems.map((item, index) => (
            <div key={index}>
              <Link
                to={item.link}
                className={`block px-3 py-2 text-base font-medium rounded-md transition-colors ${
                  isActive(item.link)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
              {item.submenu && (
                <div className="ml-4 space-y-1">
                  {item.submenu.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      to={subItem.link}
                      className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md"
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

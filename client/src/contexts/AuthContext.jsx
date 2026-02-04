import React, { createContext, useContext, useMemo, useState } from 'react';
import { authApi } from '../lib/api.js';
import { apiFetch } from '../lib/api.js';

const AuthContext = createContext(null);

function readStored() {
  try {
    return {
      token: localStorage.getItem('kcet_token') || '',
      role: localStorage.getItem('kcet_role') || '',
    };
  } catch {
    return { token: '', role: '' };
  }
}

export function AuthProvider({ children }) {
  // Start with empty state - don't auto-restore from localStorage
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  function persist(nextToken, nextRole) {
    setToken(nextToken);
    setRole(nextRole);
    try {
      localStorage.setItem('kcet_token', nextToken);
      localStorage.setItem('kcet_role', nextRole);
    } catch {
      // ignore
    }
  }

  async function refreshMe(nextToken = token) {
    if (!nextToken) {
      setUser(null);
      return;
    }
    const data = await authApi.me(nextToken);
    setUser(data?.user || null);
  }

  async function loginStudent({ email, password }) {
    const data = await authApi.studentLogin({ email, password });
    persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  async function registerStudent({ name, email, password }) {
    const data = await authApi.studentRegister({ name, email, password });
    persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  async function loginAdmin({ email, password }) {
    const data = await authApi.adminLogin({ email, password });
    persist(data.token, 'admin');
    setUser(data.user);
    return data;
  }

  async function requestStudentLoginOtp({ email }) {
    return apiFetch('/api/auth/student/otp-login/request', { method: 'POST', body: { email } });
  }

  async function loginStudentWithOtp({ email, otp }) {
    const data = await apiFetch('/api/auth/student/otp-login/verify', { method: 'POST', body: { email, otp } });
    persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  function logout() {
    persist('', '');
    setUser(null);
    // Also clear localStorage completely
    try {
      localStorage.removeItem('kcet_token');
      localStorage.removeItem('kcet_role');
    } catch {
      // ignore
    }
  }

  // Removed automatic auth refresh - require explicit login
  // useEffect(() => {
  //   ...
  // }, [token]);

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      loading,
      loginStudent,
      registerStudent,
      loginAdmin,
      requestStudentLoginOtp,
      loginStudentWithOtp,
      refreshMe,
      logout,
    }),
    [token, role, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

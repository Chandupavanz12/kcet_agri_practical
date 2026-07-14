import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';
import { apiFetch } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadStored() {
      try {
        const storedRole = await SecureStore.getItemAsync('kcet_role');
        if (storedRole === 'admin') {
          // Admin must log in every time
          await SecureStore.deleteItemAsync('kcet_token');
          await SecureStore.deleteItemAsync('kcet_role');
        } else {
          const storedToken = await SecureStore.getItemAsync('kcet_token');
          if (storedToken) setToken(storedToken);
          if (storedRole) setRole(storedRole);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadStored();
  }, []);

  async function persist(nextToken, nextRole) {
    setToken(nextToken);
    setRole(nextRole);
    try {
      if (nextRole === 'admin') {
        // Do not persist admin sessions per user request
        await SecureStore.deleteItemAsync('kcet_token');
        await SecureStore.deleteItemAsync('kcet_role');
        return;
      }

      if (nextToken) {
        await SecureStore.setItemAsync('kcet_token', nextToken);
      } else {
        await SecureStore.deleteItemAsync('kcet_token');
      }
      if (nextRole) {
        await SecureStore.setItemAsync('kcet_role', nextRole);
      } else {
        await SecureStore.deleteItemAsync('kcet_role');
      }
    } catch {
      // ignore
    }
  }

  async function refreshMe(nextToken = token) {
    if (!nextToken) {
      setUser(null);
      return;
    }
    try {
      const data = await authApi.me(nextToken);
      setUser(data?.user || null);
    } catch (e) {
      console.error(e);
    }
  }

  async function loginStudent({ email, password }) {
    const data = await authApi.studentLogin({ email, password });
    await persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  async function requestStudentRegisterOtp({ email }) {
    return apiFetch('/api/auth/student/register-otp/request', { method: 'POST', body: { email } });
  }

  async function registerStudent({ name, email, password, otp }) {
    const data = await authApi.studentRegister({ name, email, password, otp });
    await persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  async function oauthStudent({ email, name, provider, providerId }) {
    const data = await apiFetch('/api/auth/student/oauth', { method: 'POST', body: { email, name, provider, providerId } });
    await persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  async function loginAdmin({ email, password }) {
    const data = await authApi.adminLogin({ email, password });
    // This will now return requiresOtp: true
    return data;
  }

  async function verifyAdminLoginOtp({ email, otp }) {
    const data = await apiFetch('/api/auth/admin/login-verify', { method: 'POST', body: { email, otp } });
    await persist(data.token, 'admin'); // It skips saving to SecureStore for admin
    setUser(data.user);
    return data;
  }

  async function registerAdmin({ name, email, password }) {
    const data = await apiFetch('/api/auth/admin/register', { method: 'POST', body: { name, email, password } });
    await persist(data.token, 'admin');
    setUser(data.user);
    return data;
  }

  async function requestStudentLoginOtp({ email }) {
    return apiFetch('/api/auth/student/otp-login/request', { method: 'POST', body: { email } });
  }

  async function loginStudentWithOtp({ email, otp }) {
    const data = await apiFetch('/api/auth/student/otp-login/verify', { method: 'POST', body: { email, otp } });
    await persist(data.token, 'student');
    setUser(data.user);
    return data;
  }

  async function logout() {
    await persist('', '');
    setUser(null);
  }

  useEffect(() => {
    if (token && !loading) {
      refreshMe(token);
    }
  }, [token, loading]);

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      loading,
      loginStudent,
      requestStudentRegisterOtp,
      registerStudent,
      oauthStudent,
      loginAdmin,
      verifyAdminLoginOtp,
      registerAdmin,
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

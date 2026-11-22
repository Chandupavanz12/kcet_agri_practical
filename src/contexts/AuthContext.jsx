import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';
import { apiFetch } from '../api/client.js';

const storage = {
  async getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) return val;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key, val) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(val));
      }
    } catch {}
    try {
      await SecureStore.setItemAsync(key, String(val));
    } catch {}
  },
  async deleteItem(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
};

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
        // 1. Check for token in URL query (e.g. after post-payment redirect on web)
        let queryToken = '';
        if (typeof window !== 'undefined' && window.location?.search) {
          const sp = new URLSearchParams(window.location.search);
          queryToken = sp.get('token') || sp.get('auth_token') || '';
        }

        const storedRole = await storage.getItem('kcet_role');
        if (storedRole === 'admin' && !queryToken) {
          await storage.deleteItem('kcet_token');
          await storage.deleteItem('kcet_role');
          await storage.deleteItem('kcet_user');
        } else {
          const storedToken = queryToken || (await storage.getItem('kcet_token'));
          const storedUserStr = await storage.getItem('kcet_user');
          let parsedUser = null;
          if (storedUserStr) {
            try { parsedUser = JSON.parse(storedUserStr); } catch (_) {}
          }

          if (storedToken) {
            setToken(storedToken);
            if (parsedUser) {
              setUser(parsedUser);
            }
            if (storedRole) setRole(storedRole);
            if (queryToken) {
              await storage.setItem('kcet_token', queryToken);
              await storage.setItem('kcet_role', 'student');
            }
            // Sync fresh profile in background
            refreshMe(storedToken);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadStored();
  }, []);

  async function persist(nextToken, nextRole, nextUser = null) {
    setToken(nextToken);
    setRole(nextRole);
    if (nextUser) setUser(nextUser);
    try {
      if (nextRole === 'admin') {
        // Do not persist admin sessions per user request
        await storage.deleteItem('kcet_token');
        await storage.deleteItem('kcet_role');
        await storage.deleteItem('kcet_user');
        return;
      }

      if (nextToken) {
        await storage.setItem('kcet_token', nextToken);
      } else {
        await storage.deleteItem('kcet_token');
      }
      if (nextRole) {
        await storage.setItem('kcet_role', nextRole);
      } else {
        await storage.deleteItem('kcet_role');
      }
      if (nextUser) {
        await storage.setItem('kcet_user', JSON.stringify(nextUser));
      } else if (!nextToken) {
        await storage.deleteItem('kcet_user');
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
      if (data?.user) {
        setUser(data.user);
        await storage.setItem('kcet_user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loginStudent({ email, password }) {
    const data = await authApi.studentLogin({ email, password });
    await persist(data.token, 'student', data.user);
    setUser(data.user);
    return data;
  }

  async function requestStudentRegisterOtp({ email }) {
    return apiFetch('/api/auth/student/register-otp/request', { method: 'POST', body: { email } });
  }

  async function registerStudent({ name, email, password, otp }) {
    const data = await authApi.studentRegister({ name, email, password, otp });
    await persist(data.token, 'student', data.user);
    setUser(data.user);
    return data;
  }

  async function oauthStudent({ email, name, provider, providerId }) {
    const data = await apiFetch('/api/auth/student/oauth', { method: 'POST', body: { email, name, provider, providerId } });
    await persist(data.token, 'student', data.user);
    setUser(data.user);
    return data;
  }

  async function loginAdmin({ email, password }) {
    const data = await authApi.adminLogin({ email, password });
    if (!data.requiresOtp && data.token) {
      await persist(data.token, 'admin', data.user);
      setUser(data.user);
    }
    return data;
  }

  async function verifyAdminLoginOtp({ email, otp }) {
    const data = await apiFetch('/api/auth/admin/login-verify', { method: 'POST', body: { email, otp } });
    await persist(data.token, 'admin', data.user); // It skips saving to SecureStore for admin
    setUser(data.user);
    return data;
  }

  async function registerAdmin({ name, email, password }) {
    const data = await apiFetch('/api/auth/admin/register', { method: 'POST', body: { name, email, password } });
    await persist(data.token, 'admin', data.user);
    setUser(data.user);
    return data;
  }

  async function requestStudentLoginOtp({ email }) {
    return apiFetch('/api/auth/student/otp-login/request', { method: 'POST', body: { email } });
  }

  async function loginStudentWithOtp({ email, otp }) {
    const data = await apiFetch('/api/auth/student/otp-login/verify', { method: 'POST', body: { email, otp } });
    await persist(data.token, data.user?.role || 'student', data.user);
    setUser(data.user);
    return data;
  }

  async function logout() {
    await persist('', '', null);
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

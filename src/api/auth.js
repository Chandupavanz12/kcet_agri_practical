import { apiFetch } from './client';

export const authApi = {
  studentRegister(payload) {
    return apiFetch('/api/auth/student/register', { method: 'POST', body: payload });
  },
  studentLogin(payload) {
    return apiFetch('/api/auth/student/login', { method: 'POST', body: payload });
  },
  adminLogin(payload) {
    return apiFetch('/api/auth/admin/login', { method: 'POST', body: payload });
  },
  me(token) {
    return apiFetch('/api/auth/me', { token });
  },
};

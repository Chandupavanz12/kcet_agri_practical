const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

export async function apiFetch(path, { token, method = 'GET', body, headers } = {}) {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  });

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data = null;

  if (contentType.includes('text/csv')) {
    data = text;
  } else if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

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

import { API_BASE_URL } from '../config/env';

const _getCache = new Map();
const _inFlight = new Map();

/**
 * Clears all cached GET responses whose path starts with the given prefix.
 * Call this after a successful payment to ensure premium status is re-fetched fresh.
 */
export function clearApiCache(pathPrefix) {
  const prefix = String(pathPrefix || '');
  for (const key of _getCache.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      _getCache.delete(key);
    }
  }
  for (const key of _inFlight.keys()) {
    if (!prefix || key.startsWith(prefix)) {
      _inFlight.delete(key);
    }
  }
}

function cacheKey(path, token, headers) {
  const h = headers ? JSON.stringify(headers) : '';
  return `${path}::${token || ''}::${h}`;
}

function cacheTtlMs(path) {
  if (String(path || '').startsWith('/api/student/dashboard')) return 15000;
  if (String(path || '').startsWith('/api/student/notifications')) return 10000;
  if (String(path || '').startsWith('/api/student/videos')) return 10000;
  if (String(path || '').startsWith('/api/admin/dashboard')) return 15000;
  return 5000;
}

export async function apiFetch(path, { token, method = 'GET', body, headers } = {}) {
  const isFormData = body instanceof FormData;

  const m = String(method || 'GET').toUpperCase();

  const doFetch = async () => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: m,
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
  };

  const canCache = m === 'GET' && !body && !isFormData;
  if (canCache) {
    const key = cacheKey(path, token, headers);
    const cached = _getCache.get(key);
    const ttl = cacheTtlMs(path);
    if (cached && Date.now() - cached.ts < ttl) {
      return cached.data;
    }
    const inFlight = _inFlight.get(key);
    if (inFlight) return inFlight;

    const p = (async () => {
      try {
        const data = await doFetch();
        _getCache.set(key, { ts: Date.now(), data });
        return data;
      } finally {
        _inFlight.delete(key);
      }
    })();

    _inFlight.set(key, p);
    return p;
  }

  return doFetch();
}

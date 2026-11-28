import { API_BASE_URL } from '../config/env';

/**
 * Converts a relative image path (e.g. /uploads/test-images/foo.jpg)
 * into a fully-qualified URL using the configured API base.
 * If the path is already absolute (starts with http) or a data URI, it is returned as-is.
 */
export function getImageUrl(path) {
  if (!path) return '';
  const strPath = String(path);
  if (strPath.startsWith('http://') || strPath.startsWith('https://') || strPath.startsWith('data:')) {
    return strPath;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = strPath.startsWith('/') ? strPath : `/${strPath}`;
  return `${base}${p}`;
}

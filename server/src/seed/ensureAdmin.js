import { hashPassword } from '../utils/auth.js';
import { query } from '../config/db-pg.js';

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') return;

    const existingAdmin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (existingAdmin.length > 0) return;

    const fallbackEmail = 'admin@kcet.local';
    const fallbackPassword = 'admin123';
    const passwordHash = await hashPassword(fallbackPassword);

    await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      name,
      fallbackEmail,
      passwordHash,
      'admin',
    ]);
    return;
  }

  const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);

  if (existing.length > 0) {
    return;
  }

  const passwordHash = await hashPassword(password);

  await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
    name,
    email.toLowerCase(),
    passwordHash,
    'admin',
  ]);
}

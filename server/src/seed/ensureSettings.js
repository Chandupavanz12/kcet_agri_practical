import { query } from '../config/db-pg.js';

export async function ensureSettings() {
  await query('INSERT IGNORE INTO settings (id) VALUES (1)');
  const rows = await query('SELECT * FROM settings WHERE id = 1');
  return rows[0];
}

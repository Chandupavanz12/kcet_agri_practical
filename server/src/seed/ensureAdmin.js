import { hashPassword } from '../utils/auth.js';
import { User } from '../models/index.js';

export async function ensureAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') return;

    const existingAdmin = await User.findOne({ role: 'admin' }).select({ id: 1 }).lean();
    if (existingAdmin) return;

    const fallbackEmail = 'admin@kcet.local';
    const fallbackPassword = 'admin123';
    const passwordHash = await hashPassword(fallbackPassword);

    await new User({ name, email: fallbackEmail, password_hash: passwordHash, role: 'admin' }).save();
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() }).select({ id: 1 }).lean();
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await new User({ name, email: email.toLowerCase(), password_hash: passwordHash, role: 'admin' }).save();
}

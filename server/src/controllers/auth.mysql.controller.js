import { query } from '../config/db.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { signToken, hashPassword, verifyPassword } from '../utils/auth.js';

function mapUserRow(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function isValidEmail(email) {
  const e = String(email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function studentRegister(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [(email || '').toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const result = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      name,
      email.toLowerCase(),
      passwordHash,
      'student',
    ]);

    const user = { id: result.insertId, name, email: email.toLowerCase(), role: 'student' };
    const token = signToken(user);

    return res.json({ token, user });
  } catch (err) {
    return next(err);
  }
}

export async function requestPasswordResetByEmail(req, res, next) {
  try {
    const emailInput = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!emailInput || !isValidEmail(emailInput)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const users = await query(`SELECT id, email, role FROM users WHERE email = ? LIMIT 1`, [emailInput]);
    const user = users[0];

    // Always return a generic message to avoid revealing which emails exist.
    if (!user || user.role !== 'student') {
      return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otp}.${secret}.${user.id}`).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(`UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [user.id]);
    await query(`INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)`, [user.id, tokenHash, expiresAt]);

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';

    if (host && smtpUser && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: smtpUser, pass },
      });

      await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Password Reset OTP',
        text: `Your password reset OTP is ${otp}. This OTP is valid for 10 minutes. If you did not request this, you can ignore this email.`,
      });
    } else {
      if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
        return res.status(500).json({ message: 'Email service not configured' });
      }
      // Dev convenience only
      return res.json({ message: 'OTP generated (SMTP not configured).', otp });
    }

    return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
  } catch (err) {
    return next(err);
  }
}

export async function resetPasswordByEmail(req, res, next) {
  try {
    const emailInput = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otpValue = typeof req.body?.otp === 'string' ? req.body.otp.trim() : String(req.body?.otp || '').trim();
    const newPassword = req.body?.newPassword;

    if (!emailInput || !isValidEmail(emailInput)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!otpValue || !newPassword) {
      return res.status(400).json({ message: 'email, otp and newPassword are required' });
    }

    const users = await query(`SELECT id, email, role FROM users WHERE email = ? LIMIT 1`, [emailInput]);
    const user = users[0];
    if (!user || user.role !== 'student') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otpValue}.${secret}.${user.id}`).digest('hex');
    const rows = await query(
      `SELECT id, expires_at, used_at FROM password_resets WHERE user_id = ? AND token = ? LIMIT 1`,
      [user.id, tokenHash]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid OTP' });

    const { id, expires_at, used_at } = rows[0];
    if (used_at) return res.status(400).json({ message: 'OTP already used' });
    if (new Date() > new Date(expires_at)) return res.status(400).json({ message: 'OTP expired' });

    const passwordHash = await hashPassword(newPassword);
    await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, user.id]);
    await query(`UPDATE password_resets SET used_at = NOW() WHERE id = ?`, [id]);
    return res.json({ reset: true });
  } catch (err) {
    return next(err);
  }
}

export async function requestLoginOtpByEmail(req, res, next) {
  try {
    const emailInput = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!emailInput || !isValidEmail(emailInput)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    const users = await query(`SELECT id, email, role, name FROM users WHERE email = ? LIMIT 1`, [emailInput]);
    const user = users[0];

    // Always return generic message
    if (!user || user.role !== 'student') {
      return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otp}.${secret}.${user.id}.login`).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query(`UPDATE login_otps SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [user.id]);
    await query(`INSERT INTO login_otps (user_id, token, expires_at) VALUES (?, ?, ?)`, [user.id, tokenHash, expiresAt]);

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';

    if (host && smtpUser && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: smtpUser, pass },
      });

      await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Login OTP',
        text: `Your login OTP is ${otp}. This OTP is valid for 10 minutes. If you did not request this, you can ignore this email.`,
      });
    } else {
      if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
        return res.status(500).json({ message: 'Email service not configured' });
      }
      return res.json({ message: 'OTP generated (SMTP not configured).', otp });
    }

    return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
  } catch (err) {
    return next(err);
  }
}

export async function verifyLoginOtpByEmail(req, res, next) {
  try {
    const emailInput = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otpValue = typeof req.body?.otp === 'string' ? req.body.otp.trim() : String(req.body?.otp || '').trim();
    if (!emailInput || !isValidEmail(emailInput)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (!otpValue) {
      return res.status(400).json({ message: 'otp is required' });
    }

    const users = await query(`SELECT id, email, role, name FROM users WHERE email = ? LIMIT 1`, [emailInput]);
    const user = users[0];
    if (!user || user.role !== 'student') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otpValue}.${secret}.${user.id}.login`).digest('hex');
    const rows = await query(
      `SELECT id, expires_at, used_at FROM login_otps WHERE user_id = ? AND token = ? LIMIT 1`,
      [user.id, tokenHash]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid OTP' });

    const { id, expires_at, used_at } = rows[0];
    if (used_at) return res.status(400).json({ message: 'OTP already used' });
    if (new Date() > new Date(expires_at)) return res.status(400).json({ message: 'OTP expired' });

    await query(`UPDATE login_otps SET used_at = NOW() WHERE id = ?`, [id]);

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: 'student' });
    return res.json({ token, user: mapUserRow({ id: user.id, name: user.name, email: user.email, role: 'student' }) });
  } catch (err) {
    return next(err);
  }
}

export async function studentLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [(email || '').toLowerCase()]);
    const user = rows[0];

    if (!user || user.role !== 'student') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(password || '', user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.json({ token, user: mapUserRow(user) });
  } catch (err) {
    return next(err);
  }
}

export async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const rows = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [(email || '').toLowerCase()]);
    const user = rows[0];

    if (!user || user.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(password || '', user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.json({ token, user: mapUserRow(user) });
  } catch (err) {
    return next(err);
  }
}

export async function me(req, res) {
  return res.json({ user: req.user });
}

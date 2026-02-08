import crypto from 'crypto';
import https from 'https';
import nodemailer from 'nodemailer';
import { signToken, hashPassword, verifyPassword } from '../utils/auth.js';
import { LoginOtp, PasswordReset, User } from '../models/index.js';

function mapUserRow(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function isValidEmail(email) {
  const e = String(email || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function sendViaBrevoHttp({ apiKey, fromEmail, fromName, toEmail, subject, text }) {
  const payload = JSON.stringify({
    sender: {
      email: fromEmail,
      name: fromName || fromEmail,
    },
    to: [{ email: toEmail }],
    subject,
    textContent: text,
  });

  const options = {
    method: 'POST',
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload),
    },
    timeout: 12000,
  };

  await new Promise((resolve, reject) => {
    const req = https.request(options, (resp) => {
      let body = '';
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => {
        body += chunk;
      });
      resp.on('end', () => {
        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          resolve(true);
          return;
        }
        let parsed;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch {
          parsed = { message: body };
        }
        reject(new Error(parsed?.message || parsed?.error || 'Brevo email send failed'));
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('Brevo email request timeout'));
    });
    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

async function sendMail({ toEmail, subject, text }) {
  const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();
  const fromRaw = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  const fallbackFrom = fromRaw || 'no-reply@example.com';
  const fromMatch = fallbackFrom.match(/^(.*)<([^>]+)>\s*$/);
  const fromName = fromMatch ? String(fromMatch[1] || '').trim() : '';
  const fromEmail = fromMatch ? String(fromMatch[2] || '').trim() : fallbackFrom;

  if (brevoApiKey) {
    await sendViaBrevoHttp({
      apiKey: brevoApiKey,
      fromEmail,
      fromName,
      toEmail,
      subject,
      text,
    });
    return;
  }

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(String(process.env.SMTP_PORT || 587).trim());
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const from = fromRaw || smtpUser || 'no-reply@example.com';

  if (!host || !smtpUser || !pass || !Number.isFinite(port)) {
    const err = new Error('Email service not configured');
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: smtpUser, pass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  });

  await transporter.sendMail({
    from,
    to: toEmail,
    subject,
    text,
  });
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

    const emailLower = (email || '').toLowerCase();
    const existing = await User.findOne({ email: emailLower }).select({ id: 1 }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const doc = await new User({ name, email: emailLower, password_hash: passwordHash, role: 'student' }).save();

    const user = { id: doc.id, name, email: emailLower, role: 'student' };
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

    const user = await User.findOne({ email: emailInput }).select({ id: 1, email: 1, role: 1 }).lean();

    // Always return a generic message to avoid revealing which emails exist.
    if (!user || user.role !== 'student') {
      return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otp}.${secret}.${user.id}`).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.updateMany({ user_id: user.id, used_at: null }, { $set: { used_at: new Date() } });
    await new PasswordReset({ user_id: user.id, token: tokenHash, expires_at: expiresAt, used_at: null }).save();

    try {
      await sendMail({
        toEmail: user.email,
        subject: 'Password Reset OTP',
        text: `Your password reset OTP is ${otp}. This OTP is valid for 10 minutes. If you did not request this, you can ignore this email.`,
      });
    } catch (e) {
      const prod = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      const hasBrevo = Boolean(String(process.env.BREVO_API_KEY || '').trim());
      const msg = String(e?.message || '').toLowerCase();
      if (prod && (msg.includes('timeout') || msg.includes('timed out') || String(e?.code || '').toLowerCase().includes('timeout'))) {
        return res.status(500).json({ message: 'Email service connection timeout' });
      }
      if (prod) {
        if (hasBrevo) {
          return res.status(500).json({ message: `Email send failed: ${String(e?.message || 'Brevo error')}` });
        }
        return res.status(500).json({ message: 'Email service not configured' });
      }
      return res.json({ message: e?.message || 'Email send failed', otp });
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

    const user = await User.findOne({ email: emailInput }).select({ id: 1, email: 1, role: 1 }).lean();
    if (!user || user.role !== 'student') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otpValue}.${secret}.${user.id}`).digest('hex');
    const row = await PasswordReset.findOne({ user_id: user.id, token: tokenHash }).select({ id: 1, expires_at: 1, used_at: 1 }).lean();
    if (!row) return res.status(400).json({ message: 'Invalid OTP' });

    const { id, expires_at, used_at } = row;
    if (used_at) return res.status(400).json({ message: 'OTP already used' });
    if (new Date() > new Date(expires_at)) return res.status(400).json({ message: 'OTP expired' });

    const passwordHash = await hashPassword(newPassword);
    await User.updateOne({ id: user.id }, { $set: { password_hash: passwordHash } });
    await PasswordReset.updateOne({ id }, { $set: { used_at: new Date() } });
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

    const user = await User.findOne({ email: emailInput }).select({ id: 1, email: 1, role: 1, name: 1 }).lean();

    // Always return generic message
    if (!user || user.role !== 'student') {
      return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
    }

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otp}.${secret}.${user.id}.login`).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await LoginOtp.updateMany({ user_id: user.id, used_at: null }, { $set: { used_at: new Date() } });
    await new LoginOtp({ user_id: user.id, token: tokenHash, expires_at: expiresAt, used_at: null }).save();

    try {
      await sendMail({
        toEmail: user.email,
        subject: 'Login OTP',
        text: `Your login OTP is ${otp}. This OTP is valid for 10 minutes. If you did not request this, you can ignore this email.`,
      });
    } catch (e) {
      const prod = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
      const hasBrevo = Boolean(String(process.env.BREVO_API_KEY || '').trim());
      const msg = String(e?.message || '').toLowerCase();
      if (prod && (msg.includes('timeout') || msg.includes('timed out') || String(e?.code || '').toLowerCase().includes('timeout'))) {
        return res.status(500).json({ message: 'Email service connection timeout' });
      }
      if (prod) {
        if (hasBrevo) {
          return res.status(500).json({ message: `Email send failed: ${String(e?.message || 'Brevo error')}` });
        }
        return res.status(500).json({ message: 'Email service not configured' });
      }
      return res.json({ message: e?.message || 'Email send failed', otp });
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

    const user = await User.findOne({ email: emailInput }).select({ id: 1, email: 1, role: 1, name: 1 }).lean();
    if (!user || user.role !== 'student') {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otpValue}.${secret}.${user.id}.login`).digest('hex');
    const row = await LoginOtp.findOne({ user_id: user.id, token: tokenHash }).select({ id: 1, expires_at: 1, used_at: 1 }).lean();
    if (!row) return res.status(400).json({ message: 'Invalid OTP' });

    const { id, expires_at, used_at } = row;
    if (used_at) return res.status(400).json({ message: 'OTP already used' });
    if (new Date() > new Date(expires_at)) return res.status(400).json({ message: 'OTP expired' });

    await LoginOtp.updateOne({ id }, { $set: { used_at: new Date() } });

    const token = signToken({ id: user.id, name: user.name, email: user.email, role: 'student' });
    return res.json({ token, user: mapUserRow({ id: user.id, name: user.name, email: user.email, role: 'student' }) });
  } catch (err) {
    return next(err);
  }
}

export async function studentLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: (email || '').toLowerCase() }).lean();

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

    const user = await User.findOne({ email: (email || '').toLowerCase() }).lean();

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

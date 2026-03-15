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

// ── Brevo HTTP sender ──────────────────────────────────────────────────────
async function sendViaBrevoHttp({ apiKey, fromEmail, fromName, toEmail, subject, text }) {
  const payload = JSON.stringify({
    sender: { email: fromEmail, name: fromName || fromEmail },
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
    timeout: 15000,
  };

  await new Promise((resolve, reject) => {
    const req = https.request(options, (resp) => {
      let body = '';
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => { body += chunk; });
      resp.on('end', () => {
        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          resolve(true);
          return;
        }
        let parsed;
        try { parsed = body ? JSON.parse(body) : null; } catch { parsed = { message: body }; }
        reject(new Error(parsed?.message || parsed?.error || `Brevo send failed (HTTP ${resp.statusCode})`));
      });
    });
    req.on('timeout', () => req.destroy(new Error('Brevo request timed out after 15 s')));
    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

// ── Singleton SMTP transporter ─────────────────────────────────────────────
// A single instance is reused across all requests (connection pooling).
// Creating a new transporter per-email causes unnecessary TCP handshakes.
let _smtpTransporter = null;

function getSmtpTransporter() {
  if (_smtpTransporter) return _smtpTransporter;

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(String(process.env.SMTP_PORT || '587').trim());
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  if (!host || !smtpUser || !pass || !Number.isFinite(port)) {
    const err = new Error(
      `SMTP not configured on server. ` +
      `host="${host || '(empty)'}" user="${smtpUser || '(empty)'}" port=${port}. ` +
      `Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in your hosting platform's environment variables.`
    );
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  _smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: smtpUser, pass },
    pool: true,          // reuse connections
    maxConnections: 3,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });

  // eslint-disable-next-line no-console
  console.log(`[mail] SMTP transporter initialised → ${host}:${port}  user=${smtpUser}`);
  return _smtpTransporter;
}

// ── Main sendMail ──────────────────────────────────────────────────────────
async function sendMail({ toEmail, subject, text }) {
  const brevoApiKey = String(process.env.BREVO_API_KEY || '').trim();
  const fromRaw = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  const fallbackFrom = fromRaw || 'no-reply@example.com';
  const fromMatch = fallbackFrom.match(/^(.*)<([^>]+)>\s*$/);
  const fromName = fromMatch ? String(fromMatch[1] || '').trim() : '';
  const fromEmail = fromMatch ? String(fromMatch[2] || '').trim() : fallbackFrom;

  if (brevoApiKey) {
    // eslint-disable-next-line no-console
    console.log(`[mail] → Brevo API  to="${toEmail}"  subject="${subject}"`);
    await sendViaBrevoHttp({ apiKey: brevoApiKey, fromEmail, fromName, toEmail, subject, text });
    // eslint-disable-next-line no-console
    console.log(`[mail] ✓ Brevo sent OK to "${toEmail}"`);
    return;
  }

  // Fallback: SMTP
  const from = fromRaw || String(process.env.SMTP_USER || '').trim() || 'no-reply@example.com';
  // eslint-disable-next-line no-console
  console.log(`[mail] → SMTP  to="${toEmail}"  subject="${subject}"`);
  const transporter = getSmtpTransporter();
  await transporter.sendMail({ from, to: toEmail, subject, text });
  // eslint-disable-next-line no-console
  console.log(`[mail] ✓ SMTP sent OK to "${toEmail}"`);
}

// ── Shared mail-error handler ──────────────────────────────────────────────
// Always logs the full error to the server console (visible in hosting
// dashboard logs) then returns an appropriate JSON response to the client.
function handleMailError(err, res, label) {
  // eslint-disable-next-line no-console
  console.error(`[mail] ✗ ${label} FAILED  code=${err?.code || 'n/a'}  msg=${err?.message || err}`);

  const msg = String(err?.message || '').toLowerCase();
  const isNotConfigured = err?.code === 'EMAIL_NOT_CONFIGURED' || msg.includes('not configured');
  const isTimeout = msg.includes('timeout') || msg.includes('timed out') ||
    String(err?.code || '').toLowerCase().includes('timeout');
  const isAuth = msg.includes('invalid login') || msg.includes('535') ||
    msg.includes('authentication') || msg.includes('credential');

  if (isNotConfigured) {
    return res.status(500).json({ message: 'Email service is not configured on the server. Please contact the administrator.' });
  }
  if (isAuth) {
    return res.status(500).json({ message: 'Email authentication failed on the server. Please contact the administrator.' });
  }
  if (isTimeout) {
    return res.status(500).json({ message: 'Email service timed out. Please try again in a moment.' });
  }
  return res.status(500).json({ message: `Could not send OTP email. Please try again. (${err?.message || 'unknown error'})` });
}

// ── Student register ───────────────────────────────────────────────────────
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

// ── Password reset – request OTP ──────────────────────────────────────────
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
      return handleMailError(e, res, 'requestPasswordResetByEmail');
    }

    return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
  } catch (err) {
    return next(err);
  }
}

// ── Password reset – verify OTP + set new password ─────────────────────────
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

// ── OTP login – request OTP ────────────────────────────────────────────────
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
      return handleMailError(e, res, 'requestLoginOtpByEmail');
    }

    return res.json({ message: 'If an account exists, an OTP has been sent to the registered email.' });
  } catch (err) {
    return next(err);
  }
}

// ── OTP login – verify OTP ─────────────────────────────────────────────────
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

// ── Student login (password) ───────────────────────────────────────────────
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

// ── Admin login ────────────────────────────────────────────────────────────
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

// ── /api/auth/me ───────────────────────────────────────────────────────────
export async function me(req, res) {
  return res.json({ user: req.user });
}

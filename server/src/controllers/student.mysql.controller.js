import { ensureSettings } from '../seed/ensureSettings.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import nodemailer from 'nodemailer';
import { hashPassword } from '../utils/auth.js';
import {
  ExamCentre,
  ExamCentreYear,
  LoginOtp,
  Material,
  MaterialCompletion,
  Notification,
  PasswordReset,
  Payment,
  Plan,
  Pyq,
  Result,
  Test,
  TestQuestion,
  User,
  UserAccess,
  UserNotification,
  Menu,
  Video,
} from '../models/index.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

const _ttlCache = new Map();

function getCached(key, ttlMs) {
  const hit = _ttlCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ttlMs) {
    _ttlCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  _ttlCache.set(key, { ts: Date.now(), value });
  return value;
}

async function getOrSetCached(key, ttlMs, fn) {
  const cached = getCached(key, ttlMs);
  if (cached) return cached;
  const inFlightKey = `${key}.__inflight`;
  const inFlight = _ttlCache.get(inFlightKey);
  if (inFlight && inFlight.value) return inFlight.value;
  const p = (async () => {
    try {
      const v = await fn();
      setCached(key, v);
      return v;
    } finally {
      _ttlCache.delete(inFlightKey);
    }
  })();
  _ttlCache.set(inFlightKey, { ts: Date.now(), value: p });
  return p;
}

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v === '1' || v.toLowerCase() === 'true' || v.toLowerCase() === 'yes';
  return Boolean(v);
}

function mapSettingsRow(row) {
  return {
    id: row.id,
    videosEnabled: toBool(row.videos_enabled),
    testsEnabled: toBool(row.tests_enabled),
    pdfsEnabled: toBool(row.pdfs_enabled),
    pyqsEnabled: toBool(row.pyqs_enabled),
    notificationsEnabled: toBool(row.notifications_enabled),
  };
}

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFuture(d) {
  if (!d) return false;
  return d.getTime() > Date.now();
}

async function getPlanByCode(code) {
  const row = await Plan.findOne({ code: String(code || '').trim().toLowerCase() })
    .select({ id: 1, code: 1, status: 1, is_free: 1 })
    .lean();
  return row || null;
}

async function ensureUserAccessRow(userId) {
  const existing = await UserAccess.findOne({ user_id: Number(userId) }).lean();
  if (existing) return existing;

  const doc = await new UserAccess({ user_id: Number(userId) }).save();
  return doc.toObject();
}

function computeActiveAccess(row) {
  const comboExpiry = toDateOrNull(row?.expiry);
  const comboActive = toBool(row?.combo_access) && isFuture(comboExpiry);
  const pyqExpiry = toDateOrNull(row?.pyq_expiry);
  const materialExpiry = toDateOrNull(row?.material_expiry);

  const pyqActive = comboActive || (toBool(row?.pyq_access) && isFuture(pyqExpiry));
  const materialActive = comboActive || (toBool(row?.material_access) && isFuture(materialExpiry));

  return {
    comboActive,
    pyqActive,
    materialActive,
    comboExpiry: comboActive ? comboExpiry : null,
    pyqExpiry: pyqActive ? (comboActive ? comboExpiry : pyqExpiry) : null,
    materialExpiry: materialActive ? (comboActive ? comboExpiry : materialExpiry) : null,
  };
}

async function canAccessPlan(userId, role, planCode) {
  if (role === 'admin') return true;
  const plan = await getPlanByCode(planCode);
  if (!plan || plan.status !== 'active') return false;
  if (toBool(plan.is_free)) return true;

  const accessRow = await ensureUserAccessRow(userId);
  const active = computeActiveAccess(accessRow);

  if (planCode === 'combo') return active.comboActive;
  if (planCode === 'pyq') return active.pyqActive;
  if (planCode === 'materials') return active.materialActive;
  return false;
}

async function getPlanDetailsByCode(code) {
  const row = await Plan.findOne({ code: String(code || '').trim().toLowerCase() })
    .select({ id: 1, code: 1, name: 1, price_paise: 1, duration_days: 1, status: 1, is_free: 1 })
    .lean();
  return row || null;
}

async function listActivePlans() {
  const rows = await Plan.find({ status: 'active' })
    .sort({ id: 1 })
    .select({ id: 1, code: 1, name: 1, price_paise: 1, duration_days: 1, status: 1, is_free: 1 })
    .lean();
  return rows;
}

async function grantAccessForPlan(userId, planCode, durationDays) {
  await ensureUserAccessRow(userId);
  const expiry = new Date(Date.now() + Number(durationDays || 365) * 24 * 60 * 60 * 1000);

  if (planCode === 'combo') {
    await UserAccess.updateOne(
      { user_id: Number(userId) },
      { $set: { combo_access: true, expiry, updated_at: new Date() } }
    );
    return expiry;
  }
  if (planCode === 'pyq') {
    await UserAccess.updateOne(
      { user_id: Number(userId) },
      { $set: { pyq_access: true, pyq_expiry: expiry, updated_at: new Date() } }
    );
    return expiry;
  }
  if (planCode === 'materials') {
    await UserAccess.updateOne(
      { user_id: Number(userId) },
      { $set: { material_access: true, material_expiry: expiry, updated_at: new Date() } }
    );
    return expiry;
  }
  return null;
}

async function createUserNotification(userId, title, message) {
  await new UserNotification({ user_id: Number(userId), title, message, status: 'unread' }).save();
}

async function razorpayCreateOrder({ amountPaise, receipt, notes }) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const err = new Error('Payment gateway not configured');
    err.status = 500;
    throw err;
  }

  const payload = JSON.stringify({
    amount: Number(amountPaise),
    currency: 'INR',
    receipt,
    payment_capture: 1,
    notes: notes || {},
  });

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const options = {
    method: 'POST',
    hostname: 'api.razorpay.com',
    path: '/v1/orders',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      Authorization: `Basic ${auth}`,
    },
  };

  const data = await new Promise((resolve, reject) => {
    const req = https.request(options, (resp) => {
      let body = '';
      resp.setEncoding('utf8');
      resp.on('data', (chunk) => {
        body += chunk;
      });
      resp.on('end', () => {
        let parsed;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch {
          parsed = { message: body };
        }

        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const err = new Error(parsed?.error?.description || parsed?.message || 'Failed to create order');
        err.status = 502;
        reject(err);
      });
    });
    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });

  return data;
}

function verifyRazorpayPaymentSignature({ orderId, paymentId, signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected === signature;
}

function verifyRazorpayWebhookSignature(rawBodyBuffer, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex');
  return expected === signature;
}

export async function razorpayWebhook(req, res, next) {
  try {
    const sig = String(req.headers['x-razorpay-signature'] || '').trim();
    const raw = req.body;
    if (!Buffer.isBuffer(raw)) {
      return res.status(400).json({ message: 'Invalid webhook body' });
    }
    if (!sig || !verifyRazorpayWebhookSignature(raw, sig)) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }

    const jsonText = raw.toString('utf8') || '{}';
    let payload;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      payload = {};
    }

    const event = String(payload?.event || '').trim();
    const orderId =
      payload?.payload?.payment?.entity?.order_id ||
      payload?.payload?.order?.entity?.id ||
      payload?.payload?.payment_link?.entity?.order_id ||
      '';
    const paymentId = payload?.payload?.payment?.entity?.id || '';

    if (!orderId) {
      return res.json({ ok: true, ignored: true });
    }

    const paymentDoc = await Payment.findOne({ razorpay_order_id: String(orderId) }).lean();
    if (!paymentDoc) {
      return res.json({ ok: true, missing: true });
    }

    const planDoc = await Plan.findOne({ id: Number(paymentDoc.plan_id) })
      .select({ code: 1, name: 1, duration_days: 1 })
      .lean();
    if (!planDoc) {
      return res.json({ ok: true, missing: true });
    }

    const payment = {
      ...paymentDoc,
      plan_code: planDoc.code,
      plan_name: planDoc.name,
      duration_days: planDoc.duration_days,
    };

    if (payment.status === 'paid' || payment.status === 'free') {
      return res.json({ ok: true, alreadyProcessed: true });
    }

    if (!['payment.captured', 'order.paid'].includes(event)) {
      return res.json({ ok: true, ignored: true });
    }

    const nextPaymentId = payment.razorpay_payment_id || (paymentId ? String(paymentId) : null);
    await Payment.updateOne(
      { id: Number(payment.id), status: 'created' },
      {
        $set: {
          status: 'paid',
          razorpay_payment_id: nextPaymentId,
          paid_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    const expiry = await grantAccessForPlan(Number(payment.user_id), String(payment.plan_code), Number(payment.duration_days || 365));
    await createUserNotification(Number(payment.user_id), 'Premium activated', `Your ${payment.plan_name} is active.`);

    return res.json({ ok: true, planCode: payment.plan_code, expiry });
  } catch (err) {
    return next(err);
  }
}

export async function listPlansStudent(req, res, next) {
  try {
    const rows = await listActivePlans();
    const plans = rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      pricePaise: Number(p.price_paise || 0),
      durationDays: Number(p.duration_days || 365),
      isFree: toBool(p.is_free),
      status: p.status,
    }));
    return res.json({ plans });
  } catch (err) {
    return next(err);
  }
}

export async function getAccessStatusStudent(req, res, next) {
  try {
    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' });

    const [pyqPlan, materialsPlan, comboPlan] = await Promise.all([
      getPlanDetailsByCode('pyq'),
      getPlanDetailsByCode('materials'),
      getPlanDetailsByCode('combo'),
    ]);

    const accessRow = await ensureUserAccessRow(userId);
    const active = computeActiveAccess(accessRow);

    const pyqUnlocked = role === 'admin' || (pyqPlan?.status === 'active' && (toBool(pyqPlan?.is_free) || active.pyqActive));
    const materialsUnlocked = role === 'admin' || (materialsPlan?.status === 'active' && (toBool(materialsPlan?.is_free) || active.materialActive));
    const comboUnlocked = role === 'admin' || (comboPlan?.status === 'active' && (toBool(comboPlan?.is_free) || active.comboActive));

    return res.json({
      access: {
        pyq: { unlocked: Boolean(pyqUnlocked), expiry: active.pyqExpiry },
        materials: { unlocked: Boolean(materialsUnlocked), expiry: active.materialExpiry },
        combo: { unlocked: Boolean(comboUnlocked), expiry: active.comboExpiry },
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function createPaymentOrderStudent(req, res, next) {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' });
    const planCode = String(req.body?.planCode || req.body?.code || '').trim().toLowerCase();
    if (!['pyq', 'materials', 'combo'].includes(planCode)) {
      return res.status(400).json({ message: 'Invalid planCode' });
    }

    const plan = await getPlanDetailsByCode(planCode);
    if (!plan || plan.status !== 'active') return res.status(400).json({ message: 'Plan is not available' });

    const durationDays = Number(plan.duration_days || 365);

    if (toBool(plan.is_free) || Number(plan.price_paise || 0) <= 0) {
      const expiry = await grantAccessForPlan(userId, planCode, durationDays);
      await createUserNotification(userId, 'Premium activated', `Your ${plan.name} is active.`);
      const orderId = `free_${userId}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      await new Payment({
        user_id: userId,
        plan_id: Number(plan.id),
        amount_paise: 0,
        razorpay_order_id: orderId,
        status: 'free',
        paid_at: new Date(),
      }).save();
      return res.json({ free: true, plan: { code: plan.code, name: plan.name }, expiry });
    }

    const receipt = `rcpt_${userId}_${planCode}_${Date.now()}`;
    const order = await razorpayCreateOrder({
      amountPaise: Number(plan.price_paise),
      receipt,
      notes: { userId: String(userId), planCode: plan.code },
    });

    await new Payment({
      user_id: userId,
      plan_id: Number(plan.id),
      amount_paise: Number(plan.price_paise),
      razorpay_order_id: String(order.id),
      status: 'created',
    }).save();

    return res.json({
      orderId: String(order.id),
      amountPaise: Number(plan.price_paise),
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: { code: plan.code, name: plan.name, durationDays },
      user: { name: req.user?.name, email: req.user?.email },
    });
  } catch (err) {
    return next(err);
  }
}

export async function verifyPaymentStudent(req, res, next) {
  try {
    const userId = Number(req.user?.sub);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' });

    const orderId = String(req.body?.razorpay_order_id || req.body?.orderId || '').trim();
    const paymentId = String(req.body?.razorpay_payment_id || req.body?.paymentId || '').trim();
    const signature = String(req.body?.razorpay_signature || req.body?.signature || '').trim();
    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: 'razorpay_order_id, razorpay_payment_id, razorpay_signature are required' });
    }

    const paymentDoc = await Payment.findOne({ razorpay_order_id: orderId }).lean();
    const planDoc = paymentDoc
      ? await Plan.findOne({ id: Number(paymentDoc.plan_id) }).select({ code: 1, name: 1, duration_days: 1 }).lean()
      : null;
    const payment = paymentDoc && planDoc
      ? {
          ...paymentDoc,
          plan_code: planDoc.code,
          plan_name: planDoc.name,
          duration_days: planDoc.duration_days,
        }
      : null;
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (Number(payment.user_id) !== userId) return res.status(403).json({ message: 'Forbidden' });

    if (!verifyRazorpayPaymentSignature({ orderId, paymentId, signature })) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    if (payment.status === 'paid' || payment.status === 'free') {
      return res.json({ ok: true, alreadyProcessed: true });
    }

    await Payment.updateOne(
      { id: Number(payment.id), status: 'created' },
      {
        $set: {
          status: 'paid',
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          paid_at: new Date(),
          updated_at: new Date(),
        },
      }
    );

    const expiry = await grantAccessForPlan(userId, String(payment.plan_code), Number(payment.duration_days || 365));
    await createUserNotification(userId, 'Premium activated', `Your ${payment.plan_name} is active.`);

    return res.json({ ok: true, planCode: payment.plan_code, expiry });
  } catch (err) {
    return next(err);
  }
}

export async function listMaterialsStudent(req, res, next) {
  try {
    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' });

    const access = String(req.query?.access || req.query?.accessType || '').trim().toLowerCase();
    const type = String(req.query?.type || 'pdf').trim().toLowerCase();
    const allowedAccess = new Set(['free', 'paid']);
    const allowedType = new Set(['pdf', 'pyq']);

    const filter = {};
    if (allowedType.has(type)) filter.type = type;
    if (allowedAccess.has(access)) filter.access_type = access;

    const dbFilter = { ...filter, status: 'active' };
    const cacheKey = `materials:list:v1:${dbFilter.type || 'all'}:${dbFilter.access_type || 'all'}`;
    const rows = await getOrSetCached(cacheKey, 8000, () =>
      Material.find(dbFilter)
        .sort({ created_at: -1, id: -1 })
        .select({ id: 1, title: 1, pdf_url: 1, subject: 1, type: 1, access_type: 1, created_at: 1 })
        .lean()
    );

    const [materialsUnlocked, pyqUnlocked] = await Promise.all([
      canAccessPlan(userId, role, 'materials'),
      canAccessPlan(userId, role, 'pyq'),
    ]);
    const materials = rows.map((m) => {
      const accessType = String(m.access_type || 'free').toLowerCase();
      const planUnlocked = String(m.type || '').toLowerCase() === 'pyq' ? pyqUnlocked : materialsUnlocked;
      const locked = accessType === 'paid' && !planUnlocked;
      const fileEndpoint = `/api/student/materials/${m.id}/file`;
      const pdfUrl = accessType === 'paid' ? fileEndpoint : (m.pdf_url || fileEndpoint);
      return {
        id: m.id,
        title: m.title,
        subject: m.subject,
        type: m.type,
        accessType,
        locked,
        pdfUrl,
      };
    });

    return res.json({ materials });
  } catch (err) {
    return next(err);
  }
}

function resolveAndValidateFile(ref, allowedBases) {
  const privateBaseMaterials = path.resolve(process.cwd(), 'private_uploads', 'materials');
  const privateBasePyqs = path.resolve(process.cwd(), 'private_uploads', 'pyqs');
  const uploadsBase = path.resolve(process.cwd(), 'uploads');

  let abs;
  const r = String(ref || '').trim();
  if (r.startsWith('/uploads/')) {
    abs = path.resolve(process.cwd(), r.slice(1));
  } else if (r.startsWith('uploads/')) {
    abs = path.resolve(process.cwd(), r);
  } else if (r.startsWith('private_uploads/')) {
    abs = path.resolve(process.cwd(), r);
  } else {
    abs = path.resolve(process.cwd(), r);
  }

  const resolved = path.resolve(abs);
  const allowedMap = {
    uploads: resolved.startsWith(uploadsBase),
    pyqs: resolved.startsWith(privateBasePyqs),
    materials: resolved.startsWith(privateBaseMaterials),
  };

  const allowed = allowedBases.some((b) => allowedMap[b]);
  return { resolved, allowed };
}

function contentTypeForPath(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

export async function getMenus(req, res, next) {
  try {
    const rows = await Menu.find({ status: 'active', type: { $in: ['student', 'both'] } })
      .sort({ menu_order: 1, id: 1 })
      .lean();
    return res.json({ menus: rows });
  } catch (err) {
    return next(err);
  }
}

export async function listVideosStudent(req, res, next) {
  try {
    const rows = await Video.find({ status: 'active' }).sort({ created_at: -1, id: -1 }).limit(60).lean();
    const videos = rows.map((v) => ({ id: v.id, title: v.title, videoUrl: v.video_url, subject: v.subject, status: v.status }));
    return res.json({ videos });
  } catch (err) {
    return next(err);
  }
}

export async function listNotificationsStudent(req, res, next) {
  try {
    const rows = await Notification.find({ status: 'active' }).sort({ created_at: -1, id: -1 }).limit(50).lean();
    const notifications = rows.map((n) => ({ id: n.id, title: n.title, message: n.message, status: n.status }));
    return res.json({ notifications });
  } catch (err) {
    return next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const settingsRow = await getOrSetCached('settings:v1', 5000, () => ensureSettings());
    const settings = mapSettingsRow(settingsRow);

    const [videos, pdfs, pyqs, notifications, tests] = await Promise.all([
      settings.videosEnabled
        ? getOrSetCached('dashboard:videos:v1', 8000, () =>
            Video.find({ status: 'active' })
              .sort({ created_at: -1, id: -1 })
              .limit(12)
              .select({ id: 1, title: 1, video_url: 1, subject: 1, status: 1 })
              .lean()
          )
        : [],
      settings.pdfsEnabled
        ? getOrSetCached('dashboard:pdfs:v1', 8000, () =>
            Material.find({ type: 'pdf', status: 'active' })
              .sort({ created_at: -1, id: -1 })
              .limit(12)
              .select({ id: 1, title: 1, pdf_url: 1, subject: 1, type: 1, access_type: 1 })
              .lean()
          )
        : [],
      settings.pyqsEnabled
        ? getOrSetCached('dashboard:pyqs:v1', 8000, () =>
            Material.find({ type: 'pyq', status: 'active' })
              .sort({ created_at: -1, id: -1 })
              .limit(12)
              .select({ id: 1, title: 1, pdf_url: 1, subject: 1, type: 1, access_type: 1 })
              .lean()
          )
        : [],
      settings.notificationsEnabled
        ? getOrSetCached('dashboard:notifications:v1', 5000, () =>
            Notification.find({ status: 'active' })
              .sort({ created_at: -1, id: -1 })
              .limit(10)
              .select({ id: 1, title: 1, message: 1, status: 1 })
              .lean()
          )
        : [],
      settings.testsEnabled
        ? getOrSetCached('dashboard:tests:v1', 8000, () =>
            Test.find({ is_active: true, question_count: { $gt: 0 } })
              .sort({ created_at: -1, id: -1 })
              .limit(20)
              .select({ id: 1, title: 1, question_count: 1, per_question_seconds: 1, marks_correct: 1, is_active: 1 })
              .lean()
          )
        : [],
    ]);

    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    const [materialsUnlocked, pyqUnlocked] = await Promise.all([
      Number.isFinite(userId) ? canAccessPlan(userId, role, 'materials') : false,
      Number.isFinite(userId) ? canAccessPlan(userId, role, 'pyq') : false,
    ]);
    const accessRow = Number.isFinite(userId) ? await ensureUserAccessRow(userId) : null;
    const activeAccess = computeActiveAccess(accessRow);

    const planRows = await listActivePlans();
    const premiumPlans = planRows.map((p) => ({
      code: p.code,
      name: p.name,
      pricePaise: Number(p.price_paise || 0),
      durationDays: Number(p.duration_days || 365),
      isFree: toBool(p.is_free),
    }));

    return res.json({
      settings,
      premiumPlans,
      premiumStatus: {
        comboActive: activeAccess.comboActive,
        pyqActive: activeAccess.pyqActive,
        materialActive: activeAccess.materialActive,
        comboExpiry: activeAccess.comboExpiry,
        pyqExpiry: activeAccess.pyqExpiry,
        materialExpiry: activeAccess.materialExpiry,
      },
      videos: videos.map((v) => ({ id: v.id, title: v.title, videoUrl: v.video_url, subject: v.subject, status: v.status })),
      pdfs: pdfs.map((m) => {
        const accessType = String(m.access_type || 'free').toLowerCase();
        const locked = accessType === 'paid' && !materialsUnlocked;
        const pdfUrl = accessType === 'paid' ? `/api/student/materials/${m.id}/file` : m.pdf_url;
        return {
          id: m.id,
          title: m.title,
          pdfUrl,
          subject: m.subject,
          type: m.type,
          accessType,
          locked,
        };
      }),
      pyqs: pyqs.map((m) => {
        const accessType = String(m.access_type || 'free').toLowerCase();
        const locked = accessType === 'paid' && !pyqUnlocked;
        const pdfUrl = accessType === 'paid' ? `/api/student/materials/${m.id}/file` : m.pdf_url;
        return {
          id: m.id,
          title: m.title,
          pdfUrl,
          subject: m.subject,
          type: m.type,
          accessType,
          locked,
        };
      }),
      notifications: notifications.map((n) => ({ id: n.id, title: n.title, message: n.message, status: n.status })),
      tests: tests.map((t) => ({
        id: t.id,
        title: t.title,
        questionCount: t.question_count,
        perQuestionSeconds: t.per_question_seconds,
        marksCorrect: t.marks_correct,
        isActive: toBool(t.is_active),
      })),
    });
  } catch (err) {
    return next(err);
  }
}

export async function listActiveTests(req, res, next) {
  try {
    const settingsRow = await getOrSetCached('settings:v1', 5000, () => ensureSettings());
    if (!toBool(settingsRow.tests_enabled)) {
      return res.json({ tests: [] });
    }

    const rows = await getOrSetCached(
      'tests:active:v1',
      8000,
      () => Test.find({ is_active: true, question_count: { $gt: 0 } })
        .sort({ created_at: -1, id: -1 })
        .select({ id: 1, title: 1, is_active: 1, question_count: 1, per_question_seconds: 1, marks_correct: 1 })
        .lean()
    );
    const tests = rows.map((t) => ({
      id: t.id,
      title: t.title,
      isActive: toBool(t.is_active),
      questionCount: t.question_count,
      perQuestionSeconds: t.per_question_seconds,
      marksCorrect: t.marks_correct,
    }));

    return res.json({ tests });
  } catch (err) {
    return next(err);
  }
}

export async function startTest(req, res, next) {
  try {
    const { testId } = req.params;
    console.log('[startTest] Called with testId:', testId);

    const settingsRow = await ensureSettings();
    if (!toBool(settingsRow.tests_enabled)) {
      console.log('[startTest] Tests are disabled');
      return res.status(403).json({ message: 'Tests are disabled' });
    }

    const test = await Test.findOne({ id: Number(testId) }).lean();
    console.log('[startTest] Test found:', test ? 'YES' : 'NO');
    if (!test || !toBool(test.is_active)) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Fetch questions from test_questions table
    const questionRows = await TestQuestion.find({ test_id: Number(testId) })
      .sort({ question_order: 1, id: 1 })
      .lean();
    console.log('[startTest] Questions found:', questionRows.length);

    if (!Array.isArray(questionRows) || questionRows.length === 0) {
      console.log('[startTest] No questions available');
      return res.status(400).json({ message: 'No questions available to start the test' });
    }

    if (questionRows.length < test.question_count) {
      console.log('[startTest] Not enough questions. Need:', test.question_count, 'Have:', questionRows.length);
      return res.status(400).json({ message: 'Not enough questions to start the test' });
    }

    // Format questions for frontend
    const questions = questionRows.map((q, idx) => ({
      index: idx,
      id: q.id,
      imageUrl: q.image_url,
      questionText: q.question_text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d],
      correctOption: q.correct_option
    }));

    console.log('[startTest] Returning', questions.length, 'questions');

    return res.json({
      test: {
        id: test.id,
        title: test.title,
        questionCount: test.question_count,
        perQuestionSeconds: test.per_question_seconds,
        marksCorrect: test.marks_correct,
      },
      questions,
      serverTime: Date.now(),
    });
  } catch (err) {
    return next(err);
  }
}

export async function submitTest(req, res, next) {
  try {
    const { testId } = req.params;
    const userId = Number(req.user.sub);

    const settingsRow = await ensureSettings();
    if (!toBool(settingsRow.tests_enabled)) {
      return res.status(403).json({ message: 'Tests are disabled' });
    }

    const test = await Test.findOne({ id: Number(testId) }).lean();
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    const { responses, timeTakenSec } = req.body;
    if (!Array.isArray(responses) || typeof timeTakenSec !== 'number') {
      return res.status(400).json({ message: 'responses (array) and timeTakenSec (number) are required' });
    }

    console.log('[submitTest] Received responses:', responses);

    const ids = responses.map((r) => Number(r.questionId)).filter((n) => Number.isFinite(n));
    const uniqueIds = [...new Set(ids)];

    const questionRows = uniqueIds.length
      ? await TestQuestion.find({ id: { $in: uniqueIds } }).select({ id: 1, correct_option: 1 }).lean()
      : [];

    const correctMap = new Map(questionRows.map((q) => [Number(q.id), q.correct_option]));

    let correctCount = 0;
    let wrongCount = 0;

    const normalizedResponses = responses.map((r) => {
      const questionId = Number(r.questionId);
      const correctOption = correctMap.get(questionId);
      const selected = typeof r.selected === 'number' ? ['A', 'B', 'C', 'D'][r.selected] : null;
      const isCorrect = correctOption && selected === correctOption;

      console.log(`[submitTest] Question ${questionId}: selected=${selected}, correct=${correctOption}, isCorrect=${isCorrect}`);

      if (correctOption) {
        if (isCorrect) correctCount += 1;
        else wrongCount += 1;
      }

      return {
        questionId,
        selected,
        correct: Boolean(isCorrect),
        correctOption,
        selectedIndex: typeof r.selected === 'number' ? r.selected : null,
      };
    });

    const totalQuestions = test.question_count;
    const marksCorrect = test.marks_correct || 4;
    const score = correctCount * marksCorrect;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 10000) / 100 : 0;

    console.log('[submitTest] Results:', { correctCount, wrongCount, totalQuestions, score, accuracy });

    const inserted = await new Result({
      user_id: userId,
      test_id: Number(testId),
      score,
      correct_count: correctCount,
      wrong_count: wrongCount,
      total_questions: totalQuestions,
      accuracy,
      time_taken_sec: timeTakenSec,
      responses_json: JSON.stringify(normalizedResponses),
      date: new Date(),
    }).save();

    const betterCount = await Result.countDocuments({
      test_id: Number(testId),
      $or: [{ score: { $gt: score } }, { score, time_taken_sec: { $lt: timeTakenSec } }],
    });

    const rank = Number(betterCount || 0) + 1;

    return res.status(201).json({
      result: {
        id: inserted.id,
        score,
        outOf: totalQuestions * marksCorrect,
        accuracy,
        correctCount,
        wrongCount,
        totalQuestions,
        timeTakenSec,
        rank,
        date: new Date(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function myResults(req, res, next) {
  try {
    const userId = Number(req.user.sub);

    const rows = await Result.find({ user_id: userId })
      .sort({ date: -1, id: -1 })
      .limit(50)
      .select({
        id: 1,
        test_id: 1,
        score: 1,
        correct_count: 1,
        wrong_count: 1,
        total_questions: 1,
        accuracy: 1,
        time_taken_sec: 1,
        date: 1,
      })
      .lean();
    const testIds = [...new Set(rows.map((r) => Number(r.test_id)).filter((x) => Number.isFinite(x)))];
    const tests = testIds.length ? await Test.find({ id: { $in: testIds } }).select({ id: 1, title: 1 }).lean() : [];
    const testTitleById = new Map(tests.map((t) => [Number(t.id), t.title]));

    const results = rows.map((r) => ({
      id: r.id,
      testId: r.test_id,
      testTitle: testTitleById.get(Number(r.test_id)) || '',
      score: r.score,
      correctCount: r.correct_count,
      wrongCount: r.wrong_count,
      totalQuestions: r.total_questions,
      accuracy: Number(r.accuracy),
      timeTakenSec: r.time_taken_sec,
      date: r.date,
    }));

    return res.json({ results });
  } catch (err) {
    return next(err);
  }
}

export async function resultDetails(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const { id } = req.params;

    const r = await Result.findOne({ id: Number(id), user_id: userId }).lean();
    if (!r) return res.status(404).json({ message: 'Result not found' });

    const t = await Test.findOne({ id: Number(r.test_id) }).select({ id: 1, title: 1 }).lean();
    const responses = JSON.parse(r.responses_json || '[]');

    const questionIds = responses
      .map((resp) => resp.questionId)
      .filter((qid) => Number.isFinite(Number(qid)))
      .map((qid) => Number(qid));

    const questionRows = questionIds.length
      ? await TestQuestion.find({ id: { $in: questionIds } })
          .select({
            id: 1,
            question_text: 1,
            image_url: 1,
            option_a: 1,
            option_b: 1,
            option_c: 1,
            option_d: 1,
            correct_option: 1,
            question_order: 1,
          })
          .sort({ question_order: 1, id: 1 })
          .lean()
      : [];

    const questionById = new Map(questionRows.map((q) => [Number(q.id), q]));
    const detailedResponses = responses.map((resp) => {
      const question = questionById.get(Number(resp.questionId));
      return {
        ...resp,
        questionText: question?.question_text || '',
        imageUrl: question?.image_url || '',
        options: question ? [question.option_a, question.option_b, question.option_c, question.option_d] : [],
        correctOption: question?.correct_option || '',
        questionOrder: question?.question_order || 0,
      };
    });

    return res.json({
      result: {
        id: r.id,
        testId: r.test_id,
        testTitle: t?.title || '',
        score: r.score,
        correctCount: r.correct_count,
        wrongCount: r.wrong_count,
        totalQuestions: r.total_questions,
        accuracy: Number(r.accuracy),
        timeTakenSec: r.time_taken_sec,
        responses: detailedResponses,
        date: r.date,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function myProgress(req, res, next) {
  try {
    const userId = Number(req.user.sub);

    const rows = await Result.find({ user_id: userId })
      .sort({ date: -1, id: -1 })
      .limit(10)
      .select({ date: 1, score: 1, accuracy: 1 })
      .lean();

    const points = [...rows].reverse().map((r) => ({ date: r.date, score: r.score, accuracy: Number(r.accuracy) }));

    return res.json({ points });
  } catch (err) {
    return next(err);
  }
}

export async function completeMaterial(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const { materialId } = req.body;
    if (!materialId) return res.status(400).json({ message: 'materialId is required' });

    const mid = Number(materialId);
    await MaterialCompletion.updateOne(
      { user_id: userId, material_id: mid },
      { $setOnInsert: { user_id: userId, material_id: mid } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ completed: true });
  } catch (err) {
    return next(err);
  }
}

export async function getMaterialCompletions(req, res, next) {
  try {
    const userId = Number(req.user.sub);

    const rows = await MaterialCompletion.find({ user_id: userId }).select({ material_id: 1 }).lean();
    return res.json({ completedIds: rows.map((r) => r.material_id) });
  } catch (err) {
    return next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const userId = Number(req.user.sub);

    const user = await User.findOne({ id: userId }).select({ id: 1, name: 1, email: 1, role: 1 }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    await User.updateOne({ id: userId }, { $set: { name: String(name), updated_at: new Date() } });
    return res.json({ updated: true });
  } catch (err) {
    return next(err);
  }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' });

    const userDoc = await User.findOne({ id: userId }).select({ id: 1, email: 1 }).lean();
    if (!userDoc) return res.status(404).json({ message: 'User not found' });
    const email = String(userDoc.email || '').trim();
    if (!email) return res.status(400).json({ message: 'Email not found for this account' });

    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otp}.${secret}.${userId}`).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.updateMany({ user_id: userId, used_at: null }, { $set: { used_at: new Date() } });
    await new PasswordReset({ user_id: userId, token: tokenHash, expires_at: expiresAt }).save();

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
        to: email,
        subject: 'Password Reset OTP',
        text: `Your password reset OTP is ${otp}. This OTP is valid for 10 minutes. If you did not request this, you can ignore this email.`,
      });

      return res.json({ message: 'OTP sent to your registered email.' });
    }

    if (String(process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      return res.json({
        message: 'OTP generated (SMTP not configured).',
        otp,
      });
    }

    return res.status(500).json({ message: 'Email service not configured' });
  } catch (err) {
    return next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const userId = Number(req.user.sub);
    if (!Number.isFinite(userId)) return res.status(401).json({ message: 'Unauthorized' });

    const { otp, newPassword } = req.body;
    const otpValue = typeof otp === 'string' ? otp.trim() : String(otp || '').trim();
    if (!otpValue || !newPassword) return res.status(400).json({ message: 'otp and newPassword are required' });

    const secret = process.env.PASSWORD_RESET_OTP_SECRET || process.env.JWT_SECRET || 'dev-secret';
    const tokenHash = crypto.createHash('sha256').update(`${otpValue}.${secret}.${userId}`).digest('hex');

    const pr = await PasswordReset.findOne({ user_id: userId, token: tokenHash })
      .select({ id: 1, expires_at: 1, used_at: 1 })
      .lean();

    if (!pr) return res.status(400).json({ message: 'Invalid OTP' });
    if (pr.used_at) return res.status(400).json({ message: 'OTP already used' });
    if (new Date() > new Date(pr.expires_at)) return res.status(400).json({ message: 'OTP expired' });

    const passwordHash = await (await import('../utils/auth.js')).hashPassword(newPassword);
    await User.updateOne({ id: userId }, { $set: { password_hash: passwordHash, updated_at: new Date() } });
    await PasswordReset.updateOne({ id: Number(pr.id) }, { $set: { used_at: new Date() } });
    return res.json({ reset: true });
  } catch (err) {
    return next(err);
  }
}

export async function listPyqsStudent(req, res, next) {
  try {
    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    const pyqUnlocked = Number.isFinite(userId) ? await canAccessPlan(userId, role, 'pyq') : false;

    const rows = await getOrSetCached(
      'pyqs:all:v1',
      8000,
      () => Pyq.find({ status: 'active' })
        .sort({ year: -1, created_at: -1, id: -1 })
        .select({ id: 1, title: 1, subject: 1, year: 1, access_type: 1 })
        .lean()
    );
    const pyqs = rows.map((p) => {
      const accessType = String(p.access_type || 'paid').toLowerCase();
      const locked = accessType === 'paid' && !pyqUnlocked;
      return {
        id: p.id,
        title: p.title,
        subject: p.subject,
        year: p.year,
        accessType,
        locked,
      };
    });
    return res.json({ pyqs });
  } catch (err) {
    return next(err);
  }
}

export async function listExamCentresStudent(req, res, next) {
  try {
    const rows = await ExamCentre.find({ status: 'active', id: { $ne: null } })
      .sort({ name: 1, id: 1 })
      .select({ id: 1, name: 1 })
      .lean();
    return res.json({ centres: rows });
  } catch (err) {
    return next(err);
  }
}

export async function listExamCentreYearsStudent(req, res, next) {
  try {
    const { centreId } = req.params;
    const cid = Number(centreId);
    if (!Number.isFinite(cid)) return res.status(400).json({ message: 'centreId is required' });
    const rows = await ExamCentreYear.find({ centre_id: cid, status: 'active' })
      .sort({ year: -1, id: -1 })
      .select({ id: 1, year: 1 })
      .lean();
    return res.json({ years: rows });
  } catch (err) {
    return next(err);
  }
}

export async function listPyqsByCentreYear(req, res, next) {
  try {
    const centreId = Number(req.query.centreId);
    const year = typeof req.query.year === 'string' ? req.query.year.trim() : '';
    if (!Number.isFinite(centreId)) return res.status(400).json({ message: 'centreId is required' });
    if (!year) return res.status(400).json({ message: 'year is required' });

    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    const pyqUnlocked = Number.isFinite(userId) ? await canAccessPlan(userId, role, 'pyq') : false;

    const cacheKey = `pyqs:centreYear:v1:${centreId}:${year}`;
    const rows = await getOrSetCached(
      cacheKey,
      8000,
      () => Pyq.find({ status: 'active', centre_id: centreId, year })
        .sort({ created_at: -1, id: -1 })
        .select({ id: 1, title: 1, subject: 1, year: 1, access_type: 1 })
        .lean()
    );
    const pyqs = rows.map((p) => {
      const accessType = String(p.access_type || 'paid').toLowerCase();
      const locked = accessType === 'paid' && !pyqUnlocked;
      return {
        id: p.id,
        title: p.title,
        subject: p.subject,
        year: p.year,
        accessType,
        locked,
      };
    });
    return res.json({ pyqs });
  } catch (err) {
    return next(err);
  }
}

export async function streamPyqPdf(req, res, next) {
  try {
    const { id } = req.params;
    const p = await Pyq.findOne({ id: Number(id) })
      .select({ id: 1, title: 1, pdf_url: 1, status: 1, access_type: 1 })
      .lean();
    if (!p || p.status !== 'active') return res.status(404).json({ message: 'PYQ not found' });

    const accessType = String(p.access_type || 'paid').toLowerCase();

    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    if (accessType === 'paid') {
      const ok = Number.isFinite(userId) ? await canAccessPlan(userId, role, 'pyq') : false;
      if (!ok) return res.status(403).json({ message: 'Premium access required' });
    }

    const ref = String(p.pdf_url || '').trim();
    if (!ref) return res.status(404).json({ message: 'File not found' });

    const allowedBases = accessType === 'paid' ? ['pyqs'] : ['uploads'];
    const { resolved, allowed } = resolveAndValidateFile(ref, allowedBases);
    if (!allowed) return res.status(400).json({ message: 'Invalid file reference' });
    if (!fs.existsSync(resolved)) return res.status(404).json({ message: 'File not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(resolved);
    stream.on('error', (e) => next(e));
    return stream.pipe(res);
  } catch (err) {
    return next(err);
  }
}

export async function streamMaterialFile(req, res, next) {
  try {
    const { id } = req.params;
    const m = await Material.findOne({ id: Number(id) }).select({ id: 1, title: 1, pdf_url: 1, access_type: 1, type: 1 }).lean();
    if (!m) return res.status(404).json({ message: 'Material not found' });

    const accessType = String(m.access_type || 'free').toLowerCase();
    const ref = String(m.pdf_url || '').trim();
    if (!ref) return res.status(404).json({ message: 'File not found' });

    const userId = Number(req.user?.sub);
    const role = String(req.user?.role || 'student');
    if (accessType === 'paid') {
      const planCode = String(m.type || '').toLowerCase() === 'pyq' ? 'pyq' : 'materials';
      const ok = Number.isFinite(userId) ? await canAccessPlan(userId, role, planCode) : false;
      if (!ok) return res.status(403).json({ message: 'Premium access required' });
    }

    const isPyqMaterial = String(m.type || '').toLowerCase() === 'pyq';
    const allowedBases = accessType === 'paid'
      ? (isPyqMaterial ? ['pyqs', 'materials'] : ['materials'])
      : ['materials', 'uploads'];
    const { resolved, allowed } = resolveAndValidateFile(ref, allowedBases);
    if (!allowed) return res.status(400).json({ message: 'Invalid file reference' });
    if (!fs.existsSync(resolved)) return res.status(404).json({ message: 'File not found' });

    res.setHeader('Content-Type', contentTypeForPath(resolved));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(resolved);
    stream.on('error', (e) => next(e));
    return stream.pipe(res);
  } catch (err) {
    return next(err);
  }
}

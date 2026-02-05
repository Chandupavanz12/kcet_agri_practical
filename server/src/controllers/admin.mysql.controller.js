import { query } from '../config/db-pg.js';
import { ensureSettings } from '../seed/ensureSettings.js';
import { makePrivateMaterialRef, makePrivateUploadRef, makePublicUploadUrl } from '../middleware/upload.js';
import { hashPassword } from '../utils/auth.js';

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

function buildUpdate(fields, mapping) {
  const set = [];
  const params = [];

  for (const [key, col] of Object.entries(mapping)) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      set.push(`${col} = ?`);
      params.push(fields[key]);
    }
  }

  return { set, params };
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function badRequest(res, message, details) {
  return res.status(400).json({ message, details });
}

function asNonEmptyString(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normalizeStatus(v, allowed) {
  const s = asNonEmptyString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (!allowed.includes(lower)) return null;
  return lower;
}

async function ensureExamCentreByName(name) {
  const centreName = typeof name === 'string' ? name.trim() : '';
  if (!centreName) return null;

  await query(
    "INSERT INTO exam_centres (name, status) VALUES (?, 'active') ON DUPLICATE KEY UPDATE status = 'active'",
    [centreName]
  );

  const rows = await query('SELECT id FROM exam_centres WHERE name = ? LIMIT 1', [centreName]);
  return rows.length ? Number(rows[0].id) : null;
}

async function ensureExamCentreYearActive(centreId, year) {
  const yr = typeof year === 'string' ? year.trim() : String(year ?? '').trim();
  if (!yr) return null;

  await query(
    "INSERT INTO exam_centre_years (centre_id, year, status) VALUES (?, ?, 'active') ON DUPLICATE KEY UPDATE status = 'active'",
    [centreId, yr]
  );
  return yr;
}

function parseOptions(input) {
  // Accept:
  // - array of strings
  // - JSON string of array
  // - object {0,1,2,3} from form
  if (Array.isArray(input)) {
    return input.map((x) => String(x ?? '').trim());
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return null;
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x ?? '').trim());
    } catch (_) {
      return null;
    }
  }
  if (input && typeof input === 'object') {
    const arr = [input[0], input[1], input[2], input[3]].map((x) => String(x ?? '').trim());
    return arr;
  }
  return null;
}

export async function uploadSpecimenImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  return res.json({ url: makePublicUploadUrl(req.file.path) });
}

export async function uploadMaterialPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  return res.json({ url: makePublicUploadUrl(req.file.path) });
}

export async function uploadMaterialPdfPrivate(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  return res.json({ ref: makePrivateMaterialRef(req.file.path) });
}

export async function uploadPyqPdfPrivate(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  return res.json({ ref: makePrivateUploadRef(req.file.path) });
}

export async function uploadPyqPdfPublic(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  return res.json({ url: makePublicUploadUrl(req.file.path) });
}

export async function createExamCentre(req, res, next) {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : 'active';
    if (!name) return res.status(400).json({ message: 'name is required' });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'status must be active|inactive' });

    const result = await query('INSERT INTO exam_centres (name, status) VALUES (?, ?)', [name, status]);
    const rows = await query('SELECT * FROM exam_centres WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ centre: rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function listExamCentres(req, res, next) {
  try {
    const rows = await query('SELECT * FROM exam_centres ORDER BY name ASC, id ASC');
    return res.json({ centres: rows });
  } catch (err) {
    return next(err);
  }
}

export async function updateExamCentre(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const mapping = { name: 'name', status: 'status' };
    const { set, params } = buildUpdate(fields, mapping);
    if (set.length === 0) return res.status(400).json({ message: 'No fields to update' });
    await query(`UPDATE exam_centres SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    const rows = await query('SELECT * FROM exam_centres WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Centre not found' });
    return res.json({ centre: rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExamCentre(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM exam_centres WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Centre not found' });
    await query('DELETE FROM exam_centre_years WHERE centre_id = ?', [id]);
    await query('UPDATE pyqs SET centre_id = NULL WHERE centre_id = ?', [id]);
    await query('DELETE FROM exam_centres WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createExamCentreYear(req, res, next) {
  try {
    const { centreId } = req.params;
    const year = typeof req.body?.year === 'string' ? req.body.year.trim() : '';
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : 'active';
    if (!year) return res.status(400).json({ message: 'year is required' });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'status must be active|inactive' });
    const centres = await query('SELECT id FROM exam_centres WHERE id = ? LIMIT 1', [centreId]);
    if (!centres.length) return res.status(404).json({ message: 'Centre not found' });

    const result = await query('INSERT INTO exam_centre_years (centre_id, year, status) VALUES (?, ?, ?)', [centreId, year, status]);
    const rows = await query('SELECT * FROM exam_centre_years WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ year: rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function listExamCentreYears(req, res, next) {
  try {
    const { centreId } = req.params;
    const rows = await query('SELECT * FROM exam_centre_years WHERE centre_id = ? ORDER BY year DESC, id DESC', [centreId]);
    return res.json({ years: rows });
  } catch (err) {
    return next(err);
  }
}

export async function updateExamCentreYear(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const mapping = { year: 'year', status: 'status' };
    const { set, params } = buildUpdate(fields, mapping);
    if (set.length === 0) return res.status(400).json({ message: 'No fields to update' });
    await query(`UPDATE exam_centre_years SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    const rows = await query('SELECT * FROM exam_centre_years WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Year not found' });
    return res.json({ year: rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExamCentreYear(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id, centre_id, year FROM exam_centre_years WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Year not found' });
    const y = rows[0];
    const used = await query('SELECT COUNT(*) as cnt FROM pyqs WHERE centre_id = ? AND year = ? LIMIT 1', [y.centre_id, y.year]);
    if (Number(used?.[0]?.cnt || 0) > 0) {
      return res.status(400).json({ message: 'Cannot delete year with existing PYQs' });
    }
    await query('DELETE FROM exam_centre_years WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function listStudents(req, res, next) {
  try {
    const students = await query(
      'SELECT id, name, email, created_at as createdAt FROM users WHERE role = ? ORDER BY created_at DESC',
      ['student']
    );
    return res.json({ students });
  } catch (err) {
    return next(err);
  }
}

export async function createStudent(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, password are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [(email || '').toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const result = await query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      name,
      email.toLowerCase(),
      passwordHash,
      'student',
    ]);

    return res.status(201).json({ user: { id: result.insertId, name, email: email.toLowerCase(), role: 'student' } });
  } catch (err) {
    return next(err);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const rows = await query('SELECT * FROM users WHERE id = ? AND role = ? LIMIT 1', [id, 'student']);
    const student = rows[0];
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (email && email.toLowerCase() !== student.email) {
      const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
      if (existing.length > 0) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase();
    if (password) updates.password_hash = await hashPassword(password);

    const { set, params } = buildUpdate(updates, { name: 'name', email: 'email', password_hash: 'password_hash' });
    if (set.length === 0) {
      return res.json({ user: { id: student.id, name: student.name, email: student.email, role: student.role } });
    }

    await query(`UPDATE users SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    const updatedRows = await query('SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1', [id]);
    return res.json({ user: updatedRows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;

    const rows = await query('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1', [id, 'student']);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await query('DELETE FROM results WHERE user_id = ?', [id]);
    await query('DELETE FROM users WHERE id = ?', [id]);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createVideo(req, res, next) {
  try {
    const body = req.body || {};
    const title = asNonEmptyString(body.title);
    const videoUrl = asNonEmptyString(body.videoUrl);
    const subject = asNonEmptyString(body.subject) || 'General';
    const status = normalizeStatus(body.status, ['active', 'inactive']) || 'active';

    const errors = {};
    if (!title) errors.title = 'title is required';
    if (!videoUrl) errors.videoUrl = 'videoUrl is required';
    if (!subject) errors.subject = 'subject is required';
    if (!normalizeStatus(status, ['active', 'inactive'])) errors.status = 'status must be active|inactive';
    if (Object.keys(errors).length) return badRequest(res, 'Validation failed', errors);

    const result = await query(
      'INSERT INTO videos (title, video_url, subject, status) VALUES (?, ?, ?, ?)',
      [title, videoUrl, subject, status]
    );
    const rows = await query('SELECT * FROM videos WHERE id = ? LIMIT 1', [result.insertId]);
    const v = rows[0];
    return res.status(201).json({
      video: { 
        id: v.id, 
        title: v.title, 
        videoUrl: v.video_url, 
        subject: v.subject, 
        status: v.status 
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listVideos(req, res, next) {
  try {
    const rows = await query('SELECT * FROM videos ORDER BY created_at DESC');
    const videos = rows.map((v) => ({
      id: v.id,
      title: v.title,
      videoUrl: v.video_url,
      subject: v.subject,
      status: v.status,
    }));
    return res.json({ videos });
  } catch (err) {
    return next(err);
  }
}

export async function updateVideo(req, res, next) {
  try {
    const { id } = req.params;

    const body = { ...(req.body || {}) };
    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const st = normalizeStatus(body.status, ['active', 'inactive']);
      if (!st) return badRequest(res, 'Validation failed', { status: 'status must be active|inactive' });
      body.status = st;
    }

    const mapping = { title: 'title', videoUrl: 'video_url', subject: 'subject', status: 'status' };
    const { set, params } = buildUpdate(body, mapping);
    if (set.length === 0) {
      const rows = await query('SELECT * FROM videos WHERE id = ? LIMIT 1', [id]);
      const v = rows[0];
      if (!v) return res.status(404).json({ message: 'Video not found' });
      return res.json({ 
        video: { 
          id: v.id, 
          title: v.title, 
          videoUrl: v.video_url, 
          subject: v.subject, 
          status: v.status 
        } 
      });
    }

    await query(`UPDATE videos SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    const rows = await query('SELECT * FROM videos WHERE id = ? LIMIT 1', [id]);
    const v = rows[0];
    if (!v) return res.status(404).json({ message: 'Video not found' });
    return res.json({ 
      video: { 
        id: v.id, 
        title: v.title, 
        videoUrl: v.video_url, 
        subject: v.subject, 
        status: v.status 
      } 
    });
  } catch (err) {
    return next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const [students, tests, videos, materials] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['student']).catch(() => [{ count: 0 }]),
      query('SELECT COUNT(*) as count FROM tests WHERE is_active = 1').catch(() => [{ count: 0 }]),
      query('SELECT COUNT(*) as count FROM videos WHERE status = ?', ['active']).catch(() => [{ count: 0 }]),
      query('SELECT COUNT(*) as count FROM materials').catch(() => [{ count: 0 }]),
    ]);

    return res.json({
      students: students[0] || { count: 0 },
      tests: tests[0] || { count: 0 },
      videos: videos[0] || { count: 0 },
      materials: materials[0] || { count: 0 },
    });
  } catch (err) {
    console.error('[getDashboard] Error:', err);
    return res.status(500).json({ 
      message: 'Failed to load dashboard data',
      error: err.message 
    });
  }
}

export async function deleteVideo(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM videos WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Video not found' });
    await query('DELETE FROM videos WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createMaterial(req, res, next) {
  try {
    const body = req.body || {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const pdfUrl = typeof body.pdfUrl === 'string' && body.pdfUrl.trim() ? body.pdfUrl.trim() : (typeof body.pdf_url === 'string' ? body.pdf_url.trim() : '');
    const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim() : 'General';
    const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'pdf';
    const accessTypeRaw = typeof body.accessType === 'string' && body.accessType.trim() ? body.accessType.trim() : (typeof body.access_type === 'string' ? body.access_type.trim() : 'free');
    const accessType = String(accessTypeRaw || 'free').toLowerCase();

    const errors = {};
    if (!title) errors.title = 'title is required';
    if (!pdfUrl) errors.pdfUrl = 'pdfUrl is required';
    if (!['free', 'paid'].includes(accessType)) errors.accessType = 'accessType must be free|paid';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Validation failed', errors });

    const result = await query(
      'INSERT INTO materials (title, pdf_url, subject, type, access_type) VALUES (?, ?, ?, ?, ?)',
      [title, pdfUrl, subject, type, accessType]
    );
    const rows = await query('SELECT * FROM materials WHERE id = ? LIMIT 1', [result.insertId]);
    const m = rows[0];
    return res.status(201).json({
      material: { id: m.id, title: m.title, pdfUrl: m.pdf_url, subject: m.subject, type: m.type, accessType: m.access_type },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listMaterials(req, res, next) {
  try {
    const { type } = req.query;
    const rows = type
      ? await query('SELECT * FROM materials WHERE type = ? ORDER BY created_at DESC', [type])
      : await query('SELECT * FROM materials ORDER BY created_at DESC');

    const materials = rows.map((m) => ({ id: m.id, title: m.title, pdfUrl: m.pdf_url, subject: m.subject, type: m.type, accessType: m.access_type }));
    return res.json({ materials });
  } catch (err) {
    return next(err);
  }
}

export async function updateMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const mapping = { title: 'title', pdfUrl: 'pdf_url', subject: 'subject', type: 'type', accessType: 'access_type' };
    const { set, params } = buildUpdate(req.body || {}, mapping);
    if (set.length > 0) {
      await query(`UPDATE materials SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    }

    const rows = await query('SELECT * FROM materials WHERE id = ? LIMIT 1', [id]);
    const m = rows[0];
    if (!m) return res.status(404).json({ message: 'Material not found' });
    return res.json({ material: { id: m.id, title: m.title, pdfUrl: m.pdf_url, subject: m.subject, type: m.type, accessType: m.access_type } });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM materials WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Material not found' });
    await query('DELETE FROM materials WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function listPlans(req, res, next) {
  try {
    const rows = await query('SELECT id, code, name, price_paise, duration_days, status, is_free FROM plans ORDER BY id ASC');
    const plans = rows.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      pricePaise: Number(p.price_paise || 0),
      durationDays: Number(p.duration_days || 365),
      status: p.status,
      isFree: toBool(p.is_free),
    }));
    return res.json({ plans });
  } catch (err) {
    return next(err);
  }
}

function normalizePlanUpdateFields(body) {
  const b = body || {};
  const out = {};
  if (Object.prototype.hasOwnProperty.call(b, 'name')) out.name = String(b.name || '').trim();
  if (Object.prototype.hasOwnProperty.call(b, 'pricePaise')) out.price_paise = Number(b.pricePaise || 0);
  if (Object.prototype.hasOwnProperty.call(b, 'price_paise')) out.price_paise = Number(b.price_paise || 0);
  if (Object.prototype.hasOwnProperty.call(b, 'durationDays')) out.duration_days = Number(b.durationDays || 365);
  if (Object.prototype.hasOwnProperty.call(b, 'duration_days')) out.duration_days = Number(b.duration_days || 365);
  if (Object.prototype.hasOwnProperty.call(b, 'status')) out.status = String(b.status || '').trim().toLowerCase();

  if (Object.prototype.hasOwnProperty.call(b, 'isFree')) {
    const v = b.isFree;
    out.is_free = v === true || v === 1 || v === '1' || String(v || '').toLowerCase() === 'true' ? 1 : 0;
  }
  if (Object.prototype.hasOwnProperty.call(b, 'is_free')) {
    const v = b.is_free;
    out.is_free = v === true || v === 1 || v === '1' || String(v || '').toLowerCase() === 'true' ? 1 : 0;
  }

  return out;
}

export async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const fields = normalizePlanUpdateFields(req.body);

    const mapping = {
      name: 'name',
      price_paise: 'price_paise',
      duration_days: 'duration_days',
      status: 'status',
      is_free: 'is_free',
    };
    const { set, params } = buildUpdate(fields, mapping);
    if (set.length === 0) return res.status(400).json({ message: 'No fields to update' });

    if (Object.prototype.hasOwnProperty.call(fields, 'status') && !['active', 'inactive'].includes(fields.status)) {
      return res.status(400).json({ message: 'status must be active|inactive' });
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'price_paise') && (!Number.isFinite(fields.price_paise) || fields.price_paise < 0)) {
      return res.status(400).json({ message: 'pricePaise must be a non-negative number' });
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'duration_days') && (!Number.isFinite(fields.duration_days) || fields.duration_days <= 0)) {
      return res.status(400).json({ message: 'durationDays must be a positive number' });
    }

    await query(`UPDATE plans SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    const rows = await query('SELECT id, code, name, price_paise, duration_days, status, is_free FROM plans WHERE id = ? LIMIT 1', [id]);
    const p = rows[0];
    if (!p) return res.status(404).json({ message: 'Plan not found' });
    return res.json({
      plan: {
        id: p.id,
        code: p.code,
        name: p.name,
        pricePaise: Number(p.price_paise || 0),
        durationDays: Number(p.duration_days || 365),
        status: p.status,
        isFree: toBool(p.is_free),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deletePlan(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM plans WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Plan not found' });
    await query("UPDATE plans SET status = 'inactive', updated_at = NOW() WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function listPayments(req, res, next) {
  try {
    const rows = await query(
      `SELECT p.id, p.user_id, u.name as user_name, u.email as user_email, pl.code as plan_code, pl.name as plan_name,
              p.amount_paise, p.razorpay_order_id, p.razorpay_payment_id, p.status, p.created_at, p.paid_at
       FROM payments p
       JOIN users u ON u.id = p.user_id
       JOIN plans pl ON pl.id = p.plan_id
       ORDER BY p.created_at DESC
       LIMIT 200`
    );

    const payments = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      planCode: r.plan_code,
      planName: r.plan_name,
      amountPaise: Number(r.amount_paise || 0),
      orderId: r.razorpay_order_id,
      paymentId: r.razorpay_payment_id,
      status: r.status,
      createdAt: r.created_at,
      paidAt: r.paid_at,
    }));

    return res.json({ payments });
  } catch (err) {
    return next(err);
  }
}

export async function createNotification(req, res, next) {
  try {
    const { title, message, status = 'active' } = req.body;
    const result = await query('INSERT INTO notifications (title, message, status) VALUES (?, ?, ?)', [
      title,
      message,
      status,
    ]);
    const rows = await query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [result.insertId]);
    const n = rows[0];
    return res.status(201).json({ notification: { id: n.id, title: n.title, message: n.message, status: n.status } });
  } catch (err) {
    return next(err);
  }
}

export async function listNotifications(req, res, next) {
  try {
    const rows = await query('SELECT * FROM notifications ORDER BY created_at DESC');
    const notifications = rows.map((n) => ({ id: n.id, title: n.title, message: n.message, status: n.status }));
    return res.json({ notifications });
  } catch (err) {
    return next(err);
  }
}

export async function updateNotification(req, res, next) {
  try {
    const { id } = req.params;
    const mapping = { title: 'title', message: 'message', status: 'status' };
    const { set, params } = buildUpdate(req.body || {}, mapping);
    if (set.length > 0) {
      await query(`UPDATE notifications SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    }

    const rows = await query('SELECT * FROM notifications WHERE id = ? LIMIT 1', [id]);
    const n = rows[0];
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    return res.json({ notification: { id: n.id, title: n.title, message: n.message, status: n.status } });
  } catch (err) {
    return next(err);
  }
}

export async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM notifications WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Notification not found' });
    await query('DELETE FROM notifications WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createSpecimen(req, res, next) {
  try {
    const body = req.body || {};
    const imageUrl = asNonEmptyString(body.imageUrl ?? body.image_url);
    const rawOptions = body.options ?? body.options_json ?? body.optionsJson;
    const options = parseOptions(rawOptions);
    const correct = Number(body.correct ?? body.correctOption ?? body.correct_option);
    const status = normalizeStatus(body.status, ['active', 'inactive']) || 'active';
    const questionText = asNonEmptyString(body.questionText ?? body.question_text) || null;

    const errors = {};
    if (!imageUrl) errors.imageUrl = 'imageUrl is required';
    if (!options || options.length !== 4 || options.some((x) => !asNonEmptyString(x))) {
      errors.options = 'options must be an array of 4 non-empty strings';
    }
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      errors.correct = 'correct option index must be 0-3';
    }
    if (!normalizeStatus(status, ['active', 'inactive'])) errors.status = 'status must be active|inactive';
    if (Object.keys(errors).length) return badRequest(res, 'Validation failed', errors);

    const result = await query(
      'INSERT INTO specimens (image_url, options_json, correct, status, question_text) VALUES (?, ?, ?, ?, ?)',
      [imageUrl, JSON.stringify(options), correct, status, questionText]
    );

    const rows = await query('SELECT * FROM specimens WHERE id = ? LIMIT 1', [result.insertId]);
    const s = rows[0];
    return res.status(201).json({
      specimen: {
        id: s.id,
        imageUrl: s.image_url,
        options: JSON.parse(s.options_json),
        correct: s.correct,
        status: s.status,
        questionText: s.question_text ?? null,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listSpecimens(req, res, next) {
  try {
    const rows = await query('SELECT * FROM specimens ORDER BY created_at DESC');
    const specimens = rows.map((s) => ({
      id: s.id,
      imageUrl: s.image_url,
      options: JSON.parse(s.options_json),
      correct: s.correct,
      status: s.status,
      questionText: s.question_text ?? null,
    }));
    return res.json({ specimens });
  } catch (err) {
    return next(err);
  }
}

export async function updateSpecimen(req, res, next) {
  try {
    const { id } = req.params;
    const body = { ...(req.body || {}) };

    if (Object.prototype.hasOwnProperty.call(body, 'image_url') && !Object.prototype.hasOwnProperty.call(body, 'imageUrl')) {
      body.imageUrl = body.image_url;
      delete body.image_url;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'options')) {
      const opts = parseOptions(body.options);
      if (!opts || opts.length !== 4 || opts.some((x) => !asNonEmptyString(x))) {
        return badRequest(res, 'Validation failed', { options: 'options must be an array of 4 non-empty strings' });
      }
      body.optionsJson = JSON.stringify(opts);
      delete body.options;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'options_json') && !Object.prototype.hasOwnProperty.call(body, 'optionsJson')) {
      const opts = parseOptions(body.options_json);
      if (!opts || opts.length !== 4 || opts.some((x) => !asNonEmptyString(x))) {
        return badRequest(res, 'Validation failed', { options: 'options must be an array of 4 non-empty strings' });
      }
      body.optionsJson = JSON.stringify(opts);
      delete body.options_json;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'correct')) {
      const c = Number(body.correct);
      if (!Number.isInteger(c) || c < 0 || c > 3) return badRequest(res, 'Validation failed', { correct: 'correct option index must be 0-3' });
    }

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const st = normalizeStatus(body.status, ['active', 'inactive']);
      if (!st) return badRequest(res, 'Validation failed', { status: 'status must be active|inactive' });
      body.status = st;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'question_text') && !Object.prototype.hasOwnProperty.call(body, 'questionText')) {
      body.questionText = body.question_text;
      delete body.question_text;
    }

    const mapping = { imageUrl: 'image_url', optionsJson: 'options_json', correct: 'correct', status: 'status' };
    if (Object.prototype.hasOwnProperty.call(body, 'questionText')) {
      body.questionText = asNonEmptyString(body.questionText) || null;
    }

    const mapping2 = { ...mapping, questionText: 'question_text' };
    const { set, params } = buildUpdate(body, mapping2);
    if (set.length > 0) {
      await query(`UPDATE specimens SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    }

    const rows = await query('SELECT * FROM specimens WHERE id = ? LIMIT 1', [id]);
    const s = rows[0];
    if (!s) return res.status(404).json({ message: 'Specimen not found' });
    return res.json({ specimen: { id: s.id, imageUrl: s.image_url, options: JSON.parse(s.options_json), correct: s.correct, status: s.status, questionText: s.question_text ?? null } });
  } catch (err) {
    return next(err);
  }
}

export async function createTestWithQuestions(req, res, next) {
  try {
    const body = req.body || {};
    console.log('[createTestWithQuestions] Received body:', JSON.stringify(body, null, 2));
    
    const title = asNonEmptyString(body.title);
    const perQuestionSeconds = Number(body.perQuestionSeconds ?? 30);
    const marksCorrect = Number(body.marksCorrect ?? 4);
    const isActive = toBool(body.isActive ?? true);
    const questionCount = Number(body.questionCount ?? 10);
    const questions = Array.isArray(body.questions) ? body.questions : null;

    console.log('[createTestWithQuestions] Parsed values:', {
      title,
      perQuestionSeconds,
      marksCorrect,
      isActive,
      questionCount,
      questionsCount: questions?.length
    });

    const errors = {};
    if (!title) errors.title = 'title is required';
    if (!Number.isFinite(perQuestionSeconds) || perQuestionSeconds <= 0) errors.perQuestionSeconds = 'must be a positive number';
    if (!Number.isFinite(marksCorrect) || marksCorrect <= 0) errors.marksCorrect = 'must be a positive number';
    if (!Number.isFinite(questionCount) || questionCount <= 0 || questionCount > 50) errors.questionCount = 'must be between 1 and 50';
    if (!questions || questions.length === 0) errors.questions = 'at least 1 question is required';
    if (questions && questions.length !== questionCount) errors.questions = `question count mismatch: expected ${questionCount}, got ${questions.length}`;
    if (Object.keys(errors).length) return badRequest(res, 'Validation failed', errors);

    // Validate each question
    const normalizedQuestions = questions.map((q, idx) => {
      console.log(`[createTestWithQuestions] Processing question ${idx}:`, JSON.stringify(q, null, 2));
      
      const questionText = asNonEmptyString(q.questionText ?? q.question_text);
      const imageUrl = asNonEmptyString(q.imageUrl ?? q.image_url);
      const optionA = asNonEmptyString(q.optionA ?? q.option_a);
      const optionB = asNonEmptyString(q.optionB ?? q.option_b);
      const optionC = asNonEmptyString(q.optionC ?? q.option_c);
      const optionD = asNonEmptyString(q.optionD ?? q.option_d);
      const correctOption = (q.correctOption ?? q.correct_option)?.toUpperCase();
      const questionOrder = Number(q.questionOrder ?? q.question_order ?? idx + 1);
      
      console.log(`[createTestWithQuestions] Parsed question ${idx}:`, {
        questionText,
        imageUrl,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        questionOrder
      });
      
      const qErrors = {};
      if (!questionText) qErrors.questionText = 'questionText is required';
      if (!imageUrl) qErrors.imageUrl = 'imageUrl is required';
      if (!optionA) qErrors.optionA = 'optionA is required';
      if (!optionB) qErrors.optionB = 'optionB is required';
      if (!optionC) qErrors.optionC = 'optionC is required';
      if (!optionD) qErrors.optionD = 'optionD is required';
      if (!['A', 'B', 'C', 'D'].includes(correctOption)) qErrors.correctOption = 'correctOption must be A, B, C, or D';
      
      if (Object.keys(qErrors).length > 0) {
        console.log(`[createTestWithQuestions] Question ${idx} errors:`, qErrors);
      }
      
      return { idx, questionText, imageUrl, optionA, optionB, optionC, optionD, correctOption, questionOrder, qErrors };
    });

    const questionErrors = normalizedQuestions.filter((q) => Object.keys(q.qErrors).length);
    if (questionErrors.length) {
      return badRequest(res, 'Validation failed', { questions: questionErrors.map((q) => ({ index: q.idx, ...q.qErrors })) });
    }

    // Create test
    const testResult = await query(
      'INSERT INTO tests (title, is_active, question_count, per_question_seconds, marks_correct) VALUES (?, ?, ?, ?, ?)',
      [title, isActive ? 1 : 0, questionCount, perQuestionSeconds, marksCorrect]
    );
    const testId = testResult.insertId;

    // Insert questions into test_questions table
    for (const q of normalizedQuestions) {
      await query(
        'INSERT INTO test_questions (test_id, question_text, image_url, option_a, option_b, option_c, option_d, correct_option, question_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [testId, q.questionText, q.imageUrl, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption, q.questionOrder]
      );
    }

    const rows = await query('SELECT * FROM tests WHERE id = ? LIMIT 1', [testId]);
    const t = rows[0];
    return res.status(201).json({
      test: {
        id: t.id,
        title: t.title,
        isActive: toBool(t.is_active),
        questionCount: t.question_count,
        perQuestionSeconds: t.per_question_seconds,
        marksCorrect: t.marks_correct,
      },
    });
  } catch (err) {
    console.error('[createTestWithQuestions]', err);
    return next(err);
  }
}

export async function deleteSpecimen(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM specimens WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Specimen not found' });
    await query('DELETE FROM specimens WHERE id = ?', [id]);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createTest(req, res, next) {
  try {
    const { title, isActive = true, questionCount = 50, perQuestionSeconds = 30, marksCorrect = 4 } = req.body;
    const result = await query(
      'INSERT INTO tests (title, is_active, question_count, per_question_seconds, marks_correct) VALUES (?, ?, ?, ?, ?)',
      [title, isActive ? 1 : 0, questionCount, perQuestionSeconds, marksCorrect]
    );

    const rows = await query('SELECT * FROM tests WHERE id = ? LIMIT 1', [result.insertId]);
    const t = rows[0];
    return res.status(201).json({
      test: {
        id: t.id,
        title: t.title,
        isActive: toBool(t.is_active),
        questionCount: t.question_count,
        perQuestionSeconds: t.per_question_seconds,
        marksCorrect: t.marks_correct,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listTests(req, res, next) {
  try {
    const rows = await query('SELECT * FROM tests ORDER BY created_at DESC');
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

export async function updateTest(req, res, next) {
  try {
    const { id } = req.params;
    const body = { ...(req.body || {}) };
    if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
      body.isActive = body.isActive ? 1 : 0;
    }

    const mapping = {
      title: 'title',
      isActive: 'is_active',
      questionCount: 'question_count',
      perQuestionSeconds: 'per_question_seconds',
      marksCorrect: 'marks_correct',
    };

    const { set, params } = buildUpdate(body, mapping);
    if (set.length > 0) {
      await query(`UPDATE tests SET ${set.join(', ')} WHERE id = ?`, [...params, id]);
    }

    const rows = await query('SELECT * FROM tests WHERE id = ? LIMIT 1', [id]);
    const t = rows[0];
    if (!t) return res.status(404).json({ message: 'Test not found' });

    return res.json({
      test: {
        id: t.id,
        title: t.title,
        isActive: toBool(t.is_active),
        questionCount: t.question_count,
        perQuestionSeconds: t.per_question_seconds,
        marksCorrect: t.marks_correct,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteTest(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query('SELECT id FROM tests WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Test not found' });

    await query('DELETE FROM results WHERE test_id = ?', [id]);
    await query('DELETE FROM tests WHERE id = ?', [id]);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function getSettings(req, res, next) {
  try {
    const row = await ensureSettings();
    return res.json({ settings: mapSettingsRow(row) });
  } catch (err) {
    return next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    await ensureSettings();

    const mapping = {
      videosEnabled: 'videos_enabled',
      testsEnabled: 'tests_enabled',
      pdfsEnabled: 'pdfs_enabled',
      pyqsEnabled: 'pyqs_enabled',
      notificationsEnabled: 'notifications_enabled',
    };

    const updates = {};
    for (const [k, col] of Object.entries(mapping)) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) {
        updates[k] = toBool(req.body[k]) ? 1 : 0;
      }
    }

    const { set, params } = buildUpdate(updates, mapping);
    if (set.length > 0) {
      await query(`UPDATE settings SET ${set.join(', ')} WHERE id = 1`, params);
    }

    const rows = await query('SELECT * FROM settings WHERE id = 1');
    return res.json({ settings: mapSettingsRow(rows[0]) });
  } catch (err) {
    return next(err);
  }
}

function toCsv(rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  return rows.map((r) => r.map(escape).join(',')).join('\n');
}

export async function listResults(req, res, next) {
  try {
    const { testId, limit = 200 } = req.query;
    const lim = Math.min(Number(limit) || 200, 500);

    const rows = testId
      ? await query(
          `SELECT r.*, u.name as student_name, u.email as student_email, t.title as test_title
           FROM results r
           JOIN (
             SELECT user_id, MIN(id) AS first_id
             FROM results
             WHERE test_id = ?
             GROUP BY user_id
           ) first_attempt ON first_attempt.first_id = r.id
           JOIN users u ON u.id = r.user_id
           JOIN tests t ON t.id = r.test_id
           WHERE r.test_id = ?
           ORDER BY r.score DESC, r.time_taken_sec ASC, r.date ASC
           LIMIT ${lim}`,
          [testId, testId]
        )
      : await query(
          `SELECT r.*, u.name as student_name, u.email as student_email, t.title as test_title
           FROM results r
           JOIN users u ON u.id = r.user_id
           JOIN tests t ON t.id = r.test_id
           ORDER BY r.date DESC
           LIMIT ${lim}`
        );

    const out = testId
      ? rows.map((r, idx) => ({ ...r, rank: idx + 1 }))
      : rows;

    return res.json({ results: out });
  } catch (err) {
    return next(err);
  }
}

export async function exportResultsCsv(req, res, next) {
  try {
    const { testId } = req.query;

    const rows = testId
      ? await query(
          `SELECT r.date, u.name as student_name, u.email as student_email, t.title as test_title,
                  r.score, r.accuracy, r.time_taken_sec
           FROM results r
           JOIN (
             SELECT user_id, MIN(id) AS first_id
             FROM results
             WHERE test_id = ?
             GROUP BY user_id
           ) first_attempt ON first_attempt.first_id = r.id
           JOIN users u ON u.id = r.user_id
           JOIN tests t ON t.id = r.test_id
           WHERE r.test_id = ?
           ORDER BY r.score DESC, r.time_taken_sec ASC, r.date ASC
           LIMIT 5000`,
          [testId, testId]
        )
      : await query(
          `SELECT r.date, u.name as student_name, u.email as student_email, t.title as test_title,
                  r.score, r.accuracy, r.time_taken_sec
           FROM results r
           JOIN users u ON u.id = r.user_id
           JOIN tests t ON t.id = r.test_id
           ORDER BY r.date DESC
           LIMIT 5000`
        );

    const csvRows = testId
      ? [
          ['rank', 'date', 'student_name', 'student_email', 'test_title', 'score', 'accuracy', 'time_taken_sec'],
          ...rows.map((r, idx) => [
            idx + 1,
            r.date?.toISOString?.() ?? r.date,
            r.student_name,
            r.student_email,
            r.test_title,
            r.score,
            r.accuracy,
            r.time_taken_sec,
          ]),
        ]
      : [
          ['date', 'student_name', 'student_email', 'test_title', 'score', 'accuracy', 'time_taken_sec'],
          ...rows.map((r) => [
            r.date?.toISOString?.() ?? r.date,
            r.student_name,
            r.student_email,
            r.test_title,
            r.score,
            r.accuracy,
            r.time_taken_sec,
          ]),
        ];

    const csv = toCsv(csvRows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="results.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('[exportResultsCsv]', err);
    return res.status(500).json({ message: 'Failed to export results' });
  }
}

// PYQ CRUD
export async function createPyq(req, res) {
  try {
    const { title, pdf_url, solution_url, subject, year, centre_id, centre_name, status, access_type } = req.body;
    if (!title || !pdf_url) {
      return res.status(400).json({ message: 'title and pdf_url are required' });
    }
    const st = status ? String(status).trim().toLowerCase() : 'active';
    if (!['active', 'inactive'].includes(st)) return res.status(400).json({ message: 'status must be active|inactive' });

    const accessType = access_type ? String(access_type).trim().toLowerCase() : 'paid';
    if (!['free', 'paid'].includes(accessType)) return res.status(400).json({ message: 'access_type must be free|paid' });

    let centreId = null;
    const centreName = typeof centre_name === 'string' ? centre_name.trim() : '';
    if (centreName) {
      centreId = await ensureExamCentreByName(centreName);
      if (!centreId) return res.status(400).json({ message: 'Invalid centre_name' });
    } else {
      centreId = centre_id === undefined || centre_id === null || centre_id === '' ? null : Number(centre_id);
      if (centreId !== null && !Number.isFinite(centreId)) return res.status(400).json({ message: 'centre_id must be a number' });
      if (centreId !== null) {
        const centres = await query('SELECT id FROM exam_centres WHERE id = ? LIMIT 1', [centreId]);
        if (!centres.length) return res.status(400).json({ message: 'Invalid centre_id' });
      }
    }

    if (centreId === null) {
      return res.status(400).json({ message: 'exam centre is required' });
    }

    let yr = year ? String(year).trim() : '';
    if (!yr) return res.status(400).json({ message: 'year is required' });
    yr = await ensureExamCentreYearActive(centreId, yr);
    if (!yr) return res.status(400).json({ message: 'Invalid year' });

    const result = await query(
      `INSERT INTO pyqs (title, pdf_url, solution_url, subject, year, centre_id, access_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, pdf_url, solution_url || null, subject || 'General', yr || null, centreId, accessType, st]
    );
    return res.json({ id: result.insertId });
  } catch (err) {
    console.error('[createPyq]', err);
    return res.status(500).json({ message: 'Failed to create PYQ' });
  }
}

export async function listPyqs(req, res) {
  try {
    const rows = await query(
      `SELECT p.*, c.name as centre_name
       FROM pyqs p
       LEFT JOIN exam_centres c ON c.id = p.centre_id
       ORDER BY p.created_at DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[listPyqs]', err);
    return res.status(500).json({ message: 'Failed to fetch PYQs' });
  }
}

export async function updatePyq(req, res) {
  try {
    const { id } = req.params;
    const { title, pdf_url, solution_url, subject, year, status, centre_id, centre_name, access_type } = req.body;

    const existingRows = await query('SELECT id, centre_id, year FROM pyqs WHERE id = ? LIMIT 1', [id]);
    if (!existingRows.length) return res.status(404).json({ message: 'PYQ not found' });
    const existing = existingRows[0];

    let nextCentreId = existing.centre_id === null || existing.centre_id === undefined ? null : Number(existing.centre_id);
    let nextYear = existing.year === null || existing.year === undefined ? null : String(existing.year).trim();

    const centreName = typeof centre_name === 'string' ? centre_name.trim() : '';
    if (centre_name !== undefined) {
      if (!centreName) {
        nextCentreId = null;
      } else {
        const ensured = await ensureExamCentreByName(centreName);
        if (!ensured) return res.status(400).json({ message: 'Invalid centre_name' });
        nextCentreId = ensured;
      }
    }

    if (centre_id !== undefined) {
      if (centre_id === '' || centre_id === null) {
        nextCentreId = null;
      } else {
        const parsed = Number(centre_id);
        if (!Number.isFinite(parsed)) return res.status(400).json({ message: 'centre_id must be a number' });
        const centres = await query('SELECT id FROM exam_centres WHERE id = ? LIMIT 1', [parsed]);
        if (!centres.length) return res.status(400).json({ message: 'Invalid centre_id' });
        nextCentreId = parsed;
      }
    }

    if (year !== undefined) {
      nextYear = year === null ? null : String(year).trim();
    }

    if (nextCentreId !== null) {
      if (!nextYear) return res.status(400).json({ message: 'year is required' });
      await ensureExamCentreYearActive(nextCentreId, nextYear);
    }

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (pdf_url !== undefined) { updates.push('pdf_url = ?'); params.push(pdf_url); }
    if (solution_url !== undefined) { updates.push('solution_url = ?'); params.push(solution_url); }
    if (subject !== undefined) { updates.push('subject = ?'); params.push(subject); }
    if (year !== undefined) { updates.push('year = ?'); params.push(nextYear); }

    if (centre_name !== undefined) {
      updates.push('centre_id = ?');
      params.push(nextCentreId);
    } else if (centre_id !== undefined) {
      updates.push('centre_id = ?');
      params.push(nextCentreId);
    }

    if (access_type !== undefined) {
      const at = access_type === null ? null : String(access_type).trim().toLowerCase();
      if (!at || !['free', 'paid'].includes(at)) return res.status(400).json({ message: 'access_type must be free|paid' });
      updates.push('access_type = ?');
      params.push(at);
    }

    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });
    params.push(id);
    await query(`UPDATE pyqs SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.json({ updated: true });
  } catch (err) {
    console.error('[updatePyq]', err);
    return res.status(500).json({ message: 'Failed to update PYQ' });
  }
}

export async function deletePyq(req, res) {
  try {
    const { id } = req.params;
    await query(`DELETE FROM pyqs WHERE id = ?`, [id]);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[deletePyq]', err);
    return res.status(500).json({ message: 'Failed to delete PYQ' });
  }
}

export async function getMenus(req, res) {
  try {
    const { type, status } = req.query;
    let sql = `SELECT * FROM menus WHERE 1=1`;
    const params = [];

    if (status) {
      const st = normalizeStatus(status, ['active', 'inactive']);
      if (!st) return badRequest(res, 'Validation failed', { status: 'status must be active|inactive' });
      sql += ` AND status = ?`;
      params.push(st);
    }

    if (type) {
      sql += ` AND (type = ? OR type = 'both')`;
      params.push(type);
    }

    sql += ` ORDER BY menu_order ASC, id ASC`;
    const rows = await query(sql, params);
    return res.json({ menus: rows });
  } catch (err) {
    console.error('[getMenus]', err);
    return res.status(500).json({ message: 'Failed to fetch menus' });
  }
}

export async function createMenu(req, res) {
  try {
    const body = req.body || {};

    const name = asNonEmptyString(body.name);
    const route = typeof body.route === 'string' ? body.route.trim() : null;
    const icon = asNonEmptyString(body.icon) || '📄';
    const type = asNonEmptyString(body.type) || 'student';
    const status = normalizeStatus(body.status, ['active', 'inactive']) || 'active';
    const menuOrder = Number.isFinite(Number(body.menu_order)) ? Number(body.menu_order) : 0;

    if (!name) return badRequest(res, 'Validation failed', { name: 'name is required' });
    if (!['student', 'admin', 'both'].includes(type)) {
      return badRequest(res, 'Validation failed', { type: 'type must be student|admin|both' });
    }

    const result = await query(
      'INSERT INTO menus (name, route, icon, type, status, menu_order, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, route || null, icon, type, status, menuOrder, body.parent_id ?? null]
    );

    const rows = await query('SELECT * FROM menus WHERE id = ? LIMIT 1', [result.insertId]);
    return res.status(201).json({ menu: rows[0] });
  } catch (err) {
    console.error('[createMenu]', err);
    return res.status(500).json({ message: 'Failed to create menu' });
  }
}

export async function updateMenu(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const allowed = {
      name: 'name',
      route: 'route',
      icon: 'icon',
      type: 'type',
      status: 'status',
      menu_order: 'menu_order',
      parent_id: 'parent_id',
    };

    const updates = [];
    const params = [];

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = asNonEmptyString(body.name);
      if (!name) return badRequest(res, 'Validation failed', { name: 'name is required' });
      updates.push(`${allowed.name} = ?`);
      params.push(name);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'route')) {
      const route = typeof body.route === 'string' ? body.route.trim() : null;
      updates.push(`${allowed.route} = ?`);
      params.push(route || null);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'icon')) {
      const icon = asNonEmptyString(body.icon) || '📄';
      updates.push(`${allowed.icon} = ?`);
      params.push(icon);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'type')) {
      const type = asNonEmptyString(body.type);
      if (!type || !['student', 'admin', 'both'].includes(type)) {
        return badRequest(res, 'Validation failed', { type: 'type must be student|admin|both' });
      }
      updates.push(`${allowed.type} = ?`);
      params.push(type);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = normalizeStatus(body.status, ['active', 'inactive']);
      if (!status) return badRequest(res, 'Validation failed', { status: 'status must be active|inactive' });
      updates.push(`${allowed.status} = ?`);
      params.push(status);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'menu_order')) {
      updates.push(`${allowed.menu_order} = ?`);
      params.push(Number(body.menu_order) || 0);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'parent_id')) {
      updates.push(`${allowed.parent_id} = ?`);
      params.push(body.parent_id ?? null);
    }

    if (updates.length === 0) return badRequest(res, 'No fields to update');

    params.push(id);
    await query(`UPDATE menus SET ${updates.join(', ')} WHERE id = ?`, params);

    const rows = await query('SELECT * FROM menus WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Menu not found' });

    return res.json({ menu: rows[0] });
  } catch (err) {
    console.error('[updateMenu]', err);
    return res.status(500).json({ message: 'Failed to update menu' });
  }
}

export async function deleteMenu(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM menus WHERE id = ?', [id]);
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[deleteMenu]', err);
    return res.status(500).json({ message: 'Failed to delete menu' });
  }
}

export async function reorderMenus(req, res) {
  try {
    const { orders } = req.body || {};
    if (!Array.isArray(orders)) {
      return badRequest(res, 'Validation failed', { orders: 'orders must be an array of {id, menu_order}' });
    }

    for (const item of orders) {
      if (!item || !item.id) return badRequest(res, 'Validation failed', { orders: 'each item must have id' });
      await query('UPDATE menus SET menu_order = ? WHERE id = ?', [Number(item.menu_order) || 0, item.id]);
    }

    return res.json({ reordered: true });
  } catch (err) {
    console.error('[reorderMenus]', err);
    return res.status(500).json({ message: 'Failed to reorder menus' });
  }
}

// Analytics dashboard
export async function getAnalytics(req, res) {
  try {
    const [studentsCount] = await query(`SELECT COUNT(*) as cnt FROM users WHERE role = 'student'`);
    const [testsCount] = await query(`SELECT COUNT(*) as cnt FROM tests WHERE is_active = 1`);
    const [specimensCount] = await query(`SELECT COUNT(*) as cnt FROM specimens WHERE status = 'active'`);
    const [videosCount] = await query(`SELECT COUNT(*) as cnt FROM videos WHERE status = 'active'`);
    const [materialsCount] = await query(`SELECT COUNT(*) as cnt FROM materials`);
    const [pyqsCount] = await query(`SELECT COUNT(*) as cnt FROM pyqs`);
    const [resultsCount] = await query(`SELECT COUNT(*) as cnt FROM results`);
    const avgAccuracy = await query(`SELECT AVG(accuracy) as avg FROM results`);
    return res.json({
      studentsCount: studentsCount.cnt,
      testsCount: testsCount.cnt,
      specimensCount: specimensCount.cnt,
      videosCount: videosCount.cnt,
      materialsCount: materialsCount.cnt,
      pyqsCount: pyqsCount.cnt,
      resultsCount: resultsCount.cnt,
      avgAccuracy: avgAccuracy[0]?.avg || 0,
    });
  } catch (err) {
    console.error('[getAnalytics]', err);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

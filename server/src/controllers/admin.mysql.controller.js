import {
  Counter,
  ExamCentre,
  ExamCentreYear,
  Material,
  Menu,
  Notification,
  Payment,
  Plan,
  Pyq,
  Result,
  Settings,
  Specimen,
  Test,
  TestQuestion,
  User,
  Video,
} from '../models/index.js';
import { ensureSettings } from '../seed/ensureSettings.js';
import { makePrivateMaterialRef, makePrivateUploadRef, makePublicUploadUrl } from '../middleware/upload.js';
import { hashPassword } from '../utils/auth.js';

const _ttlCache = new Map();

function getOrSetCached(key, ttlMs, getter) {
  const now = Date.now();
  const hit = _ttlCache.get(key);
  if (hit && hit.exp > now) return hit.value;
  const p = Promise.resolve().then(getter);
  _ttlCache.set(key, { exp: now + Number(ttlMs || 0), value: p });
  p.catch(() => {
    const cur = _ttlCache.get(key);
    if (cur && cur.value === p) _ttlCache.delete(key);
  });
  return p;
}

async function getNextNumericId(sequenceName, ensureAtLeast) {
  const min = Number(ensureAtLeast || 0);
  if (Number.isFinite(min) && min > 0) {
    await Counter.findByIdAndUpdate(
      sequenceName,
      { $max: { seq: min } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const doc = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return Number(doc.seq);
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

  let doc = await ExamCentre.findOne({ name: centreName }).lean();

  if (!doc) {
    const newCentre = new ExamCentre({
      name: centreName,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await newCentre.save();
    return newCentre.id;
  }

  if (doc.id === undefined || doc.id === null) {
    const maxRow = await ExamCentre.findOne({ id: { $ne: null } }).sort({ id: -1 }).select({ id: 1 }).lean();
    const nextId = await getNextNumericId('exam_centres', Number(maxRow?.id || 0));
    await ExamCentre.updateOne(
      { _id: doc._id, $or: [{ id: { $exists: false } }, { id: null }] },
      { $set: { id: nextId, updated_at: new Date() } }
    );
    return nextId;
  }

  if (doc.status !== 'active') {
    await ExamCentre.updateOne(
      { name: centreName },
      { $set: { status: 'active', updated_at: new Date() } }
    );
  }

  return doc?.id != null ? Number(doc.id) : null;
}

async function ensureExamCentreYearActive(centreId, year) {
  const yr = typeof year === 'string' ? year.trim() : String(year ?? '').trim();
  if (!yr) return null;

  const cid = Number(centreId);
  if (!Number.isFinite(cid)) return null;

  const existing = await ExamCentreYear.findOne({ centre_id: cid, year: yr }).lean();
  if (!existing) {
    const doc = new ExamCentreYear({
      centre_id: cid,
      year: yr,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });
    await doc.save();
    return yr;
  }

  if (existing.id === undefined || existing.id === null) {
    const maxRow = await ExamCentreYear.findOne({ id: { $ne: null } }).sort({ id: -1 }).select({ id: 1 }).lean();
    const nextId = await getNextNumericId('exam_centre_years', Number(maxRow?.id || 0));
    await ExamCentreYear.updateOne(
      { _id: existing._id, $or: [{ id: { $exists: false } }, { id: null }] },
      { $set: { id: nextId, updated_at: new Date() } }
    );
  }

  if (existing.status !== 'active') {
    await ExamCentreYear.updateOne(
      { _id: existing._id },
      { $set: { status: 'active', updated_at: new Date() } }
    );
  }

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

    const centre = new ExamCentre({ name, status, created_at: new Date(), updated_at: new Date() });
    await centre.save();
    const doc = await ExamCentre.findOne({ id: centre.id }, { _id: 0, __v: 0 }).lean();
    return res.status(201).json({ centre: doc });
  } catch (err) {
    return next(err);
  }
}

export async function listExamCentres(req, res, next) {
  try {
    const centres = await ExamCentre.find({}, { _id: 0, __v: 0 }).sort({ name: 1, id: 1 }).lean();
    return res.json({ centres });
  } catch (err) {
    return next(err);
  }
}

export async function updateExamCentre(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'name')) updates.name = fields.name;
    if (Object.prototype.hasOwnProperty.call(fields, 'status')) updates.status = fields.status;

    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No fields to update' });

    updates.updated_at = new Date();
    await ExamCentre.updateOne({ id: Number(id) }, { $set: updates });
    const doc = await ExamCentre.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
    if (!doc) return res.status(404).json({ message: 'Centre not found' });
    return res.json({ centre: doc });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExamCentre(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await ExamCentre.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Centre not found' });

    await ExamCentreYear.deleteMany({ centre_id: Number(id) });
    await Pyq.updateMany({ centre_id: Number(id) }, { $set: { centre_id: null } });
    await ExamCentre.deleteOne({ id: Number(id) });
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

    const centre = await ExamCentre.findOne({ id: Number(centreId) }, { id: 1, _id: 0 }).lean();
    if (!centre) return res.status(404).json({ message: 'Centre not found' });

    const doc = new ExamCentreYear({
      centre_id: Number(centreId),
      year,
      status,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await doc.save();
    const saved = await ExamCentreYear.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    return res.status(201).json({ year: saved });
  } catch (err) {
    return next(err);
  }
}

export async function listExamCentreYears(req, res, next) {
  try {
    const { centreId } = req.params;
    const years = await ExamCentreYear.find({ centre_id: Number(centreId) }, { _id: 0, __v: 0 })
      .sort({ year: -1, id: -1 })
      .lean();
    return res.json({ years });
  } catch (err) {
    return next(err);
  }
}

export async function updateExamCentreYear(req, res, next) {
  try {
    const { id } = req.params;
    const fields = req.body || {};
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'year')) updates.year = fields.year;
    if (Object.prototype.hasOwnProperty.call(fields, 'status')) updates.status = fields.status;

    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No fields to update' });

    updates.updated_at = new Date();
    await ExamCentreYear.updateOne({ id: Number(id) }, { $set: updates });
    const doc = await ExamCentreYear.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
    if (!doc) return res.status(404).json({ message: 'Year not found' });
    return res.json({ year: doc });
  } catch (err) {
    return next(err);
  }
}

export async function deleteExamCentreYear(req, res, next) {
  try {
    const { id } = req.params;

    const y = await ExamCentreYear.findOne({ id: Number(id) }, { id: 1, centre_id: 1, year: 1, _id: 0 }).lean();
    if (!y) return res.status(404).json({ message: 'Year not found' });

    const cnt = await Pyq.countDocuments({ centre_id: Number(y.centre_id), year: String(y.year) });
    if (Number(cnt || 0) > 0) {
      return res.status(400).json({ message: 'Cannot delete year with existing PYQs' });
    }

    await ExamCentreYear.deleteOne({ id: Number(id) });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function listStudents(req, res, next) {
  try {
    const rows = await User.find(
      { role: 'student' },
      { _id: 0, id: 1, name: 1, email: 1, created_at: 1 }
    )
      .sort({ created_at: -1, id: -1 })
      .lean();

    const students = (rows || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.created_at,
    }));

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

    const normalizedEmail = String(email || '').toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }, { id: 1, _id: 0 }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const passwordHash = await hashPassword(password);

    try {
      const user = new User({
        name,
        email: normalizedEmail,
        password_hash: passwordHash,
        role: 'student',
        created_at: new Date(),
        updated_at: new Date(),
      });
      await user.save();

      return res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (e) {
      if (e && (e.code === 11000 || e.code === 11001)) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      throw e;
    }
  } catch (err) {
    return next(err);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    const student = await User.findOne({ id: Number(id), role: 'student' }, { _id: 0, __v: 0 }).lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const normalizedEmail = email ? String(email).toLowerCase() : null;
    if (normalizedEmail && normalizedEmail !== student.email) {
      const existing = await User.findOne({ email: normalizedEmail }, { id: 1, _id: 0 }).lean();
      if (existing) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (normalizedEmail) updates.email = normalizedEmail;
    if (password) updates.password_hash = await hashPassword(password);

    if (Object.keys(updates).length === 0) {
      return res.json({ user: { id: student.id, name: student.name, email: student.email, role: student.role } });
    }

    updates.updated_at = new Date();
    try {
      await User.updateOne({ id: Number(id), role: 'student' }, { $set: updates });
    } catch (e) {
      if (e && (e.code === 11000 || e.code === 11001)) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      throw e;
    }

    const updated = await User.findOne(
      { id: Number(id) },
      { _id: 0, id: 1, name: 1, email: 1, role: 1 }
    ).lean();

    return res.json({ user: updated });
  } catch (err) {
    return next(err);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await User.findOne({ id: Number(id), role: 'student' }, { id: 1, _id: 0 }).lean();
    if (!existing) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Result.deleteMany({ user_id: Number(id) });
    await User.deleteOne({ id: Number(id) });

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

    const v = new Video({
      title,
      video_url: videoUrl,
      subject,
      status,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await v.save();

    return res.status(201).json({
      video: { 
        id: v.id,
        title: v.title,
        videoUrl: v.video_url,
        subject: v.subject,
        status: v.status,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function listVideos(req, res, next) {
  try {
    const rows = await Video.find({}, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .lean();
    const videos = (rows || []).map((v) => ({
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

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, 'title')) updates.title = body.title;
    if (Object.prototype.hasOwnProperty.call(body, 'videoUrl')) updates.video_url = body.videoUrl;
    if (Object.prototype.hasOwnProperty.call(body, 'subject')) updates.subject = body.subject;
    if (Object.prototype.hasOwnProperty.call(body, 'status')) updates.status = body.status;

    if (Object.keys(updates).length === 0) {
      const v = await Video.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
      if (!v) return res.status(404).json({ message: 'Video not found' });
      return res.json({
        video: {
          id: v.id,
          title: v.title,
          videoUrl: v.video_url,
          subject: v.subject,
          status: v.status,
        },
      });
    }

    updates.updated_at = new Date();
    await Video.updateOne({ id: Number(id) }, { $set: updates });

    const v = await Video.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
    if (!v) return res.status(404).json({ message: 'Video not found' });
    return res.json({
      video: {
        id: v.id,
        title: v.title,
        videoUrl: v.video_url,
        subject: v.subject,
        status: v.status,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getDashboard(req, res, next) {
  try {
    const data = await getOrSetCached('admin:dashboard:v1', 8000, async () => {
      const [studentsCount, testsCount, videosCount, materialsCount] = await Promise.all([
        User.countDocuments({ role: 'student' }).catch(() => 0),
        Test.countDocuments({ is_active: true }).catch(() => 0),
        Video.countDocuments({ status: 'active' }).catch(() => 0),
        Material.countDocuments({}).catch(() => 0),
      ]);

      return {
        students: { count: Number(studentsCount || 0) },
        tests: { count: Number(testsCount || 0) },
        videos: { count: Number(videosCount || 0) },
        materials: { count: Number(materialsCount || 0) },
      };
    });

    return res.json(data);
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

    const existing = await Video.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Video not found' });

    await Video.deleteOne({ id: Number(id) });
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

    const m = new Material({
      title,
      pdf_url: pdfUrl,
      subject,
      type,
      access_type: accessType,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await m.save();

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

    const filter = {};
    if (type) filter.type = String(type);

    const rows = await Material.find(filter, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .lean();

    const materials = (rows || []).map((m) => ({
      id: m.id,
      title: m.title,
      pdfUrl: m.pdf_url,
      subject: m.subject,
      type: m.type,
      accessType: m.access_type,
    }));
    return res.json({ materials });
  } catch (err) {
    return next(err);
  }
}

export async function updateMaterial(req, res, next) {
  try {
    const { id } = req.params;

    const body = req.body || {};
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, 'title')) updates.title = body.title;
    if (Object.prototype.hasOwnProperty.call(body, 'pdfUrl')) updates.pdf_url = body.pdfUrl;
    if (Object.prototype.hasOwnProperty.call(body, 'pdf_url')) updates.pdf_url = body.pdf_url;
    if (Object.prototype.hasOwnProperty.call(body, 'subject')) updates.subject = body.subject;
    if (Object.prototype.hasOwnProperty.call(body, 'type')) updates.type = body.type;
    if (Object.prototype.hasOwnProperty.call(body, 'accessType')) updates.access_type = body.accessType;
    if (Object.prototype.hasOwnProperty.call(body, 'access_type')) updates.access_type = body.access_type;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await Material.updateOne({ id: Number(id) }, { $set: updates });
    }

    const m = await Material.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
    if (!m) return res.status(404).json({ message: 'Material not found' });
    return res.json({
      material: { id: m.id, title: m.title, pdfUrl: m.pdf_url, subject: m.subject, type: m.type, accessType: m.access_type },
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteMaterial(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await Material.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Material not found' });

    await Material.deleteOne({ id: Number(id) });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createPlan(req, res, next) {
  try {
    const body = req.body || {};

    const code = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : 'active';
    const pricePaise = Object.prototype.hasOwnProperty.call(body, 'pricePaise') ? Number(body.pricePaise) : Number(body.price_paise);
    const durationDays = Object.prototype.hasOwnProperty.call(body, 'durationDays') ? Number(body.durationDays) : Number(body.duration_days);
    const isFree = Object.prototype.hasOwnProperty.call(body, 'isFree') ? toBool(body.isFree) : toBool(body.is_free);

    if (!code) return res.status(400).json({ message: 'code is required' });
    if (!name) return res.status(400).json({ message: 'name is required' });
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'status must be active|inactive' });
    if (!Number.isFinite(pricePaise) || pricePaise < 0) return res.status(400).json({ message: 'pricePaise must be a non-negative number' });
    if (!Number.isFinite(durationDays) || durationDays <= 0) return res.status(400).json({ message: 'durationDays must be a positive number' });

    const doc = new Plan({
      code,
      name,
      price_paise: Number(pricePaise || 0),
      duration_days: Number(durationDays || 365),
      status,
      is_free: Boolean(isFree),
      created_at: new Date(),
      updated_at: new Date(),
    });

    try {
      await doc.save();
    } catch (e) {
      if (e && (e.code === 11000 || e.code === 11001)) {
        return res.status(409).json({ message: 'code already exists' });
      }
      throw e;
    }

    return res.status(201).json({ id: doc.id });
  } catch (err) {
    return next(err);
  }
}

export async function listPlans(req, res, next) {
  try {
    const rows = await Plan.find(
      {},
      { _id: 0, id: 1, code: 1, name: 1, price_paise: 1, duration_days: 1, status: 1, is_free: 1 }
    )
      .sort({ id: 1 })
      .lean();

    const plans = (rows || []).map((p) => ({
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
  if (Object.prototype.hasOwnProperty.call(b, 'code')) out.code = String(b.code || '').trim().toLowerCase();
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

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(fields, 'code')) updates.code = fields.code;
    if (Object.prototype.hasOwnProperty.call(fields, 'name')) updates.name = fields.name;
    if (Object.prototype.hasOwnProperty.call(fields, 'price_paise')) updates.price_paise = fields.price_paise;
    if (Object.prototype.hasOwnProperty.call(fields, 'duration_days')) updates.duration_days = fields.duration_days;
    if (Object.prototype.hasOwnProperty.call(fields, 'status')) updates.status = fields.status;
    if (Object.prototype.hasOwnProperty.call(fields, 'is_free')) updates.is_free = Boolean(fields.is_free);
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No fields to update' });

    if (Object.prototype.hasOwnProperty.call(fields, 'code')) {
      const code = String(fields.code || '').trim().toLowerCase();
      if (!code) return res.status(400).json({ message: 'code is required' });
      updates.code = code;
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'status') && !['active', 'inactive'].includes(fields.status)) {
      return res.status(400).json({ message: 'status must be active|inactive' });
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'price_paise') && (!Number.isFinite(fields.price_paise) || fields.price_paise < 0)) {
      return res.status(400).json({ message: 'pricePaise must be a non-negative number' });
    }
    if (Object.prototype.hasOwnProperty.call(fields, 'duration_days') && (!Number.isFinite(fields.duration_days) || fields.duration_days <= 0)) {
      return res.status(400).json({ message: 'durationDays must be a positive number' });
    }

    updates.updated_at = new Date();
    await Plan.updateOne({ id: Number(id) }, { $set: updates });

    const p = await Plan.findOne(
      { id: Number(id) },
      { _id: 0, id: 1, code: 1, name: 1, price_paise: 1, duration_days: 1, status: 1, is_free: 1 }
    ).lean();
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

    const existing = await Plan.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Plan not found' });

    await Plan.updateOne({ id: Number(id) }, { $set: { status: 'inactive', updated_at: new Date() } });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function listPayments(req, res, next) {
  try {
    const rows = await Payment.find({}, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .limit(200)
      .lean();

    const userIds = [...new Set((rows || []).map((r) => Number(r.user_id)).filter((x) => Number.isFinite(x)))];
    const planIds = [...new Set((rows || []).map((r) => Number(r.plan_id)).filter((x) => Number.isFinite(x)))];

    const [users, plans] = await Promise.all([
      User.find({ id: { $in: userIds } }, { _id: 0, id: 1, name: 1, email: 1 }).lean(),
      Plan.find({ id: { $in: planIds } }, { _id: 0, id: 1, code: 1, name: 1 }).lean(),
    ]);

    const userById = new Map((users || []).map((u) => [Number(u.id), u]));
    const planById = new Map((plans || []).map((p) => [Number(p.id), p]));

    const payments = (rows || []).map((r) => {
      const u = userById.get(Number(r.user_id));
      const p = planById.get(Number(r.plan_id));
      return {
        id: r.id,
        userId: r.user_id,
        userName: u?.name ?? null,
        userEmail: u?.email ?? null,
        planCode: p?.code ?? null,
        planName: p?.name ?? null,
        amountPaise: Number(r.amount_paise || 0),
        orderId: r.razorpay_order_id,
        paymentId: r.razorpay_payment_id,
        status: r.status,
        createdAt: r.created_at,
        paidAt: r.paid_at,
      };
    });

    return res.json({ payments });
  } catch (err) {
    return next(err);
  }
}

export async function createNotification(req, res, next) {
  try {
    const body = req.body || {};
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const titleRaw = typeof body.title === 'string' ? body.title.trim() : '';
    const status = typeof body.status === 'string' ? body.status : 'active';

    if (!message) {
      return badRequest(res, 'Validation failed', { message: 'message is required' });
    }

    const title = titleRaw || (message.length > 60 ? `${message.slice(0, 60)}…` : message);

    const n = new Notification({
      title,
      message,
      status,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await n.save();
    return res.status(201).json({ notification: { id: n.id, title: n.title, message: n.message, status: n.status } });
  } catch (err) {
    return next(err);
  }
}

export async function listNotifications(req, res, next) {
  try {
    const rows = await Notification.find({}, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .lean();
    const notifications = (rows || []).map((n) => ({ id: n.id, title: n.title, message: n.message, status: n.status }));
    return res.json({ notifications });
  } catch (err) {
    return next(err);
  }
}

export async function updateNotification(req, res, next) {
  try {
    const { id } = req.params;

    const body = req.body || {};
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, 'title')) updates.title = body.title;
    if (Object.prototype.hasOwnProperty.call(body, 'message')) updates.message = body.message;
    if (Object.prototype.hasOwnProperty.call(body, 'status')) updates.status = body.status;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await Notification.updateOne({ id: Number(id) }, { $set: updates });
    }

    const n = await Notification.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
    if (!n) return res.status(404).json({ message: 'Notification not found' });
    return res.json({ notification: { id: n.id, title: n.title, message: n.message, status: n.status } });
  } catch (err) {
    return next(err);
  }
}

export async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await Notification.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Notification not found' });

    await Notification.deleteOne({ id: Number(id) });
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

    const s = new Specimen({
      image_url: imageUrl,
      options_json: JSON.stringify(options),
      correct,
      status,
      question_text: questionText,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await s.save();

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
    const rows = await Specimen.find({}, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .lean();

    const specimens = (rows || []).map((s) => ({
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

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, 'imageUrl')) updates.image_url = body.imageUrl;
    if (Object.prototype.hasOwnProperty.call(body, 'optionsJson')) updates.options_json = body.optionsJson;
    if (Object.prototype.hasOwnProperty.call(body, 'correct')) updates.correct = Number(body.correct);
    if (Object.prototype.hasOwnProperty.call(body, 'status')) updates.status = body.status;
    if (Object.prototype.hasOwnProperty.call(body, 'questionText')) updates.question_text = body.questionText;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await Specimen.updateOne({ id: Number(id) }, { $set: updates });
    }

    const s = await Specimen.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
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

    const t = new Test({
      title,
      is_active: Boolean(isActive),
      question_count: Number(questionCount),
      per_question_seconds: Number(perQuestionSeconds),
      marks_correct: Number(marksCorrect),
      created_at: new Date(),
      updated_at: new Date(),
    });
    await t.save();

    const testId = t.id;
    const qDocs = normalizedQuestions.map((q) => ({
      test_id: Number(testId),
      question_text: q.questionText,
      image_url: q.imageUrl,
      option_a: q.optionA,
      option_b: q.optionB,
      option_c: q.optionC,
      option_d: q.optionD,
      correct_option: q.correctOption,
      question_order: Number(q.questionOrder),
      created_at: new Date(),
    }));

    for (const q of qDocs) {
      const doc = new TestQuestion(q);
      await doc.save();
    }

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

    const existing = await Specimen.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Specimen not found' });

    await Specimen.deleteOne({ id: Number(id) });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
}

export async function createTest(req, res, next) {
  try {
    const { title, isActive = true, questionCount = 50, perQuestionSeconds = 30, marksCorrect = 4 } = req.body;

    const t = new Test({
      title,
      is_active: Boolean(isActive),
      question_count: Number(questionCount),
      per_question_seconds: Number(perQuestionSeconds),
      marks_correct: Number(marksCorrect),
      created_at: new Date(),
      updated_at: new Date(),
    });
    await t.save();

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
    const rows = await Test.find({}, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .lean();

    const tests = (rows || []).map((t) => ({
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

    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, 'title')) updates.title = body.title;
    if (Object.prototype.hasOwnProperty.call(body, 'isActive')) updates.is_active = Boolean(body.isActive);
    if (Object.prototype.hasOwnProperty.call(body, 'questionCount')) updates.question_count = Number(body.questionCount);
    if (Object.prototype.hasOwnProperty.call(body, 'perQuestionSeconds')) updates.per_question_seconds = Number(body.perQuestionSeconds);
    if (Object.prototype.hasOwnProperty.call(body, 'marksCorrect')) updates.marks_correct = Number(body.marksCorrect);

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await Test.updateOne({ id: Number(id) }, { $set: updates });
    }

    const t = await Test.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
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

    const existing = await Test.findOne({ id: Number(id) }, { id: 1, _id: 0 }).lean();
    if (!existing) return res.status(404).json({ message: 'Test not found' });

    await Result.deleteMany({ test_id: Number(id) });
    await TestQuestion.deleteMany({ test_id: Number(id) });
    await Test.deleteOne({ id: Number(id) });

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
        updates[col] = toBool(req.body[k]);
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await Settings.updateOne({ id: 1 }, { $set: updates });
    }

    const row = await Settings.findOne({ id: 1 }, { _id: 0, __v: 0 }).lean();
    return res.json({ settings: mapSettingsRow(row) });
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

    if (testId) {
      const tid = Number(testId);
      if (!Number.isFinite(tid)) return res.status(400).json({ message: 'testId must be a number' });

      const firstAttempts = await Result.aggregate([
        { $match: { test_id: tid } },
        { $sort: { id: 1 } },
        { $group: { _id: '$user_id', first: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$first' } },
        { $sort: { score: -1, time_taken_sec: 1, date: 1, id: 1 } },
        { $limit: lim },
        { $project: { _id: 0, __v: 0 } },
      ]);

      const userIds = [...new Set((firstAttempts || []).map((r) => Number(r.user_id)).filter((x) => Number.isFinite(x)))];
      const [users, test] = await Promise.all([
        User.find({ id: { $in: userIds } }, { _id: 0, id: 1, name: 1, email: 1 }).lean(),
        Test.findOne({ id: tid }, { _id: 0, id: 1, title: 1 }).lean(),
      ]);

      const userById = new Map((users || []).map((u) => [Number(u.id), u]));
      const out = (firstAttempts || []).map((r, idx) => {
        const u = userById.get(Number(r.user_id));
        return {
          ...r,
          student_name: u?.name ?? null,
          student_email: u?.email ?? null,
          test_title: test?.title ?? null,
          rank: idx + 1,
        };
      });

      return res.json({ results: out });
    }

    const rows = await Result.find({}, { _id: 0, __v: 0 })
      .sort({ date: -1, id: -1 })
      .limit(lim)
      .lean();

    const userIds = [...new Set((rows || []).map((r) => Number(r.user_id)).filter((x) => Number.isFinite(x)))];
    const testIds = [...new Set((rows || []).map((r) => Number(r.test_id)).filter((x) => Number.isFinite(x)))];

    const [users, tests] = await Promise.all([
      User.find({ id: { $in: userIds } }, { _id: 0, id: 1, name: 1, email: 1 }).lean(),
      Test.find({ id: { $in: testIds } }, { _id: 0, id: 1, title: 1 }).lean(),
    ]);

    const userById = new Map((users || []).map((u) => [Number(u.id), u]));
    const testById = new Map((tests || []).map((t) => [Number(t.id), t]));

    const out = (rows || []).map((r) => {
      const u = userById.get(Number(r.user_id));
      const t = testById.get(Number(r.test_id));
      return {
        ...r,
        student_name: u?.name ?? null,
        student_email: u?.email ?? null,
        test_title: t?.title ?? null,
      };
    });

    return res.json({ results: out });
  } catch (err) {
    return next(err);
  }
}

export async function exportResultsCsv(req, res) {
  try {
    const { testId } = req.query;

    let rows = [];
    if (testId) {
      const tid = Number(testId);
      if (!Number.isFinite(tid)) return res.status(400).json({ message: 'testId must be a number' });

      const firstAttempts = await Result.aggregate([
        { $match: { test_id: tid } },
        { $sort: { id: 1 } },
        { $group: { _id: '$user_id', first: { $first: '$$ROOT' } } },
        { $replaceRoot: { newRoot: '$first' } },
        { $sort: { score: -1, time_taken_sec: 1, date: 1, id: 1 } },
        { $limit: 5000 },
        { $project: { _id: 0, date: 1, user_id: 1, test_id: 1, score: 1, accuracy: 1, time_taken_sec: 1 } },
      ]);

      const userIds = [...new Set((firstAttempts || []).map((r) => Number(r.user_id)).filter((x) => Number.isFinite(x)))];
      const [users, test] = await Promise.all([
        User.find({ id: { $in: userIds } }, { _id: 0, id: 1, name: 1, email: 1 }).lean(),
        Test.findOne({ id: tid }, { _id: 0, id: 1, title: 1 }).lean(),
      ]);

      const userById = new Map((users || []).map((u) => [Number(u.id), u]));
      rows = (firstAttempts || []).map((r) => {
        const u = userById.get(Number(r.user_id));
        return {
          date: r.date,
          student_name: u?.name ?? null,
          student_email: u?.email ?? null,
          test_title: test?.title ?? null,
          score: r.score,
          accuracy: r.accuracy,
          time_taken_sec: r.time_taken_sec,
        };
      });
    } else {
      const results = await Result.find({}, { _id: 0, date: 1, user_id: 1, test_id: 1, score: 1, accuracy: 1, time_taken_sec: 1 })
        .sort({ date: -1, id: -1 })
        .limit(5000)
        .lean();

      const userIds = [...new Set((results || []).map((r) => Number(r.user_id)).filter((x) => Number.isFinite(x)))];
      const testIds = [...new Set((results || []).map((r) => Number(r.test_id)).filter((x) => Number.isFinite(x)))];

      const [users, tests] = await Promise.all([
        User.find({ id: { $in: userIds } }, { _id: 0, id: 1, name: 1, email: 1 }).lean(),
        Test.find({ id: { $in: testIds } }, { _id: 0, id: 1, title: 1 }).lean(),
      ]);

      const userById = new Map((users || []).map((u) => [Number(u.id), u]));
      const testById = new Map((tests || []).map((t) => [Number(t.id), t]));

      rows = (results || []).map((r) => {
        const u = userById.get(Number(r.user_id));
        const t = testById.get(Number(r.test_id));
        return {
          date: r.date,
          student_name: u?.name ?? null,
          student_email: u?.email ?? null,
          test_title: t?.title ?? null,
          score: r.score,
          accuracy: r.accuracy,
          time_taken_sec: r.time_taken_sec,
        };
      });
    }

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

export async function createPyq(req, res) {
  try {
    const { title, pdf_url, solution_url, subject, year, centre_id, centre_name, status, access_type } = req.body;

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedPdfUrl = typeof pdf_url === 'string' ? pdf_url.trim() : '';
    if (!trimmedTitle || !trimmedPdfUrl) {
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
      if (!centreId) {
        return res.status(400).json({ message: 'Invalid centre_name' });
      }
    } else {
      centreId = centre_id === undefined || centre_id === null || centre_id === '' ? null : Number(centre_id);
      if (centreId !== null && !Number.isFinite(centreId)) return res.status(400).json({ message: 'centre_id must be a number' });
      if (centreId !== null) {
        const centre = await ExamCentre.findOne({ id: Number(centreId) }, { id: 1, _id: 0 }).lean();
        if (!centre) return res.status(400).json({ message: 'Invalid centre_id' });
      }
    }

    if (centreId === null) {
      return res.status(400).json({ message: 'exam centre is required' });
    }

    let yr = year ? String(year).trim() : '';
    if (!yr) return res.status(400).json({ message: 'year is required' });
    yr = await ensureExamCentreYearActive(centreId, yr);
    if (!yr) return res.status(400).json({ message: 'Invalid year' });

    const doc = new Pyq({
      title: trimmedTitle,
      pdf_url: trimmedPdfUrl,
      solution_url: solution_url || null,
      subject: subject || 'General',
      year: yr || null,
      centre_id: Number(centreId),
      access_type: accessType,
      status: st,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await doc.save();
    return res.json({ id: doc.id });
  } catch (err) {
    console.error('[createPyq]', err);
    return res.status(500).json({ message: 'Failed to create PYQ' });
  }
}

export async function listPyqs(req, res) {
  try {
    const rows = await Pyq.find({}, { _id: 0, __v: 0 })
      .sort({ created_at: -1, id: -1 })
      .lean();

    const centreIds = [...new Set((rows || []).map((p) => Number(p.centre_id)).filter((x) => Number.isFinite(x)))];
    const centres = await ExamCentre.find({ id: { $in: centreIds } }, { _id: 0, id: 1, name: 1 }).lean();
    const centreById = new Map((centres || []).map((c) => [Number(c.id), c]));

    const out = (rows || []).map((p) => ({
      ...p,
      centre_name: centreById.get(Number(p.centre_id))?.name ?? null,
    }));

    return res.json(out);
  } catch (err) {
    console.error('[listPyqs]', err);
    return res.status(500).json({ message: 'Failed to fetch PYQs' });
  }
}

export async function updatePyq(req, res) {
  try {
    const { id } = req.params;
    const { title, pdf_url, solution_url, subject, year, status, centre_id, centre_name, access_type } = req.body;

    const existing = await Pyq.findOne({ id: Number(id) }, { _id: 0, id: 1, centre_id: 1, year: 1 }).lean();
    if (!existing) return res.status(404).json({ message: 'PYQ not found' });

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
        const centre = await ExamCentre.findOne({ id: Number(parsed) }, { id: 1, _id: 0 }).lean();
        if (!centre) return res.status(400).json({ message: 'Invalid centre_id' });
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

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (pdf_url !== undefined) updates.pdf_url = pdf_url;
    if (solution_url !== undefined) updates.solution_url = solution_url;
    if (subject !== undefined) updates.subject = subject;
    if (year !== undefined) updates.year = nextYear;

    if (centre_name !== undefined || centre_id !== undefined) {
      updates.centre_id = nextCentreId;
    }

    if (access_type !== undefined) {
      const at = access_type === null ? null : String(access_type).trim().toLowerCase();
      if (!at || !['free', 'paid'].includes(at)) return res.status(400).json({ message: 'access_type must be free|paid' });
      updates.access_type = at;
    }

    if (status !== undefined) updates.status = status;
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No fields to update' });

    updates.updated_at = new Date();
    await Pyq.updateOne({ id: Number(id) }, { $set: updates });
    return res.json({ updated: true });
  } catch (err) {
    console.error('[updatePyq]', err);
    return res.status(500).json({ message: 'Failed to update PYQ' });
  }
}

export async function deletePyq(req, res) {
  try {
    const { id } = req.params;
    await Pyq.deleteOne({ id: Number(id) });
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[deletePyq]', err);
    return res.status(500).json({ message: 'Failed to delete PYQ' });
  }
}

export async function getMenus(req, res) {
  try {
    const { type, status } = req.query;
    const filter = {};
    if (status) {
      const st = normalizeStatus(status, ['active', 'inactive']);
      if (!st) return badRequest(res, 'Validation failed', { status: 'status must be active|inactive' });
      filter.status = st;
    }

    if (type) {
      filter.type = { $in: [String(type), 'both'] };
    }

    const rows = await Menu.find(filter, { _id: 0, __v: 0 }).sort({ menu_order: 1, id: 1 }).lean();
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

    const doc = new Menu({
      name,
      route: route || null,
      icon,
      type,
      status,
      menu_order: menuOrder,
      parent_id: body.parent_id ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await doc.save();

    const saved = await Menu.findOne({ id: doc.id }, { _id: 0, __v: 0 }).lean();
    return res.status(201).json({ menu: saved });
  } catch (err) {
    console.error('[createMenu]', err);
    return res.status(500).json({ message: 'Failed to create menu' });
  }
}

export async function updateMenu(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = asNonEmptyString(body.name);
      if (!name) return badRequest(res, 'Validation failed', { name: 'name is required' });
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'route')) {
      const route = typeof body.route === 'string' ? body.route.trim() : null;
      updates.route = route || null;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'icon')) {
      const icon = asNonEmptyString(body.icon) || '📄';
      updates.icon = icon;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'type')) {
      const type = asNonEmptyString(body.type);
      if (!type || !['student', 'admin', 'both'].includes(type)) {
        return badRequest(res, 'Validation failed', { type: 'type must be student|admin|both' });
      }
      updates.type = type;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'status')) {
      const status = normalizeStatus(body.status, ['active', 'inactive']);
      if (!status) return badRequest(res, 'Validation failed', { status: 'status must be active|inactive' });
      updates.status = status;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'menu_order')) {
      updates.menu_order = Number(body.menu_order) || 0;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'parent_id')) {
      updates.parent_id = body.parent_id ?? null;
    }

    if (Object.keys(updates).length === 0) return badRequest(res, 'No fields to update');

    updates.updated_at = new Date();
    await Menu.updateOne({ id: Number(id) }, { $set: updates });

    const row = await Menu.findOne({ id: Number(id) }, { _id: 0, __v: 0 }).lean();
    if (!row) return res.status(404).json({ message: 'Menu not found' });

    return res.json({ menu: row });
  } catch (err) {
    console.error('[updateMenu]', err);
    return res.status(500).json({ message: 'Failed to update menu' });
  }
}

export async function deleteMenu(req, res) {
  try {
    const { id } = req.params;
    await Menu.deleteOne({ id: Number(id) });
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
      await Menu.updateOne({ id: Number(item.id) }, { $set: { menu_order: Number(item.menu_order) || 0, updated_at: new Date() } });
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
    const data = await getOrSetCached('admin:analytics:v1', 8000, async () => {
      const [
        studentsCount,
        testsCount,
        specimensCount,
        videosCount,
        materialsCount,
        pyqsCount,
        resultsCount,
        avgAccuracyAgg,
      ] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        Test.countDocuments({ is_active: true }),
        Specimen.countDocuments({ status: 'active' }),
        Video.countDocuments({ status: 'active' }),
        Material.countDocuments({}),
        Pyq.countDocuments({}),
        Result.countDocuments({}),
        Result.aggregate([{ $group: { _id: null, avg: { $avg: '$accuracy' } } }]).catch(() => []),
      ]);

      return {
        studentsCount: Number(studentsCount || 0),
        testsCount: Number(testsCount || 0),
        specimensCount: Number(specimensCount || 0),
        videosCount: Number(videosCount || 0),
        materialsCount: Number(materialsCount || 0),
        pyqsCount: Number(pyqsCount || 0),
        resultsCount: Number(resultsCount || 0),
        avgAccuracy: Number(avgAccuracyAgg?.[0]?.avg || 0),
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('[getAnalytics]', err);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

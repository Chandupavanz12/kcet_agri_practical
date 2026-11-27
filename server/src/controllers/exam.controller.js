import crypto from 'crypto';
import { getPoolForExam, getPucPool, getKcetNeetPool } from '../config/examPgs.js';
export { getPoolForExam, getPucPool, getKcetNeetPool };
import { Material, Pyq, User, UserAccess, Result } from '../models/index.js';
import { getMockResultModel } from '../config/mockTestDb.js';

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY TTL CACHE FOR ULTRA-FAST SUB-SECOND RESPONSES
// ─────────────────────────────────────────────────────────────────────────────
const _examMemCache = new Map();
export function getCached(key, ttlMs = 45000) {
  const item = _examMemCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    _examMemCache.delete(key);
    return null;
  }
  return item.data;
}

export function setCached(key, data, ttlMs = 45000) {
  _examMemCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function clearExamCache(pattern) {
  if (!pattern) {
    _examMemCache.clear();
    return;
  }
  for (const k of _examMemCache.keys()) {
    if (k.includes(pattern)) _examMemCache.delete(k);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BANNERS API (Admin & Student)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentBanners(req, res, next) {
  try {
    const exam = String(req.query.exam || 'global').toLowerCase().trim();
    const cacheKey = `banners:${exam}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, banners: cached });
    }

    const pool = getKcetNeetPool(); // default pool storing global banners

    let banners = [];
    try {
      const result = await pool.query(
        `SELECT * FROM banners 
         WHERE is_active = true AND (exam = 'global' OR exam = $1)
         ORDER BY display_order ASC, id DESC LIMIT 10`,
        [exam]
      );
      banners = result.rows;
    } catch (_err) {
      // Fallback to PUC pool if needed
      try {
        const pool2 = getPucPool();
        const result2 = await pool2.query(
          `SELECT * FROM banners WHERE is_active = true ORDER BY display_order ASC LIMIT 10`
        );
        banners = result2.rows;
      } catch (_) {}
    }

    if (banners.length === 0) {
      // Return beautiful default banner matching the user's reference image
      banners = [
        {
          id: 1,
          exam: 'global',
          template_id: 'emerald-dream',
          title: 'Dream Big...',
          highlight_text: 'Prepare Smart!',
          subtitle: 'Your Complete Exam Preparation Partner',
          button_text: 'Start Learning >',
          action_route: '/student/dashboard',
          image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&auto=format&fit=crop&q=80',
          bg_gradient_start: '#07162c',
          bg_gradient_end: '#059669',
          is_active: true,
        },
      ];
    }

    setCached(cacheKey, banners, 60000);
    return res.json({ success: true, banners });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminBanners(req, res, next) {
  try {
    const pool = getKcetNeetPool();
    const result = await pool.query(`SELECT * FROM banners ORDER BY id DESC`);
    return res.json({ success: true, banners: result.rows });
  } catch (err) {
    return next(err);
  }
}

export async function createAdminBanner(req, res, next) {
  try {
    const {
      exam = 'global',
      template_id = 'emerald-dream',
      title,
      highlight_text = '',
      subtitle = '',
      button_text = 'Start Learning >',
      action_route = '/student/dashboard',
      image_url = '',
      bg_gradient_start = '#07162c',
      bg_gradient_end = '#059669',
      display_order = 1,
      is_active = true,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Banner title is required' });
    }

    const pool = getKcetNeetPool();
    const result = await pool.query(
      `INSERT INTO banners (
        exam, template_id, title, highlight_text, subtitle, 
        button_text, action_route, image_url, bg_gradient_start, 
        bg_gradient_end, display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        exam.toLowerCase(),
        template_id,
        title.trim(),
        highlight_text.trim(),
        subtitle.trim(),
        button_text.trim(),
        action_route.trim(),
        image_url.trim(),
        bg_gradient_start,
        bg_gradient_end,
        Number(display_order || 1),
        Boolean(is_active),
      ]
    );

    // Also mirror into PUC DB so banners queryable everywhere
    try {
      const pool2 = getPucPool();
      await pool2.query(
        `INSERT INTO banners (
          exam, template_id, title, highlight_text, subtitle, 
          button_text, action_route, image_url, bg_gradient_start, 
          bg_gradient_end, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          exam.toLowerCase(),
          template_id,
          title.trim(),
          highlight_text.trim(),
          subtitle.trim(),
          button_text.trim(),
          action_route.trim(),
          image_url.trim(),
          bg_gradient_start,
          bg_gradient_end,
          Number(display_order || 1),
          Boolean(is_active),
        ]
      );
    } catch (_) {}

    clearExamCache();
    return res.status(201).json({ success: true, banner: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function updateAdminBanner(req, res, next) {
  try {
    const { id } = req.params;
    const {
      exam,
      template_id,
      title,
      highlight_text,
      subtitle,
      button_text,
      action_route,
      image_url,
      bg_gradient_start,
      bg_gradient_end,
      display_order,
      is_active,
    } = req.body;

    const pool = getKcetNeetPool();
    const result = await pool.query(
      `UPDATE banners SET
        exam = COALESCE($1, exam),
        template_id = COALESCE($2, template_id),
        title = COALESCE($3, title),
        highlight_text = COALESCE($4, highlight_text),
        subtitle = COALESCE($5, subtitle),
        button_text = COALESCE($6, button_text),
        action_route = COALESCE($7, action_route),
        image_url = COALESCE($8, image_url),
        bg_gradient_start = COALESCE($9, bg_gradient_start),
        bg_gradient_end = COALESCE($10, bg_gradient_end),
        display_order = COALESCE($11, display_order),
        is_active = COALESCE($12, is_active),
        updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [
        exam,
        template_id,
        title,
        highlight_text,
        subtitle,
        button_text,
        action_route,
        image_url,
        bg_gradient_start,
        bg_gradient_end,
        display_order !== undefined ? Number(display_order) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
      ]
    );

    clearExamCache();
    return res.json({ success: true, banner: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function deleteAdminBanner(req, res, next) {
  try {
    const { id } = req.params;
    const pool = getKcetNeetPool();
    await pool.query('DELETE FROM banners WHERE id = $1', [id]);
    try {
      const pool2 = getPucPool();
      await pool2.query('DELETE FROM banners WHERE id = $1', [id]);
    } catch (_) {}
    clearExamCache();
    return res.json({ success: true, message: 'Banner deleted' });
  } catch (err) {
    return next(err);
  }
}

// Helper: Determine if accessModules grants permission to a specific module
export function modulesInclude(accessModules, moduleName) {
  if (!moduleName) return true;
  let mods = accessModules;
  if (typeof mods === 'string') {
    try {
      mods = JSON.parse(mods);
    } catch {
      mods = [mods];
    }
  }
  if (!Array.isArray(mods)) return true;
  if (mods.length === 0 || mods.includes('all') || mods.includes('*') || mods.includes('complete')) {
    return true;
  }
  const cleanMod = String(moduleName).toLowerCase().trim();
  return mods.some((m) => {
    const s = String(m).toLowerCase().trim();
    if (s === 'all' || s === '*' || s === cleanMod) return true;
    if (cleanMod === 'materials' && (s === 'material' || s === 'notes' || s === 'study' || s === 'pdfs')) return true;
    if (cleanMod === 'tests' && (s === 'test' || s === 'mock' || s === 'mocks' || s === 'mock_tests')) return true;
    if (cleanMod === 'pyqs' && (s === 'pyq' || s === 'paper' || s === 'papers' || s === 'previous_years')) return true;
    return false;
  });
}

// Helper: Check if a plan/access record is an item-level Bulk Plan
export function hasBulkAllowedItems(obj) {
  let items = obj?.allowed_items;
  if (!items) return false;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch { return false; }
  }
  if (!items || typeof items !== 'object') return false;
  return (
    (Array.isArray(items.materials) && items.materials.length > 0) ||
    (Array.isArray(items.pyqs) && items.pyqs.length > 0) ||
    (Array.isArray(items.tests) && items.tests.length > 0)
  );
}

// Helper: Fetch merged item-level unlocks across all active Bulk Plans for a user
export async function getUserBulkAllowedItems(userId) {
  const result = {
    materials: new Set(),
    pyqs: new Set(),
    tests: new Set(),
  };
  if (!userId) return result;

  const mergeItems = (raw) => {
    let items = raw;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch { return; }
    }
    if (!items || typeof items !== 'object') return;
    for (const key of ['materials', 'pyqs', 'tests']) {
      if (Array.isArray(items[key])) {
        for (const entry of items[key]) {
          if (entry && entry.exam && entry.id !== undefined) {
            result[key].add(`${String(entry.exam).toLowerCase().trim()}:${Number(entry.id)}`);
          }
        }
      }
    }
  };

  try {
    const { Payment } = await import('../models/index.js');
    const paidDocs = await Payment.find({
      user_id: Number(userId),
      status: { $in: ['paid', 'free'] },
      admin_revoked: { $ne: true },
      allowed_items: { $ne: null },
    }).lean();
    const now = new Date();
    for (const doc of paidDocs) {
      const paidDate = doc.paid_at || doc.created_at || now;
      const durationDays = Number(doc.duration_days || 365);
      const expiresAt = new Date(new Date(paidDate).getTime() + durationDays * 86400000);
      if (expiresAt > now) {
        mergeItems(doc.allowed_items);
      }
    }
  } catch (_) {}

  const pools = [getPucPool(), getKcetNeetPool()].filter(Boolean);
  for (const p of pools) {
    try {
      const r = await p.query(
        `SELECT allowed_items FROM user_access WHERE user_id = $1 AND allowed_items IS NOT NULL AND expires_at > NOW()`,
        [Number(userId)]
      );
      for (const row of r.rows) {
        mergeItems(row.allowed_items);
      }
    } catch (_) {}
  }

  return result;
}

export function isItemUnlockedByBulk(bulkItems, type, exam, id) {
  if (!bulkItems || !bulkItems[type]) return false;
  return bulkItems[type].has(`${String(exam).toLowerCase().trim()}:${Number(id)}`);
}

// Helper: Check student module access (respects granular module choices & global plans)
const _userAccessCache = new Map();
export async function checkUserModuleAccess(pool, userId, exam, moduleName) {
  if (!userId) return false;
  const cacheKey = `${userId}:${exam}:${moduleName || 'all'}`;
  const cached = _userAccessCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.hasAccess;
  }

  const cleanExam = String(exam || '').toLowerCase().trim();

  // 1. Direct MongoDB Payment check (verifies active status, expiry, and granular access modules)
  try {
    const { Payment } = await import('../models/index.js');
    const paidDocs = await Payment.find({
      user_id: Number(userId),
      status: { $in: ['paid', 'free'] },
      admin_revoked: { $ne: true },
      $or: [
        { exam: cleanExam },
        { exam: 'global' },
      ],
    }).sort({ paid_at: -1, created_at: -1 }).lean();

    const now = new Date();
    for (const paidDoc of paidDocs) {
      const paidDate = paidDoc.paid_at || paidDoc.created_at || now;
      const durationDays = Number(paidDoc.duration_days || 365);
      const expiresAt = new Date(new Date(paidDate).getTime() + durationDays * 86400000);

      if (expiresAt > now) {
        // Bulk Plans only unlock specific allowed_items, never whole modules
        if (hasBulkAllowedItems(paidDoc)) {
          continue;
        }
        // If plan is 'global', check if this exam is allowed
        if (paidDoc.exam === 'global' && Array.isArray(paidDoc.target_exams) && paidDoc.target_exams.length > 0) {
          if (!paidDoc.target_exams.map((x) => String(x).toLowerCase()).includes(cleanExam)) {
            continue; // this global plan doesn't cover this exam
          }
        }

        // Check if the requested module is included in the plan's access_modules
        if (modulesInclude(paidDoc.access_modules, moduleName)) {
          _userAccessCache.set(cacheKey, { hasAccess: true, expiresAt: Date.now() + 60000 });
          return true;
        }
      }
    }
  } catch (mongoErr) {
    console.warn('[checkUserModuleAccess] Mongo payment check error:', mongoErr?.message || mongoErr);
  }

  // 2. PostgreSQL user_access check
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT access_modules, allowed_items, exam, expires_at FROM user_access 
         WHERE user_id = $1 AND (exam = $2 OR exam = 'global') AND expires_at > NOW()`,
        [userId, cleanExam]
      );
      for (const row of res.rows) {
        if (hasBulkAllowedItems(row)) continue;
        if (modulesInclude(row.access_modules, moduleName)) {
          _userAccessCache.set(cacheKey, { hasAccess: true, expiresAt: Date.now() + 60000 });
          return true;
        }
      }
    } catch (err) {
      console.error('[checkUserModuleAccess] Postgres error:', err?.message || err);
    }
  }

  _userAccessCache.set(cacheKey, { hasAccess: false, expiresAt: Date.now() + 30000 });
  return false;
}

// Helper: Grant exam access in PostgreSQL (supports granular modules, global plans, & bulk item plans)
export async function grantExamAccess(userId, exam, planCode, accessModules = ['all'], durationDays = 365, allowedItems = null) {
  const normalizedExam = String(exam || '').toLowerCase().trim();
  const expiresAt = new Date(Date.now() + durationDays * 86400000);

  _userAccessCache.clear();
  clearExamCache();

  // Always write access to both PostgreSQL pools so both PUC and KCET/NEET instances reflect access immediately
  const poolsToUpdate = [getPucPool(), getKcetNeetPool()].filter(Boolean);

  for (const p of poolsToUpdate) {
    try {
      await p.query(`
        CREATE TABLE IF NOT EXISTS user_access (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          exam VARCHAR(50) NOT NULL DEFAULT 'puc',
          plan_code VARCHAR(50) NOT NULL,
          access_modules JSONB DEFAULT '["all"]'::jsonb,
          allowed_items JSONB DEFAULT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      try {
        await p.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS exam VARCHAR(50) DEFAULT 'puc'`);
        await p.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS access_modules JSONB DEFAULT '["all"]'::jsonb`);
        await p.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS allowed_items JSONB DEFAULT NULL`);
      } catch (_) {}

      await p.query(
        `DELETE FROM user_access WHERE user_id = $1 AND (exam = $2 OR exam = 'global') AND plan_code = $3`,
        [userId, normalizedExam, planCode]
      );
      await p.query(
        `INSERT INTO user_access (user_id, exam, plan_code, access_modules, allowed_items, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, normalizedExam, planCode, JSON.stringify(accessModules), allowedItems ? JSON.stringify(allowedItems) : null, expiresAt]
      );
    } catch (err) {
      console.error('[grantExamAccess] error:', err);
    }
  }
}

// Helper: Revoke exam access for a user (can revoke specific exam or 'all')
export async function revokeExamAccess(userId, targetExam = 'all') {
  const uid = Number(userId);
  const exam = String(targetExam || 'all').toLowerCase().trim();

  _userAccessCache.clear();
  clearExamCache();

  // 1. Remove from Neon PostgreSQL user_access
  const pools = [getPucPool(), getKcetNeetPool()].filter(Boolean);
  for (const p of pools) {
    try {
      if (exam === 'all') {
        await p.query('DELETE FROM user_access WHERE user_id = $1', [uid]);
      } else {
        await p.query('DELETE FROM user_access WHERE user_id = $1 AND (exam = $2 OR exam = $3)', [uid, exam, 'global']);
      }
    } catch (err) {
      console.error(`[revokeExamAccess] Postgres delete error (${exam}):`, err?.message || err);
    }
  }

  // 2. Mark payments as revoked in MongoDB Payment
  try {
    const { Payment } = await import('../models/index.js');
    const filter = { user_id: uid };
    if (exam !== 'all') {
      filter.exam = exam;
    }
    await Payment.updateMany(filter, {
      $set: {
        status: 'revoked',
        admin_revoked: true,
        admin_revoked_at: new Date(),
      },
    });
  } catch (mongoErr) {
    console.error('[revokeExamAccess] Mongo payment revoke error:', mongoErr?.message || mongoErr);
  }
}

// Helper: Retrieve all active exam access records for a student across Postgres and Mongo
export async function getUserActiveExamAccess(userId) {
  const uid = Number(userId);
  const activePlans = [];
  const now = new Date();

  // Check MongoDB Payments
  try {
    const { Payment } = await import('../models/index.js');
    const payments = await Payment.find({
      user_id: uid,
      status: { $in: ['paid', 'free'] },
      admin_revoked: { $ne: true },
    }).lean();

    for (const p of payments) {
      const paidDate = p.paid_at || p.created_at || now;
      const duration = Number(p.duration_days || 365);
      const expiry = new Date(new Date(paidDate).getTime() + duration * 86400000);
      if (expiry > now) {
        activePlans.push({
          source: 'payment',
          exam: p.exam || 'agri',
          planCode: p.plan_code || 'plan',
          planName: p.plan_name || `${(p.exam || '').toUpperCase()} Plan`,
          accessModules: p.access_modules || ['all'],
          expiresAt: expiry,
        });
      }
    }
  } catch (_) {}

  // Check Postgres Neon user_access
  const pools = [getPucPool(), getKcetNeetPool()].filter(Boolean);
  for (const p of pools) {
    try {
      const r = await p.query(
        `SELECT * FROM user_access WHERE user_id = $1 AND expires_at > NOW()`,
        [uid]
      );
      for (const row of r.rows) {
        if (!activePlans.some((ap) => ap.exam === row.exam && ap.planCode === row.plan_code)) {
          let mods = row.access_modules;
          if (typeof mods === 'string') {
            try { mods = JSON.parse(mods); } catch { mods = [mods]; }
          }
          activePlans.push({
            source: 'postgres',
            exam: row.exam,
            planCode: row.plan_code,
            planName: `${String(row.exam).toUpperCase()} Access`,
            accessModules: mods || ['all'],
            expiresAt: row.expires_at,
          });
        }
      }
    } catch (_) {}
  }

  return activePlans;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM MATERIALS & SUBJECTS (PUC, KCET, NEET)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamMaterials(req, res, next) {
  try {
    const exam = String(req.query.exam || '').toLowerCase().trim();
    const subject = String(req.query.subject || '').toLowerCase().trim();

    const pool = getPoolForExam(exam);
    if (!pool) {
      return res.json({ materials: [] });
    }

    const cacheKey = `materials:${exam}:${subject}`;
    let rows = getCached(cacheKey);

    if (!rows) {
      let queryText = 'SELECT * FROM materials WHERE exam = $1 AND status = $2';
      const params = [exam, 'active'];

      if (subject) {
        queryText += ' AND LOWER(subject) = $3';
        params.push(subject);
      }
      queryText += ' ORDER BY created_at DESC, id DESC';

      const result = await pool.query(queryText, params);
      rows = result.rows;
      setCached(cacheKey, rows, 45000);
    }

    const userId = Number(req.user?.sub || req.user?.id);
    const [hasAccess, bulkItems] = await Promise.all([
      checkUserModuleAccess(pool, userId, exam, 'materials'),
      userId ? getUserBulkAllowedItems(userId) : Promise.resolve(null),
    ]);

    const materials = rows.map((m) => ({
      id: m.id,
      title: m.title,
      subject: m.subject,
      description: m.description,
      pdfUrl: m.pdf_url,
      type: m.type || 'pdf',
      isFree: m.is_free,
      locked: !m.is_free && !hasAccess && !isItemUnlockedByBulk(bulkItems, 'materials', exam, m.id),
      exam: m.exam,
      createdAt: m.created_at,
    }));

    return res.json({ success: true, materials, isSubscribed: hasAccess });
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM PYQS (PUC, KCET, NEET - No Exam Centre needed)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamPyqs(req, res, next) {
  try {
    const exam = String(req.query.exam || '').toLowerCase().trim();
    const subject = String(req.query.subject || '').toLowerCase().trim();

    const pool = getPoolForExam(exam);
    if (!pool) {
      return res.json({ pyqs: [] });
    }

    const cacheKey = `pyqs:${exam}:${subject}`;
    let rows = getCached(cacheKey);

    if (!rows) {
      let queryText = 'SELECT * FROM pyqs WHERE exam = $1 AND status = $2';
      const params = [exam, 'active'];

      if (subject) {
        queryText += ' AND LOWER(subject) = $3';
        params.push(subject);
      }
      queryText += ' ORDER BY year DESC, created_at DESC';

      const result = await pool.query(queryText, params);
      rows = result.rows;
      setCached(cacheKey, rows, 45000);
    }

    const userId = Number(req.user?.sub || req.user?.id);
    const [hasAccess, bulkItems] = await Promise.all([
      checkUserModuleAccess(pool, userId, exam, 'pyqs'),
      userId ? getUserBulkAllowedItems(userId) : Promise.resolve(null),
    ]);

    const pyqs = rows.map((p) => ({
      id: p.id,
      title: p.title,
      subject: p.subject,
      year: p.year,
      pdfUrl: p.pdf_url,
      isFree: p.is_free,
      locked: !p.is_free && !hasAccess && !isItemUnlockedByBulk(bulkItems, 'pyqs', exam, p.id),
      exam: p.exam,
      createdAt: p.created_at,
    }));

    return res.json({ success: true, pyqs, isSubscribed: hasAccess });
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM MOCK TESTS (PUC, KCET, NEET)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamTests(req, res, next) {
  try {
    const exam = String(req.query.exam || '').toLowerCase().trim();
    const subject = String(req.query.subject || '').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.json({ tests: [] });

    const cacheKey = `tests:${exam}:${subject}`;
    let rows = getCached(cacheKey);

    if (!rows) {
      let queryText = `
        SELECT t.*, COUNT(q.id) as question_count 
        FROM mock_tests t
        LEFT JOIN mock_questions q ON q.test_id = t.id
        WHERE t.exam = $1 AND t.is_active = true
      `;
      const params = [exam];

      if (subject) {
        queryText += ' AND LOWER(t.subject) = $2';
        params.push(subject);
      }

      queryText += ` GROUP BY t.id ORDER BY t.created_at DESC`;

      const result = await pool.query(queryText, params);
      rows = result.rows;
      setCached(cacheKey, rows, 45000);
    }

    const userId = Number(req.user?.sub || req.user?.id);
    const [hasAccess, bulkItems] = await Promise.all([
      checkUserModuleAccess(pool, userId, exam, 'tests'),
      userId ? getUserBulkAllowedItems(userId) : Promise.resolve(null),
    ]);

    const tests = rows.map((t) => {
      const isFree = t.is_free === true || t.is_free === null || t.is_free === undefined ? (t.is_free !== false) : false;
      const locked = !isFree && !hasAccess && !isItemUnlockedByBulk(bulkItems, 'tests', exam, t.id);

      return {
        id: t.id,
        title: t.title,
        subject: t.subject,
        exam: t.exam,
        instructions: t.instructions,
        questionCount: Number(t.question_count || 0),
        durationMinutes: t.duration_minutes,
        totalMarks: t.total_marks,
        passingMarks: t.passing_marks,
        perQuestionSeconds: t.per_question_seconds || 30,
        marksCorrect: t.marks_correct || 4,
        isFree,
        locked,
      };
    });

    return res.json({ success: true, tests, hasAccess });
  } catch (err) {
    return next(err);
  }
}

export async function startExamTest(req, res, next) {
  try {
    const { id } = req.params;
    const exam = String(req.query.exam || '').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.status(404).json({ message: 'Exam test not found' });

    const testRes = await pool.query('SELECT * FROM mock_tests WHERE id = $1', [id]);
    if (testRes.rows.length === 0) {
      return res.status(404).json({ message: 'Test not found' });
    }
    const test = testRes.rows[0];

    const qRes = await pool.query(
      'SELECT id, test_id, question_text, option_a, option_b, option_c, option_d, question_order FROM mock_questions WHERE test_id = $1 ORDER BY question_order ASC, id ASC',
      [id]
    );

    return res.json({
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        exam: test.exam,
        durationMinutes: test.duration_minutes,
        perQuestionSeconds: test.per_question_seconds || 30,
        marksCorrect: test.marks_correct || 4,
        totalMarks: test.total_marks,
      },
      questions: qRes.rows.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

export async function submitExamTest(req, res, next) {
  try {
    const { id } = req.params;
    const exam = String(req.body.exam || req.query.exam || '').toLowerCase().trim();
    const { answers = {}, timeTakenSec = 0 } = req.body;
    const userId = Number(req.user?.sub || req.user?.id);

    const pool = getPoolForExam(exam);
    if (!pool) return res.status(400).json({ message: 'Invalid exam specified' });

    const testRes = await pool.query('SELECT * FROM mock_tests WHERE id = $1', [id]);
    if (testRes.rows.length === 0) return res.status(404).json({ message: 'Test not found' });
    const test = testRes.rows[0];

    const qRes = await pool.query(
      'SELECT id, correct_option FROM mock_questions WHERE test_id = $1',
      [id]
    );
    const questions = qRes.rows;

    let correctCount = 0;
    let wrongCount = 0;
    const totalQuestions = questions.length;

    for (const q of questions) {
      const studentAns = String(answers[q.id] || '').trim().toLowerCase();
      const correctAns = String(q.correct_option || '').trim().toLowerCase();
      if (studentAns) {
        if (studentAns === correctAns) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    }

    const marksCorrect = test.marks_correct || 4;
    const score = correctCount * marksCorrect;
    const accuracy = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

    const insertRes = await pool.query(
      `INSERT INTO mock_results (
        user_id, exam, test_id, score, correct_count, wrong_count, 
        total_questions, accuracy, time_taken_sec, responses_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        exam,
        id,
        score,
        correctCount,
        wrongCount,
        totalQuestions,
        accuracy,
        timeTakenSec,
        JSON.stringify(answers),
      ]
    );

    return res.json({
      success: true,
      result: {
        id: insertRes.rows[0].id,
        score,
        correctCount,
        wrongCount,
        totalQuestions,
        accuracy,
        timeTakenSec,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM SUBSCRIPTION PLANS (PUC, KCET, NEET)
// ─────────────────────────────────────────────────────────────────────────────

export async function getExamPlans(req, res, next) {
  try {
    const exam = String(req.query.exam || '').toLowerCase().trim();
    const pool = getPoolForExam(exam) || getKcetNeetPool();
    if (!pool) return res.json({ plans: [] });

    const cacheKey = `plans:${exam}`;
    let plansRows = getCached(cacheKey);

    if (!plansRows) {
      // Return plans for this specific exam AND global plans that cover all exams
      const result = await pool.query(
        `SELECT * FROM plans 
         WHERE (exam = $1 OR exam = 'global') AND status = $2 
         ORDER BY price_paise ASC`,
        [exam, 'active']
      );
      plansRows = result.rows;
      setCached(cacheKey, plansRows, 30000);
    }

    const userId = Number(req.user?.sub || req.user?.id);
    let activeAccess = null;
    let activePlanCodes = [];
    let activePlanIds = [];

    if (userId) {
      // 1. Check PostgreSQL user_access across all pools
      const poolsToCheck = [pool, getPucPool(), getKcetNeetPool()].filter(Boolean);
      for (const p of poolsToCheck) {
        try {
          const accessRes = await p.query(
            `SELECT * FROM user_access 
             WHERE user_id = $1 AND (exam = $2 OR exam = 'global' OR exam IS NULL) AND expires_at > NOW()`,
            [userId, exam]
          );
          for (const r of accessRes.rows) {
            if (!activeAccess) activeAccess = r;
            if (r.plan_code) activePlanCodes.push(String(r.plan_code).toLowerCase().trim());
          }
        } catch (_) {}
      }

      // 2. Check MongoDB Payment records for active purchases
      try {
        const { Payment } = await import('../models/index.js');
        const paidDocs = await Payment.find({
          user_id: Number(userId),
          status: { $in: ['paid', 'free'] },
          $or: [{ exam }, { exam: 'global' }, { exam: null }, { exam: '' }],
        }).sort({ paid_at: -1, created_at: -1 }).lean();

        for (const paidDoc of paidDocs) {
          const paidDate = paidDoc.paid_at || paidDoc.created_at || new Date();
          const durationDays = Number(paidDoc.duration_days || 365);
          const expiresAt = new Date(new Date(paidDate).getTime() + durationDays * 86400000);
          if (expiresAt > new Date()) {
            if (paidDoc.plan_code) activePlanCodes.push(String(paidDoc.plan_code).toLowerCase().trim());
            if (paidDoc.plan_id) activePlanIds.push(Number(paidDoc.plan_id));
            if (!activeAccess) {
              activeAccess = {
                user_id: userId,
                exam,
                plan_code: paidDoc.plan_code,
                access_modules: paidDoc.access_modules || ['all'],
                expires_at: expiresAt,
              };
            }
          }
        }
      } catch (_) {}
    }

    activePlanCodes = [...new Set(activePlanCodes)];
    activePlanIds = [...new Set(activePlanIds)];

    const hasAnyActive = !!activeAccess || activePlanCodes.length > 0;

    const filteredPlans = plansRows.filter((p) => {
      if (p.exam !== 'global') return true;
      const targets = Array.isArray(p.target_exams)
        ? p.target_exams
        : typeof p.target_exams === 'string'
          ? JSON.parse(p.target_exams || '[]')
          : [];
      if (!Array.isArray(targets) || targets.length === 0) return true;
      return targets.map((x) => String(x).toLowerCase().trim()).includes(exam);
    });

    const mappedPlans = filteredPlans.map((p) => {
      const pCode = String(p.code || '').toLowerCase().trim();
      const pId = Number(p.id || 0);
      const isPlanActive = activePlanCodes.includes(pCode) || activePlanIds.includes(pId) || (hasAnyActive && filteredPlans.length === 1);
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        exam: p.exam,
        pricePaise: p.price_paise,
        durationDays: p.duration_days,
        accessModules: Array.isArray(p.access_modules) ? p.access_modules : (typeof p.access_modules === 'string' ? JSON.parse(p.access_modules || '["all"]') : ['all']),
        targetExams: Array.isArray(p.target_exams) ? p.target_exams : (typeof p.target_exams === 'string' ? JSON.parse(p.target_exams || '[]') : []),
        allowedItems: p.allowed_items || null,
        features: Array.isArray(p.features) ? p.features : typeof p.features === 'string' ? JSON.parse(p.features || '[]') : [],
        isActive: Boolean(isPlanActive),
      };
    });

    return res.json({
      success: true,
      plans: mappedPlans,
      hasActivePlan: hasAnyActive,
      activePlanCodes,
      activePlanIds,
      activePlanCode: activeAccess?.plan_code || activePlanCodes[0] || null,
      activePlanExpiresAt: activeAccess?.expires_at || null,
      activeAccessModules: activeAccess?.access_modules || null,
    });
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATED STUDENT PROGRESS (All 4 Exams with Flow Breakdown)
// ─────────────────────────────────────────────────────────────────────────────

// Helper to build exam subject progress breakdown
function buildSubjectBreakdown(defaultSubjects, subjectStatsMap) {
  return defaultSubjects.map((s) => {
    const key = s.name.toLowerCase().trim();
    // Match exact or partial subject name (e.g. 'physics', 'maths' -> 'mathematics')
    let matchedKey = Object.keys(subjectStatsMap).find((k) => k === key || k.includes(key) || key.includes(k));
    const stat = matchedKey ? subjectStatsMap[matchedKey] : null;

    const tests = stat?.testsAttended || 0;
    const totalScore = stat?.totalScore || 0;
    const correctCount = stat?.correctCount || 0;
    const wrongCount = stat?.wrongCount || 0;
    const totalQuestions = stat?.totalQuestions || (correctCount + wrongCount);
    const acc = stat?.accuracy ? Number(stat.accuracy.toFixed(1)) : (totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 100).toFixed(1)) : 0);
    const progressPercent = tests > 0 ? Math.min(100, Math.round(acc * 0.7 + Math.min(tests * 10, 30))) : 0;

    let status = 'Ready to Start';
    if (tests > 0) {
      if (acc >= 80) status = 'Mastered';
      else if (acc >= 50) status = 'Good Progress';
      else status = 'Needs Focus';
    }

    return {
      name: s.name,
      icon: s.icon,
      color: s.color,
      testsAttended: tests,
      totalScore,
      correctCount,
      wrongCount,
      totalQuestions,
      accuracy: acc,
      progressPercent,
      status,
    };
  });
}

function getExamMotivation(examName, testsAttended, accuracy) {
  if (testsAttended === 0) {
    return `Take your first ${examName} test to unlock in-depth analytics and track your rank!`;
  }
  if (accuracy >= 85) {
    return `Championship Form! 🌟 You are scoring in the top ranker bracket for ${examName}. Maintain this accuracy!`;
  }
  if (accuracy >= 65) {
    return `Strong Performance! 🔥 A few more targeted revisions will comfortably push you past 90%+!`;
  }
  if (accuracy >= 40) {
    return `Solid Foundation! ⚡ Consistent daily tests will rapidly turn weak areas into strengths.`;
  }
  return `Keep Going! 🚀 Every practice test builds memory and test-taking stamina.`;
}

const _aggProgressCache = new Map();

function withTimeout(promise, ms = 3500, fallback = null) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export async function getAggregatedProgress(req, res, next) {
  try {
    const userId = Number(req.user?.sub || req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const isFresh = req.query.fresh === 'true' || req.query.refresh === 'true';
    const cacheKey = `agg_prog:${userId}`;
    const cached = _aggProgressCache.get(cacheKey);
    if (!isFresh && cached && Date.now() - cached.ts < 20000) {
      return res.json(cached.data);
    }

    // Default subject configurations for each exam
    const PUC_SUBJECTS = [
      { name: 'Physics', icon: '⚛️', color: '#0284c7' },
      { name: 'Chemistry', icon: '🧪', color: '#7c3aed' },
      { name: 'Mathematics', icon: '📐', color: '#ea580c' },
      { name: 'Biology', icon: '🧬', color: '#16a34a' },
    ];
    const KCET_SUBJECTS = [
      { name: 'Physics', icon: '⚛️', color: '#0284c7' },
      { name: 'Chemistry', icon: '🧪', color: '#7c3aed' },
      { name: 'Mathematics', icon: '📐', color: '#ea580c' },
      { name: 'Biology', icon: '🧬', color: '#16a34a' },
    ];
    const NEET_SUBJECTS = [
      { name: 'Physics', icon: '⚛️', color: '#0284c7' },
      { name: 'Chemistry', icon: '🧪', color: '#7c3aed' },
      { name: 'Biology', icon: '🧬', color: '#16a34a' },
    ];
    const AGRI_SUBJECTS = [
      { name: 'Field Agriculture', icon: '🌾', color: '#16a34a' },
      { name: 'Specimen Identification', icon: '🔬', color: '#0891b2' },
      { name: 'Seeds & Soil', icon: '🌱', color: '#ca8a04' },
      { name: 'Farm Implements', icon: '🚜', color: '#ea580c' },
    ];

    // 1. Parallel Task: PUC Progress
    const fetchPuc = async () => {
      let pucData = {
        exam: 'puc',
        name: 'PUC (Class 12)',
        tagline: 'Study • Practice • Ace',
        icon: '📄',
        themeColor: '#4f46e5',
        bgColor: '#e0e7ff',
        testsAttended: 0,
        totalScore: 0,
        correctCount: 0,
        wrongCount: 0,
        totalQuestions: 0,
        avgAccuracy: 0,
        progressPercent: 0,
        motivationMessage: '',
        subjects: [],
      };
      try {
        const pool1 = getPucPool();
        if (pool1) {
          const [r1, subjRows] = await Promise.all([
            pool1.query(
              `SELECT 
                 COUNT(DISTINCT r.test_id) as cnt, 
                 COALESCE(SUM(r.score), 0) as total_score, 
                 COALESCE(SUM(r.correct_count), 0) as correct_count,
                 COALESCE(SUM(r.wrong_count), 0) as wrong_count,
                 COALESCE(SUM(r.total_questions), 0) as total_questions,
                 COALESCE(AVG(r.accuracy), 0) as avg_acc 
               FROM mock_results r
               WHERE r.user_id = $1 AND r.exam = $2`,
              [userId, 'puc']
            ),
            pool1.query(
              `SELECT 
                 LOWER(TRIM(t.subject)) as subj,
                 COUNT(DISTINCT r.test_id) as cnt,
                 COALESCE(SUM(r.score), 0) as total_score,
                 COALESCE(SUM(r.correct_count), 0) as correct_count,
                 COALESCE(SUM(r.wrong_count), 0) as wrong_count,
                 COALESCE(SUM(r.total_questions), 0) as total_questions,
                 COALESCE(AVG(r.accuracy), 0) as avg_acc
               FROM mock_results r
               JOIN mock_tests t ON r.test_id = t.id
               WHERE r.user_id = $1 AND (r.exam = $2 OR t.exam = $2)
               GROUP BY LOWER(TRIM(t.subject))`,
              [userId, 'puc']
            ),
          ]);

          const cnt = Number(r1.rows[0]?.cnt || 0);
          const acc = Number(r1.rows[0]?.avg_acc || 0);
          pucData.testsAttended = cnt;
          pucData.totalScore = Number(r1.rows[0]?.total_score || 0);
          pucData.correctCount = Number(r1.rows[0]?.correct_count || 0);
          pucData.wrongCount = Number(r1.rows[0]?.wrong_count || 0);
          pucData.totalQuestions = Number(r1.rows[0]?.total_questions || 0);
          pucData.avgAccuracy = Number(acc.toFixed(1));
          pucData.progressPercent = cnt > 0 ? Math.min(100, Math.round(acc * 0.7 + Math.min(cnt * 10, 30))) : 0;

          const subjMap = {};
          for (const row of subjRows.rows) {
            subjMap[row.subj] = {
              testsAttended: Number(row.cnt || 0),
              totalScore: Number(row.total_score || 0),
              correctCount: Number(row.correct_count || 0),
              wrongCount: Number(row.wrong_count || 0),
              totalQuestions: Number(row.total_questions || 0),
              accuracy: Number(row.avg_acc || 0),
            };
          }
          pucData.subjects = buildSubjectBreakdown(PUC_SUBJECTS, subjMap);
        }
      } catch (_) {}
      if (pucData.subjects.length === 0) {
        pucData.subjects = buildSubjectBreakdown(PUC_SUBJECTS, {});
      }
      pucData.motivationMessage = getExamMotivation('PUC', pucData.testsAttended, pucData.avgAccuracy);
      return pucData;
    };

    // 2. Parallel Task: KCET Progress
    const fetchKcet = async () => {
      let kcetData = {
        exam: 'kcet',
        name: 'KCET Engineering',
        tagline: 'Target Your Rank',
        icon: '🎯',
        themeColor: '#0284c7',
        bgColor: '#e0e7ff',
        testsAttended: 0,
        totalScore: 0,
        correctCount: 0,
        wrongCount: 0,
        totalQuestions: 0,
        avgAccuracy: 0,
        progressPercent: 0,
        motivationMessage: '',
        subjects: [],
      };
      try {
        const pool2 = getKcetNeetPool();
        if (pool2) {
          const [r2, subjRows2] = await Promise.all([
            pool2.query(
              `SELECT 
                 COUNT(DISTINCT r.test_id) as cnt, 
                 COALESCE(SUM(r.score), 0) as total_score, 
                 COALESCE(SUM(r.correct_count), 0) as correct_count,
                 COALESCE(SUM(r.wrong_count), 0) as wrong_count,
                 COALESCE(SUM(r.total_questions), 0) as total_questions,
                 COALESCE(AVG(r.accuracy), 0) as avg_acc 
               FROM mock_results r
               WHERE r.user_id = $1 AND r.exam = $2`,
              [userId, 'kcet']
            ),
            pool2.query(
              `SELECT 
                 LOWER(TRIM(t.subject)) as subj,
                 COUNT(DISTINCT r.test_id) as cnt,
                 COALESCE(SUM(r.score), 0) as total_score,
                 COALESCE(SUM(r.correct_count), 0) as correct_count,
                 COALESCE(SUM(r.wrong_count), 0) as wrong_count,
                 COALESCE(SUM(r.total_questions), 0) as total_questions,
                 COALESCE(AVG(r.accuracy), 0) as avg_acc
               FROM mock_results r
               JOIN mock_tests t ON r.test_id = t.id
               WHERE r.user_id = $1 AND (r.exam = $2 OR t.exam = $2)
               GROUP BY LOWER(TRIM(t.subject))`,
              [userId, 'kcet']
            ),
          ]);

          const cnt = Number(r2.rows[0]?.cnt || 0);
          const acc = Number(r2.rows[0]?.avg_acc || 0);
          kcetData.testsAttended = cnt;
          kcetData.totalScore = Number(r2.rows[0]?.total_score || 0);
          kcetData.correctCount = Number(r2.rows[0]?.correct_count || 0);
          kcetData.wrongCount = Number(r2.rows[0]?.wrong_count || 0);
          kcetData.totalQuestions = Number(r2.rows[0]?.total_questions || 0);
          kcetData.avgAccuracy = Number(acc.toFixed(1));
          kcetData.progressPercent = cnt > 0 ? Math.min(100, Math.round(acc * 0.7 + Math.min(cnt * 10, 30))) : 0;

          const subjMap2 = {};
          for (const row of subjRows2.rows) {
            subjMap2[row.subj] = {
              testsAttended: Number(row.cnt || 0),
              totalScore: Number(row.total_score || 0),
              correctCount: Number(row.correct_count || 0),
              wrongCount: Number(row.wrong_count || 0),
              totalQuestions: Number(row.total_questions || 0),
              accuracy: Number(row.avg_acc || 0),
            };
          }
          kcetData.subjects = buildSubjectBreakdown(KCET_SUBJECTS, subjMap2);
        }
      } catch (_) {}
      if (kcetData.subjects.length === 0) {
        kcetData.subjects = buildSubjectBreakdown(KCET_SUBJECTS, {});
      }
      kcetData.motivationMessage = getExamMotivation('KCET', kcetData.testsAttended, kcetData.avgAccuracy);
      return kcetData;
    };

    // 3. Parallel Task: NEET Progress
    const fetchNeet = async () => {
      let neetData = {
        exam: 'neet',
        name: 'NEET Medical',
        tagline: 'Prepare for Success',
        icon: '🩺',
        themeColor: '#e11d48',
        bgColor: '#ffe4e6',
        testsAttended: 0,
        totalScore: 0,
        correctCount: 0,
        wrongCount: 0,
        totalQuestions: 0,
        avgAccuracy: 0,
        progressPercent: 0,
        motivationMessage: '',
        subjects: [],
      };
      try {
        const pool2 = getKcetNeetPool();
        if (pool2) {
          const [r3, subjRows3] = await Promise.all([
            pool2.query(
              `SELECT 
                 COUNT(DISTINCT r.test_id) as cnt, 
                 COALESCE(SUM(r.score), 0) as total_score, 
                 COALESCE(SUM(r.correct_count), 0) as correct_count,
                 COALESCE(SUM(r.wrong_count), 0) as wrong_count,
                 COALESCE(SUM(r.total_questions), 0) as total_questions,
                 COALESCE(AVG(r.accuracy), 0) as avg_acc 
               FROM mock_results r
               WHERE r.user_id = $1 AND r.exam = $2`,
              [userId, 'neet']
            ),
            pool2.query(
              `SELECT 
                 LOWER(TRIM(t.subject)) as subj,
                 COUNT(DISTINCT r.test_id) as cnt,
                 COALESCE(SUM(r.score), 0) as total_score,
                 COALESCE(SUM(r.correct_count), 0) as correct_count,
                 COALESCE(SUM(r.wrong_count), 0) as wrong_count,
                 COALESCE(SUM(r.total_questions), 0) as total_questions,
                 COALESCE(AVG(r.accuracy), 0) as avg_acc
               FROM mock_results r
               JOIN mock_tests t ON r.test_id = t.id
               WHERE r.user_id = $1 AND (r.exam = $2 OR t.exam = $2)
               GROUP BY LOWER(TRIM(t.subject))`,
              [userId, 'neet']
            ),
          ]);

          const cnt = Number(r3.rows[0]?.cnt || 0);
          const acc = Number(r3.rows[0]?.avg_acc || 0);
          neetData.testsAttended = cnt;
          neetData.totalScore = Number(r3.rows[0]?.total_score || 0);
          neetData.correctCount = Number(r3.rows[0]?.correct_count || 0);
          neetData.wrongCount = Number(r3.rows[0]?.wrong_count || 0);
          neetData.totalQuestions = Number(r3.rows[0]?.total_questions || 0);
          neetData.avgAccuracy = Number(acc.toFixed(1));
          neetData.progressPercent = cnt > 0 ? Math.min(100, Math.round(acc * 0.7 + Math.min(cnt * 10, 30))) : 0;

          const subjMap3 = {};
          for (const row of subjRows3.rows) {
            subjMap3[row.subj] = {
              testsAttended: Number(row.cnt || 0),
              totalScore: Number(row.total_score || 0),
              correctCount: Number(row.correct_count || 0),
              wrongCount: Number(row.wrong_count || 0),
              totalQuestions: Number(row.total_questions || 0),
              accuracy: Number(row.avg_acc || 0),
            };
          }
          neetData.subjects = buildSubjectBreakdown(NEET_SUBJECTS, subjMap3);
        }
      } catch (_) {}
      if (neetData.subjects.length === 0) {
        neetData.subjects = buildSubjectBreakdown(NEET_SUBJECTS, {});
      }
      neetData.motivationMessage = getExamMotivation('NEET', neetData.testsAttended, neetData.avgAccuracy);
      return neetData;
    };

    // 4. Parallel Task: Agri Practical Progress
    const fetchAgri = async () => {
      let agriData = {
        exam: 'agri',
        name: 'Agri Practical',
        tagline: 'Grow Your Future',
        icon: '🌱',
        themeColor: '#16a34a',
        bgColor: '#dcfce7',
        testsAttended: 0,
        totalScore: 0,
        correctCount: 0,
        wrongCount: 0,
        totalQuestions: 0,
        avgAccuracy: 0,
        progressPercent: 0,
        motivationMessage: '',
        subjects: [],
      };
      try {
        const MockResult = await getMockResultModel();
        const MockTest = await getMockTestModel();
        const resultsList = await MockResult.find({ user_id: userId }).lean();

        if (Array.isArray(resultsList) && resultsList.length > 0) {
          const agriResults = resultsList.filter((r) => !r.exam || r.exam === 'agri');
          const uniqueTestIds = [...new Set(agriResults.map((r) => r.test_id))];
          const cnt = uniqueTestIds.length;

          if (cnt > 0) {
            const totalScore = agriResults.reduce((sum, r) => sum + Number(r.score || 0), 0);
            const correctCount = agriResults.reduce((sum, r) => sum + Number(r.correct_count || 0), 0);
            const wrongCount = agriResults.reduce((sum, r) => sum + Number(r.wrong_count || 0), 0);
            const totalQuestions = agriResults.reduce((sum, r) => sum + Number(r.total_questions || 0), 0);
            const avgAcc = agriResults.reduce((sum, r) => sum + Number(r.accuracy || 0), 0) / agriResults.length;

            agriData.testsAttended = cnt;
            agriData.totalScore = totalScore;
            agriData.correctCount = correctCount;
            agriData.wrongCount = wrongCount;
            agriData.totalQuestions = totalQuestions;
            agriData.avgAccuracy = Number(avgAcc.toFixed(1));
            agriData.progressPercent = Math.min(100, Math.round(avgAcc * 0.7 + Math.min(cnt * 10, 30)));

            const testDocs = await MockTest.find({ id: { $in: uniqueTestIds } }).lean();
            const testSubjectMap = new Map((testDocs || []).map((t) => [Number(t.id), String(t.subject || t.title || 'Field Agriculture').toLowerCase()]));

            const agriSubjMap = {};
            for (const res of agriResults) {
              const subj = testSubjectMap.get(Number(res.test_id)) || 'field agriculture';
              if (!agriSubjMap[subj]) {
                agriSubjMap[subj] = {
                  testsAttended: 0,
                  totalScore: 0,
                  correctCount: 0,
                  wrongCount: 0,
                  totalQuestions: 0,
                  accuracy: 0,
                  accList: [],
                };
              }
              agriSubjMap[subj].testsAttended += 1;
              agriSubjMap[subj].totalScore += Number(res.score || 0);
              agriSubjMap[subj].correctCount += Number(res.correct_count || 0);
              agriSubjMap[subj].wrongCount += Number(res.wrong_count || 0);
              agriSubjMap[subj].totalQuestions += Number(res.total_questions || 0);
              agriSubjMap[subj].accList.push(Number(res.accuracy || 0));
            }

            for (const k of Object.keys(agriSubjMap)) {
              const list = agriSubjMap[k].accList;
              agriSubjMap[k].accuracy = list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : 0;
            }
            agriData.subjects = buildSubjectBreakdown(AGRI_SUBJECTS, agriSubjMap);
          }
        }
      } catch (_) {}

      if (agriData.subjects.length === 0) {
        agriData.subjects = buildSubjectBreakdown(AGRI_SUBJECTS, {});
      }
      agriData.motivationMessage = getExamMotivation('Agri Practical', agriData.testsAttended, agriData.avgAccuracy);
      return agriData;
    };

    // Run all 4 exam calculations concurrently in parallel with 3.5s timeout protection
    const [pucData, kcetData, neetData, agriData] = await Promise.all([
      withTimeout(fetchPuc(), 3500, fetchPuc()),
      withTimeout(fetchKcet(), 3500, fetchKcet()),
      withTimeout(fetchNeet(), 3500, fetchNeet()),
      withTimeout(fetchAgri(), 3500, fetchAgri()),
    ]);

    const allExams = [pucData, kcetData, neetData, agriData];
    const totalTests = allExams.reduce((s, e) => s + e.testsAttended, 0);
    const totalScore = allExams.reduce((s, e) => s + e.totalScore, 0);
    const totalCorrect = allExams.reduce((s, e) => s + e.correctCount, 0);
    const totalWrong = allExams.reduce((s, e) => s + e.wrongCount, 0);
    const totalQuestions = allExams.reduce((s, e) => s + e.totalQuestions, 0);

    const activeExamsWithTests = allExams.filter((e) => e.testsAttended > 0);
    const overallAccuracy = activeExamsWithTests.length > 0
      ? Number((activeExamsWithTests.reduce((s, e) => s + e.avgAccuracy, 0) / activeExamsWithTests.length).toFixed(1))
      : 0;
    const overallProgressPercent = activeExamsWithTests.length > 0
      ? Math.round(activeExamsWithTests.reduce((s, e) => s + e.progressPercent, 0) / activeExamsWithTests.length)
      : (totalTests > 0 ? 50 : 0);

    let motivationalQuote = "💡 Ready to Begin? Take your first mock test today to unlock your personalized analytics and boost your score!";
    if (overallProgressPercent >= 80 || overallAccuracy >= 80) {
      motivationalQuote = "🏆 Outstanding Mastery! You are performing at top-ranker level. Keep up this championship streak!";
    } else if (overallProgressPercent >= 55 || overallAccuracy >= 60) {
      motivationalQuote = "🔥 Great Momentum! You're making tremendous progress. Polish weak topics to reach 90%+!";
    } else if (totalTests > 0) {
      motivationalQuote = "🚀 Solid Start! Every mock test attended strengthens your memory and boosts your speed.";
    }

    const payload = {
      success: true,
      overall: {
        progressPercent: overallProgressPercent,
        totalTestsGiven: totalTests,
        totalScore,
        correctCount: totalCorrect,
        wrongCount: totalWrong,
        totalQuestions,
        overallAccuracy,
        motivationalQuote,
      },
      exams: allExams,
    };

    _aggProgressCache.set(cacheKey, { ts: Date.now(), data: payload });

    return res.json(payload);
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN OPERATIONS FOR PUC, KCET, NEET
// ─────────────────────────────────────────────────────────────────────────────

export async function createAdminExamMaterial(req, res, next) {
  try {
    const {
      exam,
      subject,
      title,
      description = '',
      pdf_url,
      type = 'pdf',
      is_free = false,
      status = 'active',
    } = req.body;

    const normalizedExam = String(exam || '').toLowerCase().trim();
    if (!['puc', 'kcet', 'neet'].includes(normalizedExam)) {
      return res.status(400).json({ message: 'Exam must be puc, kcet, or neet' });
    }
    if (!subject || !title || !pdf_url) {
      return res.status(400).json({ message: 'Exam, subject, title and pdf_url are required' });
    }

    const pool = getPoolForExam(normalizedExam);
    const result = await pool.query(
      `INSERT INTO materials (exam, subject, title, description, pdf_url, type, is_free, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        normalizedExam,
        subject.toLowerCase().trim(),
        title.trim(),
        description.trim(),
        pdf_url.trim(),
        type,
        Boolean(is_free),
        status,
      ]
    );

    clearExamCache();
    return res.status(201).json({ success: true, material: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function createAdminExamPyq(req, res, next) {
  try {
    const {
      exam,
      subject,
      year,
      title,
      pdf_url,
      is_free = false,
      status = 'active',
    } = req.body;

    const normalizedExam = String(exam || '').toLowerCase().trim();
    if (!['puc', 'kcet', 'neet'].includes(normalizedExam)) {
      return res.status(400).json({ message: 'Exam must be puc, kcet, or neet' });
    }
    if (!subject || !year || !title || !pdf_url) {
      return res.status(400).json({ message: 'Exam, subject, year, title, and pdf_url are required' });
    }

    const pool = getPoolForExam(normalizedExam);
    const result = await pool.query(
      `INSERT INTO pyqs (exam, subject, year, title, pdf_url, is_free, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        normalizedExam,
        subject.toLowerCase().trim(),
        Number(year),
        title.trim(),
        pdf_url.trim(),
        Boolean(is_free),
        status,
      ]
    );

    clearExamCache();
    return res.status(201).json({ success: true, pyq: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function createAdminExamTest(req, res, next) {
  try {
    const {
      exam,
      subject = '',
      title,
      instructions = '',
      duration_minutes = 30,
      total_marks = 60,
      passing_marks = 20,
      per_question_seconds = 30,
      marks_correct = 4,
      is_free = true,
      questions = [],
    } = req.body;

    const normalizedExam = String(exam || '').toLowerCase().trim();
    if (!['puc', 'kcet', 'neet'].includes(normalizedExam)) {
      return res.status(400).json({ message: 'Exam must be puc, kcet, or neet' });
    }
    if (!title?.trim()) {
      return res.status(400).json({ message: 'Test title is required' });
    }

    const pool = getPoolForExam(normalizedExam);
    const testResult = await pool.query(
      `INSERT INTO mock_tests (
        exam, subject, title, instructions, duration_minutes, 
        total_marks, passing_marks, per_question_seconds, marks_correct, is_free, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *`,
      [
        normalizedExam,
        subject.toLowerCase().trim(),
        title.trim(),
        instructions,
        Number(duration_minutes),
        Number(total_marks),
        Number(passing_marks),
        Number(per_question_seconds),
        Number(marks_correct),
        Boolean(is_free),
      ]
    );

    const testId = testResult.rows[0].id;

    if (Array.isArray(questions) && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await pool.query(
          `INSERT INTO mock_questions (
            test_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            testId,
            q.question_text || q.questionText || '',
            q.option_a || q.optionA || '',
            q.option_b || q.optionB || '',
            q.option_c || q.optionC || '',
            q.option_d || q.optionD || '',
            String(q.correct_option || q.correctOption || 'a').toLowerCase().trim(),
            q.explanation || '',
            i + 1,
          ]
        );
      }
    }

    clearExamCache();
    return res.status(201).json({ success: true, test: testResult.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function createAdminExamPlan(req, res, next) {
  try {
    const {
      exam,
      code,
      name,
      price_paise = 0,
      duration_days = 365,
      access_modules = ['all'],
      target_exams = [],
      features = [],
    } = req.body;

    const normalizedExam = String(exam || '').toLowerCase().trim();
    if (!['puc', 'kcet', 'neet', 'global'].includes(normalizedExam)) {
      return res.status(400).json({ message: 'Exam must be puc, kcet, neet, or global' });
    }
    if (!code || !name) {
      return res.status(400).json({ message: 'Exam, code and name are required' });
    }

    const poolsToInsert = normalizedExam === 'global'
      ? [getPucPool(), getKcetNeetPool()]
      : [getPoolForExam(normalizedExam) || getKcetNeetPool()];

    let savedPlan = null;
    for (const pool of poolsToInsert) {
      const result = await pool.query(
        `INSERT INTO plans (exam, code, name, price_paise, duration_days, access_modules, target_exams, features, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
         RETURNING *`,
        [
          normalizedExam,
          code.trim(),
          name.trim(),
          Number(price_paise),
          Number(duration_days),
          JSON.stringify(Array.isArray(access_modules) ? access_modules : [access_modules]),
          JSON.stringify(Array.isArray(target_exams) ? target_exams : [target_exams]),
          JSON.stringify(Array.isArray(features) ? features : [features]),
        ]
      );
      savedPlan = result.rows[0];
    }

    clearExamCache();
    return res.status(201).json({ success: true, plan: savedPlan });
  } catch (err) {
    return next(err);
  }
}

export async function updateAdminExamPlan(req, res, next) {
  try {
    const { id } = req.params;
    const {
      exam = 'puc',
      code,
      name,
      price_paise,
      duration_days,
      access_modules,
      target_exams,
      features,
      status = 'active',
    } = req.body;

    const poolsToUpdate = [getPucPool(), getKcetNeetPool()].filter(Boolean);

    let updatedPlan = null;
    for (const pool of poolsToUpdate) {
      try {
        const result = await pool.query(
          `UPDATE plans SET
            code = COALESCE($1, code),
            name = COALESCE($2, name),
            price_paise = COALESCE($3, price_paise),
            duration_days = COALESCE($4, duration_days),
            access_modules = COALESCE($5, access_modules),
            target_exams = COALESCE($6, target_exams),
            features = COALESCE($7, features),
            status = COALESCE($8, status),
            updated_at = NOW()
           WHERE id = $9 OR code = $1
           RETURNING *`,
          [
            code ? code.trim() : null,
            name ? name.trim() : null,
            price_paise !== undefined ? Number(price_paise) : null,
            duration_days !== undefined ? Number(duration_days) : null,
            access_modules ? JSON.stringify(Array.isArray(access_modules) ? access_modules : [access_modules]) : null,
            target_exams ? JSON.stringify(Array.isArray(target_exams) ? target_exams : [target_exams]) : null,
            features ? JSON.stringify(Array.isArray(features) ? features : [features]) : null,
            status,
            id,
          ]
        );
        if (result.rows.length > 0) updatedPlan = result.rows[0];
      } catch (err) {
        console.warn('[updateAdminExamPlan] pool update error:', err?.message || err);
      }
    }

    clearExamCache();
    return res.json({ success: true, plan: updatedPlan });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminExamMaterials(req, res, next) {
  try {
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.json({ success: true, materials: [] });
    const result = await pool.query('SELECT * FROM materials WHERE exam = $1 ORDER BY id DESC', [exam]);
    return res.json({ success: true, materials: result.rows });
  } catch (err) {
    return next(err);
  }
}

export async function deleteAdminExamMaterial(req, res, next) {
  try {
    const { id } = req.params;
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.status(400).json({ message: 'Invalid exam specified' });
    await pool.query('DELETE FROM materials WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Material deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminExamPyqs(req, res, next) {
  try {
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.json({ success: true, pyqs: [] });
    const result = await pool.query('SELECT * FROM pyqs WHERE exam = $1 ORDER BY year DESC, id DESC', [exam]);
    return res.json({ success: true, pyqs: result.rows });
  } catch (err) {
    return next(err);
  }
}

export async function deleteAdminExamPyq(req, res, next) {
  try {
    const { id } = req.params;
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.status(400).json({ message: 'Invalid exam specified' });
    await pool.query('DELETE FROM pyqs WHERE id = $1', [id]);
    return res.json({ success: true, message: 'PYQ deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminExamTests(req, res, next) {
  try {
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.json({ success: true, tests: [] });
    const result = await pool.query(
      `SELECT t.*, COUNT(q.id) as question_count 
       FROM mock_tests t
       LEFT JOIN mock_questions q ON q.test_id = t.id
       WHERE t.exam = $1
       GROUP BY t.id
       ORDER BY t.id DESC`,
      [exam]
    );
    return res.json({ success: true, tests: result.rows });
  } catch (err) {
    return next(err);
  }
}

export async function deleteAdminExamTest(req, res, next) {
  try {
    const { id } = req.params;
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.status(400).json({ message: 'Invalid exam specified' });
    await pool.query('DELETE FROM mock_questions WHERE test_id = $1', [id]);
    await pool.query('DELETE FROM mock_tests WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Test deleted' });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminExamPlans(req, res, next) {
  try {
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam) || getKcetNeetPool();
    if (!pool) return res.json({ success: true, plans: [] });
    const result = await pool.query('SELECT * FROM plans WHERE exam = $1 ORDER BY id DESC', [exam]);
    return res.json({ success: true, plans: result.rows });
  } catch (err) {
    return next(err);
  }
}

export async function deleteAdminExamPlan(req, res, next) {
  try {
    const { id } = req.params;
    const pools = [getPucPool(), getKcetNeetPool()].filter(Boolean);
    for (const pool of pools) {
      try {
        await pool.query('DELETE FROM plans WHERE id = $1', [id]);
      } catch (err) {
        console.warn('[deleteAdminExamPlan] pool delete error:', err?.message || err);
      }
    }

    try {
      const { Plan } = await import('../models/index.js');
      await Plan.deleteOne({ id: Number(id) });
    } catch (_) {}

    clearExamCache();
    return res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    return next(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK PLAN CREATION (Multi-Exam, Item-Level Unlocking)
// ─────────────────────────────────────────────────────────────────────────────

export async function getBulkPlanCatalog(req, res, next) {
  try {
    const pucPool = getPucPool();
    const kcetPool = getKcetNeetPool();
    const { getTestModel } = await import('../config/mockTestDb.js');
    const AgriTest = await getTestModel();

    const [
      pucMats, pucPyqs, pucTests,
      knMats, knPyqs, knTests,
      agriMats, agriPyqs, agriTests,
    ] = await Promise.all([
      pucPool ? pucPool.query(`SELECT id, exam, subject, title, is_free FROM materials WHERE status = 'active' ORDER BY id DESC`).catch(() => ({ rows: [] })) : { rows: [] },
      pucPool ? pucPool.query(`SELECT id, exam, subject, year, title, is_free FROM pyqs WHERE status = 'active' ORDER BY id DESC`).catch(() => ({ rows: [] })) : { rows: [] },
      pucPool ? pucPool.query(`SELECT id, exam, subject, title, is_free FROM mock_tests WHERE is_active = true ORDER BY id DESC`).catch(() => ({ rows: [] })) : { rows: [] },
      kcetPool ? kcetPool.query(`SELECT id, exam, subject, title, is_free FROM materials WHERE status = 'active' ORDER BY id DESC`).catch(() => ({ rows: [] })) : { rows: [] },
      kcetPool ? kcetPool.query(`SELECT id, exam, subject, year, title, is_free FROM pyqs WHERE status = 'active' ORDER BY id DESC`).catch(() => ({ rows: [] })) : { rows: [] },
      kcetPool ? kcetPool.query(`SELECT id, exam, subject, title, is_free FROM mock_tests WHERE is_active = true ORDER BY id DESC`).catch(() => ({ rows: [] })) : { rows: [] },
      Material.find({ status: 'active' }).select({ id: 1, title: 1, subject: 1, access_type: 1 }).sort({ id: -1 }).lean().catch(() => []),
      Pyq.find({ status: 'active' }).select({ id: 1, title: 1, subject: 1, year: 1, access_type: 1 }).sort({ id: -1 }).lean().catch(() => []),
      AgriTest.find({ is_active: true }).select({ id: 1, title: 1 }).sort({ id: -1 }).lean().catch(() => []),
    ]);

    const materials = [
      ...pucMats.rows.map((m) => ({ id: Number(m.id), exam: String(m.exam || 'puc').toLowerCase(), subject: m.subject || 'General', title: m.title })),
      ...knMats.rows.map((m) => ({ id: Number(m.id), exam: String(m.exam || 'kcet').toLowerCase(), subject: m.subject || 'General', title: m.title })),
      ...agriMats.map((m) => ({ id: Number(m.id), exam: 'agri', subject: m.subject || 'Practical', title: m.title })),
    ];

    const pyqs = [
      ...pucPyqs.rows.map((p) => ({ id: Number(p.id), exam: String(p.exam || 'puc').toLowerCase(), subject: p.subject || 'General', year: p.year, title: p.title })),
      ...knPyqs.rows.map((p) => ({ id: Number(p.id), exam: String(p.exam || 'kcet').toLowerCase(), subject: p.subject || 'General', year: p.year, title: p.title })),
      ...agriPyqs.map((p) => ({ id: Number(p.id), exam: 'agri', subject: p.subject || 'Practical', year: p.year, title: p.title })),
    ];

    const tests = [
      ...pucTests.rows.map((t) => ({ id: Number(t.id), exam: String(t.exam || 'puc').toLowerCase(), subject: t.subject || 'General', title: t.title })),
      ...knTests.rows.map((t) => ({ id: Number(t.id), exam: String(t.exam || 'kcet').toLowerCase(), subject: t.subject || 'General', title: t.title })),
      ...agriTests.map((t) => ({ id: Number(t.id), exam: 'agri', subject: 'Practical', title: t.title })),
    ];

    return res.json({ success: true, materials, pyqs, tests });
  } catch (err) {
    return next(err);
  }
}

export async function listBulkPlans(req, res, next) {
  try {
    const pool = getKcetNeetPool() || getPucPool();
    if (!pool) return res.json({ success: true, plans: [] });
    const result = await pool.query(
      `SELECT * FROM plans WHERE allowed_items IS NOT NULL ORDER BY id DESC`
    );
    return res.json({ success: true, plans: result.rows });
  } catch (err) {
    return next(err);
  }
}

function deriveTargetExamsFromAllowedItems(allowedItems) {
  const exams = new Set();
  if (!allowedItems || typeof allowedItems !== 'object') return [];
  for (const key of ['materials', 'pyqs', 'tests']) {
    if (Array.isArray(allowedItems[key])) {
      for (const item of allowedItems[key]) {
        if (item?.exam) exams.add(String(item.exam).toLowerCase().trim());
      }
    }
  }
  return Array.from(exams);
}

export async function createBulkPlan(req, res, next) {
  try {
    const {
      code,
      name,
      price_paise = 0,
      duration_days = 365,
      allowed_items = { materials: [], pyqs: [], tests: [] },
      features = [],
      status = 'active',
    } = req.body;

    if (!code?.trim() || !name?.trim()) {
      return res.status(400).json({ message: 'Plan code and name are required' });
    }
    const targetExams = deriveTargetExamsFromAllowedItems(allowed_items);
    if (targetExams.length === 0) {
      return res.status(400).json({ message: 'Please select at least one material, PYQ, or mock test' });
    }

    const poolsToInsert = [getKcetNeetPool()];
    if (targetExams.includes('puc') && getPucPool() && getPucPool() !== getKcetNeetPool()) {
      poolsToInsert.push(getPucPool());
    }

    let savedPlan = null;
    for (const pool of poolsToInsert.filter(Boolean)) {
      const result = await pool.query(
        `INSERT INTO plans (exam, code, name, price_paise, duration_days, access_modules, target_exams, allowed_items, features, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          'global',
          code.trim().toLowerCase(),
          name.trim(),
          Number(price_paise),
          Number(duration_days),
          JSON.stringify(['bulk']),
          JSON.stringify(targetExams),
          JSON.stringify(allowed_items),
          JSON.stringify(Array.isArray(features) ? features : []),
          status,
        ]
      );
      if (!savedPlan) savedPlan = result.rows[0];
    }

    clearExamCache();
    return res.status(201).json({ success: true, plan: savedPlan });
  } catch (err) {
    return next(err);
  }
}

export async function updateBulkPlan(req, res, next) {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      price_paise,
      duration_days,
      allowed_items,
      features,
      status = 'active',
    } = req.body;

    const targetExams = allowed_items ? deriveTargetExamsFromAllowedItems(allowed_items) : null;
    const pools = [getKcetNeetPool(), getPucPool()].filter(Boolean);

    let updated = null;
    for (const pool of pools) {
      try {
        const result = await pool.query(
          `UPDATE plans SET
            code = COALESCE($1, code),
            name = COALESCE($2, name),
            price_paise = COALESCE($3, price_paise),
            duration_days = COALESCE($4, duration_days),
            target_exams = COALESCE($5, target_exams),
            allowed_items = COALESCE($6, allowed_items),
            features = COALESCE($7, features),
            status = COALESCE($8, status),
            updated_at = NOW()
           WHERE id = $9 OR (code = $1 AND allowed_items IS NOT NULL)
           RETURNING *`,
          [
            code ? code.trim().toLowerCase() : null,
            name ? name.trim() : null,
            price_paise !== undefined ? Number(price_paise) : null,
            duration_days !== undefined ? Number(duration_days) : null,
            targetExams ? JSON.stringify(targetExams) : null,
            allowed_items ? JSON.stringify(allowed_items) : null,
            features ? JSON.stringify(features) : null,
            status,
            id,
          ]
        );
        if (result.rows.length > 0 && !updated) updated = result.rows[0];
      } catch (_) {}
    }

    clearExamCache();
    return res.json({ success: true, plan: updated });
  } catch (err) {
    return next(err);
  }
}

export async function deleteBulkPlan(req, res, next) {
  try {
    const { id } = req.params;
    const pools = [getKcetNeetPool(), getPucPool()].filter(Boolean);
    let planCode = null;
    for (const pool of pools) {
      try {
        const found = await pool.query('SELECT code FROM plans WHERE id = $1', [id]);
        if (found.rows[0]?.code) planCode = found.rows[0].code;
        await pool.query('DELETE FROM plans WHERE id = $1 OR ($2::text IS NOT NULL AND code = $2 AND allowed_items IS NOT NULL)', [id, planCode]);
      } catch (_) {}
    }
    clearExamCache();
    return res.json({ success: true, message: 'Bulk plan deleted' });
  } catch (err) {
    return next(err);
  }
}




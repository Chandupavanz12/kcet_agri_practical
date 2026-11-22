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

// Helper: Check student module access (respects granular module choices & global plans)
const _userAccessCache = new Map();
export async function checkUserModuleAccess(pool, userId, exam, moduleName) {
  if (!userId) return false;
  const cacheKey = `${userId}:${exam}:${moduleName}`;
  const cached = _userAccessCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.hasAccess;
  }

  try {
    const res = await pool.query(
      `SELECT access_modules, exam, expires_at FROM user_access 
       WHERE user_id = $1 AND (exam = $2 OR exam = 'global') AND expires_at > NOW()`,
      [userId, exam]
    );
    if (res.rows.length === 0) {
      return false;
    }

    for (const row of res.rows) {
      let mods = row.access_modules;
      if (typeof mods === 'string') {
        try { mods = JSON.parse(mods); } catch { mods = [mods]; }
      }
      if (!Array.isArray(mods)) mods = ['all'];
      if (mods.includes('all') || mods.includes(moduleName)) {
        _userAccessCache.set(cacheKey, { hasAccess: true, expiresAt: Date.now() + 60000 });
        return true;
      }
    }
    return false;
  } catch (err) {
    console.error('[checkUserModuleAccess] error:', err);
    return false;
  }
}

// Helper: Grant exam access in PostgreSQL (supports granular modules & global plans)
export async function grantExamAccess(userId, exam, planCode, accessModules = ['all'], durationDays = 365) {
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
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      try {
        await p.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS exam VARCHAR(50) DEFAULT 'puc'`);
        await p.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS access_modules JSONB DEFAULT '["all"]'::jsonb`);
      } catch (_) {}

      await p.query(
        `DELETE FROM user_access WHERE user_id = $1 AND (exam = $2 OR exam = 'global') AND plan_code = $3`,
        [userId, normalizedExam, planCode]
      );
      await p.query(
        `INSERT INTO user_access (user_id, exam, plan_code, access_modules, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, normalizedExam, planCode, JSON.stringify(accessModules), expiresAt]
      );
    } catch (err) {
      console.error('[grantExamAccess] error:', err);
    }
  }
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
    const hasAccess = await checkUserModuleAccess(pool, userId, exam, 'materials');

    const materials = rows.map((m) => ({
      id: m.id,
      title: m.title,
      subject: m.subject,
      description: m.description,
      pdfUrl: m.pdf_url,
      type: m.type || 'pdf',
      isFree: m.is_free,
      locked: !m.is_free && !hasAccess,
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
    const hasAccess = await checkUserModuleAccess(pool, userId, exam, 'pyqs');

    const pyqs = rows.map((p) => ({
      id: p.id,
      title: p.title,
      subject: p.subject,
      year: p.year,
      pdfUrl: p.pdf_url,
      isFree: p.is_free,
      locked: !p.is_free && !hasAccess,
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
    const hasAccess = await checkUserModuleAccess(pool, userId, exam, 'tests');

    const tests = rows.map((t) => {
      const isFree = t.is_free === true || t.is_free === null || t.is_free === undefined ? (t.is_free !== false) : false;
      const locked = !isFree && !hasAccess;

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
      setCached(cacheKey, plansRows, 60000);
    }

    const userId = Number(req.user?.sub || req.user?.id);
    let activeAccess = null;
    if (userId) {
      const accessRes = await pool.query(
        `SELECT * FROM user_access 
         WHERE user_id = $1 AND (exam = $2 OR exam = 'global') AND expires_at > NOW()`,
        [userId, exam]
      );
      if (accessRes.rows.length > 0) {
        activeAccess = accessRes.rows[0];
      }
    }

    return res.json({
      success: true,
      plans: plansRows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        exam: p.exam,
        pricePaise: p.price_paise,
        durationDays: p.duration_days,
        accessModules: Array.isArray(p.access_modules) ? p.access_modules : (typeof p.access_modules === 'string' ? JSON.parse(p.access_modules || '["all"]') : ['all']),
        targetExams: Array.isArray(p.target_exams) ? p.target_exams : (typeof p.target_exams === 'string' ? JSON.parse(p.target_exams || '[]') : []),
        features: Array.isArray(p.features) ? p.features : typeof p.features === 'string' ? JSON.parse(p.features || '[]') : [],
      })),
      hasActivePlan: !!activeAccess,
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

export async function getAggregatedProgress(req, res, next) {
  try {
    const userId = Number(req.user?.sub || req.user?.id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. PUC Progress from Neon PG 1 (counting each unique test only ONCE)
    let pucData = { exam: 'puc', name: 'PUC Exam', testsAttended: 0, totalScore: 0, avgAccuracy: 0, progressPercent: 0 };
    try {
      const pool1 = getPucPool();
      const r1 = await pool1.query(
        `SELECT 
           COUNT(DISTINCT test_id) as cnt, 
           COALESCE(SUM(best_score), 0) as total_score, 
           COALESCE(AVG(best_acc), 0) as avg_acc 
         FROM (
           SELECT test_id, MAX(score) as best_score, MAX(accuracy) as best_acc 
           FROM mock_results 
           WHERE user_id = $1 AND exam = $2 
           GROUP BY test_id
         ) sub`,
        [userId, 'puc']
      );
      const cnt = Number(r1.rows[0]?.cnt || 0);
      const acc = Number(r1.rows[0]?.avg_acc || 0);
      pucData.testsAttended = cnt;
      pucData.totalScore = Number(r1.rows[0]?.total_score || 0);
      pucData.avgAccuracy = Number(acc.toFixed(1));
      pucData.progressPercent = Math.min(100, Math.round(acc * 0.7 + Math.min(cnt * 10, 30)));
    } catch (_) {}

    // 2. KCET Progress from Neon PG 2 (counting each unique test only ONCE)
    let kcetData = { exam: 'kcet', name: 'KCET Engineering', testsAttended: 0, totalScore: 0, avgAccuracy: 0, progressPercent: 0 };
    try {
      const pool2 = getKcetNeetPool();
      const r2 = await pool2.query(
        `SELECT 
           COUNT(DISTINCT test_id) as cnt, 
           COALESCE(SUM(best_score), 0) as total_score, 
           COALESCE(AVG(best_acc), 0) as avg_acc 
         FROM (
           SELECT test_id, MAX(score) as best_score, MAX(accuracy) as best_acc 
           FROM mock_results 
           WHERE user_id = $1 AND exam = $2 
           GROUP BY test_id
         ) sub`,
        [userId, 'kcet']
      );
      const cnt = Number(r2.rows[0]?.cnt || 0);
      const acc = Number(r2.rows[0]?.avg_acc || 0);
      kcetData.testsAttended = cnt;
      kcetData.totalScore = Number(r2.rows[0]?.total_score || 0);
      kcetData.avgAccuracy = Number(acc.toFixed(1));
      kcetData.progressPercent = Math.min(100, Math.round(acc * 0.7 + Math.min(cnt * 10, 30)));
    } catch (_) {}

    // 3. NEET Progress from Neon PG 2 (counting each unique test only ONCE)
    let neetData = { exam: 'neet', name: 'NEET Medical', testsAttended: 0, totalScore: 0, avgAccuracy: 0, progressPercent: 0 };
    try {
      const pool2 = getKcetNeetPool();
      const r3 = await pool2.query(
        `SELECT 
           COUNT(DISTINCT test_id) as cnt, 
           COALESCE(SUM(best_score), 0) as total_score, 
           COALESCE(AVG(best_acc), 0) as avg_acc 
         FROM (
           SELECT test_id, MAX(score) as best_score, MAX(accuracy) as best_acc 
           FROM mock_results 
           WHERE user_id = $1 AND exam = $2 
           GROUP BY test_id
         ) sub`,
        [userId, 'neet']
      );
      const cnt = Number(r3.rows[0]?.cnt || 0);
      const acc = Number(r3.rows[0]?.avg_acc || 0);
      neetData.testsAttended = cnt;
      neetData.totalScore = Number(r3.rows[0]?.total_score || 0);
      neetData.avgAccuracy = Number(acc.toFixed(1));
      neetData.progressPercent = Math.min(100, Math.round(acc * 0.7 + Math.min(cnt * 10, 30)));
    } catch (_) {}

    // 4. Fallback check & Agri Practical Progress from Mongo Atlas (group by test_id so each unique test counted strictly ONCE)
    let agriData = { exam: 'agri', name: 'KCET Agri Practical', testsAttended: 0, totalScore: 0, avgAccuracy: 0, progressPercent: 0 };
    try {
      const MockResult = await getMockResultModel();
      const mongoAgg = await MockResult.aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: { test_id: '$test_id', exam: '$exam' },
            bestScore: { $max: '$score' },
            bestAccuracy: { $max: '$accuracy' },
          },
        },
      ]);

      // Count Agri tests (where exam is 'agri' or null/undefined)
      const agriTests = mongoAgg.filter((r) => !r._id.exam || r._id.exam === 'agri');
      const cnt = agriTests.length;
      if (cnt > 0) {
        const totalScore = agriTests.reduce((sum, r) => sum + Number(r.bestScore || 0), 0);
        const avgAcc = agriTests.reduce((sum, r) => sum + Number(r.bestAccuracy || 0), 0) / cnt;
        agriData.testsAttended = cnt;
        agriData.totalScore = totalScore;
        agriData.avgAccuracy = Number(avgAcc.toFixed(1));
        agriData.progressPercent = Math.min(100, Math.round(avgAcc * 0.7 + Math.min(cnt * 10, 30)));
      }

      // Check if PUC, KCET, or NEET had results in MongoDB (e.g. from earlier submissions)
      if (pucData.testsAttended === 0) {
        const pucTests = mongoAgg.filter((r) => r._id.exam === 'puc');
        if (pucTests.length > 0) {
          pucData.testsAttended = pucTests.length;
          pucData.totalScore = pucTests.reduce((sum, r) => sum + Number(r.bestScore || 0), 0);
          pucData.avgAccuracy = Number((pucTests.reduce((sum, r) => sum + Number(r.bestAccuracy || 0), 0) / pucTests.length).toFixed(1));
          pucData.progressPercent = Math.min(100, Math.round(pucData.avgAccuracy * 0.7 + Math.min(pucData.testsAttended * 10, 30)));
        }
      }
      if (kcetData.testsAttended === 0) {
        const kcetTests = mongoAgg.filter((r) => r._id.exam === 'kcet');
        if (kcetTests.length > 0) {
          kcetData.testsAttended = kcetTests.length;
          kcetData.totalScore = kcetTests.reduce((sum, r) => sum + Number(r.bestScore || 0), 0);
          kcetData.avgAccuracy = Number((kcetTests.reduce((sum, r) => sum + Number(r.bestAccuracy || 0), 0) / kcetTests.length).toFixed(1));
          kcetData.progressPercent = Math.min(100, Math.round(kcetData.avgAccuracy * 0.7 + Math.min(kcetData.testsAttended * 10, 30)));
        }
      }
      if (neetData.testsAttended === 0) {
        const neetTests = mongoAgg.filter((r) => r._id.exam === 'neet');
        if (neetTests.length > 0) {
          neetData.testsAttended = neetTests.length;
          neetData.totalScore = neetTests.reduce((sum, r) => sum + Number(r.bestScore || 0), 0);
          neetData.avgAccuracy = Number((neetTests.reduce((sum, r) => sum + Number(r.bestAccuracy || 0), 0) / neetTests.length).toFixed(1));
          neetData.progressPercent = Math.min(100, Math.round(neetData.avgAccuracy * 0.7 + Math.min(neetData.testsAttended * 10, 30)));
        }
      }
    } catch (_) {}

    const allExams = [pucData, kcetData, neetData, agriData];
    const totalTests = allExams.reduce((s, e) => s + e.testsAttended, 0);
    const totalScore = allExams.reduce((s, e) => s + e.totalScore, 0);
    const activeExamsWithTests = allExams.filter((e) => e.testsAttended > 0);
    const overallAccuracy = activeExamsWithTests.length > 0
      ? Number((activeExamsWithTests.reduce((s, e) => s + e.avgAccuracy, 0) / activeExamsWithTests.length).toFixed(1))
      : 0;
    const overallProgressPercent = activeExamsWithTests.length > 0
      ? Math.round(activeExamsWithTests.reduce((s, e) => s + e.progressPercent, 0) / activeExamsWithTests.length)
      : (totalTests > 0 ? 50 : 0);

    return res.json({
      success: true,
      overall: {
        progressPercent: overallProgressPercent,
        totalTestsGiven: totalTests,
        totalScore,
        overallAccuracy,
      },
      exams: allExams,
    });
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

    const normalizedExam = String(exam || 'puc').toLowerCase().trim();
    const poolsToUpdate = normalizedExam === 'global'
      ? [getPucPool(), getKcetNeetPool()]
      : [getPoolForExam(normalizedExam) || getKcetNeetPool()];

    let updatedPlan = null;
    for (const pool of poolsToUpdate) {
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
    }

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
    const exam = String(req.query.exam || 'puc').toLowerCase().trim();
    const pool = getPoolForExam(exam);
    if (!pool) return res.status(400).json({ message: 'Invalid exam specified' });
    await pool.query('DELETE FROM plans WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Plan deleted' });
  } catch (err) {
    return next(err);
  }
}



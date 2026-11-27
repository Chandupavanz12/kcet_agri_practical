import pg from 'pg';

let pucPool = null;
let kcetNeetPool = null;

export function getPucPool() {
  const url = process.env.PUC_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.warn('[pg-puc] Neither PUC_DATABASE_URL nor DATABASE_URL environment variable is defined.');
    return null;
  }
  if (!pucPool) {
    pucPool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    pucPool.on('error', (err) => console.error('[pg-puc] pool error', err?.message || err));
  }
  return pucPool;
}

export function getKcetNeetPool() {
  const url = process.env.KCET_NEET_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.warn('[pg-kcet-neet] Neither KCET_NEET_DATABASE_URL nor DATABASE_URL environment variable is defined.');
    return null;
  }
  if (!kcetNeetPool) {
    kcetNeetPool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    kcetNeetPool.on('error', (err) => console.error('[pg-kcet-neet] pool error', err?.message || err));
  }
  return kcetNeetPool;
}

/**
 * Returns the relevant PostgreSQL pool for a given exam code.
 * @param {string} exam - 'puc' | 'kcet' | 'neet' | 'agri'
 * @returns {pg.Pool|null} Pool for Postgres-backed exams, or null for Agri (Mongo-backed).
 */
export function getPoolForExam(exam) {
  const normalized = String(exam || '').toLowerCase().trim();
  if (normalized === 'puc') {
    return getPucPool();
  }
  if (normalized === 'kcet' || normalized === 'neet') {
    return getKcetNeetPool();
  }
  return null; // Agri Practical uses MongoDB Atlas
}

const TABLE_SCHEMAS = `
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  exam VARCHAR(50) DEFAULT 'global',
  template_id VARCHAR(50) DEFAULT 'emerald-dream',
  title VARCHAR(255) NOT NULL,
  highlight_text VARCHAR(100),
  subtitle TEXT,
  button_text VARCHAR(100) DEFAULT 'Start Learning >',
  action_route VARCHAR(255) DEFAULT '/student/dashboard',
  image_url TEXT,
  bg_gradient_start VARCHAR(50) DEFAULT '#0a192f',
  bg_gradient_end VARCHAR(50) DEFAULT '#059669',
  display_order INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  exam VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pdf_url TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'pdf',
  is_free BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pyqs (
  id SERIAL PRIMARY KEY,
  exam VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  pdf_url TEXT NOT NULL,
  is_free BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_tests (
  id SERIAL PRIMARY KEY,
  exam VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  instructions TEXT,
  duration_minutes INT DEFAULT 30,
  total_marks INT DEFAULT 60,
  passing_marks INT DEFAULT 20,
  per_question_seconds INT DEFAULT 30,
  marks_correct INT DEFAULT 4,
  is_free BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_questions (
  id SERIAL PRIMARY KEY,
  test_id INT NOT NULL REFERENCES mock_tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option VARCHAR(10) NOT NULL,
  explanation TEXT,
  question_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mock_results (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  exam VARCHAR(50) NOT NULL,
  test_id INT NOT NULL,
  score INT NOT NULL,
  correct_count INT NOT NULL,
  wrong_count INT NOT NULL,
  total_questions INT NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  time_taken_sec INT NOT NULL,
  responses_json TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  exam VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price_paise INT NOT NULL DEFAULT 0,
  duration_days INT NOT NULL DEFAULT 365,
  access_modules JSONB DEFAULT '["all"]'::jsonb,
  target_exams JSONB DEFAULT '[]'::jsonb,
  allowed_items JSONB DEFAULT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_access (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  exam VARCHAR(50) NOT NULL,
  plan_code VARCHAR(50) NOT NULL,
  access_modules JSONB DEFAULT '["all"]'::jsonb,
  allowed_items JSONB DEFAULT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam, plan_code)
);
`;

export async function initExamPgSchemas() {
  const pools = [
    { name: 'PUC (Neon DB 1)', pool: getPucPool() },
    { name: 'KCET/NEET (Neon DB 2)', pool: getKcetNeetPool() },
  ];

  for (const { name, pool } of pools) {
    if (!pool) {
      console.warn(`[pg-init] Skipping schema initialization for ${name}: Database URL not provided in environment.`);
      continue;
    }
    try {
      await pool.query(TABLE_SCHEMAS);
      // Run migrations for new columns if table already existed
      try {
        await pool.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS access_modules JSONB DEFAULT '["all"]'::jsonb`);
        await pool.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS target_exams JSONB DEFAULT '[]'::jsonb`);
        await pool.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS allowed_items JSONB DEFAULT NULL`);
        await pool.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS access_modules JSONB DEFAULT '["all"]'::jsonb`);
        await pool.query(`ALTER TABLE user_access ADD COLUMN IF NOT EXISTS allowed_items JSONB DEFAULT NULL`);
        await pool.query(`ALTER TABLE mock_tests ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true`);
      } catch (_) {}
      console.log(`[pg-init] Schemas verified for ${name}`);

      // Seed initial default banner if empty
      const bannerCheck = await pool.query('SELECT COUNT(*) as cnt FROM banners');
      if (Number(bannerCheck.rows[0]?.cnt || 0) === 0) {
        await pool.query(`
          INSERT INTO banners (exam, template_id, title, highlight_text, subtitle, button_text, action_route, bg_gradient_start, bg_gradient_end, display_order, is_active)
          VALUES 
          ('global', 'emerald-dream', 'Dream Big...', 'Prepare Smart!', 'Your Complete Exam Preparation Partner', 'Start Learning >', '/student/dashboard', '#07162c', '#059669', 1, true),
          ('puc', 'indigo-ace', 'Ace Your PUC Exams', 'Top Marks Guaranteed', 'Complete chapter-wise materials, PYQs & mock drills', 'Explore PUC >', '/student/exam/puc', '#1e1b4b', '#4338ca', 1, true),
          ('kcet', 'cyan-rank', 'Target Your Best Rank', 'KCET Preparation', 'Comprehensive practice tests, solutions & PYQs', 'Explore KCET >', '/student/exam/kcet', '#082f49', '#0284c7', 1, true),
          ('neet', 'rose-success', 'Crack NEET with Confidence', 'Score 650+', 'Curated Physics, Chemistry & Biology modules', 'Explore NEET >', '/student/exam/neet', '#4c0519', '#e11d48', 1, true),
          ('agri', 'agri-future', 'KCET Agri Practical', 'Master Specimens & Tests', 'Hands-on practical guides, specimens, PYQs & tests', 'Explore Agri >', '/student/exam/agri', '#064e3b', '#10b981', 1, true)
        `);
      }

      // Seed initial plans if empty
      const plansCheck = await pool.query('SELECT COUNT(*) as cnt FROM plans');
      if (Number(plansCheck.rows[0]?.cnt || 0) === 0) {
        if (name.includes('PUC')) {
          await pool.query(`
            INSERT INTO plans (exam, code, name, price_paise, duration_days, features, status)
            VALUES 
            ('puc', 'puc_all', 'PUC Complete All-in-One Access', 49900, 365, '["Physics, Chemistry, Maths & Biology", "All Chapter Study Notes", "Previous Year Question Papers", "Mock Tests with Instant Results", "365 Days Full Validity"]'::jsonb, 'active')
          `);
        } else {
          await pool.query(`
            INSERT INTO plans (exam, code, name, price_paise, duration_days, features, status)
            VALUES 
            ('kcet', 'kcet_all', 'KCET Comprehensive Ranker Pack', 69900, 365, '["Physics, Chemistry, Maths & Biology", "All KCET Chapter PDFs", "Previous Year Papers", "Timed Mock Test Simulations", "Rank & Accuracy Analytics", "365 Days Validity"]'::jsonb, 'active'),
            ('neet', 'neet_all', 'NEET Medical Pro Pack', 89900, 365, '["Physics, Chemistry & Biology Notes", "High-Yield Medical Question Banks", "NEET Chapter PYQs", "Timed Real-Exam Mock Tests", "Detailed Solutions & Analytics", "365 Days Validity"]'::jsonb, 'active')
          `);
        }
      }
    } catch (err) {
      console.error(`[pg-init] Error initializing ${name}:`, err?.message || err);
    }
  }
}

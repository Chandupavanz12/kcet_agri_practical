import pg from 'pg';

let pool;

async function hasTable(tableName) {
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
    ['public', tableName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function hasColumn(tableName, columnName) {
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3',
    ['public', tableName, columnName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function hasIndex(tableName, indexName) {
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 AND indexname = $3',
    ['public', tableName, indexName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

function getPool() {
  if (!pool) {
    throw new Error('DB not initialized');
  }
  return pool;
}

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function initSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS plans (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(190) NOT NULL,
      price_paise INT NOT NULL DEFAULT 0,
      duration_days INT NOT NULL DEFAULT 365,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      is_free BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      amount_paise INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      razorpay_order_id VARCHAR(255),
      razorpay_payment_id VARCHAR(255),
      razorpay_signature VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_access (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      plan_code VARCHAR(50) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, plan_code)
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS menus (
      id SERIAL PRIMARY KEY,
      name VARCHAR(190) NOT NULL,
      route VARCHAR(190) NOT NULL,
      icon VARCHAR(50) NOT NULL,
      resource_type VARCHAR(50) NOT NULL DEFAULT 'link',
      type VARCHAR(20) NOT NULL DEFAULT 'student',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      menu_order INT NOT NULL DEFAULT 999,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      title VARCHAR(190) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      duration_minutes INT NOT NULL,
      total_marks INT NOT NULL,
      passing_marks INT NOT NULL,
      instructions TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      test_id INT NOT NULL,
      question_text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_answer INT NOT NULL,
      explanation TEXT,
      marks INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_tests (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      test_id INT NOT NULL,
      answers JSONB NOT NULL,
      score INT NOT NULL,
      total_marks INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(190) NOT NULL,
      description TEXT,
      video_url VARCHAR(500) NOT NULL,
      thumbnail_url VARCHAR(500),
      subject VARCHAR(100) NOT NULL,
      duration INT,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      title VARCHAR(190) NOT NULL,
      description TEXT,
      pdf_url VARCHAR(500) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'pdf',
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS pyqs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(190) NOT NULL,
      pdf_url VARCHAR(500) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      year INT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      videos_enabled BOOLEAN NOT NULL DEFAULT true,
      tests_enabled BOOLEAN NOT NULL DEFAULT true,
      pdfs_enabled BOOLEAN NOT NULL DEFAULT true,
      pyqs_enabled BOOLEAN NOT NULL DEFAULT true,
      notifications_enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await query('INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING');

  // Initialize plans if empty
  const plansCountRows = await query('SELECT COUNT(*) as cnt FROM plans');
  const plansCount = Number(plansCountRows?.[0]?.cnt || 0);
  if (plansCount === 0) {
    await query(
      'INSERT INTO plans (code, name, price_paise, duration_days, status, is_free) VALUES ($1, $2, $3, $4, $5, $6)',
      ['pyq', 'PYQ Access (All centres + all years)', 0, 365, 'active', true]
    );
    await query(
      'INSERT INTO plans (code, name, price_paise, duration_days, status, is_free) VALUES ($1, $2, $3, $4, $5, $6)',
      ['materials', 'Study Material Access (All materials)', 0, 365, 'active', true]
    );
    await query(
      'INSERT INTO plans (code, name, price_paise, duration_days, status, is_free) VALUES ($1, $2, $3, $4, $5, $6)',
      ['combo', 'Combo (PYQ + Materials)', 0, 365, 'active', true]
    );
  }
}

export async function connectDb() {
  if (pool) return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }

  // Parse connection string to extract components
  const match = dbUrl.match(/^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }

  const [, user, password, host, port, database] = match;

  pool = new pg.Pool({
    user,
    password,
    host,
    port: parseInt(port, 10),
    database,
    ssl: false,
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 30000,
  });

  await query('SELECT 1');
  await initSchema();
}

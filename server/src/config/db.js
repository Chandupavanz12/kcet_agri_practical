import mysql from 'mysql2/promise';

let pool;

async function hasTable(tableName) {
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [tableName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function hasColumn(tableName, columnName) {
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [tableName, columnName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function hasIndex(tableName, indexName) {
  const rows = await query(
    'SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [tableName, indexName]
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
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function initSchema() {
  await query(
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('student','admin') NOT NULL DEFAULT 'student',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(190) NOT NULL,
      price_paise INT NOT NULL DEFAULT 0,
      duration_days INT NOT NULL DEFAULT 365,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      is_free TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_plans_code (code)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      plan_id INT NOT NULL,
      amount_paise INT NOT NULL DEFAULT 0,
      razorpay_order_id VARCHAR(120) NOT NULL,
      razorpay_payment_id VARCHAR(120),
      razorpay_signature VARCHAR(255),
      status ENUM('created','paid','failed','refunded','free') NOT NULL DEFAULT 'created',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME,
      UNIQUE KEY uniq_payments_order (razorpay_order_id),
      UNIQUE KEY uniq_payments_payment (razorpay_payment_id),
      INDEX idx_payments_user (user_id),
      INDEX idx_payments_plan (plan_id),
      INDEX idx_payments_status (status)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_access (
      user_id INT PRIMARY KEY,
      pyq_access TINYINT(1) NOT NULL DEFAULT 0,
      material_access TINYINT(1) NOT NULL DEFAULT 0,
      combo_access TINYINT(1) NOT NULL DEFAULT 0,
      expiry DATETIME,
      pyq_expiry DATETIME,
      material_expiry DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_access_pyq_expiry (pyq_expiry),
      INDEX idx_user_access_material_expiry (material_expiry)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS user_notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('unread','read') NOT NULL DEFAULT 'unread',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_notifications_user (user_id),
      INDEX idx_user_notifications_status (status)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      video_url VARCHAR(500) NOT NULL,
      subject VARCHAR(120) DEFAULT 'General',
      menu_id INT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_videos_status (status),
      INDEX idx_videos_menu (menu_id)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      pdf_url TEXT NOT NULL,
      subject VARCHAR(120) DEFAULT 'General',
      type ENUM('pdf','pyq') NOT NULL DEFAULT 'pdf',
      menu_id INT NULL,
      access_type ENUM('free','paid') NOT NULL DEFAULT 'free',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_materials_menu (menu_id)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS pyqs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      pdf_url TEXT NOT NULL,
      solution_url TEXT,
      subject VARCHAR(120) DEFAULT 'General',
      year VARCHAR(10),
      centre_id INT NULL,
      access_type ENUM('free','paid') NOT NULL DEFAULT 'paid',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS exam_centres (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(190) NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_exam_centres_name (name)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS exam_centre_years (
      id INT AUTO_INCREMENT PRIMARY KEY,
      centre_id INT NOT NULL,
      year VARCHAR(10) NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_exam_centre_year (centre_id, year),
      INDEX idx_exam_centre_years_centre (centre_id)
    ) ENGINE=InnoDB;`
  );

  if (await hasTable('pyqs')) {
    if (!(await hasColumn('pyqs', 'centre_id'))) {
      await query('ALTER TABLE pyqs ADD COLUMN centre_id INT NULL AFTER year');
    }
    if (!(await hasColumn('pyqs', 'access_type'))) {
      await query("ALTER TABLE pyqs ADD COLUMN access_type ENUM('free','paid') NOT NULL DEFAULT 'paid' AFTER centre_id");
    }
    if (!(await hasIndex('pyqs', 'idx_pyqs_centre_year'))) {
      await query('ALTER TABLE pyqs ADD INDEX idx_pyqs_centre_year (centre_id, year)');
    }
  }

  if (await hasTable('exam_centre_years')) {
    if (!(await hasIndex('exam_centre_years', 'idx_exam_centre_years_centre'))) {
      await query('ALTER TABLE exam_centre_years ADD INDEX idx_exam_centre_years_centre (centre_id)');
    }
  }

  await query(
    `CREATE TABLE IF NOT EXISTS material_completions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      material_id INT NOT NULL,
      completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_material (user_id, material_id),
      INDEX idx_material_completions_user (user_id)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS password_resets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_resets_token (token),
      INDEX idx_password_resets_user (user_id)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS login_otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_login_otps_token (token),
      INDEX idx_login_otps_user (user_id)
    ) ENGINE=InnoDB;`
  );

  if (await hasTable('results')) {
    if (!(await hasColumn('results', 'rank'))) {
      await query('ALTER TABLE results ADD COLUMN rank INT NULL AFTER accuracy');
    }
    if (!(await hasIndex('results', 'idx_results_rank'))) {
      await query('ALTER TABLE results ADD INDEX idx_results_rank (rank)');
    }
  }

  await query(
    `CREATE TABLE IF NOT EXISTS specimens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      image_url TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct TINYINT NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  );

  if (await hasTable('specimens')) {
    if (!(await hasColumn('specimens', 'test_id'))) {
      await query('ALTER TABLE specimens ADD COLUMN test_id INT NULL AFTER id');
    }
    if (!(await hasColumn('specimens', 'question_text'))) {
      await query('ALTER TABLE specimens ADD COLUMN question_text TEXT NULL AFTER image_url');
    }
    if (!(await hasIndex('specimens', 'idx_specimens_test'))) {
      await query('ALTER TABLE specimens ADD INDEX idx_specimens_test (test_id)');
    }
  }

  await query(
    `CREATE TABLE IF NOT EXISTS tests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      question_count INT NOT NULL DEFAULT 50,
      per_question_seconds INT NOT NULL DEFAULT 30,
      marks_correct INT NOT NULL DEFAULT 4,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS test_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      test_id INT NOT NULL,
      question_text VARCHAR(255) NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      option_a VARCHAR(255) NOT NULL,
      option_b VARCHAR(255) NOT NULL,
      option_c VARCHAR(255) NOT NULL,
      option_d VARCHAR(255) NOT NULL,
      correct_option ENUM('A','B','C','D') NOT NULL,
      question_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_test_questions_test (test_id),
      INDEX idx_test_questions_order (test_id, question_order),
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      test_id INT NOT NULL,
      score INT NOT NULL,
      correct_count INT NOT NULL,
      wrong_count INT NOT NULL,
      total_questions INT NOT NULL,
      accuracy DECIMAL(5,2) NOT NULL,
      time_taken_sec INT NOT NULL,
      responses_json LONGTEXT NOT NULL,
      date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_results_user (user_id),
      INDEX idx_results_test_score (test_id, score, time_taken_sec, date)
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS menus (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      route VARCHAR(255) DEFAULT NULL,
      icon VARCHAR(100) DEFAULT '📄',
      resource_type ENUM('link','pdf','video') NOT NULL DEFAULT 'link',
      type ENUM('student','admin','both') NOT NULL DEFAULT 'student',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      menu_order INT NOT NULL DEFAULT 0,
      parent_id INT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_menus_type (type),
      INDEX idx_menus_status (status),
      INDEX idx_menus_order (menu_order)
    ) ENGINE=InnoDB;`
  );

  if (await hasTable('menus')) {
    if (!(await hasColumn('menus', 'resource_type'))) {
      await query("ALTER TABLE menus ADD COLUMN resource_type ENUM('link','pdf','video') NOT NULL DEFAULT 'link' AFTER icon");
    }

    if (!(await hasColumn('menus', 'menu_order'))) {
      await query('ALTER TABLE menus ADD COLUMN menu_order INT NOT NULL DEFAULT 0');

      if (await hasColumn('menus', 'menuOrder')) {
        await query('UPDATE menus SET menu_order = menuOrder');
      }
    }
  }

  if (await hasTable('videos')) {
    if (!(await hasColumn('videos', 'menu_id'))) {
      await query('ALTER TABLE videos ADD COLUMN menu_id INT NULL AFTER subject');
    }
    if (!(await hasIndex('videos', 'idx_videos_menu'))) {
      await query('ALTER TABLE videos ADD INDEX idx_videos_menu (menu_id)');
    }
  }

  if (await hasTable('materials')) {
    if (!(await hasColumn('materials', 'menu_id'))) {
      await query('ALTER TABLE materials ADD COLUMN menu_id INT NULL AFTER type');
    }
    if (!(await hasColumn('materials', 'access_type'))) {
      await query("ALTER TABLE materials ADD COLUMN access_type ENUM('free','paid') NOT NULL DEFAULT 'free' AFTER menu_id");
    }
    if (!(await hasIndex('materials', 'idx_materials_menu'))) {
      await query('ALTER TABLE materials ADD INDEX idx_materials_menu (menu_id)');
    }
  }

  const plansCountRows = await query('SELECT COUNT(*) as cnt FROM plans');
  const plansCount = Number(plansCountRows?.[0]?.cnt || 0);
  if (plansCount === 0) {
    await query(
      'INSERT INTO plans (code, name, price_paise, duration_days, status, is_free) VALUES (?, ?, ?, ?, ?, ?)',
      ['pyq', 'PYQ Access (All centres + all years)', 0, 365, 'active', 1]
    );
    await query(
      'INSERT INTO plans (code, name, price_paise, duration_days, status, is_free) VALUES (?, ?, ?, ?, ?, ?)',
      ['materials', 'Study Material Access (All materials)', 0, 365, 'active', 1]
    );
    await query(
      'INSERT INTO plans (code, name, price_paise, duration_days, status, is_free) VALUES (?, ?, ?, ?, ?, ?)',
      ['combo', 'Combo (PYQ + Materials)', 0, 365, 'active', 1]
    );
  }

  await query(
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      videos_enabled TINYINT(1) NOT NULL DEFAULT 1,
      tests_enabled TINYINT(1) NOT NULL DEFAULT 1,
      pdfs_enabled TINYINT(1) NOT NULL DEFAULT 1,
      pyqs_enabled TINYINT(1) NOT NULL DEFAULT 1,
      notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`
  );

  await query(`INSERT IGNORE INTO settings (id) VALUES (1);`);

  const menusCountRows = await query('SELECT COUNT(*) as cnt FROM menus');
  const menusCount = Number(menusCountRows?.[0]?.cnt || 0);
  if (menusCount === 0) {
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Dashboard', '/student/dashboard', '📊', 'link', 'student', 'active', 1]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Mock Tests', '/student/tests', '📝', 'link', 'student', 'active', 2]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Progress', '/student/progress', '📈', 'link', 'student', 'active', 3]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Videos', '/student/videos', '🎬', 'link', 'student', 'active', 4]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Free Materials', '/student/materials/free', '📚', 'link', 'student', 'active', 5]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Premium Materials', '/student/materials/premium', '�', 'link', 'student', 'active', 6]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Premium Access', '/student/premium', '💳', 'link', 'student', 'active', 7]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PYQs', '/student/pyqs', '📋', 'link', 'student', 'active', 8]
    );

    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Notifications', '/student/notifications', '🔔', 'link', 'student', 'active', 9]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Profile', '/student/profile', '👤', 'link', 'student', 'active', 10]
    );

    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Dashboard', '/admin/dashboard', '📊', 'link', 'admin', 'active', 1]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Menu Management', '/admin/menu', '🗂️', 'link', 'admin', 'active', 2]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Students', '/admin/students', '👥', 'link', 'admin', 'active', 3]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Test Builder', '/admin/test-builder', '📝', 'link', 'admin', 'active', 4]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Videos', '/admin/videos', '🎬', 'link', 'admin', 'active', 5]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Materials', '/admin/materials', '📚', 'link', 'admin', 'active', 6]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Plans', '/admin/plans', '💳', 'link', 'admin', 'active', 7]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Payments', '/admin/payments', '🧾', 'link', 'admin', 'active', 8]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Notifications', '/admin/notifications', '🔔', 'link', 'admin', 'active', 9]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Results', '/admin/results', '📈', 'link', 'admin', 'active', 10]
    );
    await query(
      'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['Settings', '/admin/settings', '⚙️', 'link', 'admin', 'active', 11]
    );
  }

  if (menusCount > 0) {
    await query(
      "UPDATE menus SET name = 'Free Materials', route = '/student/materials/free', icon = '📚' WHERE route = '/student/materials' AND (type = 'student' OR type = 'both')",
      []
    );

    const premiumMaterialsRows = await query(
      "SELECT id FROM menus WHERE route = '/student/materials/premium' AND (type = 'student' OR type = 'both') LIMIT 1",
      []
    );
    if (!premiumMaterialsRows.length) {
      await query(
        'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Premium Materials', '/student/materials/premium', '🔒', 'link', 'student', 'active', 6]
      );
    }

    const premiumAccessRows = await query(
      "SELECT id FROM menus WHERE route = '/student/premium' AND (type = 'student' OR type = 'both') LIMIT 1",
      []
    );
    if (!premiumAccessRows.length) {
      await query(
        'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Premium Access', '/student/premium', '💳', 'link', 'student', 'active', 7]
      );
    }

    const adminPlansRows = await query(
      "SELECT id FROM menus WHERE route = '/admin/plans' AND (type = 'admin' OR type = 'both') LIMIT 1",
      []
    );
    if (!adminPlansRows.length) {
      await query(
        'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Plans', '/admin/plans', '💳', 'link', 'admin', 'active', 7]
      );
    }

    const adminPaymentsRows = await query(
      "SELECT id FROM menus WHERE route = '/admin/payments' AND (type = 'admin' OR type = 'both') LIMIT 1",
      []
    );
    if (!adminPaymentsRows.length) {
      await query(
        'INSERT INTO menus (name, route, icon, resource_type, type, status, menu_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Payments', '/admin/payments', '🧾', 'link', 'admin', 'active', 8]
      );
    }
  }
}

export async function connectDb() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'kcet_agri_practical';

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });

  await query('SELECT 1');
  await initSchema();
}

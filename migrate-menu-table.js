import { query, connectDb } from './server/src/config/db.js';

async function migrateMenuTable() {
  try {
    await connectDb();
    console.log('Connected to database');

    try {
      // Create menu table
      await query(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          route VARCHAR(255) DEFAULT NULL,
          icon VARCHAR(100) DEFAULT '📄',
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          menu_order INT NOT NULL DEFAULT 0,
          type ENUM('student', 'admin', 'both') NOT NULL DEFAULT 'student',
          parent_id INT DEFAULT NULL,
          is_default BOOLEAN DEFAULT FALSE,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_menu_status (status),
          INDEX idx_menu_type (type),
          INDEX idx_menu_order (menu_order),
          INDEX idx_menu_parent (parent_id),
          FOREIGN KEY (parent_id) REFERENCES menu_items(id) ON DELETE SET NULL
        ) ENGINE=InnoDB;
      `);
      console.log('Menu table created successfully');

      // Insert default menu items
      const defaultMenus = [
        // Student menus
        { name: 'Home', route: '/', icon: '🏠', status: 'active', type: 'student', menu_order: 1, is_default: true },
        { name: 'Dashboard', route: '/student/dashboard', icon: '📊', status: 'active', type: 'student', menu_order: 2, is_default: true },
        { name: 'Study Materials', route: '/student/dashboard', icon: '📚', status: 'active', type: 'student', menu_order: 3, is_default: true },
        { name: 'Videos', route: '/student/dashboard', icon: '🎬', status: 'active', type: 'student', menu_order: 4, is_default: true },
        { name: 'Mock Tests', route: '/student/tests', icon: '📝', status: 'active', type: 'student', menu_order: 5, is_default: true },
        { name: 'Previous Year Questions', route: '/student/pyqs', icon: '📋', status: 'active', type: 'student', menu_order: 6, is_default: true },
        { name: 'Progress', route: '/student/results', icon: '📈', status: 'active', type: 'student', menu_order: 7, is_default: true },
        { name: 'Notifications', route: '/student/dashboard', icon: '🔔', status: 'active', type: 'student', menu_order: 8, is_default: true },
        { name: 'Profile', route: '/profile', icon: '👤', status: 'active', type: 'student', menu_order: 9, is_default: true },
        { name: 'FAQ', route: '/faq', icon: '❓', status: 'active', type: 'student', menu_order: 10, is_default: true },
        { name: 'About', route: '/about', icon: 'ℹ️', status: 'active', type: 'student', menu_order: 11, is_default: true },
        { name: 'Logout', route: '/logout', icon: '🚪', status: 'active', type: 'student', menu_order: 12, is_default: true },
        
        // Admin menus
        { name: 'Dashboard', route: '/admin/dashboard', icon: '📊', status: 'active', type: 'admin', menu_order: 1, is_default: true },
        { name: 'Menu Management', route: '/admin/menu', icon: '🗂️', status: 'active', type: 'admin', menu_order: 2, is_default: true },
        { name: 'Student Management', route: '/admin/students', icon: '👥', status: 'active', type: 'admin', menu_order: 3, is_default: true },
        { name: 'Test Management', route: '/admin/test-builder', icon: '📝', status: 'active', type: 'admin', menu_order: 4, is_default: true },
        { name: 'Video Management', route: '/admin/videos', icon: '🎬', status: 'active', type: 'admin', menu_order: 5, is_default: true },
        { name: 'Content Management', route: '/admin/materials', icon: '📚', status: 'active', type: 'admin', menu_order: 6, is_default: true },
        { name: 'Notifications', route: '/admin/notifications', icon: '🔔', status: 'active', type: 'admin', menu_order: 7, is_default: true },
        { name: 'Settings', route: '/admin/settings', icon: '⚙️', status: 'active', type: 'admin', menu_order: 8, is_default: true },
        { name: 'Logout', route: '/logout', icon: '🚪', status: 'active', type: 'admin', menu_order: 9, is_default: true },
      ];

      for (const menu of defaultMenus) {
        const existing = await query('SELECT id FROM menu_items WHERE name = ? AND type = ?', [menu.name, menu.type]);
        if (existing.length === 0) {
          await query(`
            INSERT INTO menu_items (name, route, icon, status, menu_order, type, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [menu.name, menu.route, menu.icon, menu.status, menu.menu_order, menu.type, menu.is_default]);
          console.log(`Added default menu: ${menu.name} (${menu.type})`);
        }
      }

      console.log('Menu migration completed successfully!');

    } catch (error) {
      console.error('Migration error:', error);
    }

  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    process.exit(0);
  }
}

migrateMenuTable();

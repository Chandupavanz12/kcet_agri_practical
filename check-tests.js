import { query, connectDb } from './server/src/config/db.js';

async function checkTests() {
  try {
    await connectDb();
    const tests = await query('SELECT id, title, is_active FROM tests WHERE is_active = 1');
    console.log('Active tests:');
    tests.forEach(test => {
      console.log(`ID: ${test.id}, Title: ${test.title}, Active: ${test.is_active}`);
    });
    
    // Check specimens linked to tests
    for (const test of tests) {
      const specimens = await query('SELECT COUNT(*) as count FROM specimens WHERE test_id = ? AND status = "active"', [test.id]);
      console.log(`Test ${test.id} has ${specimens[0].count} active specimens`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTests();

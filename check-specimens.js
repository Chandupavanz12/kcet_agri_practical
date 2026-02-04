import { query, connectDb } from './server/src/config/db.js';

async function checkSpecimens() {
  try {
    await connectDb();
    const rows = await query('SELECT id, image_url FROM specimens LIMIT 10');
    console.log('Specimens in database:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Image URL: ${row.image_url}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSpecimens();
